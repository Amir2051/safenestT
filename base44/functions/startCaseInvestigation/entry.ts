import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  validateProviderId,
  PROVIDER_IDS,
  providerLabel,
  providerModel,
} from "../../shared/investigationProvider.ts";
import { runMiaInvestigation } from "../../shared/miaEngine.ts";

/**
 * startCaseInvestigation — the single entry point for launching an
 * investigation pipeline on a case.
 *
 * Contract: IN { case_id, provider }  where provider is "hermes" | "mia".
 *
 *   1. authenticate the caller
 *   2. VALIDATE the administrator's per-run provider selection — an unknown or
 *      missing provider is rejected, never coerced to a default
 *   3. resolve the case under the caller's RLS (tenant/ownership isolation)
 *   4. persist the confirmed selection on the case so the run is auditable and
 *      the sync guards can tell which provider owns this case
 *   5. route the WHOLE pipeline to that one provider:
 *        hermes -> syncCaseToHermes (create/reuse) + hermesProxy start_investigation
 *        mia    -> the MIA multi-agent engine (roster in shared/miaAgents.ts)
 *
 * There is no fallback between providers. A provider failure is returned as a
 * failure for that provider; retrying with the other one requires a new,
 * explicit request from the administrator.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const caseIdInput = payload?.case_id;
    if (!caseIdInput) return Response.json({ ok: false, status: "bad_request", error: "case_id is required" }, { status: 400 });

    // ── 1. Validate the provider selection before anything executes ──────────
    const requestedRaw = payload?.provider;
    if (requestedRaw == null || String(requestedRaw).trim() === "") {
      return Response.json({
        ok: false,
        status: "provider_required",
        error: "No investigation provider was confirmed. Select Hermes Agent or MIA Multi-Agent and confirm before starting the pipeline.",
        valid_providers: PROVIDER_IDS,
      }, { status: 400 });
    }
    const provider = validateProviderId(requestedRaw);
    if (!provider) {
      return Response.json({
        ok: false,
        status: "invalid_provider",
        error: `Unknown investigation provider "${requestedRaw}". The only supported providers are: ${PROVIDER_IDS.join(", ")}.`,
        valid_providers: PROVIDER_IDS,
      }, { status: 400 });
    }

    // ── 2. Resolve the case under the caller's RLS ────────────────────────
    const resolved = await base44.functions.invoke("resolveInvestigationCase", { case_id: caseIdInput });
    const resolvedBody: any = resolved?.data ?? resolved;
    const caseId = resolvedBody?.case_id;
    if (!caseId) {
      return Response.json(
        { ok: false, status: resolvedBody?.status || "not_found", error: resolvedBody?.error || "Case not found or no access" },
        { status: 404 }
      );
    }
    const caseItem = resolvedBody?.case
      || (await base44.entities.InvestigationCase.get(caseId).catch((e: any) => (e?.status === 404 ? null : Promise.reject(e))));
    if (!caseItem) {
      return Response.json({ ok: false, status: "not_found", error: "Case not found or no access" }, { status: 404 });
    }

    // ── 3. Persist the confirmed selection on the case ────────────────────
    const selectedAt = new Date().toISOString();
    const selection = {
      provider,
      provider_label: providerLabel(provider),
      provider_model: providerModel(provider),
      provider_selected_by: user.email || user.id || null,
      provider_selected_at: selectedAt,
    };
    await base44.entities.InvestigationCase.update(caseId, {
      workflow: { ...(caseItem.workflow || {}), ...selection },
      last_activity: selectedAt,
    }).catch(() => { /* the run below still reports the provider it used */ });

    // ── 4. Route to the selected provider only ──────────────────────────
    if (provider === "mia") {
      const result = await runMiaInvestigation({ base44, caseItem, user, tenantId: caseItem.tenant_id });
      const ok = result?.ok === true && (result?.status === "completed" || result?.status === "completed_with_errors");
      return Response.json(
        { ...result, ok, provider: "mia", provider_source: "run_request", case_id: caseId },
        { status: 200 }
      );
    }

    // Hermes Agent — existing lifecycle, unchanged. The explicit provider is
    // forwarded so a MIA-configured default cannot block an administrator's
    // one-off Hermes run.
    const sync = await base44.functions.invoke("syncCaseToHermes", { case_id: caseId, provider: "hermes" });
    const syncBody: any = sync?.data ?? sync;
    if (!syncBody?.ok || !syncBody?.hermes_investigation_id) {
      return Response.json({
        ok: false,
        provider: "hermes",
        provider_source: "run_request",
        status: syncBody?.status || "sync_failed",
        error: syncBody?.error || "Hermes did not return an investigation_id",
        case_id: caseId,
      }, { status: 200 });
    }

    const investigationId = syncBody.hermes_investigation_id;
    const start = await base44.functions.invoke("hermesProxy", {
      action: "start_investigation",
      investigation_id: investigationId,
    });
    const startBody: any = start?.data ?? start;

    return Response.json({
      ok: startBody?.ok === true,
      provider: "hermes",
      provider_source: "run_request",
      case_id: caseId,
      hermes_investigation_id: investigationId,
      sync_action: syncBody.action,
      started: startBody?.ok === true,
      hermes_status: startBody?.data?.status || null,
      start_error: startBody?.ok === true ? null : (startBody?.error || "Hermes rejected the start request"),
      upstream_status: startBody?.upstream_status,
    }, { status: 200 });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error) }, { status: 500 });
  }
}
