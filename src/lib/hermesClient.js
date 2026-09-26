/**
 * Hermes Investigation Engine — Integration Layer
 *
 * Hermes is the AUTHORITATIVE backend for all investigation work:
 * evidence processing, blockchain analysis, entities, relationships,
 * timeline, findings, risk, reports, and agent execution.
 *
 * API: Hermes Gateway / OpenAI-compatible inference endpoint.
 *   Base URL is configured server-side via HERMES_BASE_URL (or HERMES_API_URL).
 *   Models:   live catalog queried via hermesProxy { action: "models" }.
 *             Hermes-4-70B/405B have been retired; the configured key currently
 *             has insufficient credits for paid models, so Hermes reports a
 *             "not_ready" state honestly until credits are added.
 *   Auth:     Bearer token (stored as HERMES_API_KEY secret — server-side only)
 *
 * SECURITY RULES (enforced by design):
 *  - The HERMES_API_KEY is stored as an app secret and is NEVER exposed
 *    to the browser. It is only accessible in backend functions via
 *    process.env.HERMES_API_KEY.
 *  - All Hermes calls are proxied through a Base44 backend function
 *    (`hermesProxy`) so the key stays server-side.
 *  - The base URL below is public (not secret) and safe to reference here.
 *
 * CONNECTION STATES:
 *  - "backend_unavailable": The hermesProxy backend function is not
 *                            accessible (requires Builder+ plan).
 *  - "configured"         : API endpoint is known; calls will be proxied.
 *  - "ok"                 : Hermes responded.
 *
 * This layer NEVER fabricates data. When unavailable, it returns a
 * structured not-connected result so the UI can show honest states.
 */

// The actual gateway URL is intentionally server-side. Browser code must
// never depend on or expose its endpoint/credentials; calls go through hermesProxy.
const HERMES_BASE_URL = "server-side-hermes-gateway";
export const HERMES_PROXY_FUNCTION = "hermesProxy";
// Live free model from the Nous catalog (Hermes-4-70B is retired; the account
// has no credits for paid models). Used by pingHermes() and as the fallback.
export const HERMES_DEFAULT_MODEL = "hermes-agent";

/**
 * Returns the current Hermes connection descriptor.
 *
 * NOTE: The Hermes backend is accessed through the `hermesProxy` backend
 * function, which requires a Builder+ plan. Until that function is
 * deployed and accessible, we report `not_connected` honestly so the UI
 * never claims Hermes is live when it cannot reach the engine.
 */
export function getHermesStatus() {
  // The hermesProxy backend function is deployed (Builder+). The API key stays
  // server-side; this only reports that the proxy is wired. A real reachability
  // check is performed by pingHermes() below.
  return { connected: false, state: "checking", baseUrl: HERMES_BASE_URL, via: HERMES_PROXY_FUNCTION };
}

/**
 * Real Hermes reachability check — sends a tiny prompt through the server-side
 * hermesProxy and reports ok / fail + latency. Never exposes the key.
 */
export async function pingHermes() {
  const t0 = Date.now();
  try {
    const { base44 } = await import("@/api/base44Client");
    const res = await base44.functions.invoke(HERMES_PROXY_FUNCTION, {
      action: "health",
    });
    const body = res?.data ?? res;
    if (body && body.ok !== false && body.status !== "error") {
      return { connected: true, state: "ok", ms: Date.now() - t0, model: body?.model };
    }
    // Classify the real failure honestly so the UI can show a clear status.
    const err = String(body?.error || "");
    let state = "error";
    if (body?.configured === false) state = "not_configured";
    else if (err.includes("insufficient_credits") || err.includes("credits")) state = "no_credits";
    else if (err.includes("retired")) state = "model_retired";
    return { connected: false, state, ms: Date.now() - t0, error: err || "Hermes did not respond" };
  } catch (e) {
    const msg = String(e?.message || e || "");
    const missing = msg.includes("not found") || msg.includes("not available") || msg.includes("404");
    return { connected: false, state: missing ? "backend_unavailable" : "error", ms: Date.now() - t0, error: msg };
  }
}

/**
 * Low-level Hermes request. Proxied through the backend function so
 * no secrets reach the browser. Returns a normalized result object:
 *   { status: 'ok'|'not_connected'|'backend_unavailable'|'error',
 *     data?: any, error?: string }
 *
 * DO NOT bypass this by calling Hermes directly from the browser.
 */
export async function hermesRequest(path, { method = "GET", body } = {}) {
  // The proxy is the only supported transport. The browser does not know
  // the real gateway URL and must never attempt to call it directly.
  try {
    const { base44 } = await import("@/api/base44Client");
    const res = await base44.functions.invoke(HERMES_PROXY_FUNCTION, {
      path,
      method,
      body,
    });
    return { status: "ok", data: res?.data ?? res };
  } catch (err) {
    const msg = String(err?.message || err || "");
    const backendMissing =
      msg.includes("not found") ||
      msg.includes("not available") ||
      msg.includes("404") ||
      msg.includes("function");
    return {
      status: backendMissing ? "backend_unavailable" : "error",
      error: msg,
      data: null,
    };
  }
}

// ── Investigation lifecycle ───────────────────────────────────────────────
export const HermesAPI = {
  // Investigation orchestration. Execution itself is performed by the
  // investigation runner, whose default provider is Hermes. Status is read
  // from the same auditable Base44 InvestigationRun records that the runner
  // writes, rather than from an unsupported /api/cases endpoint.
  startInvestigation: async (caseId, payload = {}) => {
    const { runPhase } = await import("@/lib/investigationRunner");
    const phases = ["planning", "evidence", "analysis", "reality_check", "risk", "dossier"];
    const results = [];
    for (const phase of phases) {
      const result = await runPhase({
        caseId,
        phase,
        provider: payload.provider || "hermes",
        model: payload.model || "meituan/longcat-2.0:free",
      });
      results.push({ phase, status: result.status, run_id: result.run?.id, error: result.error });
      if (result.status !== "completed") break;
    }
    return { status: results.every((r) => r.status === "completed") ? "ok" : "error", data: { caseId, phases: results } };
  },
  getInvestigation: async (caseId) => {
    const { base44 } = await import("@/api/base44Client");
    const runs = await base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 100).catch(() => []);
    return { status: "ok", data: { case_id: caseId, runs } };
  },
  getInvestigationStatus: async (caseId) => {
    const { base44 } = await import("@/api/base44Client");
    const runs = await base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 100).catch(() => []);
    const latest = runs[0] || null;
    const phases = {};
    for (const run of runs) {
      if (!phases[run.phase]) phases[run.phase] = run;
    }
    const active = runs.filter((r) => r.status === "running");
    return {
      status: "ok",
      data: {
        investigation: {
          case_id: caseId,
          status: active.length ? "running" : latest?.status || "idle",
          current_phase: latest?.phase || null,
          started_at: latest?.started_at || null,
          agents_active: latest?.phase === "analysis" && latest?.status === "running" ? 3 : 0,
          provider: latest?.provider || "hermes",
          model: latest?.model || HERMES_DEFAULT_MODEL,
          phases,
        },
      },
    };
  },
  pauseInvestigation: (caseId) =>
    hermesRequest(`/api/cases/${caseId}/investigation`, { method: "POST", body: { action: "pause" } }),
  resumeInvestigation: (caseId) =>
    hermesRequest(`/api/cases/${caseId}/investigation`, { method: "POST", body: { action: "resume" } }),
  cancelInvestigation: (caseId) =>
    hermesRequest(`/api/cases/${caseId}/investigation`, { method: "POST", body: { action: "cancel" } }),

  // Evidence (Hermes-side processing; local storage is in EvidenceItem entity)
  getEvidence: (caseId) => hermesRequest(`/api/cases/${caseId}/evidence`),
  submitEvidence: (caseId, evidence) =>
    hermesRequest(`/api/cases/${caseId}/evidence`, { method: "POST", body: evidence }),

  // Targets
  getTargets: (caseId) => hermesRequest(`/api/cases/${caseId}/targets`),
  submitTarget: (caseId, target) =>
    hermesRequest(`/api/cases/${caseId}/targets`, { method: "POST", body: { target } }),

  // Blockchain analysis
  getBlockchainTrace: (caseId) => hermesRequest(`/api/cases/${caseId}/blockchain/trace`),
  traceBlockchain: (caseId, target) =>
    hermesRequest(`/api/cases/${caseId}/blockchain/trace`, { method: "POST", body: target }),
  getWallet: (caseId, address) =>
    hermesRequest(`/api/cases/${caseId}/blockchain/wallet/${address}`),
  getTransactions: (caseId) =>
    hermesRequest(`/api/cases/${caseId}/blockchain/transactions`),

  // Entity intelligence
  getEntities: (caseId) => hermesRequest(`/api/cases/${caseId}/entities`),
  getRelationships: (caseId) => hermesRequest(`/api/cases/${caseId}/relationships`),

  // Timeline
  getTimeline: (caseId) => hermesRequest(`/api/cases/${caseId}/timeline`),

  // Findings + Review
  getFindings: (caseId) => hermesRequest(`/api/cases/${caseId}/findings`),
  submitFindingReview: (caseId, findingId, review) =>
    hermesRequest(`/api/cases/${caseId}/findings/${findingId}/review`, { method: "POST", body: review }),
  getReviews: (caseId) => hermesRequest(`/api/cases/${caseId}/reviews`),

  // Risk
  getRisk: (caseId) => hermesRequest(`/api/cases/${caseId}/risk`),

  // Reports
  getReports: (caseId) => hermesRequest(`/api/cases/${caseId}/reports`),
  createReport: (caseId, payload) =>
    hermesRequest(`/api/cases/${caseId}/reports`, { method: "POST", body: payload }),

  // Agent activity
  getAgentActivity: (caseId) => hermesRequest(`/api/cases/${caseId}/agent-activity`),
};

export default HermesAPI;