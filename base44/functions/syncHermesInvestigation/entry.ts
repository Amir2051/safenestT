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

// ── Hermes result → SafeNestT entity mappers ────────────────────────────────
// These map the ACTUAL Hermes /report response schema (inspected live) into
// the SafeNestT entity enums. No fields are invented — only translated.

function mapEvidenceType(source) {
  const s = String(source || "").toLowerCase();
  if (s.includes("blockchain") || s.includes("wallet") || s.includes("chain")) return "blockchain";
  if (s.includes("transaction") || s.includes("tx_")) return "transaction";
  if (s.includes("email") || s.includes("message") || s.includes("comm")) return "communication";
  return "other";
}

function mapFindingCategory(findingType) {
  const s = String(findingType || "").toUpperCase();
  if (s.includes("WALLET") || s.includes("FUNDS")) return "wallet_activity";
  if (s.includes("ENTITY") || s.includes("CONNECT")) return "entity_connection";
  if (s.includes("TRANSACTION") || s.includes("FLOW")) return "transaction_pattern";
  if (s.includes("CORRELAT")) return "evidence_correlation";
  if (s.includes("RISK")) return "risk_factor";
  if (s.includes("FRAUD") || s.includes("INDICATOR")) return "fraud_indicator";
  return "other";
}

function severityFromScore(score) {
  if (score == null) return "medium";
  if (score >= 0.85) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

function confidenceFromReality(realityStatus) {
  const s = String(realityStatus || "").toUpperCase();
  if (s.includes("VERIFIED") || s.includes("FACT") || s.includes("CONFIRMED")) return "high";
  if (s.includes("UNKNOWN") || s.includes("UNVERIFIED") || s.includes("SPECULATIVE")) return "low";
  return "medium"; // AI_INFERENCE and most tool-derived findings
}

// Hermes findings use a `claim` field that is usually a string, but synthesis
// findings can carry an object (e.g. { investigation_synthesis: "..." }).
// InvestigationFinding.title and risk_factors[].factor are both strings, so
// coerce to a meaningful string here — never pass the raw object through.
function findingTitle(f) {
  const c = f?.claim;
  if (typeof c === "string" && c.trim()) return c;
  if (c && typeof c === "object") {
    return c.investigation_synthesis || c.summary || c.title || c.conclusion || JSON.stringify(c).slice(0, 140);
  }
  return f?.finding_id || "Hermes finding";
}

function confidenceFrom01(v) {
  if (v == null) return "medium";
  if (v >= 0.7) return "high";
  if (v >= 0.4) return "medium";
  return "low";
}

function mapNodeType(t) {
  const s = String(t || "").toLowerCase();
  if (s.includes("wallet")) return "wallet";
  if (s.includes("person")) return "person";
  if (s.includes("exchange")) return "exchange";
  if (s.includes("domain")) return "domain";
  if (s.includes("ip")) return "ip";
  if (s.includes("email")) return "email";
  if (s.includes("phone")) return "phone";
  if (s.includes("transaction") || s.includes("tx")) return "transaction";
  if (s.includes("token") || s.includes("contract")) return "token_contract";
  if (s.includes("service")) return "service";
  if (s.includes("org")) return "organization";
  return "other";
}

function mapRelationship(rel) {
  const s = String(rel || "").toLowerCase();
  if (s.includes("send")) return "sends_funds";
  if (s.includes("receiv")) return "receives_funds";
  if (s.includes("control")) return "controls";
  if (s.includes("owned")) return "owned_by";
  if (s.includes("communicat")) return "communicates_with";
  if (s.includes("transact")) return "transacted_with";
  if (s.includes("support") || s.includes("link") || s.includes("relat")) return "linked_to";
  return "other";
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
    let caseItem = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
    if (!caseItem) return Response.json({ ok: false, status: "not_found", error: "Case not found or no access" });

    let investigationId = caseItem.workflow?.hermes_investigation_id || payload?.investigation_id;
    if (!investigationId) {
      // No Hermes investigation exists yet — create it idempotently via
      // syncCaseToHermes (narrative-tolerant, RLS-enforced). This makes "every
      // new case syncs" true even when the case was created without an
      // immediate sync, without requiring a manual Hermes case creation step.
      const syncRes = await base44.functions.invoke("syncCaseToHermes", { case_id: caseId });
      const syncBody = syncRes?.data ?? syncRes;
      if (!syncBody || syncBody.ok === false) {
        return Response.json({ ok: false, status: syncBody?.status || "sync_failed", error: syncBody?.error || "Failed to sync case to Hermes", action: "needs_creation", case_id: caseId });
      }
      caseItem = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
      investigationId = caseItem?.workflow?.hermes_investigation_id;
      if (!investigationId) {
        return Response.json({ ok: true, status: "ok", action: "needs_creation", case_id: caseId, terminal: false });
      }
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
      last_synced_at: now,
      sync_status: terminal ? (isFailed ? "failed" : "synced") : "active",
      ...(caseStatus ? { status: caseStatus } : {}),
    };
    await base44.entities.InvestigationCase.update(caseId, updatePatch).catch(() => null);

    const persisted = { evidence: 0, findings: 0, report_id: null, risk_score: null, risk_level: null, graph_nodes: 0, graph_edges: 0 };

    // Idempotency: persist results once. The marker lives on the existing
    // workflow.phases.dossier.output object (already declared in the schema as
    // a free-form object), so no schema change is needed and re-polling a
    // completed investigation never creates duplicate records.
    const resultsAlreadyPersisted = !!(wf.phases?.dossier?.output?.results_persisted);

    if (terminal && !resultsAlreadyPersisted && !isFailed) {
      const tenantId = caseItem.tenant_id;
      const invId = investigationId;

      // ── Race-safe dedup guard. The 8s auto-sync poll can fire several
      // concurrent syncs that all read the pre-marker workflow and each try to
      // persist. The marker alone can't close that window. A fresh query for
      // existing Hermes-derived evidence is the reliable guard: if any exists,
      // a concurrent sync already persisted results for this investigation —
      // skip duplicate creation. (Recreated investigations clear old evidence
      // first in syncCaseToHermes, so this still allows fresh persistence.)
      const existingHermesEv = await base44.entities.EvidenceItem.filter({ case_id: caseId, source: "hermes_extraction" }, "-created_date", 1).catch(() => []);
      if (existingHermesEv && existingHermesEv.length > 0) {
        const cSkip = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
        const wfSkip = cSkip?.workflow || workflowUpdate;
        const phSkip = { ...(wfSkip.phases || {}) };
        phSkip.dossier = { ...(phSkip.dossier || {}), status: "completed", completed_at: now, output: { ...(phSkip.dossier?.output || {}), results_persisted: true, skipped_duplicate: true } };
        await base44.entities.InvestigationCase.update(caseId, { workflow: { ...wfSkip, phases: phSkip }, sync_status: "synced", last_synced_at: now }).catch(() => null);
        return Response.json({
          ok: true, status: "ok", case_id: caseId, hermes_investigation_id: investigationId,
          hermes_status: hermesStatus, case_status: caseStatus || caseItem.status,
          phases, progress, terminal,
          persisted: { evidence: existingHermesEv.length, findings: 0, report_id: null, risk_score: wfSkip.risk_score, risk_level: wfSkip.risk_level, graph_nodes: 0, graph_edges: 0 },
          action: "already_persisted",
        });
      }

      // ── Fetch the three Hermes result endpoints. The base GET
      // /v1/investigations/{id} only carries lifecycle metadata; the actual
      // evidence, findings, and dossier/report live on separate sub-resources.
      // /report is the canonical, richest source (it embeds evidence[],
      // findings[], dossier{}, intelligence{entity_graph, risk}). /evidence and
      // /findings are fetched too for count cross-verification.
      const [reportRes, evidenceRes, findingsRes] = await Promise.all([
        base44.functions.invoke("hermesProxy", { action: "get_investigation_report", investigation_id: invId }).catch(() => null),
        base44.functions.invoke("hermesProxy", { action: "get_investigation_evidence", investigation_id: invId }).catch(() => null),
        base44.functions.invoke("hermesProxy", { action: "get_investigation_findings", investigation_id: invId }).catch(() => null),
      ]);
      const reportData = (reportRes?.data ?? reportRes)?.data;
      const standaloneEvidence = (evidenceRes?.data ?? evidenceRes)?.data;
      const standaloneFindings = (findingsRes?.data ?? findingsRes)?.data;
      if (!reportData) {
        // No report retrievable — record the gap truthfully without fabricating.
        await base44.entities.AuditEvent.create({
          tenant_id: tenantId, actor: user.email, actor_name: user.full_name || user.email,
          timestamp: now, action: "hermes_results_unavailable", object_type: "case",
          object_id: caseId, case_id: caseId,
          description: `Hermes investigation ${invId} completed but /report returned no data`,
          metadata: { investigation_id: invId }, source: "hermes",
        }).catch(() => null);
      } else {
        // Canonical arrays from /report (richest schema: confidence, provenance, metadata).
        const hermesEvidence = Array.isArray(reportData.evidence) ? reportData.evidence : [];
        const hermesFindings = Array.isArray(reportData.findings) ? reportData.findings : [];
        const dossier = reportData.dossier || reportData.intelligence?.dossier || {};
        const risk = dossier.risk || reportData.intelligence?.risk || {};
        const graph = reportData.intelligence?.entity_graph || dossier.graph || {};
        const graphNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const graphEdges = Array.isArray(graph.edges) ? graph.edges : [];

        // ── 1. Evidence → EvidenceItem. Capture hermes_evidence_id → SafeNestT id
        // so findings can link via evidence_refs (FindingsTab joins on
        // EvidenceItem.id, not the Hermes id).
        const evidencePayloads = hermesEvidence.map((e) => {
          const hermesEid = e.evidence_id;
          const toolCall = e.data?.tool_call || {};
          return {
            tenant_id: tenantId,
            case_id: caseId,
            filename: String(e.source || hermesEid).split(".").pop() || e.source || hermesEid,
            file_url: `hermes://evidence/${hermesEid}`,
            evidence_type: mapEvidenceType(e.source),
            source: "hermes_extraction",
            uploaded_by: user.email,
            uploaded_by_name: user.full_name || user.email,
            uploaded_at: e.observed_at || now,
            file_hash: hermesEid,
            description: `${e.source || "Hermes evidence"} · target: ${e.target || "—"}`,
            tags: [e.source_type, e.source].filter(Boolean),
            processing_status: "processed",
            processing_notes: JSON.stringify({ capability: toolCall.capability, status: toolCall.status, tool_status: toolCall.tool_status }).slice(0, 1000),
            detected_targets: e.target ? [{ type: "domain", value: e.target }] : [],
            original_import: false,
          };
        });
        const evidenceRecs = evidencePayloads.length
          ? await base44.entities.EvidenceItem.bulkCreate(evidencePayloads).catch(() => [])
          : [];
        const evidenceMap = {};
        for (const rec of evidenceRecs) {
          if (rec?.file_hash) evidenceMap[rec.file_hash] = rec.id;
        }
        persisted.evidence = evidenceRecs.length;

        // ── 2. Findings → InvestigationFinding (evidence_refs mapped to SafeNestT ids).
        const findingPayloads = hermesFindings.map((f) => {
          const payload = {
            tenant_id: tenantId,
            case_id: caseId,
            title: findingTitle(f),
            description: [f.factors?.finding_type, f.factors?.capability && `capability: ${f.factors.capability}`, f.factors?.limitations?.length && `limitations: ${f.factors.limitations.join("; ")}`].filter(Boolean).join(" · "),
            category: mapFindingCategory(f.factors?.finding_type),
            severity: severityFromScore(f.risk_score),
            confidence: confidenceFromReality(f.reality_status),
            status: "proposed", // AI findings are never auto-verified
            source: "hermes",
            evidence_refs: (f.evidence_ids || []).map((id) => evidenceMap[id]).filter(Boolean),
            hermes_raw: f,
          };
          // confidence_score is a number field — only set it when Hermes
          // provided a numeric risk_score (omit rather than pass null).
          if (typeof f.risk_score === "number") payload.confidence_score = Math.round(f.risk_score * 100);
          return payload;
        });
        const findingRecs = findingPayloads.length
          ? await base44.entities.InvestigationFinding.bulkCreate(findingPayloads).catch(() => [])
          : [];
        persisted.findings = findingRecs.length;

        // ── 3. Report / dossier → InvestigationReport.
        const reportRec = await base44.entities.InvestigationReport.create({
          tenant_id: tenantId,
          case_id: caseId,
          title: `Hermes Investigation Dossier — ${reportData.target || invId}`,
          report_type: "dossier",
          status: "generated",
          generated_by: "hermes",
          generated_date: reportData.intelligence?.generated_at || now,
          content: dossier,
          sections: [
            { title: "Executive Summary", classification: "analysis", content: dossier.executive_summary || "" },
            { title: "Risk Assessment", classification: "analysis", content: `Score: ${risk.score ?? "—"} · Level: ${risk.level ?? "—"} · Method: ${risk.method || "—"}` },
            { title: "Findings", classification: "evidence", content: `${hermesFindings.length} findings` },
            { title: "Evidence", classification: "evidence", content: `${hermesEvidence.length} evidence items` },
          ],
          evidence_register: hermesEvidence.map((e) => ({ evidence_id: e.evidence_id, filename: e.source, type: e.source_type, source: "hermes", timestamp: e.observed_at })),
          conclusion: dossier.executive_summary || "",
          recommended_actions: [],
          created_by: user.email,
        }).catch(() => null);
        persisted.report_id = reportRec?.id || null;

        // ── 4. Risk → case workflow.
        if (typeof risk.score === "number") {
          persisted.risk_score = risk.score;
          persisted.risk_level = String(risk.level || "").toLowerCase() || null;
        }

        // ── 5. Entity graph → GraphNode / GraphEdge.
        const nodePayloads = graphNodes.map((n) => ({
          tenant_id: tenantId, case_id: caseId,
          node_type: mapNodeType(n.type), label: n.label || n.id,
          value: n.id, source: "hermes_extraction", hermes_raw: n, confidence: "medium",
        }));
        const nodeRecs = nodePayloads.length ? await base44.entities.GraphNode.bulkCreate(nodePayloads).catch(() => []) : [];
        persisted.graph_nodes = nodeRecs.length;

        const edgePayloads = graphEdges.map((ed) => ({
          tenant_id: tenantId, case_id: caseId,
          source_node: ed.source, target_node: ed.target,
          relationship_type: mapRelationship(ed.relationship), label: ed.relationship,
          confidence: confidenceFrom01(ed.confidence), hermes_raw: ed,
          evidence_refs: (ed.evidence_ids || []).map((id) => evidenceMap[id]).filter(Boolean),
        }));
        const edgeRecs = edgePayloads.length ? await base44.entities.GraphEdge.bulkCreate(edgePayloads).catch(() => []) : [];
        persisted.graph_edges = edgeRecs.length;

        // ── Mark results persisted on the dossier phase output (idempotency marker)
        // AND write the risk score/level/factors onto the case workflow.
        const c2 = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
        const wf2 = c2?.workflow || workflowUpdate;
        const mergedPhases2 = { ...(wf2.phases || {}) };
        mergedPhases2.dossier = {
          ...(mergedPhases2.dossier || {}),
          status: "completed",
          completed_at: now,
          output: {
            results_persisted: true,
            evidence_count: persisted.evidence,
            findings_count: persisted.findings,
            report_id: persisted.report_id,
            risk_score: persisted.risk_score,
            graph_nodes: persisted.graph_nodes,
            graph_edges: persisted.graph_edges,
            hermes_evidence_count: reportData.evidence_count,
            hermes_finding_count: reportData.finding_count,
            standalone_evidence_count: Array.isArray(standaloneEvidence) ? standaloneEvidence.length : null,
            standalone_findings_count: Array.isArray(standaloneFindings) ? standaloneFindings.length : null,
          },
        };
        await base44.entities.InvestigationCase.update(caseId, {
          workflow: {
            ...wf2,
            phases: mergedPhases2,
            risk_score: persisted.risk_score,
            risk_level: persisted.risk_level,
            risk_factors: hermesFindings.map((f) => ({ factor: findingTitle(f), weight: f.risk_score != null ? Math.round(f.risk_score * 100) : 0 })),
          },
        }).catch(() => null);
      }

      // Mark the active InvestigationRun terminal.
      const runs = await base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 5).catch(() => []);
      const activeRun = (runs || []).find((r) => r.status === "running");
      if (activeRun) {
        await base44.entities.InvestigationRun.update(activeRun.id, {
          status: "completed",
          output: reportData ? { evidence_count: persisted.evidence, findings_count: persisted.findings, report_id: persisted.report_id } : statusData,
          completed_at: now,
          persisted_outputs: persisted,
        }).catch(() => null);
      }

      // Immutable audit trail.
      await base44.entities.AuditEvent.create({
        tenant_id: caseItem.tenant_id, actor: user.email, actor_name: user.full_name || user.email,
        timestamp: now,
        action: "hermes_investigation_completed",
        object_type: "case", object_id: caseId, case_id: caseId,
        description: `Hermes investigation ${investigationId} results persisted: ${persisted.evidence} evidence, ${persisted.findings} findings, report ${persisted.report_id ? "present" : "absent"}`,
        metadata: { investigation_id: investigationId, status: hermesStatus, persisted, hermes_evidence_count: reportData?.evidence_count, hermes_finding_count: reportData?.finding_count },
        source: "hermes",
      }).catch(() => null);
    } else if (terminal && isFailed && !wasTerminal) {
      // First time we see a FAILED investigation — mark the run failed + audit.
      const runs = await base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 5).catch(() => []);
      const activeRun = (runs || []).find((r) => r.status === "running");
      if (activeRun) {
        await base44.entities.InvestigationRun.update(activeRun.id, {
          status: "failed", error: statusData?.error || "Hermes investigation failed",
          completed_at: now, persisted_outputs: persisted,
        }).catch(() => null);
      }
      await base44.entities.AuditEvent.create({
        tenant_id: caseItem.tenant_id, actor: user.email, actor_name: user.full_name || user.email,
        timestamp: now, action: "hermes_investigation_failed", object_type: "case",
        object_id: caseId, case_id: caseId,
        description: `Hermes investigation ${investigationId} failed: ${statusData?.error || "unknown"}`,
        metadata: { investigation_id: investigationId, status: hermesStatus, error: statusData?.error },
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