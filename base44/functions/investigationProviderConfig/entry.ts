import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import {
  PROVIDERS, normaliseProvider, isPlatformAdmin, readProviderConfig, writeProviderConfig,
} from "../../shared/investigationProvider.ts";

/**
 * investigationProviderConfig — read and change the global investigation
 * provider, and health-test either provider.
 *
 *   action "get"  (any signed-in user)  -> { provider, providers, configured, updated_at, updated_by }
 *   action "set"  (platform admin only) -> persists the default provider
 *   action "test" (any signed-in user)  -> real health check of one provider
 *
 * Authorisation is enforced here, not in the UI: a non-admin "set" is rejected
 * with 403 and nothing is written.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || "get").toLowerCase();

    if (action === "get") {
      const config = await readProviderConfig(base44);
      return Response.json({ ok: true, ...config, providers: PROVIDERS, is_admin: isPlatformAdmin(user) });
    }

    if (action === "set") {
      if (!isPlatformAdmin(user)) {
        return Response.json({ ok: false, error: "Only an administrator can change the investigation provider" }, { status: 403 });
      }
      const requested = payload?.provider;
      if (!requested) return Response.json({ ok: false, error: "provider is required" }, { status: 400 });

      const saved = await writeProviderConfig(base44, requested, user.email);
      return Response.json({ ok: true, ...saved, providers: PROVIDERS, is_admin: true });
    }

    if (action === "test") {
      const config = await readProviderConfig(base44);
      const provider = payload?.provider ? normaliseProvider(payload.provider) : config.provider;
      const t0 = Date.now();

      if (provider === "mia") {
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: 'Reply with exactly {"ok": true} and nothing else.',
            response_json_schema: { type: "object", properties: { ok: { type: "boolean" } } },
          });
          const parsed: any = typeof res === "string" ? JSON.parse(res) : (res?.data ?? res);
          return Response.json({
            ok: parsed?.ok === true,
            provider,
            status: parsed?.ok === true ? "ok" : "degraded",
            ms: Date.now() - t0,
            sample: JSON.stringify(parsed).slice(0, 160),
          });
        } catch (e: any) {
          return Response.json({ ok: false, provider, status: "failed", ms: Date.now() - t0, error: e?.message || String(e) });
        }
      }

      const health = await base44.functions.invoke("hermesProxy", { action: "health" });
      const body: any = health?.data ?? health;
      const hm: any = body?.data?.model || {};
      return Response.json({
        ok: body?.ok === true,
        provider: "hermes",
        status: body?.ok === true ? "ok" : (body?.status || "failed"),
        ms: Date.now() - t0,
        model: hm.model || hm.id || null,
        model_provider: hm.provider || null,
        error: body?.ok === true ? undefined : body?.error,
      });
    }

    return Response.json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}
