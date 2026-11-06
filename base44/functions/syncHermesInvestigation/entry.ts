import { createClientFromRequest } from "npm:@base44/sdk@0.8.51";
import { summarizeToolResult, canonicalJson, sha256Hex } from "../../shared/toolResult.ts";

/**
 * syncHermesInvestigation — server-side single sync step for a Hermes
 * investigation linked to a SafeNestT case. See repo docs for the full
 * lifecycle contract. Nothing is fabricated: if Hermes returns no findings,
 * none are created.
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
  const s = String(status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  return [
    "completed", "done", "complete", "success", "succeeded", "finished", "ok",
    "completed_with_errors", "completed_with_warnings", "completed_with_failures",
    "partial_success", "partially_completed", "partial_failure", "partially_failed",
    "failed", "error", "errored", "failed_with_results", "cancelled", "canceled",
    "aborted", "expired", "timeout", "timed_out",
  ].includes(s);
}

function isFailedStatus(status) {
  const s = String(status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  return [
    "failed", "error", "errored", "cancelled", "canceled",
    "aborted", "expired", "timeout", "timed_out",
  ].includes(s);
}

function isPartialStatus(status) {
  const s = String(status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  return [
    "failed_with_results", "completed_with_errors", "completed_with_warnings",
    "completed_with_failures", "partial_success", "partially_completed",
    "partial_failure", "partially_failed",
  ].includes(s);
}

// A successful HTTP/tool invocation is not the same as source-backed evidence;
// the gates below decide whether a run may be marked complete.
function hasSourceBackedEvidence(reportData) {
  const metadataKeys = new Set(["domain", "target", "source", "query", "status"]);
  function hasSubstantiveValue(value, key = "") {
    if (metadataKeys.has(String(key).toLowerCase())) return false;
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.some((item) => hasSubstantiveValue(item));
    if (typeof value === "object") {
      return Object.entries(value).some(([childKey, childValue]) => hasSubstantiveValue(childValue, childKey));
    }
    return false;
  }

  const evidence = Array.isArray(reportData?.evidence) ? reportData.evidence : [];
  return evidence.some((item) => {
    const call = item?.data?.tool_call;
    const result = call?.result;
    const payload = result?.data ?? item?.data?.data;
    if (!call || !["success", "ok"].includes(String(call.status || "").toLowerCase())) return false;
    if (!payload || typeof payload !== "object") return false;
    return hasSubstantiveValue(payload);
  });
}

function hasPersistedResults(persisted) {
  return Number(persisted?.evidence) > 0 && typeof persisted?.report_id === "string" && persisted.report_id.trim().length > 0;
}

function persistedRunStatus(sourceBacked, persisted) {
  return sourceBacked && hasPersistedResults(persisted) ? "completed" : "failed";
}

// Build clean, de-duplicated risk factors from Hermes findings. Drops findings
// whose lookups returned nothing (e.g. a crypto trace run against no wallet,
// reported upstream as "for None"), strips markdown, and caps length so a
// whole synthesis document can never be stored as a single risk factor.
function buildRiskFactors(findings, titleOf) {
  const seen = new Set();
  const out = [];
  for (const f of Array.isArray(findings) ? findings : []) {
    const raw = String(titleOf(f) || "");
    if (/\b(for|on) None\b/.test(raw) || /returned no data|trace failed/i.test(raw)) continue;
    let text = raw.replace(/[#*`>_]+/g, " ").replace(/\s+/g, " ").trim();
    if (!text) continue;
    if (text.length > 160) text = text.slice(0, 157).trimEnd() + "…";
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ factor: text, weight: f?.risk_score != null ? Math.round(f.risk_score * 100) : 0 });
  }
  return out;
}

function extractStatus(data) {
  return String(data?.status || data?.state || "pending").toLowerCase();
}

const RESULT_JSON_CAP = 20000;

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
  return "medium";
}

// Guard against a raw model chain-of-thought (or any oversized blob) leaking
// into a finding title. A title must read as a title — never a reasoning dump.
function cleanFindingTitle(raw, f) {
  const s = String(raw || "").trim();
  const looksLikeReasoning =
    s.length > 300 ||
    /\bthinking process\b/i.test(s) ||
    /^here'?s (a|my) (thinking|reasoning|thought)/i.test(s) ||
    /\blet me (think|analyze|count|break|start)\b/i.test(s) ||
    /(^|\n)\s*\d+\.\s/.test(s) ||
    /\*\*(analyze|synthesize|draft|key)/i.test(s);
  if (looksLikeReasoning) {
    const ft = f?.factors?.finding_type || f?.finding_type;
    return ft ? `Hermes finding: ${String(ft).toLowerCase().replace(/_/g, " ")} (review required)` : "Hermes finding (review required)";
  }
  return s.length > 180 ? s.slice(0, 177) + "…" : (s || (f?.finding_id || "Hermes finding"));
}

function findingTitle(f) {
  const c = f?.claim;
  let raw = "";
  if (typeof c === "string" && c.trim()) raw = c;
  else if (c && typeof c === "object") {
    raw = c.investigation_synthesis || c.summary || c.title || c.conclusion || "";
  }
  return cleanFindingTitle(raw || f?.finding_id || "Hermes finding", f);
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
    let caseId = payload?.case_id;
    if (!caseId) return Response.json({ ok: false, status: "bad_request", error: "case_id is required" });

    const resolveRes = await base44.functions.invoke("resolveInvestigationCase", { case_id: caseId });
    const resolveBody = resolveRes?.data ?? resolveRes;
    if (!resolveBody || resolveBody.ok === false) {
      return Response.json({
        ok: false,
        status: resolveBody?.status || "not_found",
        error: resolveBody?.error || "Case not found or no access",
        case_id: caseId,
      });
    }
    caseId = resolveBody.case_id;
    let caseItem = resolveBody.case || await base44.entities.InvestigationCase.get(caseId).catch(() => null);
    if (!caseItem) return Response.json({ ok: false, status: "not_found", error: "Case not found or no access", case_id: caseId });

    if (String(caseItem.workflow?.provider || "") === "mia") {
      return Response.json({
        ok: false,
        status: "wrong_provider",
        provider: "mia",
        case_id: caseId,
        error: "This case is investigated by MIA Multi-Agent; Hermes sync is disabled for it.",
      });
    }

    let investigationId = caseItem.workflow?.hermes_investigation_id || payload?.investigation_id;
    if (!investigationId) {
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

    const proxyRes = await base44.functions.invoke("hermesProxy", { action: "get_investigation", investigation_id: investigationId });
    const proxyBody = proxyRes && proxyRes.data ? proxyRes.data : proxyRes;
    if (!proxyBody || proxyBody.ok === false) {
      const failedStatus = proxyBody?.status || "error";
      if (failedStatus === "not_found") {
        const wf = caseItem.workflow || {};
        await base44.entities.InvestigationCase.update(caseId, {
          sync_status: "failed",
          last_synced_at: new Date().toISOString(),
          workflow: {
            ...wf,
            hermes_investigation_id: null,
            hermes_status: "not_found",
            hermes_error: "Hermes no longer recognises the stored investigation id (404 investigation_not_found). The mapping was cleared; run the investigation again to create a new one.",
          },
        }).catch(() => null);
        return Response.json({
          ok: false,
          status: "not_found",
          action: "stale_mapping_cleared",
          case_id: caseId,
          hermes_investigation_id: investigationId,
          error: "Hermes investigation not found; stale mapping cleared.",
        });
      }

      return Response.json({
        ok: false,
        status: failedStatus,
        error: proxyBody?.error || "Hermes status fetch failed",
        upstream_status: proxyBody?.upstream_status,
        correlation_id: proxyBody?.correlation_id,
      });
    }
    const statusData = proxyBody.data || {};

    const hermesStatus = extractStatus(statusData);
    const phaseStatuses = extractPhaseStatuses(statusData);
    const isFailed = isFailedStatus(hermesStatus);
    const isPartial = isPartialStatus(hermesStatus);
    const phases = {};
    for (const p of CANONICAL_PHASES) {
      phases[p] = phaseStatuses[p] || (p === "planning" ? "running" : "pending");
    }
    const terminal = isTerminal(hermesStatus);
    console.log(`[hermes-sync] case=${caseId} hermes_status=${hermesStatus} terminal=${terminal}`);
    if (terminal && isFailed) {
      const inflight = CANONICAL_PHASES.find((p) => phases[p] === "running") || "planning";
      phases[inflight] = "failed";
    }

    const prevStatus = caseItem.workflow?.hermes_status;
    const wasTerminal = prevStatus && isTerminal(prevStatus);

    const wf = caseItem.workflow || { current_phase: "planning", phases: {} };

    // Idempotency guard: once this Hermes investigation's results are persisted
    // and the case is finalized, a later sync (page reload, cron, resume) must
    // NOT rewrite the workflow. Hermes does not return per-phase detail, so the
    // defaults below (planning=running, others=pending) would clobber a closed
    // case back to "investigating". Only refresh the sync timestamp.
    const alreadyFinalized = !!wf.phases?.dossier?.output?.results_persisted
      && wf.hermes_investigation_id === investigationId
      && terminal && !isFailed;
    if (alreadyFinalized) {
      await base44.entities.InvestigationCase.update(caseId, { last_synced_at: new Date().toISOString() }).catch(() => null);
      const finalPhases = {};
      for (const p of CANONICAL_PHASES) finalPhases[p] = wf.phases?.[p]?.status || "completed";
      return Response.json({
        ok: true, status: "ok", case_id: caseId, hermes_investigation_id: investigationId,
        hermes_status: hermesStatus, case_status: caseItem.status, phases: finalPhases,
        progress: caseItem.investigation_progress ?? 100, terminal: true,
        persisted: { ...(wf.phases.dossier.output || {}) }, action: "already_finalized",
      });
    }

    // Hermes reports no per-phase detail for finished runs; don't fabricate a
    // "planning still running" state for a terminal, non-failed investigation.
    if (terminal && !isFailed && Object.keys(phaseStatuses).length === 0) {
      for (const p of CANONICAL_PHASES) phases[p] = p === "dossier" ? "pending" : "completed";
    }
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
    if (terminal && !isFailed) {
      currentPhase = "evidence";
      caseStatus = "investigating";
    } else if (hermesStatus === "queued" || hermesStatus === "queue" || hermesStatus === "pending" || hermesStatus === "waiting" || hermesStatus === "not_started") {
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
      sync_status: terminal ? (isFailed || isPartial ? "failed" : "synced") : "active",
      ...(caseStatus ? { status: caseStatus } : {}),
    };
    await base44.entities.InvestigationCase.update(caseId, updatePatch).catch(() => null);

    const persisted = { evidence: 0, findings: 0, report_id: null, risk_score: null, risk_level: null, graph_nodes: 0, graph_edges: 0, partial: false, hermes_status: hermesStatus };

    const resultsAlreadyPersisted = !!(wf.phases?.dossier?.output?.results_persisted);

    if (terminal && !resultsAlreadyPersisted && !isFailed) {
      const tenantId = caseItem.tenant_id;
      const invId = investigationId;

      const [reportRes, evidenceRes, findingsRes] = await Promise.all([
        base44.functions.invoke("hermesProxy", { action: "get_investigation_report", investigation_id: invId }).catch(() => null),
        base44.functions.invoke("hermesProxy", { action: "get_investigation_evidence", investigation_id: invId }).catch(() => null),
        base44.functions.invoke("hermesProxy", { action: "get_investigation_findings", investigation_id: invId }).catch(() => null),
      ]);
      const reportData = (reportRes?.data ?? reportRes)?.data;
      const standaloneEvidence = (evidenceRes?.data ?? evidenceRes)?.data;
      const standaloneFindings = (findingsRes?.data ?? findingsRes)?.data;
      const sourceBacked = !!reportData && hasSourceBackedEvidence(reportData);
      if (!sourceBacked) {
        const latestCase = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
        const latestWorkflow = latestCase?.workflow || workflowUpdate;
        const latestPhases = { ...(latestWorkflow.phases || {}) };
        latestPhases.evidence = { ...(latestPhases.evidence || {}), status: "failed" };
        latestPhases.dossier = { ...(latestPhases.dossier || {}), status: "blocked", output: { results_persisted: false, reason: !reportData ? "Hermes report unavailable" : "No source-backed evidence returned" } };
        await base44.entities.InvestigationCase.update(caseId, {
          status: "investigating",
          sync_status: "failed",
          investigation_progress: Math.round((CANONICAL_PHASES.filter((p) => latestPhases[p]?.status === "completed").length / CANONICAL_PHASES.length) * 100),
          workflow: { ...latestWorkflow, current_phase: "evidence", phases: latestPhases, hermes_error: !reportData ? "Hermes report unavailable; results were not marked complete." : "No source-backed evidence returned; results were not marked complete." },
        }).catch(() => null);
        await base44.entities.AuditEvent.create({
          tenant_id: tenantId, actor: user.email, actor_name: user.full_name || user.email,
          timestamp: now, action: "hermes_results_unavailable", object_type: "case",
          object_id: caseId, case_id: caseId,
          description: !reportData
            ? `Hermes investigation ${invId} returned no report; case left incomplete`
            : `Hermes investigation ${invId} returned no source-backed evidence; case left incomplete`,
          metadata: { investigation_id: invId, report_available: !!reportData, source_backed_evidence: false }, source: "hermes",
        }).catch(() => null);
      } else {
        const hermesEvidence = Array.isArray(reportData.evidence) ? reportData.evidence : [];
        const hermesFindings = Array.isArray(reportData.findings) ? reportData.findings : [];
        const dossier = reportData.dossier || reportData.intelligence?.dossier || {};
        const risk = dossier.risk || reportData.intelligence?.risk || {};
        const graph = reportData.intelligence?.entity_graph || dossier.graph || {};
        const graphNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const graphEdges = Array.isArray(graph.edges) ? graph.edges : [];

        const evidencePayloads = await Promise.all(hermesEvidence.map(async (e) => {
          const hermesEid = e.evidence_id;
          const toolCall = e.data?.tool_call || {};
          const rawData = toolCall.result?.data !== undefined ? toolCall.result.data : e.data?.data;
          const verdict = summarizeToolResult({ capability: toolCall.capability || e.source, target: e.target, status: toolCall.status, data: rawData });
          const canon = rawData === undefined ? "" : canonicalJson(rawData);
          const toolResult = {
            capability: String(toolCall.capability || e.source || ""),
            target: String(e.target || ""),
            target_kind: verdict.target_kind,
            status: String(toolCall.status || ""),
            state: verdict.state,
            summary: verdict.summary,
            record_count: verdict.record_count,
            retrieved_at: e.observed_at || now,
            data_json: canon.slice(0, RESULT_JSON_CAP),
            data_sha256: canon ? await sha256Hex(canon) : "",
            data_bytes: canon.length,
            truncated: canon.length > RESULT_JSON_CAP,
            source_reference: String(hermesEid || ""),
          };
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
            processing_status: verdict.state === "data" ? "processed" : verdict.state === "error" ? "failed" : "review_required",
            processing_notes: JSON.stringify({ capability: toolCall.capability, status: toolCall.status, tool_status: toolCall.tool_status, result_state: verdict.state }).slice(0, 1000),
            detected_targets: e.target ? [{ type: verdict.target_kind || "other", value: e.target }] : [],
            original_import: false,
            tool_result: toolResult,
          };
        }));
        const evidenceHasData: Record<string, boolean> = {};
        for (const p of evidencePayloads) evidenceHasData[p.file_hash] = p.tool_result.state === "data";
        const evidenceRecs = evidencePayloads.length
          ? await base44.entities.EvidenceItem.bulkCreate(evidencePayloads).catch(() => [])
          : [];
        const evidenceMap = {};
        for (const rec of evidenceRecs) {
          if (rec?.file_hash) evidenceMap[rec.file_hash] = rec.id;
        }
        persisted.evidence = evidenceRecs.length;

        const findingPayloads = hermesFindings.map((f) => {
          const eids: string[] = Array.isArray(f.evidence_ids) ? f.evidence_ids : [];
          const noData = eids.length > 0 && eids.every((id) => id in evidenceHasData && !evidenceHasData[id]);
          const limitations = [...(f.factors?.limitations || []), ...(noData ? ["Every lookup cited for this finding returned no records or did not apply to the indicator."] : [])];
          const payload = {
            tenant_id: tenantId,
            case_id: caseId,
            title: findingTitle(f),
            description: [f.factors?.finding_type, f.factors?.capability && `capability: ${f.factors.capability}`, limitations.length && `limitations: ${limitations.join("; ")}`].filter(Boolean).join(" · "),
            category: mapFindingCategory(f.factors?.finding_type),
            severity: noData ? "low" : severityFromScore(f.risk_score),
            confidence: noData ? "low" : confidenceFromReality(f.reality_status),
            status: "proposed",
            source: "hermes",
            evidence_refs: (f.evidence_ids || []).map((id) => evidenceMap[id]).filter(Boolean),
            hermes_raw: f,
          };
          if (typeof f.risk_score === "number" && !noData) payload.confidence_score = Math.round(f.risk_score * 100);
          return payload;
        });
        const findingRecs = findingPayloads.length
          ? await base44.entities.InvestigationFinding.bulkCreate(findingPayloads).catch(() => [])
          : [];
        persisted.findings = findingRecs.length;

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

        if (typeof risk.score === "number") {
          persisted.risk_score = risk.score;
          persisted.risk_level = String(risk.level || "").toLowerCase() || null;
        }

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

        const persistenceSucceeded = hasPersistedResults(persisted);

        if (persistenceSucceeded) {
        const c2 = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
        const wf2 = c2?.workflow || workflowUpdate;
        const mergedPhases2 = { ...(wf2.phases || {}) };
        mergedPhases2.evidence = {
          ...(mergedPhases2.evidence || {}),
          status: "completed",
          completed_at: mergedPhases2.evidence?.completed_at || now,
        };
        mergedPhases2.dossier = {
          ...(mergedPhases2.dossier || {}),
          status: "completed",
          completed_at: now,
          output: {
            results_persisted: true,
            partial: isPartial,
            hermes_status: hermesStatus,
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

        if (isPartial) {
          const partialProgress = Math.round(
            (CANONICAL_PHASES.filter((phase) => mergedPhases2[phase]?.status === "completed").length /
              CANONICAL_PHASES.length) * 100,
          );
          await base44.entities.InvestigationCase.update(caseId, {
            status: "investigating",
            sync_status: "synced",
            investigation_progress: partialProgress,
            workflow: {
              ...wf2,
              current_phase: "analysis",
              phases: mergedPhases2,
              hermes_status: hermesStatus,
              hermes_error: statusData?.error || `Hermes returned partial results (${hermesStatus}); saved results require investigator review.`,
              risk_score: persisted.risk_score,
              risk_level: persisted.risk_level,
              risk_factors: buildRiskFactors(hermesFindings, findingTitle),
            },
          }).catch(() => null);
        } else {
          const completedPhases = { ...mergedPhases2 };
          for (const phase of CANONICAL_PHASES) {
            completedPhases[phase] = {
              ...(completedPhases[phase] || {}),
              status: "completed",
              completed_at: completedPhases[phase]?.completed_at || now,
            };
          }
          await base44.entities.InvestigationCase.update(caseId, {
            status: "closed",
            sync_status: "synced",
            investigation_progress: 100,
            workflow: {
              ...wf2,
              current_phase: "closed",
              phases: completedPhases,
              hermes_error: null,
              risk_score: persisted.risk_score,
              risk_level: persisted.risk_level,
              risk_factors: buildRiskFactors(hermesFindings, findingTitle),
            },
          }).catch(() => null);
        }
        } else {
          const latestCase = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
          const latestWorkflow = latestCase?.workflow || workflowUpdate;
          const latestPhases = { ...(latestWorkflow.phases || {}) };
          latestPhases.evidence = { ...(latestPhases.evidence || {}), status: "failed" };
          latestPhases.dossier = {
            ...(latestPhases.dossier || {}),
            status: "blocked",
            output: { results_persisted: false, reason: "SafeNestT report/evidence persistence incomplete", persisted },
          };
          await base44.entities.InvestigationCase.update(caseId, {
            status: "investigating",
            sync_status: "failed",
            workflow: {
              ...latestWorkflow,
              current_phase: "evidence",
              phases: latestPhases,
              hermes_error: "Hermes returned source-backed evidence, but SafeNestT could not persist the report and evidence records.",
            },
          }).catch(() => null);
        }
      }

      const runs = await base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 5).catch(() => []);
      const activeRun = (runs || []).find((r) => r.status === "running");
      if (activeRun) {
        const runStatus = persistedRunStatus(sourceBacked, persisted);
        const partialPersisted = runStatus === "completed" && isPartial;
        persisted.partial = partialPersisted;
        persisted.hermes_status = hermesStatus;
        await base44.entities.InvestigationRun.update(activeRun.id, {
          status: runStatus,
          error: partialPersisted
            ? `Hermes returned partial results (${hermesStatus}); saved outputs require investigator review.`
            : (runStatus === "completed" ? undefined : "Source-backed evidence or SafeNestT result persistence is incomplete; run cannot be marked complete."),
          output: reportData ? { evidence_count: persisted.evidence, findings_count: persisted.findings, report_id: persisted.report_id } : statusData,
          completed_at: now,
          persisted_outputs: persisted,
        }).catch(() => null);
      }

      await base44.entities.AuditEvent.create({
        tenant_id: caseItem.tenant_id, actor: user.email, actor_name: user.full_name || user.email,
        timestamp: now,
        action: reportData && hasSourceBackedEvidence(reportData) && hasPersistedResults(persisted)
          ? (isPartial ? "hermes_investigation_partial" : "hermes_investigation_completed")
          : "hermes_investigation_failed",
        object_type: "case", object_id: caseId, case_id: caseId,
        description: reportData && hasSourceBackedEvidence(reportData) && hasPersistedResults(persisted)
          ? (isPartial
            ? `Hermes investigation ${investigationId} returned partial results: ${persisted.evidence} evidence, ${persisted.findings} findings, report saved; investigator review required`
            : `Hermes investigation ${investigationId} results persisted: ${persisted.evidence} evidence, ${persisted.findings} findings, report present`)
          : `Hermes investigation ${investigationId} did not fully persist source-backed results; SafeNestT left the case incomplete`,
        metadata: { investigation_id: investigationId, status: hermesStatus, persisted, source_backed_evidence: !!reportData && hasSourceBackedEvidence(reportData), persistence_succeeded: hasPersistedResults(persisted), hermes_evidence_count: reportData?.evidence_count, hermes_finding_count: reportData?.finding_count },
        source: "hermes",
      }).catch(() => null);
    } else if (terminal && isFailed) {
      const runs = await base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 10).catch(() => []);
      const activeRun = (runs || []).find((r) => r.status === "running");
      if (activeRun) {
        await base44.entities.InvestigationRun.update(activeRun.id, {
          status: "failed",
          error: statusData?.error || `Hermes reached terminal status: ${hermesStatus}`,
          completed_at: now,
          persisted_outputs: persisted,
        }).catch(() => null);
      }
      if (!wasTerminal) {
        await base44.entities.AuditEvent.create({
          tenant_id: caseItem.tenant_id, actor: user.email, actor_name: user.full_name || user.email,
          timestamp: now, action: "hermes_investigation_failed", object_type: "case",
          object_id: caseId, case_id: caseId,
          description: `Hermes investigation ${investigationId} ended with status ${hermesStatus}: ${statusData?.error || "no error details returned"}`,
          metadata: { investigation_id: investigationId, status: hermesStatus, error: statusData?.error },
          source: "hermes",
        }).catch(() => null);
      }
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
