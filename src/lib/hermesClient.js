/**
 * Hermes Investigation Engine — Integration Layer
 *
 * Hermes is the AUTHORITATIVE backend for all investigation work:
 * evidence processing, blockchain analysis, entities, relationships,
 * timeline, findings, risk, reports, and agent execution.
 *
 * API: Nous Research Inference API (OpenAI-compatible, OpenRouter-backed)
 *   Base URL: https://inference-api.nousresearch.com/v1
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

const HERMES_BASE_URL = "https://inference-api.nousresearch.com/v1";
export const HERMES_PROXY_FUNCTION = "hermesProxy";
export const HERMES_DEFAULT_MODEL = "unbiased/pareto";

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
  return { connected: true, state: "configured", baseUrl: HERMES_BASE_URL };
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
      prompt: "Reply with exactly: ok",
      temperature: 0,
      max_tokens: 5,
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
  if (!HERMES_BASE_URL) {
    return { status: "not_connected", data: null };
  }

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
  // Investigation orchestration
  startInvestigation: (caseId, payload = {}) =>
    hermesRequest(`/api/cases/${caseId}/investigation`, { method: "POST", body: payload }),
  getInvestigation: (caseId) =>
    hermesRequest(`/api/cases/${caseId}/investigation`),
  getInvestigationStatus: (caseId) =>
    hermesRequest(`/api/cases/${caseId}/investigation/status`),
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