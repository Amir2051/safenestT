/**
 * Shared Hermes gateway HTTP helpers.
 *
 * Used by every backend function that talks to the Hermes investigation
 * gateway (hermesProxy, syncCaseToHermes). Keeping URL/key sanitization, the
 * authenticated fetch, error classification, correlation ids and logging in one
 * place guarantees:
 *   - one authoritative auth implementation (X-API-Key + "hermes-api_key"),
 *   - consistent endpoint construction,
 *   - the credential never reaches the browser or the logs,
 *   - every failure carries a correlation id and the upstream body.
 *
 * HERMES_BASE_URL points to the gateway root (https://host or https://host/v1).
 */

/** Correlation id used to trace one logical Hermes request across logs. */
export function correlationId(prefix = "hm"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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

export function classifyUpstream(status: number, errText: string, authHint = "") {
  const t = (errText || "").slice(0, 300);
  if (status === 401 || status === 403)
    return { status: "auth_error", error: `Hermes rejected credentials (HTTP ${status}).${t ? " " + t : ""}${authHint}` };
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

function pathOf(url: string): string {
  try { return new URL(url).pathname; } catch { return String(url); }
}

/**
 * Hermes investigation-lifecycle request.
 *
 * Retries are OPT-IN and default to none, because replaying a POST that creates
 * or starts an investigation can duplicate work on the gateway. GET polling is
 * retried by the caller's own loop. Callers that must retry set `retry`.
 */
export async function investigationFetch(
  url: string,
  { method, body, apiKey, timeoutMs = 60000, corrId, retry = 0, authHint = "" }: {
    method: string;
    body?: any;
    apiKey: string;
    timeoutMs?: number;
    corrId?: string;
    retry?: number;
    authHint?: string;
  }
) {
  const correlation = corrId || correlationId();
  const path = pathOf(url);
  const attempts = Math.max(1, Math.floor(retry) + 1);
  let last: any = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const { controller, timer } = withTimeout(timeoutMs);
    const started = Date.now();
    try {
      const headers: Record<string, string> = {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Correlation-ID": correlation,
      };
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
      const ms = Date.now() - started;

      if (res.ok) {
        console.log(`[hermes] ${correlation} ${method} ${path} -> ${res.status} (${ms}ms)`);
        return {
          ok: true,
          status: "ok" as const,
          upstream_status: res.status,
          data: json ?? (text ? { raw: text.slice(0, 1000) } : {}),
          correlation_id: correlation,
        };
      }

      const cls = classifyUpstream(res.status, text, authHint);
      console.error(`[hermes] ${correlation} ${method} ${path} -> ${res.status} ${cls.status} (${ms}ms)`);
      last = {
        ok: false,
        status: cls.status,
        upstream_status: res.status,
        upstream_body: json ?? (text ? text.slice(0, 1000) : null),
        error: cls.error,
        data: json,
        correlation_id: correlation,
      };

      if ((res.status === 429 || res.status >= 500) && attempt < attempts) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      return last;
    } catch (e: any) {
      clearTimeout(timer);
      const cls = classifyNetwork(e);
      console.error(`[hermes] ${correlation} ${method} ${path} -> ${cls.status} (${Date.now() - started}ms)`);
      last = { ok: false, status: cls.status, error: cls.error, correlation_id: correlation };
      if (attempt < attempts && cls.status !== "timeout") {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      return last;
    }
  }
  return last;
}

// Load + sanitize the Hermes credentials from app secrets. Returns an empty
// value for either piece if not configured so the caller can fail loudly.
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