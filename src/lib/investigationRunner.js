import { base44 } from "@/api/base44Client";
import { ensureTenant, getCurrentUser } from "@/lib/tenantContext";
import { runInference } from "@/lib/investigationAI";
import { logAuditEvent } from "@/lib/auditLogger";

/**
 * Investigation Runner — executes a workflow phase for a case using the
 * configured AI provider/model, persists an auditable InvestigationRun,
 * updates the case workflow state, and persists phase-specific outputs
 * (findings for analysis, risk score for risk, a dossier report for the
 * final phase). Failures are surfaced honestly, never mocked.
 */

export const PHASES = [
  { id: "planning", label: "Planning", description: "Build the investigation plan: objectives, scope, hypotheses, priority targets." },
  { id: "evidence", label: "Evidence Collection", description: "Summarize collected evidence and surface key indicators + gaps." },
  { id: "analysis", label: "Analysis", description: "Correlate evidence and targets into proposed findings." },
  { id: "reality_check", label: "Reality-Check", description: "Verify proposed findings against evidence; flag unsupported claims." },
  { id: "risk", label: "Risk Scoring", description: "Compute an overall risk score and risk factors." },
  { id: "dossier", label: "Dossier / Report", description: "Generate a structured case dossier with classification labels." },
];

const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p]));
export const DEFAULT_PROVIDER = "invokellm";
export const DEFAULT_MODEL = "automatic";

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…[truncated]" : s;
}

async function gatherCaseContext(caseId) {
  const [evidence, targets, findings] = await Promise.all([
    base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 100).catch(() => []),
    base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 100).catch(() => []),
    base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 100).catch(() => []),
  ]);
  return { evidence, targets, findings };
}

// ── Per-phase JSON schemas (returned to the model) ────────────────────────
const PLAN_SCHEMA = { type: "object", properties: { objectives: { type: "array", items: { type: "string" } }, scope: { type: "string" }, hypotheses: { type: "array", items: { type: "string" } }, priority_targets: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "object", properties: { step: { type: "string" }, detail: { type: "string" } } } }, notes: { type: "string" } } };
const EVIDENCE_SCHEMA = { type: "object", properties: { summary: { type: "string" }, key_indicators: { type: "array", items: { type: "string" } }, gaps: { type: "array", items: { type: "string" } }, needs_verification: { type: "array", items: { type: "string" } } } };
const ANALYSIS_SCHEMA = { type: "object", properties: { findings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, severity: { type: "string" }, confidence: { type: "string" }, supporting_evidence: { type: "array", items: { type: "string" } } } } }, rationale: { type: "string" } } };
const REALITY_SCHEMA = { type: "object", properties: { verifications: { type: "array", items: { type: "object", properties: { finding_title: { type: "string" }, status: { type: "string" }, reasoning: { type: "string" } } } }, unsupported_claims: { type: "array", items: { type: "string" } }, notes: { type: "string" } } };
const RISK_SCHEMA = { type: "object", properties: { risk_score: { type: "number" }, risk_level: { type: "string" }, risk_factors: { type: "array", items: { type: "object", properties: { factor: { type: "string" }, weight: { type: "number" } } } }, summary: { type: "string" } } };
const DOSSIER_SCHEMA = { type: "object", properties: { title: { type: "string" }, sections: { type: "array", items: { type: "object", properties: { title: { type: "string" }, classification: { type: "string" }, content: { type: "string" } } } }, conclusion: { type: "string" }, recommended_actions: { type: "array", items: { type: "string" } } } };

const PHASE_SPECS = {
  planning: { instr: "Produce an investigation plan: objectives, scope, key hypotheses, priority targets, and a step-by-step plan. Respond as JSON.", schema: PLAN_SCHEMA },
  evidence: { instr: "Summarize the collected evidence, surface key indicators, note gaps, and flag evidence that needs verification. Respond as JSON.", schema: EVIDENCE_SCHEMA },
  analysis: { instr: "Propose findings by correlating evidence and targets. Each finding must cite supporting evidence filenames/ids. Respond as JSON with a findings array.", schema: ANALYSIS_SCHEMA },
  reality_check: { instr: "Review the existing findings. For each, mark verification status (supported / partially_supported / unsupported) with reasoning. Flag any unsupported claims. Respond as JSON.", schema: REALITY_SCHEMA },
  risk: { instr: "Compute an overall risk score (0-100), list risk factors with weight, and an overall risk level. Respond as JSON.", schema: RISK_SCHEMA },
  dossier: { instr: "Generate a structured case dossier with classified sections (fact/evidence/analysis/inference/hypothesis), a conclusion, and recommended actions. Respond as JSON.", schema: DOSSIER_SCHEMA },
};

function buildPhasePrompt(phase, caseItem, ctx) {
  const caseSummary = {
    case_title: caseItem.case_title,
    fraud_type: caseItem.fraud_type,
    victim_name: caseItem.victim_name,
    amount_stolen_usd: caseItem.amount_stolen_usd,
    description: caseItem.description,
    incident_date: caseItem.incident_date,
    suspect_details: caseItem.suspect_details,
    scammer_info: caseItem.scammer_info,
  };
  const evidenceSummary = (ctx.evidence || []).map((e) => ({
    filename: e.filename, type: e.evidence_type, description: e.description,
    tags: e.tags, processing_status: e.processing_status,
  }));
  const targetSummary = (ctx.targets || []).map((t) => ({
    type: t.type, value: t.value, network: t.network, label: t.label, status: t.status,
  }));
  const findingSummary = (ctx.findings || []).map((f) => ({
    title: f.title, category: f.category, severity: f.severity, confidence: f.confidence, status: f.status,
  }));

  const base =
    `You are a senior cyber-fraud investigation analyst. Analyze the case below and execute the "${PHASE_BY_ID[phase].label}" phase.\n` +
    `Be factual. Do NOT fabricate data. If information is missing, say so. Distinguish FACT, EVIDENCE, ANALYSIS, INFERENCE, and HYPOTHESIS.\n\n` +
    `CASE:\n${JSON.stringify(caseSummary, null, 2)}\n\n` +
    `EVIDENCE (${evidenceSummary.length}):\n${JSON.stringify(evidenceSummary, null, 2)}\n\n` +
    `TARGETS (${targetSummary.length}):\n${JSON.stringify(targetSummary, null, 2)}\n\n` +
    `EXISTING FINDINGS (${findingSummary.length}):\n${JSON.stringify(findingSummary, null, 2)}\n`;

  const spec = PHASE_SPECS[phase];
  return { prompt: `${base}\n${spec.instr}`, schema: spec.schema };
}

/**
 * Execute a workflow phase. Returns { status, run, output, error, persisted }.
 * status is "completed" | "failed".
 */
export async function runPhase({ caseId, phase, provider = DEFAULT_PROVIDER, model = DEFAULT_MODEL }) {
  if (!PHASE_BY_ID[phase]) throw new Error(`Unknown phase: ${phase}`);

  const tenantId = await ensureTenant();
  const user = await getCurrentUser();
  const caseItem = await base44.entities.InvestigationCase.get(caseId);
  const ctx = await gatherCaseContext(caseId);
  const { prompt, schema } = buildPhasePrompt(phase, caseItem, ctx);

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const run = await base44.entities.InvestigationRun.create({
    tenant_id: tenantId,
    case_id: caseId,
    phase,
    provider,
    model,
    status: "running",
    prompt: truncate(prompt, 8000),
    input_summary: {
      evidence_count: ctx.evidence.length,
      target_count: ctx.targets.length,
      finding_count: ctx.findings.length,
    },
    started_at: startedAt,
    run_by: user.id,
    run_by_email: user.email,
  });

  await updateWorkflowPhase(caseId, phase, { status: "running", run_id: run.id }).catch(() => {});

  try {
    const output = await runInference({ provider, model, prompt, responseJsonSchema: schema });
    const outputObj = typeof output === "string" ? { text: output } : output;
    const duration = Date.now() - t0;

    const persisted = await persistPhaseOutputs({
      caseId, phase, output: outputObj, tenantId, runId: run.id, user,
    });

    await base44.entities.InvestigationRun.update(run.id, {
      status: "completed",
      output: outputObj,
      output_text: typeof output === "string" ? output : undefined,
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      persisted_outputs: persisted,
    });

    await updateWorkflowPhase(caseId, phase, {
      status: "completed", run_id: run.id, completed_at: new Date().toISOString(), output: outputObj,
    });

    await logAuditEvent({
      action: `investigation_run_${phase}`,
      objectType: "case",
      objectId: caseId,
      caseId,
      description: `Phase "${PHASE_BY_ID[phase].label}" completed via ${provider}/${model}`,
      metadata: { run_id: run.id, provider, model, duration_ms: duration },
    });

    return { status: "completed", run: { ...run, status: "completed", output: outputObj }, output: outputObj, persisted };
  } catch (e) {
    const errMsg = e?.message || String(e);
    const duration = Date.now() - t0;
    await base44.entities.InvestigationRun.update(run.id, {
      status: "failed",
      error: truncate(errMsg, 4000),
      completed_at: new Date().toISOString(),
      duration_ms: duration,
    }).catch(() => {});
    await updateWorkflowPhase(caseId, phase, { status: "failed", run_id: run.id }).catch(() => {});
    await logAuditEvent({
      action: `investigation_run_${phase}_failed`,
      objectType: "case",
      objectId: caseId,
      caseId,
      description: `Phase "${PHASE_BY_ID[phase].label}" failed: ${errMsg}`,
      metadata: { run_id: run.id, provider, model, error: errMsg },
    });
    return { status: "failed", run: { ...run, status: "failed", error: errMsg }, error: errMsg };
  }
}

async function updateWorkflowPhase(caseId, phase, patch) {
  const c = await base44.entities.InvestigationCase.get(caseId);
  const wf = c.workflow || { current_phase: "planning", phases: {} };
  const phases = wf.phases || {};
  phases[phase] = { ...(phases[phase] || {}), ...patch };

  const order = PHASES.map((p) => p.id);
  let currentPhase = wf.current_phase || "planning";
  if (patch.status === "completed") {
    const idx = order.indexOf(phase);
    if (idx >= 0 && idx < order.length - 1) currentPhase = order[idx + 1];
    else if (idx === order.length - 1) currentPhase = "closed";
  }
  const completedCount = order.filter((p) => phases[p]?.status === "completed").length;
  const progress = Math.round((completedCount / order.length) * 100);

  await base44.entities.InvestigationCase.update(caseId, {
    workflow: { ...wf, phases, current_phase: currentPhase },
    investigation_progress: progress,
    last_activity: new Date().toISOString(),
  });
}

async function persistPhaseOutputs({ caseId, phase, output, tenantId, runId, user }) {
  const result = {};

  if (phase === "analysis" && Array.isArray(output.findings)) {
    const created = [];
    for (const f of output.findings) {
      const rec = await base44.entities.InvestigationFinding.create({
        tenant_id: tenantId,
        case_id: caseId,
        title: f.title || "Untitled finding",
        description: f.description || "",
        category: f.category || "other",
        severity: f.severity || "medium",
        confidence: f.confidence || "medium",
        status: "proposed",
        source: "ai_run",
        evidence_refs: f.supporting_evidence || [],
        generating_run_id: runId,
      }).catch(() => null);
      if (rec) created.push(rec.id);
    }
    result.finding_ids = created;
  }

  if (phase === "risk" && typeof output.risk_score === "number") {
    const c = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
    const wf = c?.workflow || {};
    await base44.entities.InvestigationCase.update(caseId, {
      workflow: { ...wf, risk_score: output.risk_score },
    }).catch(() => {});
    result.risk_score = output.risk_score;
  }

  if (phase === "dossier") {
    const report = await base44.entities.InvestigationReport.create({
      tenant_id: tenantId,
      case_id: caseId,
      title: output.title || "Investigation Dossier",
      report_type: "dossier",
      status: "generated",
      generated_by: "ai_run",
      generated_date: new Date().toISOString(),
      content: output,
      sections: output.sections,
      conclusion: output.conclusion,
      recommended_actions: output.recommended_actions,
      created_by: user.email,
      generating_run_id: runId,
    }).catch(() => null);
    if (report) result.report_id = report.id;
  }

  return result;
}

/** Auditable AI run history for a case (tenant-scoped via RLS). */
export async function getRunHistory(caseId) {
  return base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 100).catch(() => []);
}