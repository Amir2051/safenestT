/**
 * Hermes Investigation Engine — Integration Layer
 *
 * Hermes is the AUTHORITATIVE backend for all investigation work:
 * evidence processing, blockchain analysis, entities, relationships,
 * timeline, findings, risk, reports, and agent execution.
 *
 * SECURITY RULES (enforced by design):
 *  - No API keys or credentials ever live in frontend code.
 *  - All Hermes calls are proxied through a Base44 backend function
 *    (`hermesProxy`) so secrets stay server-side.
 *  - The frontend only reads a public base URL (VITE_HERMES_API_URL)
 *    to know whether Hermes is configured.
 *
 * CONNECTION STATES:
 *  - "not_connected"      : VITE_HERMES_API_URL is not set.
 *  - "backend_unavailable": URL is set, but the hermesProxy backend
 *                            function is not accessible (plan limitation).
 *  - "configured"         : URL is set; calls will be proxied server-side.
 *  - "ok"                 : Hermes responded.
 *
 * This layer NEVER fabricates data. When unavailable, it returns a
 * structured not-connected result so the UI can show honest states.
 */

const HERMES_BASE_URL = import.meta.env.VITE_HERMES_API_URL || "";
export const HERMES_PROXY_FUNCTION = "hermesProxy";

/**
 * Returns the current Hermes connection descriptor.
 */
export function getHermesStatus() {
  if (!HERMES_BASE_URL) {
    return { connected: false, state: "not_connected", baseUrl: null };
  }
  return { connected: true, state: "configured", baseUrl: HERMES_BASE_URL };
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