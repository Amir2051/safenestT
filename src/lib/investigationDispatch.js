import { base44 } from "@/api/base44Client";

/**
 * Provider dispatch.
 *
 * The backend (`startCaseInvestigation`) reads the saved global provider
 * configuration and executes ONLY that provider — the browser cannot choose a
 * provider per request, and there is no client-side fallback.
 *
 * Returns either:
 *   { provider: "hermes", hermes_investigation_id, started, start_error }
 *   { provider: "mia", status, phases, findings, report_id, persisted, ... }
 */
export async function dispatchInvestigation(caseId) {
  const res = await base44.functions.invoke("startCaseInvestigation", { case_id: caseId });
  const body = res?.data ?? res;
  if (!body) throw new Error("Investigation dispatch returned no response");
  return body;
}

/** Read the active provider configuration (any signed-in user). */
export async function getProviderConfig() {
  const res = await base44.functions.invoke("investigationProviderConfig", { action: "get" });
  return res?.data ?? res;
}