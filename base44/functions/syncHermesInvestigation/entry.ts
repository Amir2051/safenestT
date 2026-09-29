import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * syncHermesInvestigation — server-side single sync step for a Hermes
 * investigation linked to a SafeNestT case.
 *
 * For a case that already has workflow.hermes_investigation_id, this reads the
 * LIVE Hermes status (GET /v1/investigations/{id} via hermesProxy) and
 * synchronizes the REAL status/results back into the SAME case:
 *
 *   QUEUED   → case status "queued", phases reflect queued
 *   RUNNING  → case status "investigating", running phase marked running
 *   COMPLETED→ case status "closed", all phases completed, findings/risk/report
 *              persisted (once, on the terminal transition)
 *   FAILED   → case status "investigating", failure recorded, run marked failed
 *
 * The browser never sees HERMES_BASE_URL or the key — hermesProxy owns the HTTP.
 * All entity writes are user-scoped (base44.entities...) so RLS / tenant
 * isolation is preserved. Nothing is fabricated: if Hermes returns no findings,
 * none are created.
 *
 * Contract:
 *   IN  { case_id }
 *   OUT { ok, case_id, hermes_investigation_id, hermes_status, case_status,
 *         phases, progress, terminal, persisted, action }
 */

const CANONICAL_PHASES = ["planning", "evidence", "analysis", "reality_check", "risk", "dossier"];

const PHASE_ALIASES = {
  planning: ["planning", "plan", "intake"],
  evidence: ["evidence", "evidence_collection", "collection", "ingest"],
  analysis: ["analysis", "multi_agent_analysis", "multi_agent", "analyst", "investigation"],
  reality_check: ["reality_check", "realitycheck", "reality", "verification", "verify", "validation"],
  risk: ["risk", "risk_scoring", "risk_score", "scoring"],
  dossier: ["dossier", "report", "reporting", "finalization", "finalise", "finalize"],
};

function mapHermesPhase(name) {
  const n = String(name || "").toLowerCase().replace(/[\s-]/g, "_");
  for (const phase of Object.keys(PHASE_ALIASES)) {
    if (PHASE_ALIASES[phase].includes(n)) return phase;
  }
  return null;
}

function normalizeStatus(st) {
  const s = String(st || "pending").toLowerCase();
  if (["completed", "done", "complete", "success", "succeeded", "finished", "ok"].includes(s)) return "completed";
  if (["running", "in_progress", "inprogress", "active", "processing", "started", "working"].includes(s)) return "running";
  if (["failed", "error", "errored"].includes(s)) return "failed";
  if (["queued", "queue", "pending", "waiting", "not_started", "notstarted", "idle", "new"].includes(s)) return "pending";
  return "pending";
}

function isTerminal(status) {
  const s = String(status || "").toLowerCase();
  return ["completed", "done", "complete", "success", "succeeded", "finished", "failed", "error", "cancelled", "canceled", "aborted"].includes(s);
}

function extractStatus(data) {
  return String(data?.status || data?.state || "pending").toLowerCase();
}

function extractPhaseStatuses(data) {
  const out = {};
  const phases = data?.phases || data?.phase_progress || data?.stages || data?.pipeline || [];
  if (Array.isArray(phases)) {
    for (const p of phases) {
      const phaseId = mapHermesPhase(p.name || p.phase || p.id || p.key);
      if (!phaseId) continue;
      out[phaseId] = normalizeStatus(p.status || p.state || p.state_status || "pending");
    }
  } else if (phases && typeof phases === "object") {
    for (const [name, info] of Object.entries(phases)) {
      const phaseId = mapHermesPhase(name);
      if (!phaseId) continue;
      const st = typeof info === "string" ? info : (info?.status || info?.state || "pending");
      out[phaseId] = normalizeStatus(st);
    }
  }
  return out;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const caseId = payload?.case_id;
    if (!caseId) return Response.json({ ok: false, status: "bad_request", error: "case_id is required" });

    // User-scoped read respects RLS — only authorized users can sync this case.
    const caseItem = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
    if (!caseItem) return Response.json({ ok: false, status: "not_found", error: "Case not found or no access" });

    const investigationId = caseItem.workflow?.hermes_investigation_id || payload?.investigation_id;
    if (!investigationId) {
      return Response.json({ ok: true, status: "ok", action: "needs_creation", case_id: caseId, terminal: false });
    }

    // Read the LIVE Hermes status through the authenticated proxy.
    const proxyRes = await base44.functions.invoke("hermesProxy", { action: "get_investigation", investigation_id: investigationId });
    const proxyBody = proxyRes && proxyRes.data ? proxyRes.data : proxyRes;
    if (!proxyBody || proxyBody.ok === false) {
      return Response.json({
        ok: false,
        status: proxyBody?.status || "error",
        error: proxyBody?.error || "Hermes status fetch failed",
        upstream_status: proxyBody?.upstream_status,
      });
    }
    const statusData = proxyBody.data || {};

    const hermesStatus = extractStatus(statusData);
    const phaseStatuses = extractPhaseStatuses(statusData);
    const isFailed = hermesStatus === "failed" || hermesStatus === "error";
    const phases = {};
    for (const p of CANONICAL_PHASES) {
      phases[p] = phaseStatuses[p] || (p === "planning" ? "running" : "pending");
    }
    const terminal = isTerminal(hermesStatus);
    // Hermes' investigation status response carries only lifecycle metadata
    // (no per-phase breakdown). When Hermes reports COMPLETED, the whole
    // pipeline is done — reflect that truthfully by marking every phase
    // completed. On FAILED, mark the in-flight phase failed. This is lifecycle
    // status only; no findings/evidence/report are fabricated — those are
    // persisted only when Hermes actually returns them (below).
    if (terminal && !isFailed) {
      for (const p of CANONICAL_PHASES) phases[p] = "completed";
    } else if (terminal && isFailed) {
      const inflight = CANONICAL_PHASES.find((p) => phases[p] === "running") || "planning";
      phases[inflight] = "failed";
    }

    // Guard: only persist results ONCE — on the transition into a terminal
    // state. Repeated polls of an already-terminal investigation just refresh
    // the status without creating duplicate findings/reports.
    const prevStatus = caseItem.workflow?.hermes_status;
    const wasTerminal = prevStatus && isTerminal(prevStatus);

    // Build the merged workflow state.
    const wf = caseItem.workflow || { current_phase: "planning", phases: {} };
    const mergedPhases = { ...(wf.phases || {}) };
    const now = new Date().toISOString();
    for (const p of CANONICAL_PHASES) {
      mergedPhases[p] = { ...(mergedPhases[p] || {}), status: phases[p] };
      if (phases[p] === "completed" && !mergedPhases[p].completed_at) {
        mergedPhases[p].completed_at = now;
      }
    }
    const completedCount = CANONICAL_PHASES.filter((p) => mergedPhases[p]?.status === "completed").length;
    const progress = Math.round((completedCount / CANONICAL_PHASES.length) * 100);
    const runningPhase = CANONICAL_PHASES.find((p) => mergedPhases[p]?.status === "running");
    let currentPhase = runningPhase || wf.current_phase || "planning";
    let caseStatus;
    if (terminal && hermesStatus !== "failed" && hermesStatus !== "error") {
      currentPhase = "closed";
      caseStatus = "closed";
    } else if (hermesStatus === "queued" || hermesStatus === "queue" || hermesStatus === "pending" || hermesStatus === "waiting" || hermesStatus === "not_started") {
      // Reflect QUEUED truthfully when nothing is running yet.
      caseStatus = (hermesStatus === "queued" || hermesStatus === "queue") ? "queued" : "investigating";
    } else {
      caseStatus = "investigating";
    }

    const workflowUpdate = {
      ...wf,
      phases: mergedPhases,
      current_phase: currentPhase,
      hermes_investigation_id: investigationId,
      hermes_status: hermesStatus,
      hermes_error: statusData?.error || null,
      provider: "hermes",
    };

    const updatePatch = {
      workflow: workflowUpdate,
      investigation_progress: progress,
      last_activity: now,
      ...(caseStatus ? { status: caseStatus } : {}),
    };
    await base44.entities.InvestigationCase.update(caseId, updatePatch).catch(() => null);

    const persisted = { findings: 0, report_id: null, risk_score: null, graph_nodes: 0 };

    // Persist results only on the terminal transition.
    if (terminal && !wasTerminal) {
      const tenantId = caseItem.tenant_id;

      // Findings
      const findings = statusData?.findings || statusData?.results?.findings || [];
      if (Array.isArray(findings) && findings.length) {
        for (const f of findings) {
          const rec = await base44.entities.InvestigationFinding.create({
            tenant_id: tenantId,
            case_id: caseId,
            title: f.title || "Hermes finding",
            description: f.description || "",
            category: f.category || "other",
            severity: f.severity || "medium",
            confidence: f.confidence || "medium",
            status: "proposed",
            source: "hermes",
            hermes_raw: f,
          }).catch(() => null);
          if (rec) persisted.findings += 1;
        }
      }

      // Risk assessment
      const risk = statusData?.risk || statusData?.risk_assessment || statusData?.results?.risk;
      if (risk && typeof (risk.risk_score ?? risk.score) === "number") {
        const c2 = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
        const wf2 = c2?.workflow || workflowUpdate;
        await base44.entities.InvestigationCase.update(caseId, {
          workflow: {
            ...wf2,
            risk_score: risk.risk_score ?? risk.score,
            risk_level: risk.risk_level || risk.level,
            risk_factors: risk.risk_factors || risk.factors,
          },
        }).catch(() => null);
        persisted.risk_score = risk.risk_score ?? risk.score;
      }

      // Report / dossier
      const report = statusData?.report || statusData?.dossier || statusData?.results?.report;
      if (report) {
        const rec = await base44.entities.InvestigationReport.create({
          tenant_id: tenantId,
          case_id: caseId,
          title: report.title || "Hermes Investigation Dossier",
          report_type: "dossier",
          status: "generated",
          generated_by: "hermes",
          generated_date: now,
          content: report,
          sections: report.sections,
          conclusion: report.conclusion,
          recommended_actions: report.recommended_actions,
          created_by: user.email,
        }).catch(() => null);
        if (rec) persisted.report_id = rec.id;
      }

      // Graph entities / nodes
      const entities = statusData?.entities || statusData?.graph || statusData?.results?.entities || statusData?.nodes;
      if (Array.isArray(entities) && entities.length) {
        for (const node of entities) {
          const rec = await base44.entities.GraphNode.create({
            tenant_id: tenantId,
            case_id: caseId,
            node_type: node.type || node.node_type || "other",
            label: node.label || node.value || node.address || "Hermes entity",
            value: node.value || node.address || node.label || "",
            source: "hermes_extraction",
            hermes_raw: node,
          }).catch(() => null);
          if (rec) persisted.graph_nodes += 1;
        }
      }

      // Mark the active InvestigationRun terminal.
      const runs = await base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 5).catch(() => []);
      const activeRun = (runs || []).find((r) => r.status === "running");
      if (activeRun) {
        await base44.entities.InvestigationRun.update(activeRun.id, {
          status: (hermesStatus === "failed" || hermesStatus === "error") ? "failed" : "completed",
          output: statusData,
          completed_at: now,
          persisted_outputs: persisted,
        }).catch(() => null);
      }

      // Immutable audit trail.
      await base44.entities.AuditEvent.create({
        tenant_id: tenantId,
        actor: user.email,
        actor_name: user.full_name || user.email,
        timestamp: now,
        action: (hermesStatus === "failed" || hermesStatus === "error") ? "hermes_investigation_failed" : "hermes_investigation_completed",
        object_type: "case",
        object_id: caseId,
        case_id: caseId,
        description: `Hermes investigation ${investigationId} ${hermesStatus}`,
        metadata: { investigation_id: investigationId, status: hermesStatus, persisted },
        source: "hermes",
      }).catch(() => null);
    }

    return Response.json({
      ok: true,
      status: "ok",
      case_id: caseId,
      hermes_investigation_id: investigationId,
      hermes_status: hermesStatus,
      case_status: caseStatus || caseItem.status,
      phases,
      progress,
      terminal,
      persisted,
      action: terminal ? "synchronized" : "synced",
    });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error) }, { status: 500 });
  }
}