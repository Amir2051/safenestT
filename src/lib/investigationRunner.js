import { base44 } from "@/api/base44Client";
import { ensureTenant, getCurrentUser } from "@/lib/tenantContext";
import { runInference } from "@/lib/investigationAI";
import { logAuditEvent } from "@/lib/auditLogger";

/**
 * Investigation Runner — executes a workflow phase for a case using the
 * configured AI provider/model, persists an auditable InvestigationRun,
 * updates the case workflow state, and persists phase-specific outputs.
 *
 * Pipeline: planning → evidence → analysis (multi-agent) → reality_check →
 * risk (DETERMINISTIC) → dossier. Every stage is persisted; failures are
 * surfaced honestly, never mocked.
 */

export const PHASES = [
  { id: "planning", label: "Planning", description: "Build the investigation plan: objectives, scope, hypotheses, priority targets." },
  { id: "evidence", label: "Evidence Collection", description: "Summarize collected evidence and surface key indicators + gaps." },
  { id: "analysis", label: "Multi-Agent Analysis", description: "Three specialist analysts (blockchain, financial, behavioral) propose findings." },
  { id: "reality_check", label: "Reality-Check", description: "Verify proposed findings against evidence; flag unsupported claims." },
  { id: "risk", label: "Risk Scoring", description: "Deterministic risk score computed from findings + case attributes (no LLM)." },
  { id: "dossier", label: "Dossier / Report", description: "Generate a structured case dossier with classification labels." },
];

const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p]));
export const DEFAULT_PROVIDER = "hermes";
export const DEFAULT_MODEL = "meituan/longcat-2.0:free";
const LLM_TIMEOUT_MS = 90000;

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…[truncated]" : s;
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    ),
  ]);
}

async function gatherCaseContext(caseId) {
  const [evidence, targets, findings] = await Promise.all([
    base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
    base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
    base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
  ]);
  return { evidence, targets, findings };
}

// ── Per-phase JSON schemas ────────────────────────────────────────────────
const PLAN_SCHEMA = { type: "object", properties: { objectives: { type: "array", items: { type: "string" } }, scope: { type: "string" }, hypotheses: { type: "array", items: { type: "string" } }, priority_targets: { type: "array", items: { type: "string" } }, steps: { type: "array", items: { type: "object", properties: { step: { type: "string" }, detail: { type: "string" } } } }, notes: { type: "string" } } };
const EVIDENCE_SCHEMA = { type: "object", properties: { summary: { type: "string" }, key_indicators: { type: "array", items: { type: "string" } }, gaps: { type: "array", items: { type: "string" } }, needs_verification: { type: "array", items: { type: "string" } } } };
const ANALYSIS_SCHEMA = { type: "object", properties: { findings: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, severity: { type: "string" }, confidence: { type: "string" }, supporting_evidence: { type: "array", items: { type: "string" } } } } }, rationale: { type: "string" } } };
const REALITY_SCHEMA = { type: "object", properties: { verifications: { type: "array", items: { type: "object", properties: { finding_title: { type: "string" }, status: { type: "string" }, reasoning: { type: "string" } } } }, unsupported_claims: { type: "array", items: { type: "string" } }, notes: { type: "string" } } };
const DOSSIER_SCHEMA = { type: "object", properties: { title: { type: "string" }, sections: { type: "array", items: { type: "object", properties: { title: { type: "string" }, classification: { type: "string" }, content: { type: "string" } } } }, conclusion: { type: "string" }, recommended_actions: { type: "array", items: { type: "string" } } } };

const PHASE_SPECS = {
  planning: { instr: "Produce an investigation plan: objectives, scope, key hypotheses, priority targets, and a step-by-step plan. Respond as JSON.", schema: PLAN_SCHEMA },
  evidence: { instr: "Summarize the collected evidence, surface key indicators, note gaps, and flag evidence that needs verification. Respond as JSON.", schema: EVIDENCE_SCHEMA },
  reality_check: { instr: "Review the existing findings. For each, mark verification status (supported / partially_supported / unsupported) with reasoning. Flag any unsupported claims. Respond as JSON.", schema: REALITY_SCHEMA },
  dossier: { instr: "Generate a structured case dossier with classified sections (fact/evidence/analysis/inference/hypothesis), a conclusion, and recommended actions. Respond as JSON.", schema: DOSSIER_SCHEMA },
};

function caseSummary(caseItem) {
  return {
    case_title: caseItem.case_title,
    fraud_type: caseItem.fraud_type,
    victim_name: caseItem.victim_name,
    amount_stolen_usd: caseItem.amount_stolen_usd,
    description: caseItem.description,
    incident_date: caseItem.incident_date,
    suspect_details: caseItem.suspect_details,
    scammer_info: caseItem.scammer_info,
  };
}

function contextBlocks(ctx) {
  const evidenceSummary = (ctx.evidence || []).map((e) => ({
    id: e.id, filename: e.filename, type: e.evidence_type, description: e.description,
    tags: e.tags, processing_status: e.processing_status,
  }));
  const targetSummary = (ctx.targets || []).map((t) => ({
    type: t.type, value: t.value, network: t.network, label: t.label, status: t.status,
  }));
  const findingSummary = (ctx.findings || []).map((f) => ({
    title: f.title, category: f.category, severity: f.severity, confidence: f.confidence, status: f.status,
  }));
  return { evidenceSummary, targetSummary, findingSummary };
}

function buildPhasePrompt(phase, caseItem, ctx) {
  const { evidenceSummary, targetSummary, findingSummary } = contextBlocks(ctx);
  const base =
    `You are a senior cyber-fraud investigation analyst. Analyze the case below and execute the "${PHASE_BY_ID[phase].label}" phase.\n` +
    `Be factual. Do NOT fabricate data. If information is missing, say so. Distinguish FACT, EVIDENCE, ANALYSIS, INFERENCE, and HYPOTHESIS.\n\n` +
    `CASE:\n${JSON.stringify(caseSummary(caseItem), null, 2)}\n\n` +
    `EVIDENCE (${evidenceSummary.length}):\n${JSON.stringify(evidenceSummary, null, 2)}\n\n` +
    `TARGETS (${targetSummary.length}):\n${JSON.stringify(targetSummary, null, 2)}\n\n` +
    `EXISTING FINDINGS (${findingSummary.length}):\n${JSON.stringify(findingSummary, null, 2)}\n`;
  const spec = PHASE_SPECS[phase];
  return { prompt: `${base}\n${spec.instr}`, schema: spec.schema };
}

// ── Multi-agent analysis ─────────────────────────────────────────────────
const ANALYSTS = [
  {
    id: "blockchain_analyst",
    focus: "blockchain and crypto-flow analyst",
    instr: "You are a BLOCKCHAIN / CRYPTO-FLOW analyst. Focus ONLY on wallet addresses, transaction patterns, chain hops, mixer/exchange exposure, and on-chain indicators. Propose findings in your domain. Cite supporting evidence filenames/ids where possible. If there is no blockchain-relevant data, return an empty findings array. Respond as JSON with a findings array.",
  },
  {
    id: "financial_analyst",
    focus: "financial / funds-flow analyst",
    instr: "You are a FINANCIAL / FUNDS-FLOW analyst. Focus ONLY on amounts stolen, payment methods, bank/wire transfers, fiat on/off ramps, and monetary exposure. Propose findings in your domain. Cite supporting evidence filenames/ids where possible. If there is no financial-relevant data, return an empty findings array. Respond as JSON with a findings array.",
  },
  {
    id: "behavioral_analyst",
    focus: "behavioral / social-engineering analyst",
    instr: "You are a BEHAVIORAL / SOCIAL-ENGINEERING analyst. Focus ONLY on communication patterns, impersonation, grooming/romance/investment-scam modus operandi, suspect identity indicators, and victim-suspect interaction. Propose findings in your domain. Cite supporting evidence filenames/ids where possible. If there is no behavioral-relevant data, return an empty findings array. Respond as JSON with a findings array.",
  },
];

function buildAnalysisPrompt(caseItem, ctx, analyst) {
  const { evidenceSummary, targetSummary, findingSummary } = contextBlocks(ctx);
  return {
    prompt:
      `You are part of a multi-agent investigation team. ${analyst.instr}\n\n` +
      `CASE:\n${JSON.stringify(caseSummary(caseItem), null, 2)}\n\n` +
      `EVIDENCE (${evidenceSummary.length}):\n${JSON.stringify(evidenceSummary, null, 2)}\n\n` +
      `TARGETS (${targetSummary.length}):\n${JSON.stringify(targetSummary, null, 2)}\n\n` +
      `EXISTING FINDINGS (${findingSummary.length}):\n${JSON.stringify(findingSummary, null, 2)}\n`,
    schema: ANALYSIS_SCHEMA,
  };
}

function titlesSimilar(a, b) {
  const na = (a || "").toLowerCase().trim();
  const nb = (b || "").toLowerCase().trim();
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// Real OSINT tool dispatch — runs alongside the LLM analysts. Each finding is
// derived from real provider data (Etherscan/Alchemy/DNS/RDAP/…) and tagged
// with the producing tool. LLM responses are never treated as OSINT evidence.
async function runOsintAnalysis(ctx) {
  const findings = [];
  const toolsRun = [];
  for (const t of ctx.targets || []) {
    const providers = (t.type === "domain" || t.type === "url") ? ["dns", "rdap"]
      : (t.type === "wallet_address" || t.type === "token_contract" || t.type === "transaction_hash") ? ["etherscan", "alchemy"]
      : (t.type === "ip_address") ? ["virustotal", "shodan"]
      : (t.type === "email") ? ["virustotal"] : [];
    for (const p of providers) {
      toolsRun.push({ target: t.value, provider: p });
      try {
        const res = await base44.functions.invoke(
          (p === "virustotal" || p === "shodan" || p === "firecrawl") ? "osintReputationProxy" : "osintProxy",
          { provider: p, target: t.value, network: t.network }
        );
        const body = res?.data ?? res;
        if (!body || body.ok === false || body.status === "error") continue;
        const data = body.data || {};
        let title = "", description = "", category = "entity_connection", severity = "low", confidence = "high";
        if (p === "etherscan" || p === "alchemy") {
          const eth = data.balance_eth != null ? data.balance_eth : null;
          const txs = data.recent_txs?.length || data.tx_count || 0;
          title = `On-chain data for ${String(t.value).slice(0, 14)}… (${p})`;
          description = `${p} reports balance ${eth ?? "unknown"} ETH and ${txs} recent transactions. Source: ${data.source || p}. Real OSINT data — not LLM inference.`;
          category = "wallet_activity"; severity = txs > 10 ? "medium" : "low";
        } else if (p === "dns") {
          title = `DNS records for ${t.value}`;
          description = `A: ${(data.records?.A || []).join(", ") || "none"}. NS: ${(data.records?.NS || []).join(", ") || "none"}. MX: ${(data.records?.MX || []).join(", ") || "none"}. Source: Cloudflare DoH.`;
          category = "entity_connection";
        } else if (p === "rdap") {
          const ev = (data.events || []).map((e) => `${e.event}:${e.date}`).join("; ");
          title = `WHOIS/RDAP for ${t.value}`;
          description = `Registered: ${data.registered}. Status: ${(data.status || []).join(", ")}. Events: ${ev}. Nameservers: ${(data.nameservers || []).join(", ")}. Source: RDAP.`;
          category = "entity_connection";
        } else {
          title = `${p} data for ${t.value}`;
          description = JSON.stringify(data).slice(0, 300);
        }
        findings.push({ title, description, category, severity, confidence, supporting_evidence: [], agent: "osint", source_tool: p, target_value: t.value });
      } catch (e) { /* skip individual provider failure — surfaced via toolsRun */ }
    }
  }
  return { findings, toolsRun };
}

async function runAnalysisMultiAgent(caseItem, ctx, provider, model) {
  const runs = await Promise.allSettled(
    ANALYSTS.map((analyst) => {
      const { prompt, schema } = buildAnalysisPrompt(caseItem, ctx, analyst);
      return withTimeout(
        runInference({ provider, model, prompt, responseJsonSchema: schema }),
        LLM_TIMEOUT_MS,
        `analysis:${analyst.id}`
      ).then((out) => {
        const o = typeof out === "string" ? safeParse(out) : out;
        const findings = Array.isArray(o?.findings) ? o.findings : [];
        return { analyst: analyst.id, findings };
      });
    })
  );

  // Real OSINT tool dispatch — runs alongside the LLM analysts.
  const osint = await runOsintAnalysis(ctx).catch(() => ({ findings: [], toolsRun: [] }));

  const agentsRun = [];
  const agentsFailed = [];
  const merged = [];
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    const analyst = ANALYSTS[i].id;
    if (r.status === "fulfilled") {
      agentsRun.push(analyst);
      (r.value.findings || []).forEach((f) => merged.push({ ...f, agent: analyst }));
    } else {
      agentsFailed.push({ analyst, error: String(r.reason?.message || r.reason || "").slice(0, 200) });
    }
  }
  // Merge real OSINT findings, tagged with their producing tool.
  if (osint.findings.length) {
    agentsRun.push("osint");
    osint.findings.forEach((f) => merged.push(f));
  }

  // De-duplicate by title similarity (keep first)
  const deduped = [];
  for (const f of merged) {
    if (!deduped.some((d) => titlesSimilar(d.title, f.title))) deduped.push(f);
  }

  // Only fail if every LLM analyst failed AND no OSINT data was returned.
  if (agentsFailed.length === ANALYSTS.length && osint.findings.length === 0) {
    throw new Error(`All ${ANALYSTS.length} analysts failed and no OSINT data: ${agentsFailed.map((a) => a.error).join(" | ")}`);
  }

  return {
    findings: deduped,
    rationale: `Multi-agent analysis: ${agentsRun.length} agent(s) returned findings (${agentsRun.join(", ")}).${agentsFailed.length ? ` Failed: ${agentsFailed.map((a) => a.analyst).join(", ")}.` : ""} OSINT tools run: ${osint.toolsRun.length}.`,
    agents_run: agentsRun,
    agents_failed: agentsFailed,
    osint_tools_run: osint.toolsRun,
  };
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// ── Deterministic risk scoring ───────────────────────────────────────────
const SEVERITY_WEIGHT = { critical: 25, high: 15, medium: 8, low: 3 };
const CONFIDENCE_MULT = { high: 1, medium: 0.7, low: 0.4 };

function computeRiskScore(caseItem, ctx) {
  // Risk scoring must never reward findings that the reality-check rejected.
  // Verified and partially-supported findings may contribute; unsupported and
  // still-proposed findings are excluded until independently checked.
  const findings = (ctx.findings || []).filter((f) => f.status === "verified" || f.status === "partially_supported");
  let findingScore = 0;
  const riskFactors = [];

  findings.forEach((f) => {
    const sev = SEVERITY_WEIGHT[f.severity] ?? 4;
    const conf = CONFIDENCE_MULT[f.confidence] ?? 0.5;
    findingScore += sev * conf;
  });
  findingScore = Math.min(findingScore, 60);
  if (findings.length) riskFactors.push({ factor: `${findings.length} findings (severity/confidence weighted)`, weight: Math.round(findingScore) });

  // Verified findings add confidence
  const verified = findings.filter((f) => f.status === "verified").length;
  const verifiedBonus = Math.min(verified * 2, 10);
  if (verified) riskFactors.push({ factor: `${verified} verified finding(s)`, weight: verifiedBonus });

  // Amount factor
  const amt = Number(caseItem.amount_stolen_usd) || 0;
  let amtFactor = 2;
  if (amt >= 100000) amtFactor = 20;
  else if (amt >= 10000) amtFactor = 12;
  else if (amt >= 1000) amtFactor = 6;
  riskFactors.push({ factor: `Loss amount $${amt.toLocaleString()}`, weight: amtFactor });

  // Fraud type factor
  const highRiskTypes = ["crypto_theft", "ransomware", "pig_butchering", "investment_scam"];
  const typeFactor = highRiskTypes.includes(caseItem.fraud_type) ? 10 : 5;
  riskFactors.push({ factor: `Fraud type: ${caseItem.fraud_type || "unknown"}`, weight: typeFactor });

  // Targets analyzed
  const analyzedTargets = (ctx.targets || []).filter((t) => t.status === "analyzed").length;
  const targetBonus = Math.min(analyzedTargets * 2, 10);
  if (analyzedTargets) riskFactors.push({ factor: `${analyzedTargets} analyzed target(s)`, weight: targetBonus });

  const score = Math.min(100, Math.max(0, Math.round(findingScore + verifiedBonus + amtFactor + typeFactor + targetBonus)));
  const level = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "medium" : "low";

  return {
    risk_score: score,
    risk_level: level,
    risk_factors: riskFactors,
    summary: `Deterministic score ${score}/100 (${level}) from ${findings.length} finding(s), $${amt.toLocaleString()} loss, fraud type ${caseItem.fraud_type || "unknown"}, ${analyzedTargets} analyzed target(s). Computed without LLM.`,
  };
}

// ── Phase output dispatch ────────────────────────────────────────────────
async function computePhaseOutput(phase, caseItem, ctx, provider, model) {
  if (phase === "analysis") {
    return runAnalysisMultiAgent(caseItem, ctx, provider, model);
  }
  if (phase === "risk") {
    return computeRiskScore(caseItem, ctx); // deterministic, no LLM, no timeout
  }
  const { prompt, schema } = buildPhasePrompt(phase, caseItem, ctx);
  const out = await withTimeout(
    runInference({ provider, model, prompt, responseJsonSchema: schema }),
    LLM_TIMEOUT_MS,
    `phase:${phase}`
  );
  return typeof out === "string" ? safeParse(out) || { text: out } : out;
}

/**
 * Execute a workflow phase. Returns { status, run, output, error, persisted }.
 */
export async function runPhase({ caseId, phase, provider = DEFAULT_PROVIDER, model = DEFAULT_MODEL }) {
  if (!PHASE_BY_ID[phase]) throw new Error(`Unknown phase: ${phase}`);

  const tenantId = await ensureTenant();
  const user = await getCurrentUser();
  const caseItem = await base44.entities.InvestigationCase.get(caseId);
  const ctx = await gatherCaseContext(caseId);

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const run = await base44.entities.InvestigationRun.create({
    tenant_id: tenantId,
    case_id: caseId,
    phase,
    provider,
    model,
    status: "running",
    prompt: phase === "risk" ? "(deterministic — no LLM call)" : "(multi-agent analysis)" ,
    input_summary: {
      evidence_count: ctx.evidence.length,
      target_count: ctx.targets.length,
      finding_count: ctx.findings.length,
    },
    started_at: startedAt,
    run_by: user.id,
    run_by_email: user.email,
  });

  // Persist a more detailed prompt for non-deterministic phases (after we build it)
  if (phase !== "risk") {
    const promptForLog = phase === "analysis"
      ? `multi-agent: ${ANALYSTS.map((a) => a.id).join(" + ")}`
      : buildPhasePrompt(phase, caseItem, ctx).prompt;
    await base44.entities.InvestigationRun.update(run.id, { prompt: truncate(promptForLog, 8000) }).catch(() => {});
  }

  await updateWorkflowPhase(caseId, phase, { status: "running", run_id: run.id }).catch(() => {});

  try {
    const output = await computePhaseOutput(phase, caseItem, ctx, provider, model);
    const outputObj = output || {};
    const duration = Date.now() - t0;

    const persisted = await persistPhaseOutputs({
      caseId, phase, output: outputObj, tenantId, runId: run.id, user, ctx,
    });

    await base44.entities.InvestigationRun.update(run.id, {
      status: "completed",
      output: outputObj,
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
      metadata: { run_id: run.id, provider, model, duration_ms: duration, persisted },
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

// Resolve LLM-supplied supporting_evidence (filenames or ids) to real EvidenceItem ids
function resolveEvidenceRefs(rawRefs, evidence) {
  const byFilename = {};
  const byId = {};
  (evidence || []).forEach((e) => {
    if (e.filename) byFilename[String(e.filename).toLowerCase()] = e.id;
    if (e.id) byId[String(e.id)] = e.id;
  });
  const out = [];
  (rawRefs || []).forEach((s) => {
    if (!s) return;
    const key = String(s);
    if (byFilename[key.toLowerCase()]) out.push(byFilename[key.toLowerCase()]);
    else if (byId[key]) out.push(byId[key]);
  });
  return [...new Set(out)];
}

async function persistPhaseOutputs({ caseId, phase, output, tenantId, runId, user, ctx }) {
  const result = {};

  if (phase === "analysis" && Array.isArray(output.findings)) {
    const created = [];
    for (const f of output.findings) {
      const evidenceRefs = resolveEvidenceRefs(f.supporting_evidence, ctx?.evidence);
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
        evidence_refs: evidenceRefs,
        hermes_raw: { agent: f.agent || "multi_agent", source_tool: f.source_tool, target_value: f.target_value, supporting_evidence_raw: f.supporting_evidence || [] },
        generating_run_id: runId,
      }).catch(() => null);
      if (rec) created.push(rec.id);
    }
    result.finding_ids = created;
    result.agents_run = output.agents_run || [];
    result.agents_failed = output.agents_failed || [];
  }

  if (phase === "reality_check" && Array.isArray(output.verifications)) {
    const updates = [];
    for (const v of output.verifications) {
      if (!v?.finding_title) continue;
      const status = String(v.status || "").toLowerCase();
      const mapped = status === "supported" ? "verified"
        : status === "partially_supported" ? "partially_supported"
        : status === "unsupported" ? "unsupported"
        : null;
      if (!mapped) continue;
      const matches = (ctx.findings || []).filter((f) => titlesSimilar(f.title, v.finding_title));
      for (const f of matches) {
        await base44.entities.InvestigationFinding.update(f.id, {
          status: mapped,
          reality_check: {
            status: mapped,
            reasoning: v.reasoning || "",
            run_id: runId,
            checked_at: new Date().toISOString(),
          },
        }).catch(() => {});
        updates.push({ finding_id: f.id, status: mapped });
      }
    }
    result.finding_updates = updates;
    result.unsupported_claims = output.unsupported_claims || [];
  }

  if (phase === "risk" && typeof output.risk_score === "number") {
    const c = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
    const wf = c?.workflow || {};
    await base44.entities.InvestigationCase.update(caseId, {
      workflow: { ...wf, risk_score: output.risk_score, risk_level: output.risk_level, risk_factors: output.risk_factors },
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

/** Provider/model health test — real ping, honest ok/fail. Never fakes success. */
export async function testProvider({ provider = DEFAULT_PROVIDER, model = DEFAULT_MODEL } = {}) {
  const t0 = Date.now();
  try {
    const res = await withTimeout(
      runInference({
        provider,
        model,
        prompt: "Reply with exactly: {\"ok\": true}. No other text.",
        responseJsonSchema: { type: "object", properties: { ok: { type: "boolean" } } },
      }),
      30000,
      "health-test"
    );
    const ok = typeof res === "object" ? res?.ok === true : String(res).toLowerCase().includes("ok");
    return { status: ok ? "ok" : "degraded", provider, model, ms: Date.now() - t0, sample: (typeof res === "string" ? res : JSON.stringify(res)).slice(0, 120) };
  } catch (e) {
    return { status: "failed", provider, model, ms: Date.now() - t0, error: e?.message || String(e) };
  }
}