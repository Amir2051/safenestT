/**
 * Shared Hermes gateway HTTP helpers.
 *
 * Used by every backend function that talks to the Hermes investigation
 * gateway (hermesProxy, syncCaseToHermes, syncHermesInvestigation). Keeping
 * the URL/key sanitization + authenticated fetch in one place guarantees the
 * credential is never leaked and the endpoint path is built consistently.
 *
 * The Hermes credential is the secret named "hermes-api_key", sent via the
 * X-API-Key header. HERMES_BASE_URL points to the gateway root. Neither value
 * is ever returned to the browser or logs.
 */

export function sanitizeSecret(raw: any): { value: string; modified: boolean } {
  let v = String(raw ?? "");
  let modified = false;
  const trimmed = v.trim();
  if (trimmed !== v) { v = trimmed; modified = true; }
  if (v.length >= 2 && /^["'`].*["'`]$/.test(v)) { v = v.slice(1, -1); modified = true; }
  if (/^bearer\s+/i.test(v)) { v = v.replace(/^bearer\s+/i, ""); modified = true; }
  if (/\s/.test(v)) { v = v.replace(/\s+/g, ""); modified = true; }
  return { value: v, modified };
}

// Normalize the configured base URL to the API ROOT (no trailing slash, no /v1).
export function normalizeRoot(configuredBase: string): string {
  let b = (configuredBase || "").trim().replace(/\/+$/, "");
  if (b.endsWith("/v1")) b = b.slice(0, -3);
  return b;
}

// Build the investigations endpoint URL from the normalized gateway ROOT.
export function buildInvestigationsUrl(root: string): string {
  const b = (root || "").trim().replace(/\/+$/, "");
  if (/\/v1\/investigations$/.test(b)) return b;
  if (b.endsWith("/v1")) return `${b}/investigations`;
  return `${b}/v1/investigations`;
}

export function classifyUpstream(status: number, errText: string) {
  const t = (errText || "").slice(0, 300);
  if (status === 401 || status === 403)
    return { status: "auth_error", error: `Hermes rejected credentials (HTTP ${status}).${t ? " " + t : ""}` };
  if (status === 404)
    return { status: "not_found", error: `Hermes endpoint or investigation not found (HTTP 404).${t ? " " + t : ""}` };
  if (status === 429)
    return { status: "rate_limited", error: `Hermes rate limit (HTTP 429).${t ? " " + t : ""}` };
  if (status >= 500)
    return { status: "gateway_error", error: `Hermes gateway error (HTTP ${status}).${t ? " " + t : ""}` };
  return { status: "http_error", error: `Hermes HTTP ${status}.${t ? " " + t : ""}` };
}

export function classifyNetwork(e: any) {
  const msg = String(e?.message || e || "");
  if (e?.name === "AbortError") return { status: "timeout", error: `Hermes request timed out` };
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|resolve|dns/i.test(msg))
    return { status: "dns_error", error: `DNS resolution failed for Hermes gateway: ${msg}` };
  if (/ECONNREFUSED|ECONNRESET|ECONNABORTED|connect|socket|network/i.test(msg))
    return { status: "connection_error", error: `Connection to Hermes gateway failed: ${msg}` };
  return { status: "network_error", error: msg };
}

export function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

// Hermes investigation-lifecycle request. Uses the X-API-Key header with the
// value from the "hermes-api_key" secret. Returns a structured body so callers
// can branch on status without the SDK collapsing a 404/401 into a generic error.
export async function investigationFetch(
  url: string,
  { method, body, apiKey, timeoutMs = 60000 }: { method: string; body?: any; apiKey: string; timeoutMs?: number }
) {
  const { controller, timer } = withTimeout(timeoutMs);
  try {
    const headers: Record<string, string> = { "X-API-Key": apiKey, "Content-Type": "application/json", "Accept": "application/json" };
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (res.ok) {
      return { ok: true, status: "ok" as const, upstream_status: res.status, data: json ?? (text ? { raw: text.slice(0, 1000) } : {}) };
    }
    const cls = classifyUpstream(res.status, text);
    return { ok: false, status: cls.status, upstream_status: res.status, error: cls.error, data: json };
  } catch (e: any) {
    clearTimeout(timer);
    const cls = classifyNetwork(e);
    return { ok: false, status: cls.status, error: cls.error };
  }
}

// Load + sanitize the Hermes credentials from app secrets. Returns null for
// either piece if not configured so the caller can fail loudly.
export function loadHermesCredentials(secrets: { get: (name: string) => any }) {
  const rawKey = secrets.get("hermes-api_key");
  const rawBase = secrets.get("HERMES_BASE_URL");
  const { value: apiKey, modified: keySanitized } = sanitizeSecret(rawKey);
  const { value: configuredBase } = sanitizeSecret(rawBase);
  return { apiKey, configuredBase, keySanitized };
}

export function extractInvestigationId(data: any): string | null {
  if (!data) return null;
  return data.investigation_id || data.investigationId || data.id || data.investigation?.id || null;
}