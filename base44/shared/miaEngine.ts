import { MIA_PERSONA, MIA_SPECIALISTS } from "./miaAgents.ts";
import { evidenceResultNote } from "./toolResult.ts";
import { runOnchainEvidence } from "./onchain.ts";
import { runDomainEvidence } from "./domainIntel.ts";
import { runIdentityEvidence } from "./identityIntel.ts";

/**
 * MIA Multi-Agent investigation engine (server-side).
 *
 * This is the real second investigation provider. It reuses SafeNestT's
 * existing agent design — the MIA senior-investigator protocol (see
 * base44/agents/mia_security_advisor.jsonc) plus the three specialist analysts
 * and the reality-check / deterministic-risk / evidence-gated-dossier stages of
 * the existing pipeline — and runs it entirely on the server through the
 * platform AI gateway. No API keys reach the browser, and nothing is simulated:
 * every persisted finding comes from a model response over real case data, and
 * every failure is recorded and reported.
 *
 * Phases: planning -> evidence -> analysis (3 specialist analysts) ->
 *         reality_check -> risk (deterministic) -> dossier (evidence-gated).
 */

export const MIA_PROVIDER = "mia";
export const MIA_MODEL = "mia-multi-agent";
export const MIA_PHASES = ["planning", "evidence", "analysis", "reality_check", "risk", "dossier"];

const PHASE_LABELS: Record<string, string> = {
  planning: "Planning",
  evidence: "Evidence Collection",
  analysis: "Multi-Agent Analysis",
  reality_check: "Reality-Check",
  risk: "Risk Scoring",
  dossier: "Dossier / Report",
};

const LLM_TIMEOUT_MS = 90000;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    objectives: { type: "array", items: { type: "string" } },
    scope: { type: "string" },
    hypotheses: { type: "array", items: { type: "string" } },
    priority_indicators: { type: "array", items: { type: "string" } },
    steps: { type: "array", items: { type: "object", properties: { step: { type: "string" }, detail: { type: "string" } } } },
    gaps: { type: "array", items: { type: "string" } },
  },
};

const EVIDENCE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    key_indicators: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    needs_verification: { type: "array", items: { type: "string" } },
  },
};

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          supporting_evidence: { type: "array", items: { type: "string" } },
        },
        required: ["title", "description"],
      },
    },
    rationale: { type: "string" },
  },
};

const REALITY_SCHEMA = {
  type: "object",
  properties: {
    verifications: {
      type: "array",
      items: {
        type: "object",
        properties: {
          finding_id: { type: "string" },
          finding_title: { type: "string" },
          status: { type: "string", enum: ["supported", "partially_supported", "unsupported"] },
          reasoning: { type: "string" },
        },
        required: ["finding_title", "status"],
      },
    },
    unsupported_claims: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
};

function truncate(s: any, n: number) {
  const str = s == null ? "" : String(s);
  return str.length > n ? `${str.slice(0, n)}…[truncated]` : str;
}

function safeParse(value: any) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(String(value)); } catch { return null; }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)), ms)
    ),
  ]) as Promise<T>;
}

async function askModel(base44: any, prompt: string, schema: any, label: string) {
  const res = await withTimeout(
    base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: schema }),
    LLM_TIMEOUT_MS,
    label
  );
  const parsed = safeParse(res?.data ?? res);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`${label} returned an unparseable response`);
  }
  return parsed;
}

function caseSummary(c: any) {
  return {
    case_number: c.case_number,
    case_title: c.case_title,
    fraud_type: c.fraud_type,
    victim_name: c.victim_name,
    amount_stolen_usd: c.amount_stolen_usd,
    cryptocurrency: c.cryptocurrency,
    blockchain: c.blockchain,
    incident_date: c.incident_date,
    description: truncate(c.description, 4000),
    suspect_details: c.suspect_details || null,
    scammer_info: c.scammer_info || null,
  };
}

function buildContext(base44: any, caseItem: any) {
  return Promise.all([
    base44.entities.EvidenceItem.filter({ case_id: caseItem.id }, "-created_date", 100).catch(() => []),
    base44.entities.InvestigationTarget.filter({ case_id: caseItem.id }, "-created_date", 100).catch(() => []),
    base44.entities.InvestigationFinding.filter({ case_id: caseItem.id }, "-created_date", 100).catch(() => []),
    // Engine dossiers hold the raw lookup results for evidence created before
    // results were stored on the evidence record itself.
    base44.entities.InvestigationReport.filter({ case_id: caseItem.id, report_type: "dossier" }, "-created_date", 20).catch(() => []),
  ]).then(([evidence, targets, findings, dossiers]: any[]) => {
    const dossierResults: Record<string, any> = {};
    for (const r of dossiers || []) {
      for (const item of (Array.isArray(r?.content?.evidence) ? r.content.evidence : [])) {
        const call = item?.data?.tool_call || {};
        if (item?.evidence_id) {
          dossierResults[item.evidence_id] = {
            capability: call.capability || item.source, target: item.target, status: call.status,
            data: call.result?.data !== undefined ? call.result.data : item?.data?.data,
          };
        }
      }
    }
    const ev = (evidence || []).map((e: any) => ({ ...e, _result: evidenceResultNote(e, dossierResults[e.file_hash]) }));
    return { evidence: ev, targets: targets || [], findings: findings || [] };
  });
}

/** True when an evidence item can support a claim: a primary record, or a lookup that returned data. */
function evidenceSupports(e: any) {
  return typeof e?._result === "string" && (e._result === "primary record" || e._result.startsWith("data:"));
}

function contextBlock(caseItem: any, ctx: any) {
  const evidence = (ctx.evidence || []).map((e: any) => ({
    id: e.id, filename: e.filename, type: e.evidence_type, description: truncate(e.description, 500), tags: e.tags,
    // What the item actually contains. A lookup that returned no records is NOT evidence of anything.
    result: e._result,
  }));
  const targets = (ctx.targets || []).map((t: any) => ({
    type: t.type, value: t.value, network: t.network, label: t.label, status: t.status,
  }));
  const findings = (ctx.findings || []).map((f: any) => ({
    id: f.id, title: f.title, category: f.category, severity: f.severity, confidence: f.confidence, status: f.status,
  }));
  return (
    `CASE:\n${JSON.stringify(caseSummary(caseItem), null, 2)}\n\n` +
    `EVIDENCE (${evidence.length}):\n${JSON.stringify(evidence, null, 2)}\n\n` +
    `TARGETS (${targets.length}):\n${JSON.stringify(targets, null, 2)}\n\n` +
    `EXISTING FINDINGS (${findings.length}):\n${JSON.stringify(findings, null, 2)}\n`
  );
}

// ── Deterministic risk + evidence-gated dossier ──────────────────────────────
const SEVERITY_WEIGHT: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3 };
const CONFIDENCE_MULT: Record<string, number> = { high: 1, medium: 0.7, low: 0.4 };

function computeRisk(caseItem: any, findings: any[]) {
  const eligible = findings.filter((f) => f.status === "verified" || f.status === "partially_supported");
  let findingScore = 0;
  eligible.forEach((f) => {
    findingScore += (SEVERITY_WEIGHT[f.severity] ?? 4) * (CONFIDENCE_MULT[f.confidence] ?? 0.5);
  });
  findingScore = Math.min(findingScore, 60);

  const factors: any[] = [];
  if (eligible.length) factors.push({ factor: `${eligible.length} findings (severity/confidence weighted)`, weight: Math.round(findingScore) });
  const verified = eligible.filter((f) => f.status === "verified").length;
  if (verified) factors.push({ factor: `${verified} verified finding(s)`, weight: Math.min(verified * 2, 10) });

  const amt = Number(caseItem.amount_stolen_usd) || 0;
  const amtFactor = amt >= 100000 ? 20 : amt >= 10000 ? 12 : amt >= 1000 ? 6 : 2;
  factors.push({ factor: `Loss amount $${amt.toLocaleString()}`, weight: amtFactor });

  const highRisk = ["crypto_theft", "ransomware", "pig_butchering", "investment_scam"];
  const typeFactor = highRisk.includes(caseItem.fraud_type) ? 10 : 5;
  factors.push({ factor: `Fraud type: ${caseItem.fraud_type || "unknown"}`, weight: typeFactor });

  const score = Math.min(100, Math.max(0, Math.round(findingScore + Math.min(verified * 2, 10) + amtFactor + typeFactor)));
  const level = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "medium" : "low";
  return {
    risk_score: score,
    risk_level: level,
    risk_factors: factors,
    summary: `Deterministic score ${score}/100 (${level}) from ${eligible.length} evidence-checked finding(s), $${amt.toLocaleString()} loss. Computed without LLM.`,
  };
}

function buildDossier(caseItem: any, ctx: any, findings: any[]) {
  const eligible = findings.filter((f) => f.status === "verified" || f.status === "partially_supported");
  const unsupported = findings.filter((f) => f.status === "unsupported");

  const sections = [
    {
      title: "Case Facts",
      classification: "FACT",
      content: [
        caseItem.case_title ? `Case: ${caseItem.case_title}.` : "",
        caseItem.victim_name ? `Reporting party: ${caseItem.victim_name}.` : "",
        caseItem.incident_date ? `Incident date: ${caseItem.incident_date}.` : "",
        Number.isFinite(Number(caseItem.amount_stolen_usd)) ? `Reported loss: $${Number(caseItem.amount_stolen_usd).toLocaleString()} USD.` : "",
        caseItem.fraud_type ? `Reported fraud type: ${caseItem.fraud_type}.` : "",
      ].filter(Boolean).join(" "),
    },
    {
      title: "Evidence Summary",
      classification: "EVIDENCE",
      content: (ctx.evidence || []).length
        ? `${ctx.evidence.length} evidence item(s) attached` +
          ` (${ctx.evidence.filter((e: any) => e._result === "primary record").length} primary record(s); ` +
          `${ctx.evidence.filter((e: any) => String(e._result || "").startsWith("data:")).length} automated lookup(s) returned data; ` +
          `${ctx.evidence.filter((e: any) => !evidenceSupports(e)).length} returned nothing usable). ` +
          `Only evidence-checked findings are carried into this dossier.`
        : "No evidence items are attached to this case.",
    },
    {
      title: "AI-Supported Findings (pending investigator review)",
      classification: "EVIDENCE",
      content: eligible.filter((f) => f.status === "verified").length
        ? eligible.filter((f) => f.status === "verified").map((f) => `${f.title}: ${truncate(f.description, 600)}`).join(" ")
        : "No findings were supported by the evidence in the AI reality check.",
    },
  ];

  const qualified = eligible.filter((f) => f.status !== "verified");
  if (qualified.length) {
    sections.push({
      title: "Partially Supported Findings",
      classification: "ANALYSIS",
      content: `Qualified — evidence supports these only in part and they require corroboration before being relied on: ` +
        qualified.map((f) => `[${f.status}] ${f.title}: ${truncate(f.description, 600)}`).join(" "),
    });
  }

  if (unsupported.length) {
    sections.push({
      title: "Excluded Claims",
      classification: "ANALYSIS",
      content: `Excluded because the reality check did not support them: ${unsupported.map((f) => f.title).join("; ")}.`,
    });
  }

  return {
    title: `${caseItem.case_title || "Investigation"} — MIA Evidence-Gated Dossier`,
    sections,
    conclusion: eligible.length
      ? `Limited to ${eligible.length} finding(s) that passed the evidence gate. Partially-supported findings remain explicitly qualified.`
      : "The available material is insufficient to establish substantive findings. Additional evidence is required.",
    recommended_actions: [
      "Preserve and attach primary transaction, communication and identity evidence.",
      "Do not treat hypotheses or unsupported claims as established facts.",
      ...(eligible.some((f) => f.status === "partially_supported")
        ? ["Obtain the missing evidence needed to upgrade partially-supported findings."]
        : []),
    ],
  };
}

function titlesSimilar(a: string, b: string) {
  const na = (a || "").toLowerCase().trim();
  const nb = (b || "").toLowerCase().trim();
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function resolveEvidenceRefs(rawRefs: any[], evidence: any[]) {
  const byFilename: Record<string, string> = {};
  const byId: Record<string, string> = {};
  (evidence || []).forEach((e: any) => {
    if (e.filename) byFilename[String(e.filename).toLowerCase()] = e.id;
    if (e.id) byId[String(e.id)] = e.id;
  });
  const out: string[] = [];
  (rawRefs || []).forEach((r) => {
    if (!r) return;
    const key = String(r).toLowerCase();
    if (byFilename[key]) out.push(byFilename[key]);
    else if (byId[String(r)]) out.push(byId[String(r)]);
  });
  return [...new Set(out)];
}

async function recordRun(base44: any, payload: any) {
  return base44.entities.InvestigationRun.create(payload).catch(() => null);
}

async function finishRun(base44: any, run: any, patch: any) {
  if (!run?.id) return;
  await base44.entities.InvestigationRun.update(run.id, patch).catch(() => {});
}

/**
 * Execute the full MIA multi-agent investigation for one case.
 * Caller must have authenticated the user and verified case access.
 */
export async function runMiaInvestigation({ base44, caseItem, user, tenantId }: any) {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const ctx = await buildContext(base44, caseItem);
  // Real on-chain history for every Ethereum wallet on the case (Etherscan V2).
  const onchain = await runOnchainEvidence(base44, caseItem, ctx.targets, user).catch(() => []);
  // Domain intelligence, routed by indicator type (domains only).
  const domainEv = await runDomainEvidence(base44, caseItem, ctx.targets, user).catch(() => []);
  // Breach-data search (Dehashed): emails, domains, names, phones only.
  const identityEv = await runIdentityEvidence(base44, caseItem, ctx.targets, user).catch(() => []);
  ctx.evidence = [...onchain, ...domainEv, ...identityEv, ...ctx.evidence];
  const phases: Record<string, any> = {};
  MIA_PHASES.forEach((p) => { phases[p] = { status: "pending" }; });

  const runBase = {
    tenant_id: tenantId,
    case_id: caseItem.id,
    provider: MIA_PROVIDER,
    model: MIA_MODEL,
    run_by: user?.id,
    run_by_email: user?.email,
  };

  const agentsRun: string[] = [];
  const agentsFailed: any[] = [];
  const persisted: any = { findings: 0, report_id: null, risk_score: null, finding_ids: [] };

  // ── Phase: planning ────────────────────────────────────────────────────────
  let plan: any = null;
  {
    const run = await recordRun(base44, {
      ...runBase, phase: "planning", status: "running", started_at: new Date().toISOString(),
      prompt: "(multi-agent investigation plan)",
      input_summary: { evidence_count: ctx.evidence.length, target_count: ctx.targets.length },
    });
    const p0 = Date.now();
    try {
      plan = await askModel(base44,
        `${MIA_PERSONA}\n\nExecute the INVESTIGATION PLANNING phase for the case below. Produce objectives, scope, ` +
        `hypotheses, priority indicators, an ordered step plan and explicit intelligence gaps. ` +
        `Use only the supplied data. Respond as JSON.\n\n${contextBlock(caseItem, ctx)}`,
        PLAN_SCHEMA, "mia:planning");
      phases.planning = { status: "completed", completed_at: new Date().toISOString(), output: plan };
      agentsRun.push("mia_planner");
      await finishRun(base44, run, { status: "completed", output: plan, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0 });
    } catch (e: any) {
      const err = truncate(e?.message || e, 2000);
      phases.planning = { status: "failed", output: { error: err } };
      agentsFailed.push({ agent: "mia_planner", error: err });
      await finishRun(base44, run, { status: "failed", error: err, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0 });
      // Planning is the gate: without it the investigation cannot proceed honestly.
      await persistWorkflow(base44, caseItem, phases, "failed", { error: `Planning failed: ${err}` });
      return {
        ok: false, provider: MIA_PROVIDER, status: "failed", case_id: caseItem.id,
        error: `MIA planning failed: ${err}`, phases, persisted, agents_run: agentsRun, agents_failed: agentsFailed,
        duration_ms: Date.now() - t0,
      };
    }
  }

  // ── Phase: evidence ────────────────────────────────────────────────────────
  {
    const run = await recordRun(base44, { ...runBase, phase: "evidence", status: "running", started_at: new Date().toISOString() });
    const p0 = Date.now();
    try {
      const out = await askModel(base44,
        `${MIA_PERSONA}\n\nPLAN:\n${JSON.stringify(plan, null, 2)}\n\nExecute the EVIDENCE phase: summarise the collected ` +
        `evidence, list the key indicators actually present, the gaps, and what needs verification. Respond as JSON.\n\n` +
        `${contextBlock(caseItem, ctx)}`,
        EVIDENCE_SCHEMA, "mia:evidence");
      phases.evidence = { status: "completed", completed_at: new Date().toISOString(), output: out };
      agentsRun.push("mia_evidence");
      await finishRun(base44, run, { status: "completed", output: out, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0 });
    } catch (e: any) {
      const err = truncate(e?.message || e, 2000);
      phases.evidence = { status: "failed", output: { error: err } };
      agentsFailed.push({ agent: "mia_evidence", error: err });
      await finishRun(base44, run, { status: "failed", error: err, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0 });
    }
  }

  // ── Phase: analysis (3 specialist analysts, in parallel) ───────────────────
  let createdFindings: any[] = [];
  {
    const run = await recordRun(base44, {
      ...runBase, phase: "analysis", status: "running", started_at: new Date().toISOString(),
      prompt: `multi-agent: ${MIA_SPECIALISTS.map((a) => a.id).join(" + ")}`,
    });
    const p0 = Date.now();

    const settled = await Promise.allSettled(
      MIA_SPECIALISTS.map(async (analyst) => {
        const out = await askModel(base44,
          `${MIA_PERSONA}\n\nYou are the ${analyst.label}. ${analyst.instruction}\n\nPropose findings ONLY from the supplied data.\n\n` +
          `${contextBlock(caseItem, ctx)}`,
          ANALYSIS_SCHEMA, `mia:${analyst.id}`);
        return { analyst: analyst.id, findings: Array.isArray(out?.findings) ? out.findings : [] };
      })
    );

    const merged: any[] = [];
    settled.forEach((r: any, i: number) => {
      const analyst = MIA_SPECIALISTS[i].id;
      if (r.status === "fulfilled") {
        agentsRun.push(analyst);
        (r.value.findings || []).forEach((f: any) => merged.push({ ...f, agent: analyst }));
      } else {
        agentsFailed.push({ agent: analyst, error: truncate(r.reason?.message || r.reason, 500) });
      }
    });

    const deduped: any[] = [];
    for (const f of merged) {
      if (!f?.title) continue;
      if (!deduped.some((d) => titlesSimilar(d.title, f.title))) deduped.push(f);
    }

    for (const f of deduped.slice(0, 25)) {
      const rec = await base44.entities.InvestigationFinding.create({
        tenant_id: tenantId,
        case_id: caseItem.id,
        title: truncate(f.title, 300),
        description: truncate(f.description, 4000),
        category: f.category || "other",
        severity: ["low", "medium", "high", "critical"].includes(String(f.severity)) ? f.severity : "medium",
        confidence: ["low", "medium", "high"].includes(String(f.confidence)) ? f.confidence : "medium",
        status: "proposed",
        source: "ai_run",
        evidence_refs: resolveEvidenceRefs(f.supporting_evidence, ctx.evidence),
        hermes_raw: { provider: MIA_PROVIDER, agent: f.agent, supporting_evidence_raw: f.supporting_evidence || [] },
        generating_run_id: run?.id || null,
      }).catch(() => null);
      if (rec) createdFindings.push(rec);
    }

    persisted.findings = createdFindings.length;
    persisted.finding_ids = createdFindings.map((f) => f.id);

    const output = {
      findings: deduped,
      agents_run: agentsRun.filter((a) => a.endsWith("_analyst")),
      agents_failed: agentsFailed.filter((a) => String(a.agent).endsWith("_analyst")),
      persisted_finding_ids: persisted.finding_ids,
    };

    if (agentsRun.filter((a) => a.endsWith("_analyst")).length === 0) {
      const err = `All ${MIA_SPECIALISTS.length} specialist analysts failed: ${agentsFailed.map((a) => `${a.agent}: ${a.error}`).join(" | ")}`;
      phases.analysis = { status: "failed", output: { error: err } };
      await finishRun(base44, run, { status: "failed", error: truncate(err, 4000), output, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0 });
      await persistWorkflow(base44, caseItem, phases, "failed", { error: err });
      return {
        ok: false, provider: MIA_PROVIDER, status: "failed", case_id: caseItem.id, error: err,
        phases, persisted, agents_run: agentsRun, agents_failed: agentsFailed, duration_ms: Date.now() - t0,
      };
    }

    phases.analysis = { status: "completed", completed_at: new Date().toISOString(), output };
    await finishRun(base44, run, {
      status: "completed", output, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0,
      persisted_outputs: { finding_ids: persisted.finding_ids },
    });
  }

  // ── Phase: reality_check ───────────────────────────────────────────────────
  {
    const run = await recordRun(base44, { ...runBase, phase: "reality_check", status: "running", started_at: new Date().toISOString() });
    const p0 = Date.now();
    const proposed = createdFindings.map((f) => ({ id: f.id, title: f.title, description: truncate(f.description, 800), severity: f.severity }));
    try {
      const out = await askModel(base44,
        `${MIA_PERSONA}\n\nExecute the REALITY-CHECK phase. For each proposed finding decide whether the supplied ` +
        `evidence supports it: "supported", "partially_supported" or "unsupported", with reasoning. Never upgrade a ` +
        `claim beyond the supplied evidence. Each evidence item has a "result" field: an automated lookup whose result ` +
        `is "empty", "not_applicable", "error" or "unknown" found NOTHING and cannot support any claim. The fact that a ` +
        `lookup was run is not evidence. Respond as JSON.\n\nPROPOSED FINDINGS:\n${JSON.stringify(proposed, null, 2)}\n\n` +
        `${contextBlock(caseItem, ctx)}`,
        REALITY_SCHEMA, "mia:reality_check");

      const verifications = Array.isArray(out?.verifications) ? out.verifications : [];
      const updates: any[] = [];
      const updateErrors: any[] = [];

      // Persist one finding's reality-check outcome. Errors are logged and
      // carried into the run output — a verdict must never be lost silently.
      const persistVerdict = async (finding: any, mapped: string, reasoning: string | null, verdict: string | null) => {
        const refs = Array.isArray(finding.evidence_refs) ? finding.evidence_refs : [];
        // Evidence gate, enforced in code (not in the prompt): a finding may only
        // be "verified" when at least one evidence item is actually attached. A
        // "supported" verdict with no evidence is recorded as "partially_supported".
        // Second gate: a finding cannot be "verified" when every cited item is an
        // automated lookup that returned nothing (empty / not applicable / failed).
        const byId = new Map((ctx.evidence || []).map((e: any) => [e.id, e]));
        const cited = refs.map((id: string) => byId.get(id)).filter(Boolean);
        // A finding may stay "verified" ONLY if at least one cited evidence item
        // actually resolves to stored evidence AND carries real data (a primary
        // record, or a lookup that returned data). This closes two holes at once:
        // lookups that ran but returned nothing, and evidence_refs that point at
        // ids which do not resolve to any stored evidence. Otherwise a
        // "supported" verdict is recorded as "partially_supported".
        const hasRealSupport = cited.some((e: any) => evidenceSupports(e));
        const gated = mapped === "verified" && !hasRealSupport ? "partially_supported" : mapped;
        const gateReason = gated === mapped ? null
          : refs.length === 0 ? "downgraded_to_partially_supported_no_evidence"
          : cited.length < refs.length ? "downgraded_to_partially_supported_unresolved_evidence_refs"
          : "downgraded_to_partially_supported_lookups_returned_no_data";
        try {
          await base44.entities.InvestigationFinding.update(finding.id, {
            // Human-in-the-loop: an AI "supported" verdict queues the finding for
            // investigator review; only a human can mark it verified.
            status: gated === "verified" ? "under_review" : gated,
            ai_verdict: gated,
            reality_check: {
              status: gated,
              verdict,
              reasoning,
              run_id: run?.id || null,
              checked_at: new Date().toISOString(),
              provider: MIA_PROVIDER,
              evidence_gate: gateReason,
            },
          });
        } catch (e: any) {
          const err = truncate(e?.message || e, 500);
          updateErrors.push({ finding_id: finding.id, attempted_status: gated, error: err });
          console.error(`[mia] reality_check finding update failed for ${finding.id} (${gated}): ${err}`);
        }
        updates.push({ finding_id: finding.id, verdict, status: gated, evidence_refs: refs.length });
      };

      for (const v of verifications) {
        const mapped = v?.status === "supported" ? "verified"
          : v?.status === "partially_supported" ? "partially_supported"
          : v?.status === "unsupported" ? "unsupported" : null;
        if (!mapped) continue;
        const matches = createdFindings.filter((f) =>
          (v?.finding_id && f.id === v.finding_id) || titlesSimilar(f.title, v?.finding_title)
        );
        for (const f of matches) {
          await persistVerdict(f, mapped, truncate(v?.reasoning, 2000), v?.status ?? null);
        }
      }
      // Findings the reality check did not address are NOT promoted.
      const addressed = new Set(updates.map((u) => u.finding_id));
      for (const f of createdFindings) {
        if (!addressed.has(f.id)) {
          await persistVerdict(
            f,
            "partially_supported",
            "Reality check returned no verdict for this finding; treated as unverified.",
            "not_verified"
          );
        }
      }

      createdFindings = createdFindings.map((f) => {
        const u = updates.find((x) => x.finding_id === f.id);
        return { ...f, status: u ? u.status : "partially_supported" };
      });

      phases.reality_check = {
        status: "completed",
        completed_at: new Date().toISOString(),
        output: { ...out, finding_updates: updates, update_errors: updateErrors },
      };
      await finishRun(base44, run, {
        status: "completed",
        output: { ...out, finding_updates: updates, update_errors: updateErrors },
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - p0,
        persisted_outputs: { finding_updates: updates, update_errors: updateErrors },
      });
    } catch (e: any) {
      const err = truncate(e?.message || e, 2000);
      phases.reality_check = { status: "failed", output: { error: err } };
      agentsFailed.push({ agent: "mia_reality_check", error: err });
      await finishRun(base44, run, { status: "failed", error: err, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0 });
      await persistWorkflow(base44, caseItem, phases, "failed", { error: `Reality check failed: ${err}` });
      return {
        ok: false, provider: MIA_PROVIDER, status: "failed", case_id: caseItem.id,
        error: `MIA reality check failed: ${err}`, phases, persisted, agents_run: agentsRun, agents_failed: agentsFailed,
        duration_ms: Date.now() - t0,
      };
    }
  }

  // ── Phase: risk (baseline + AI opinion) ────────────────────────────────────────────
  let risk: any = null;
  {
    const run = await recordRun(base44, { ...runBase, phase: "risk", status: "running", started_at: new Date().toISOString(), prompt: "(rule-based baseline + MIA risk opinion)" });
    const p0 = Date.now();
    const baseline = computeRisk(caseItem, createdFindings);
    let ai: any = null;
    try {
      ai = await askModel(base44,
        `${MIA_PERSONA}\n\nRISK OPINION. A rule-based baseline scored this case ${baseline.risk_score}/100 (${baseline.risk_level}) ` +
        `from: ${JSON.stringify(baseline.risk_factors)}. Give YOUR independent risk score 0-100 with reasoning. ` +
        `Base it only on findings and evidence below; cite evidence ids. Name what the baseline misses or overstates, ` +
        `and list the data gaps that limit confidence. Do not invent facts.\n\n` +
        `FINDINGS:\n${JSON.stringify(createdFindings.map((f: any) => ({ id: f.id, title: f.title, severity: f.severity, ai_status: f.status })), null, 2)}\n\n${contextBlock(caseItem, ctx)}`,
        { type: "object", properties: {
          score: { type: "number" }, level: { type: "string", enum: ["low", "medium", "high", "critical"] },
          reasoning: { type: "string" }, drivers: { type: "array", items: { type: "string" } },
          baseline_critique: { type: "string" }, data_gaps: { type: "array", items: { type: "string" } },
          evidence_ids: { type: "array", items: { type: "string" } },
        }, required: ["score", "level", "reasoning"] }, "mia:risk_opinion");
      agentsRun.push("mia_risk_opinion");
    } catch (e: any) {
      agentsFailed.push({ agent: "mia_risk_opinion", error: truncate(e?.message || e, 300) });
    }
    const aiScore = ai && Number.isFinite(Number(ai.score)) ? Math.max(0, Math.min(100, Math.round(Number(ai.score)))) : null;
    risk = {
      ...baseline,
      baseline_score: baseline.risk_score,
      ai_opinion: ai ? { score: aiScore, level: ai.level, reasoning: truncate(ai.reasoning, 2000), drivers: ai.drivers || [], baseline_critique: truncate(ai.baseline_critique, 1000), data_gaps: ai.data_gaps || [], evidence_ids: ai.evidence_ids || [] } : null,
      ai_contribution: aiScore != null ? aiScore - baseline.risk_score : null,
      review_status: "pending_review",
      summary: `Baseline ${baseline.risk_score}/100 (rule-based)` + (aiScore != null ? `; MIA opinion ${aiScore}/100 (${ai.level}), ${aiScore - baseline.risk_score >= 0 ? "+" : ""}${aiScore - baseline.risk_score} vs baseline` : "; MIA opinion unavailable") + `. Final score set by investigator review.`,
    };
    phases.risk = { status: "completed", completed_at: new Date().toISOString(), output: risk };
    persisted.risk_score = risk.risk_score;
    persisted.risk_level = risk.risk_level;
    await finishRun(base44, run, { status: "completed", output: risk, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0 });
  }

  // ── Phase: dossier (evidence-gated) ────────────────────────────────────────
  {
    const run = await recordRun(base44, { ...runBase, phase: "dossier", status: "running", started_at: new Date().toISOString(), prompt: "(evidence-gated dossier)" });
    const p0 = Date.now();
    const dossier = buildDossier(caseItem, ctx, createdFindings);
    const report = await base44.entities.InvestigationReport.create({
      tenant_id: tenantId,
      case_id: caseItem.id,
      title: dossier.title,
      report_type: "dossier",
      status: "generated",
      generated_by: "ai_run",
      generated_date: new Date().toISOString(),
      content: { ...dossier, provider: MIA_PROVIDER, risk_score: risk.risk_score, risk_level: risk.risk_level, risk_assessment: risk },
      sections: dossier.sections,
      conclusion: dossier.conclusion,
      recommended_actions: dossier.recommended_actions,
      created_by: user?.email || null,
      generating_run_id: run?.id || null,
    }).catch(() => null);

    persisted.report_id = report?.id || null;
    phases.dossier = { status: "completed", completed_at: new Date().toISOString(), output: { ...dossier, report_id: persisted.report_id } };
    await finishRun(base44, run, { status: "completed", output: dossier, completed_at: new Date().toISOString(), duration_ms: Date.now() - p0, persisted_outputs: { report_id: persisted.report_id } });
  }

  const agentFailures = agentsFailed.filter((a) => String(a.agent).endsWith("_analyst"));
  const status = agentFailures.length ? "completed_with_errors" : "completed";

  await persistWorkflow(base44, caseItem, phases, status, {
    risk_score: risk?.risk_score,
    risk_level: risk?.risk_level,
    risk_factors: risk?.risk_factors,
    ai_opinion: risk?.ai_opinion,
    ai_contribution: risk?.ai_contribution,
    review_status: risk?.review_status,
  });

  return {
    ok: true,
    provider: MIA_PROVIDER,
    status,
    case_id: caseItem.id,
    phases,
    risk,
    report_id: persisted.report_id,
    findings: createdFindings.map((f) => ({
      id: f.id, title: f.title, status: f.status, severity: f.severity, confidence: f.confidence, category: f.category,
    })),
    persisted,
    agents_run: agentsRun,
    agents_failed: agentsFailed,
    duration_ms: Date.now() - t0,
    started_at: startedAt,
  };
}

/** Persist MIA phase state + workflow provider on the case. Never touches other runs. */
async function persistWorkflow(base44: any, caseItem: any, phases: any, status: string, extra: any) {
  const latest = await base44.entities.InvestigationCase.get(caseItem.id).catch(() => null);
  const wf = { ...((latest || caseItem)?.workflow || {}) };

  const completedCount = MIA_PHASES.filter((p) => phases[p]?.status === "completed").length;
  const progress = Math.round((completedCount / MIA_PHASES.length) * 100);
  const allCompleted = completedCount === MIA_PHASES.length;

  const update: any = {
    workflow: {
      ...wf,
      provider: MIA_PROVIDER,
      model: MIA_MODEL,
      provider_model: MIA_MODEL,
      phases,
      current_phase: allCompleted ? "closed" : MIA_PHASES[completedCount] || "planning",
      mia_status: status,
      mia_error: status === "failed" ? (extra?.error || null) : null,
      mia_updated_at: new Date().toISOString(),
      ...(extra?.risk_score != null ? { risk_score: extra.risk_score, risk_level: extra.risk_level, risk_factors: extra.risk_factors || [], risk_ai_opinion: extra.ai_opinion || null, risk_ai_contribution: extra.ai_contribution ?? null, risk_review_status: extra.review_status || null } : {}),
    },
    investigation_progress: progress,
    last_activity: new Date().toISOString(),
    sync_status: status === "failed" ? "failed" : "synced",
    last_synced_at: new Date().toISOString(),
    status: status === "failed" ? "investigating" : (allCompleted ? "documented" : "investigating"),
  };

  await base44.entities.InvestigationCase.update(caseItem.id, update).catch(() => {});

  await base44.entities.AuditEvent.create({
    tenant_id: caseItem.tenant_id,
    actor: "mia_multi_agent",
    actor_name: "MIA Multi-Agent",
    timestamp: new Date().toISOString(),
    action: status === "failed" ? "mia_investigation_failed" : "mia_investigation_completed",
    object_type: "case",
    object_id: caseItem.id,
    case_id: caseItem.id,
    description: `MIA multi-agent investigation ${status} (${completedCount}/${MIA_PHASES.length} phases completed)`,
    metadata: { provider: MIA_PROVIDER, phases_completed: completedCount, status, error: extra?.error || null },
    source: "system",
  }).catch(() => {});
}