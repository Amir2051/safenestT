/**
 * tenantProviderKeys — one place that decides which key an OSINT provider uses.
 *
 * Resolution order, per tenant:
 *   1. the organization's own credential (TenantProviderCredential, service-role
 *      only — the key never reaches a browser), then
 *   2. the platform secret (SHODAN_API_KEY / VIRUSTOTAL_API_KEY).
 *
 * Keys are only ever read inside backend functions and are never logged or
 * returned in a response body. Callers expose `source` (tenant | platform) and
 * a masked last-four, nothing more.
 */

export type ProviderId = "shodan" | "virustotal";

export type ProviderMeta = {
  label: string;
  secretName: string;
  category: string;
  targetHint: string;
  note: string;
};

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  shodan: {
    label: "Shodan",
    secretName: "SHODAN_API_KEY",
    category: "infrastructure",
    targetHint: "IP address",
    note: "Host, open-port and organization intelligence for an IP address.",
  },
  virustotal: {
    label: "VirusTotal",
    secretName: "VIRUSTOTAL_API_KEY",
    category: "reputation",
    targetHint: "Domain / IP / URL",
    note: "Reputation and multi-engine detection results for a domain or IP.",
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export const isProviderId = (value: unknown): value is ProviderId =>
  typeof value === "string" && (PROVIDER_IDS as string[]).includes(value);

export const maskKey = (key: string | null | undefined): string | null =>
  key ? `••••••${String(key).slice(-4)}` : null;

const TIMEOUT_MS = 15000;

async function timedFetch(url: string, opts: unknown = {}, ms = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...(opts as RequestInit), signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

/**
 * Live check that a provider accepts this key. Never throws — returns
 * { ok:false, error } with the provider's own reason so provisioning can be
 * refused honestly instead of storing a key that does not work.
 */
export async function verifyProviderKey(
  provider: ProviderId,
  key: string,
): Promise<{ ok: boolean; error?: string; detail?: Record<string, unknown> }> {
  const clean = String(key || "").trim();
  if (!clean) return { ok: false, error: "The key is empty." };

  try {
    if (provider === "shodan") {
      const res = await timedFetch(`https://api.shodan.io/api-info?key=${encodeURIComponent(clean)}`);
      const text = await res.text().catch(() => "");
      if (!res.ok) {
        return { ok: false, error: `Shodan rejected the key (${res.status}): ${text.slice(0, 160)}` };
      }
      let json: Record<string, unknown> = {};
      try { json = JSON.parse(text); } catch { json = {}; }
      return {
        ok: true,
        detail: { plan: json?.plan ?? null, query_credits: json?.query_credits ?? null },
      };
    }

    // VirusTotal: a key is valid if the API answers the resource with 200.
    // 429 means the key is recognised but its quota is exhausted, so the key
    // itself is valid — record the quota state rather than refusing it.
    const res = await timedFetch("https://www.virustotal.com/api/v3/domains/google.com", {
      headers: { "x-apikey": clean },
    });
    if (res.status === 429) {
      return { ok: true, detail: { quota: "exhausted", note: "Key is valid but its request quota is currently exhausted." } };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `VirusTotal rejected the key (${res.status}): ${text.slice(0, 160)}` };
    }
    return { ok: true, detail: { quota: "available" } };
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };
    return {
      ok: false,
      error: err?.name === "AbortError"
        ? `${PROVIDERS[provider].label} did not answer in time.`
        : `${PROVIDERS[provider].label} could not be reached: ${err?.message || String(e)}`,
    };
  }
}

type AnyEntities = {
  TenantProviderCredential: {
    filter: (query: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
  };
};

/**
 * Resolve the key for a tenant + provider. Tenant credential first, then the
 * platform secret. Service-role client required (the entity is closed to
 * browsers by RLS).
 */
export async function resolveProviderKey(
  serviceRoleEntities: AnyEntities,
  tenantId: string | null | undefined,
  provider: ProviderId,
  secrets: { get: (name: string) => string | undefined },
): Promise<{ key: string | null; source: "tenant" | "platform" | null; credential_id: string | null }> {
  if (tenantId) {
    const rows = await serviceRoleEntities.TenantProviderCredential
      .filter({ tenant_id: tenantId, provider, status: "active" })
      .catch(() => []);
    const row = (rows || [])[0];
    const tenantKey = typeof row?.api_key === "string" ? row.api_key.trim() : "";
    if (tenantKey) {
      return { key: tenantKey, source: "tenant", credential_id: String(row?.id || "") || null };
    }
  }

  const platformKey = (secrets.get(PROVIDERS[provider].secretName) || "").trim();
  if (platformKey) return { key: platformKey, source: "platform", credential_id: null };

  return { key: null, source: null, credential_id: null };
}