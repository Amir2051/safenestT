/**
 * Shared investigation-provider configuration.
 *
 * Exactly two investigation providers exist:
 *   "hermes" -> Hermes Agent gateway (create → start → poll)
 *   "mia"    -> SafeNestT MIA Multi-Agent (server-side multi-agent workflow)
 *
 * The administrator-configured default is persisted in SystemConfig under the key
 * "investigation_provider". It is only a DEFAULT: the provider is chosen per run
 * in the launch workflow and passed explicitly to startCaseInvestigation, which
 * validates it and routes the entire pipeline to it with no fallback.
 *
 * SystemConfig is admin-only at the RLS layer, so routing reads are performed
 * with the service role AFTER the caller has been authenticated and case access
 * has been verified by the calling function.
 */

export const PROVIDER_CONFIG_KEY = "investigation_provider";

export type ProviderId = "hermes" | "mia";

export const PROVIDERS = [
  {
    id: "hermes",
    label: "Hermes Agent",
    model: "hermes-agent",
    description:
      "Hermes Agent gateway — multi-agent investigation pipeline over the Hermes API (create → start → poll).",
  },
  {
    id: "mia",
    label: "MIA Multi-Agent",
    model: "mia-multi-agent",
    description:
      "SafeNestT MIA multi-agent workflow — planning, evidence, three specialist analysts, reality-check, deterministic risk, evidence-gated dossier.",
  },
];

export const PROVIDER_IDS = PROVIDERS.map((p) => p.id as ProviderId);
export const DEFAULT_PROVIDER_ID: ProviderId = "hermes";

export function providerLabel(id: any): string {
  const found = PROVIDERS.find((p) => p.id === id);
  return found ? found.label : String(id ?? "");
}

export function providerModel(id: any): string {
  const found = PROVIDERS.find((p) => p.id === id);
  return found ? found.model : "";
}

/**
 * Strict validation of an explicitly requested provider.
 * Returns the canonical id, or null when the value is not one of the two
 * supported providers. Unknown values are NEVER coerced to a default here — the
 * caller must reject the request instead of silently running another provider.
 */
export function validateProviderId(value: any): ProviderId | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "hermes" || v === "hermes_agent") return "hermes";
  if (v === "mia" || v === "mia_multi_agent") return "mia";
  return null;
}

/**
 * Lenient normalisation, used only when reading the stored DEFAULT (a stored
 * value that can no longer be resolved falls back to the documented default).
 * Never use this for a per-run selection — use validateProviderId there.
 */
export function normaliseProvider(value: any): ProviderId {
  return validateProviderId(value) || DEFAULT_PROVIDER_ID;
}

export function isPlatformAdmin(user: any): boolean {
  return !!user && (user.role === "admin" || user.is_admin === true);
}

/**
 * Read the saved provider default. Never throws: an unreadable or absent config
 * resolves to the documented default (hermes) so a default always exists.
 */
export async function readProviderConfig(base44: any) {
  try {
    const res = await base44.asServiceRole.entities.SystemConfig.filter({
      key_name: PROVIDER_CONFIG_KEY,
    });
    const items = Array.isArray(res) ? res : res?.items || [];
    const row = items.find((r: any) => r?.key_name === PROVIDER_CONFIG_KEY) || items[0];
    if (!row) {
      return { provider: DEFAULT_PROVIDER_ID, configured: false, updated_at: null, updated_by: null, row_id: null };
    }
    return {
      provider: normaliseProvider(row.value),
      configured: true,
      updated_at: row.updated_date || null,
      updated_by: row.description && row.description.startsWith("set_by:") ? row.description.slice(7) : null,
      row_id: row.id || null,
    };
  } catch {
    return { provider: DEFAULT_PROVIDER_ID, configured: false, updated_at: null, updated_by: null, row_id: null };
  }
}

/**
 * Persist the provider default. Caller MUST have verified admin privileges
 * (isPlatformAdmin) before invoking this.
 */
export async function writeProviderConfig(base44: any, provider: string, actorEmail: string) {
  const id = validateProviderId(provider);
  if (!id) throw new Error(`Unknown provider: ${provider}`);

  const existing = await base44.asServiceRole.entities.SystemConfig.filter({
    key_name: PROVIDER_CONFIG_KEY,
  });
  const items = Array.isArray(existing) ? existing : existing?.items || [];
  const row = items.find((r: any) => r?.key_name === PROVIDER_CONFIG_KEY) || items[0];

  const payload = {
    key_name: PROVIDER_CONFIG_KEY,
    value: id,
    description: `set_by:${actorEmail || "unknown"}`,
  };

  if (row?.id) {
    await base44.asServiceRole.entities.SystemConfig.update(row.id, payload);
  } else {
    await base44.asServiceRole.entities.SystemConfig.create(payload);
  }
  return { provider: id, configured: true, updated_at: new Date().toISOString(), updated_by: actorEmail || null };
}