import { base44 } from "@/api/base44Client";

/**
 * Provider dispatch.
 *
 * The administrator selects the provider in the launch workflow and confirms it;
 * that selection is passed here explicitly and forwarded to the backend, which
 * validates it and runs ONLY that provider. There is no client-side fallback and
 * no provider is inferred when the selection is missing.
 *
 * Returns either:
 *   { provider: "hermes", hermes_investigation_id, started, start_error, ... }
 *   { provider: "mia", status, phases, findings, report_id, persisted, ... }
 */
export async function dispatchInvestigation(caseId, provider) {
  if (!provider) throw new Error("No investigation provider was selected.");
  const res = await base44.functions.invoke("startCaseInvestigation", { case_id: caseId, provider });
  const body = res?.data ?? res;
  if (!body) throw new Error("Investigation dispatch returned no response");
  return body;
}

/** Read the administrator-configured default provider (any signed-in user). */
export async function getProviderConfig() {
  const res = await base44.functions.invoke("investigationProviderConfig", { action: "get" });
  return res?.data ?? res;
}