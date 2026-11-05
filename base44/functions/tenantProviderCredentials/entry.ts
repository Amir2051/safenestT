import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import { secrets } from "base44:runtime";
import {
  PROVIDERS,
  PROVIDER_IDS,
  isProviderId,
  verifyProviderKey,
  maskKey,
} from "../../shared/tenantProviderKeys.ts";

/**
 * tenantProviderCredentials — secure, tenant-scoped provisioning of the OSINT
 * provider keys used by SafeNestT's investigation agents (Shodan, VirusTotal).
 *
 * Security model:
 *  - The key is written to TenantProviderCredential, whose RLS denies reading
 *    to every browser session (platform admins included). Only this function,
 *    running with the service role, ever reads it back.
 *  - The caller's tenant comes from the locked User.tenant_id, never from the
 *    request body, so a tenant cannot provision into another tenant.
 *  - Only an organization administrator (ORG_ADMIN membership) or a platform
 *    admin may set or remove a key. Any member may read the masked status.
 *  - A key is proven against the live provider before it is stored, so a saved
 *    credential is never one that reports "unconfigured" later.
 *  - Responses only ever carry { configured, source, masked, verified_at }.
 *
 * Actions: status (default) | set | verify | remove
 */
const now = () => new Date().toISOString();

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!me) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body?.action || "status";
    const entities = base44.asServiceRole.entities;
    const tenantId = me.tenant_id || me.data?.tenant_id || null;

    if (!tenantId) {
      return Response.json({ ok: false, error: "No organization is linked to this account yet." });
    }

    const isPlatformAdmin = me.role === "admin";
    const canManage = async (): Promise<boolean> => {
      if (isPlatformAdmin) return true;
      const memberships = await entities.TenantMembership
        .filter({ tenant_id: tenantId, user_id: me.id, status: "active" })
        .catch(() => []);
      return (memberships || []).some((m: any) =>
        m.organization_role === "ORG_ADMIN" || m.role === "owner" || m.role === "admin");
    };

    const audit = (event: string, details: Record<string, unknown>) =>
      entities.AuditLog.create({
        action_type: `provider_credential_${event}`,
        action_category: "security",
        description: `${event} by ${me.email}`,
        metadata: { actor_id: me.id, tenant_id: tenantId, ...details },
        severity: "info",
        status: "success",
      }).catch((e: any) => console.error("provider credential audit write failed:", e?.message));

    if (action === "status") {
      const rows = await entities.TenantProviderCredential
        .filter({ tenant_id: tenantId })
        .catch(() => []);
      const providers = PROVIDER_IDS.map((id) => {
        const row = (rows || []).find((r: any) => r.provider === id) || null;
        const platformKey = (secrets.get(PROVIDERS[id].secretName) || "").trim();
        const source = row ? "tenant" : platformKey ? "platform" : null;
        return {
          provider: id,
          label: PROVIDERS[id].label,
          category: PROVIDERS[id].category,
          target_hint: PROVIDERS[id].targetHint,
          note: PROVIDERS[id].note,
          configured: !!source,
          source,
          masked: row ? maskKey(typeof row.api_key === "string" ? row.api_key : "") : null,
          status: row?.status || null,
          verified_at: row?.verified_at || null,
          verified_by: row?.verified_by || null,
          last_error: row?.last_error || null,
        };
      });
      return Response.json({ ok: true, tenant_id: tenantId, providers, can_manage: await canManage() });
    }

    if (action === "set") {
      if (!(await canManage())) {
        return Response.json({ ok: false, error: "Only organization administrators can provision provider keys." }, { status: 403 });
      }
      if (!isProviderId(body.provider)) {
        return Response.json({ ok: false, error: "Unsupported provider." });
      }
      const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      if (apiKey.length < 8) {
        return Response.json({ ok: false, error: "Enter the full provider API key." });
      }

      const check = await verifyProviderKey(body.provider, apiKey);
      if (!check.ok) {
        await audit("set_rejected", { provider: body.provider, reason: String(check.error || "").slice(0, 200) });
        return Response.json({ ok: false, error: check.error || "The provider rejected this key." });
      }

      const existing = await entities.TenantProviderCredential
        .filter({ tenant_id: tenantId, provider: body.provider })
        .catch(() => []);
      const patch = {
        api_key: apiKey,
        key_last4: apiKey.slice(-4),
        status: "active",
        verified_at: now(),
        verified_by: me.email,
        last_error: null,
      };
      const row = (existing || [])[0]
        ? await entities.TenantProviderCredential.update((existing as any)[0].id, patch)
        : await entities.TenantProviderCredential.create({ tenant_id: tenantId, provider: body.provider, ...patch });

      await audit("set", { provider: body.provider, key_last4: patch.key_last4, detail: check.detail || null });

      return Response.json({
        ok: true,
        provider: body.provider,
        id: (row as any)?.id || null,
        masked: maskKey(apiKey),
        verified_at: patch.verified_at,
        detail: check.detail || null,
      });
    }

    if (action === "verify") {
      if (!(await canManage())) {
        return Response.json({ ok: false, error: "Only organization administrators can verify provider keys." }, { status: 403 });
      }
      if (!isProviderId(body.provider)) {
        return Response.json({ ok: false, error: "Unsupported provider." });
      }
      const rows = await entities.TenantProviderCredential
        .filter({ tenant_id: tenantId, provider: body.provider })
        .catch(() => []);
      const row: any = (rows || [])[0];
      if (!row?.api_key) {
        return Response.json({ ok: false, error: "This organization has no stored key for that provider." });
      }

      const check = await verifyProviderKey(body.provider, row.api_key);
      await entities.TenantProviderCredential.update(row.id, check.ok
        ? { status: "active", verified_at: now(), verified_by: me.email, last_error: null }
        : { status: "invalid", last_error: String(check.error || "").slice(0, 400) });
      await audit("verify", { provider: body.provider, ok: check.ok });

      return Response.json({ ok: check.ok, provider: body.provider, error: check.ok ? undefined : check.error, detail: check.detail || null });
    }

    if (action === "remove") {
      if (!(await canManage())) {
        return Response.json({ ok: false, error: "Only organization administrators can remove provider keys." }, { status: 403 });
      }
      if (!isProviderId(body.provider)) {
        return Response.json({ ok: false, error: "Unsupported provider." });
      }
      const rows = await entities.TenantProviderCredential
        .filter({ tenant_id: tenantId, provider: body.provider })
        .catch(() => []);
      for (const row of rows || []) {
        await entities.TenantProviderCredential.delete((row as any).id);
      }
      await audit("remove", { provider: body.provider, removed: (rows || []).length });
      return Response.json({ ok: true, provider: body.provider, removed: (rows || []).length });
    }

    return Response.json({ ok: false, error: `Unknown action: ${action}` });
  } catch (error: any) {
    console.error("tenantProviderCredentials error:", error?.message || error);
    return Response.json({ ok: false, error: error?.message || "Server error" }, { status: 500 });
  }
}