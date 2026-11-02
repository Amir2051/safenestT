/**
 * Shared investigation-provider configuration.
 *
 * The global default provider is persisted in SystemConfig under the key
 * "investigation_provider". SystemConfig is admin-only at the RLS layer, so any
 * read that must reach every investigator (routing, UI display) is performed
 * with the service role AFTER the caller has been authenticated and the case
 * access has been verified by the calling function.
 *
 * Provider ids:
 *   "hermes" -> Hermes Agent gateway (hermes-engine.safenestt.com)
 *   "mia"    -> SafeNestT MIA Multi-Agent (Base44 AI gateway, server-side)
 */

export const PROVIDER_CONFIG_KEY = "investigation_provider";

export const PROVIDERS = [
  {
    id: "hermes",
    label: "Hermes Agent",
    description: "Hermes Agent gateway — multi-agent investigation pipeline over the Hermes API (create → start → poll).",
  },
  {
    id: "mia",
    label: "MIA Multi-Agent (Base44)",
    description: "SafeNestT MIA multi-agent workflow — planning, evidence, three specialist analysts, reality-check, deterministic risk, evidence-gated dossier.",
  },
];

export const VALID_PROVIDER_IDS = PROVIDERS.map((p) => p.id);
export const DEFAULT_PROVIDER_ID = "hermes";

export function normaliseProvider(value: any): string {
  const v = String(value || "").trim().toLowerCase();
  if (v === "mia" || v === "base44" || v === "base44_mia" || v === "mia_multi_agent") return "mia";
  if (v === "hermes" || v === "hermes_agent") return "hermes";
  return DEFAULT_PROVIDER_ID;
}

export function isPlatformAdmin(user: any): boolean {
  return !!user && (user.role === "admin" || user.is_admin === true);
}

/**
 * Read the saved provider configuration. Never throws: an unreadable or absent
 * config resolves to the documented default (hermes) so routing stays defined.
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
 * Persist the global provider. Caller MUST have verified admin privileges
 * (isPlatformAdmin) before invoking this.
 */
export async function writeProviderConfig(base44: any, provider: string, actorEmail: string) {
  const id = normaliseProvider(provider);
  if (!VALID_PROVIDER_IDS.includes(id)) throw new Error(`Unknown provider: ${provider}`);

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