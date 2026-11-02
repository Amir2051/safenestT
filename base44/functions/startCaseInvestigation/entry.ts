import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { readProviderConfig } from "../../shared/investigationProvider.ts";
import { runMiaInvestigation } from "../../shared/miaEngine.ts";

/**
 * startCaseInvestigation — the single provider-aware entry point for starting
 * an investigation on a case.
 *
 *   1. authenticate the caller and resolve the case under the caller's RLS
 *   2. read the saved global provider configuration
 *   3. dispatch to that provider ONLY:
 *        hermes -> syncCaseToHermes (create/reuse) + hermesProxy start_investigation
 *        mia    -> the MIA multi-agent engine (server-side, persists its results)
 *   4. return the provider that actually ran, so the UI never reports the wrong engine
 *
 * There is no fallback between providers: if the selected provider fails, the
 * error is returned as-is.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const caseIdInput = payload?.case_id;
    if (!caseIdInput) return Response.json({ ok: false, error: "case_id is required" }, { status: 400 });

    const resolved = await base44.functions.invoke("resolveInvestigationCase", { case_id: caseIdInput });
    const resolvedBody: any = resolved?.data ?? resolved;
    const caseId = resolvedBody?.case_id;
    if (!caseId) {
      return Response.json(
        { ok: false, status: resolvedBody?.status || "not_found", error: resolvedBody?.error || "Case not found or no access" },
        { status: 404 }
      );
    }

    const config = await readProviderConfig(base44);
    const provider = config.provider;

    if (provider === "mia") {
      const caseItem = resolvedBody?.case || (await base44.entities.InvestigationCase.get(caseId).catch((e: any) => (e?.status === 404 ? null : Promise.reject(e))));
      if (!caseItem) return Response.json({ ok: false, status: "not_found", error: "Case not found or no access" }, { status: 404 });

      const result = await runMiaInvestigation({ base44, caseItem, user, tenantId: caseItem.tenant_id });
      return Response.json({ ...result, provider: "mia", case_id: caseId }, { status: result.ok ? 200 : 502 });
    }

    // ── Hermes Agent: existing lifecycle, unchanged ──────────────────────────
    const sync = await base44.functions.invoke("syncCaseToHermes", { case_id: caseId });
    const syncBody: any = sync?.data ?? sync;
    if (!syncBody?.ok || !syncBody?.hermes_investigation_id) {
      return Response.json({
        ok: false,
        provider: "hermes",
        status: syncBody?.status || "sync_failed",
        error: syncBody?.error || "Hermes did not return an investigation_id",
        case_id: caseId,
      }, { status: 502 });
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
      case_id: caseId,
      hermes_investigation_id: investigationId,
      sync_action: syncBody.action,
      started: startBody?.ok === true,
      hermes_status: startBody?.data?.status || null,
      start_error: startBody?.ok === true ? null : (startBody?.error || "Hermes rejected the start request"),
      upstream_status: startBody?.upstream_status,
    }, { status: startBody?.ok === true ? 200 : 502 });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error) }, { status: 500 });
  }
}