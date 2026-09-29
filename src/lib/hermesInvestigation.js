import { base44 } from "@/api/base44Client";
import { ensureTenant, getCurrentUser } from "@/lib/tenantContext";
import { logAuditEvent } from "@/lib/auditLogger";
import { PHASES } from "@/lib/investigationRunner";

/**
 * Hermes investigation lifecycle client — real pipeline only.
 *
 * Flow:  POST /v1/investigations  →  POST /v1/investigations/{id}/start
 *        →  poll GET /v1/investigations/{id}  until terminal status.
 *
 * All HTTP goes through the `hermesProxy` backend function (server-side
 * HERMES_BASE_URL + X-API-Key). The browser never sees the gateway URL or the
 * key. The six-phase UI is driven from the real Hermes status response, never
 * simulated. Returned investigation id/status/findings/risk/report are
 * persisted into the existing SafeNestT investigation entities.
 */

export class HermesError extends Error {
  constructor(status, message, upstreamStatus) {
    super(message || status || "Hermes error");
    this.name = "HermesError";
    this.hermesStatus = status || "error";
    this.upstreamStatus = upstreamStatus;
  }
}

// Map Hermes phase names → our six canonical phases.
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
  for (const [phase, aliases] of Object.entries(PHASE_ALIASES)) {
    if (aliases.includes(n)) return phase;
  }
  return null;
}

function normalizeStatus(st) {
  const s = String(st || "pending").toLowerCase();
  if (["completed", "done", "complete", "success", "succeeded", "finished", "ok"].includes(s)) return "completed";
  if (["running", "in_progress", "inprogress", "active", "processing", "started", "working"].includes(s)) return "running";
  if (["failed", "error", "errored", "failed_"].includes(s)) return "failed";
  if (["pending", "queued", "waiting", "not_started", "notstarted", "idle", "new"].includes(s)) return "pending";
  return "pending";
}

function isTerminal(status) {
  const s = String(status || "").toLowerCase();
  return ["completed", "done", "complete", "success", "succeeded", "finished", "failed", "error", "cancelled", "canceled", "aborted"].includes(s);
}

function extractInvestigationId(data) {
  if (!data) return null;
  return data.investigation_id || data.investigationId || data.id || data.investigation?.id || null;
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

async function proxyInvoke(payload) {
  const res = await base44.functions.invoke("hermesProxy", payload);
  return res?.data ?? res;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function gatherContext(caseId) {
  const [evidence, targets, findings] = await Promise.all([
    base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
    base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
    base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
  ]);
  return { evidence, targets, findings };
}

// ── Public low-level calls ────────────────────────────────────────────────
export async function createHermesInvestigation(caseItem, ctx) {
  // Hermes requires a SINGULAR primary `target` and an `investigation_type`
  // field. The gateway rejects requests that only send the plural `targets`
  // (HTTP 422 "Field required" for body.target / body.investigation_type).
  // Derive the primary target from the first explicit target, then fall back
  // to a scammer wallet or a transaction hash recorded on the case.
  const targetObjs = (ctx.targets || []).map((t) => ({ type: t.type, value: t.value, network: t.network, label: t.label }));
  const primaryTarget =
    targetObjs[0] ||
    (caseItem.scammer_info?.wallet_addresses?.[0]
      ? { type: "wallet_address", value: caseItem.scammer_info.wallet_addresses[0] }
      : null) ||
    (Array.isArray(caseItem.transaction_hashes) && caseItem.transaction_hashes[0]
      ? { type: "transaction_hash", value: caseItem.transaction_hashes[0] }
      : null);

  if (!primaryTarget) {
    throw new HermesError(
      "no_target",
      "Cannot start a Hermes investigation without at least one target. Add a wallet address, transaction hash, domain, or other target to the case first."
    );
  }

  const body = {
    case_id: caseItem.id,
    case_title: caseItem.case_title || caseItem.client_name || "Investigation",
    investigation_type: caseItem.fraud_type || "other",
    fraud_type: caseItem.fraud_type,
    target: primaryTarget,
    targets: targetObjs,
    victim_name: caseItem.victim_name,
    amount_stolen_usd: caseItem.amount_stolen_usd,
    description: caseItem.description,
    incident_date: caseItem.incident_date,
    suspect_details: caseItem.suspect_details,
    scammer_info: caseItem.scammer_info,
    evidence: (ctx.evidence || []).map((e) => ({ filename: e.filename, type: e.evidence_type, description: e.description })),
    phases: PHASES.map((p) => p.id),
  };
  const resp = await proxyInvoke({ action: "create_investigation", body });
  if (!resp || resp.ok === false) {
    throw new HermesError(resp?.status || "error", resp?.error || "Failed to create Hermes investigation", resp?.upstream_status);
  }
  const data = resp.data || {};
  const investigationId = extractInvestigationId(data) || extractInvestigationId(resp);
  if (!investigationId) {
    throw new HermesError("no_investigation_id", "Hermes accepted the request but did not return an investigation_id.", resp?.upstream_status);
  }
  return { investigation_id: investigationId, status: extractStatus(data), raw: data };
}

export async function startHermesInvestigation(investigationId) {
  const resp = await proxyInvoke({ action: "start_investigation", investigation_id: investigationId, body: {} });
  if (!resp || resp.ok === false) {
    throw new HermesError(resp?.status || "error", resp?.error || "Failed to start Hermes investigation", resp?.upstream_status);
  }
  return resp.data || {};
}

export async function getHermesInvestigationStatus(investigationId) {
  const resp = await proxyInvoke({ action: "get_investigation", investigation_id: investigationId });
  if (!resp || resp.ok === false) {
    throw new HermesError(resp?.status || "error", resp?.error || "Failed to fetch Hermes investigation status", resp?.upstream_status);
  }
  return resp.data || {};
}

// ── Persistence helpers ──────────────────────────────────────────────────
async function persistPhaseProgress(caseId, phaseStatuses, overall, investigationId) {
  const c = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
  const wf = c?.workflow || { current_phase: "planning", phases: {} };
  const phases = { ...(wf.phases || {}) };
  for (const p of PHASES) {
    const st = phaseStatuses[p.id];
    if (!st) continue;
    phases[p.id] = { ...(phases[p.id] || {}), status: st };
  }
  const order = PHASES.map((p) => p.id);
  const completedCount = order.filter((p) => phases[p]?.status === "completed").length;
  const progress = Math.round((completedCount / order.length) * 100);
  const runningPhase = order.find((p) => phases[p]?.status === "running");
  let currentPhase = runningPhase || wf.current_phase || "planning";
  let caseStatus;
  if (overall === "completed" || overall === "done" || overall === "success" || overall === "finished") {
    currentPhase = "closed";
    caseStatus = "closed";
  } else if (overall === "failed" || overall === "error") {
    caseStatus = "investigating";
  } else {
    caseStatus = "investigating";
  }
  const update = {
    workflow: { ...wf, phases, current_phase: currentPhase, hermes_investigation_id: investigationId },
    investigation_progress: progress,
    last_activity: new Date().toISOString(),
  };
  if (caseStatus) update.status = caseStatus;
  await base44.entities.InvestigationCase.update(caseId, update);
}

async function persistHermesResults({ caseId, tenantId, runId, user, statusData }) {
  const result = {};

  // Findings
  const findings = statusData?.findings || statusData?.results?.findings || [];
  if (Array.isArray(findings) && findings.length) {
    const created = [];
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
        generating_run_id: runId,
      }).catch(() => null);
      if (rec) created.push(rec.id);
    }
    result.finding_ids = created;
  }

  // Risk
  const risk = statusData?.risk || statusData?.risk_assessment || statusData?.results?.risk;
  if (risk && typeof (risk.risk_score ?? risk.score) === "number") {
    const c = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
    const wf = c?.workflow || {};
    await base44.entities.InvestigationCase.update(caseId, {
      workflow: { ...wf, risk_score: risk.risk_score ?? risk.score, risk_level: risk.risk_level || risk.level, risk_factors: risk.risk_factors || risk.factors },
    }).catch(() => {});
    result.risk_score = risk.risk_score ?? risk.score;
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
      generated_date: new Date().toISOString(),
      content: report,
      sections: report.sections,
      conclusion: report.conclusion,
      recommended_actions: report.recommended_actions,
      created_by: user.email,
      generating_run_id: runId,
    }).catch(() => null);
    if (rec) result.report_id = rec.id;
  }

  return result;
}

/**
 * Execute the real Hermes investigation pipeline for a case.
 *
 * @param {object} opts
 * @param {string} opts.caseId
 * @param {object} opts.caseItem     - the case record (for create payload + workflow)
 * @param {(phases, overall, raw) => void} [opts.onProgress] - live phase updates
 * @param {() => boolean} [opts.shouldStop] - abort signal (true stops polling)
 * @param {number} [opts.pollIntervalMs]
 * @param {number} [opts.maxPollMs]
 * @returns {Promise<{status, investigation_id, phases, output, persisted}>}
 */
export async function runHermesInvestigation({
  caseId,
  caseItem,
  onProgress,
  shouldStop,
  pollIntervalMs = 3000,
  maxPollMs = 300000,
}) {
  const tenantId = await ensureTenant();
  const user = await getCurrentUser();
  const ctx = await gatherContext(caseId);

  // Auditable run record — tracks the real Hermes lifecycle.
  const run = await base44.entities.InvestigationRun.create({
    tenant_id: tenantId,
    case_id: caseId,
    phase: "planning",
    provider: "hermes",
    model: "hermes-agent",
    status: "running",
    prompt: "Hermes investigation lifecycle: create → start → poll /v1/investigations",
    input_summary: {
      evidence_count: ctx.evidence.length,
      target_count: ctx.targets.length,
      finding_count: ctx.findings.length,
    },
    started_at: new Date().toISOString(),
    run_by: user.id,
    run_by_email: user.email,
  }).catch(() => null);

  const emit = (phases, overall, raw) => {
    if (onProgress) {
      try { onProgress(phases, overall, raw); } catch { /* listener error is non-fatal */ }
    }
  };

  // 1. Create + start.
  let investigationId;
  try {
    const created = await createHermesInvestigation(caseItem, ctx);
    investigationId = created.investigation_id;
    await base44.entities.InvestigationCase.update(caseId, {
      workflow: { ...(caseItem?.workflow || {}), hermes_investigation_id: investigationId, current_phase: "planning" },
      last_activity: new Date().toISOString(),
    }).catch(() => {});

    // Initial progress: planning running.
    const initial = {};
    for (const p of PHASES) initial[p.id] = p.id === "planning" ? "running" : "pending";
    emit(initial, "running", created.raw);

    await startHermesInvestigation(investigationId);
  } catch (e) {
    if (run) {
      await base44.entities.InvestigationRun.update(run.id, {
        status: "failed",
        error: String(e?.message || e),
        completed_at: new Date().toISOString(),
      }).catch(() => {});
    }
    await logAuditEvent({
      action: "hermes_investigation_failed",
      objectType: "case",
      objectId: caseId,
      caseId,
      description: `Hermes investigation failed to start: ${e?.message || e}`,
      metadata: { hermes_status: e?.hermesStatus, upstream_status: e?.upstreamStatus },
    }).catch(() => {});
    throw e;
  }

  // 2. Poll the real status endpoint.
  const startedAt = Date.now();
  let last = { investigation_id: investigationId, status: "running", phases: {}, raw: {} };
  let consecutivePollErrors = 0;

  while (true) {
    if (shouldStop && shouldStop()) break;
    if (Date.now() - startedAt > maxPollMs) {
      throw new HermesError("timeout", `Hermes investigation polling timed out after ${Math.round(maxPollMs / 1000)}s`);
    }

    let statusData;
    try {
      statusData = await getHermesInvestigationStatus(investigationId);
      consecutivePollErrors = 0;
    } catch (e) {
      consecutivePollErrors += 1;
      // Surface transient poll failures but keep polling (up to a limit).
      if (consecutivePollErrors >= 5) {
        throw new HermesError(e?.hermesStatus || "poll_failed", `Hermes status polling repeatedly failed: ${e?.message || e}`, e?.upstreamStatus);
      }
      await sleep(pollIntervalMs);
      continue;
    }

    const phaseStatuses = extractPhaseStatuses(statusData);
    const overall = extractStatus(statusData);
    const merged = {};
    for (const p of PHASES) merged[p.id] = phaseStatuses[p.id] || (p.id === "planning" ? "running" : "pending");
    last = { investigation_id: investigationId, status: overall, phases: merged, raw: statusData };

    emit(merged, overall, statusData);
    await persistPhaseProgress(caseId, merged, overall, investigationId).catch(() => {});

    if (isTerminal(overall)) break;
    await sleep(pollIntervalMs);
  }

  // 3. Persist final results returned by Hermes.
  const persisted = await persistHermesResults({ caseId, tenantId, runId: run?.id, user, statusData: last.raw }).catch(() => ({}));
  const finalStatus = last.status === "failed" || last.status === "error" ? "failed" : "completed";

  if (run) {
    await base44.entities.InvestigationRun.update(run.id, {
      status: finalStatus,
      output: last.raw,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt,
      persisted_outputs: persisted,
    }).catch(() => {});
  }

  await logAuditEvent({
    action: finalStatus === "completed" ? "hermes_investigation_completed" : "hermes_investigation_failed",
    objectType: "case",
    objectId: caseId,
    caseId,
    description: `Hermes investigation ${investigationId} ${finalStatus}: ${last.status}`,
    metadata: { investigation_id: investigationId, status: last.status, persisted },
  }).catch(() => {});

  return { status: finalStatus, investigation_id: investigationId, phases: last.phases, output: last.raw, persisted };
}

export { PHASES };