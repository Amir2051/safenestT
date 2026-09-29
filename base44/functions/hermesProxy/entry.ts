import { createClientFromRequest } from "npm:@base44/sdk@0.8.51";
import { secrets } from "base44:runtime";

/**
 * hermesProxy — server-side proxy to the Hermes Agent investigation gateway.
 *
 * Hermes exposes an OpenAI-compatible API:
 *   POST <HERMES_BASE_URL>/v1/chat/completions
 *   GET  <HERMES_BASE_URL>/v1/models
 *   GET  <HERMES_BASE_URL>/health   (and /v1/health as a fallback)
 *
 * HERMES_API_KEY and HERMES_BASE_URL are read from app secrets and NEVER
 * returned to the browser or logs. All non-success cases are returned as
 * HTTP 200 with a structured { ok:false, status, error, configured } body so
 * the SDK does not collapse them into a generic "503" and the real reason
 * reaches the UI. Only unauthenticated (401) and true internal (500) errors
 * use non-200 status codes.
 *
 * Contract:
 *   IN  { prompt, response_json_schema?, model?, temperature?, max_tokens?, action? }
 *   OUT { ok: true, data, model } | { ok: false, status, error, configured?, upstream_status? }
 *
 * status values: not_configured | auth_error | not_found | rate_limited |
 *   gateway_error | http_error | timeout | dns_error | connection_error |
 *   network_error | bad_request | internal_error | ok
 */
const DEFAULT_MODEL = "hermes-agent";
const TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 2;

// Non-leaking hint appended to auth errors when the stored secret contained
// surrounding whitespace/quotes that we stripped before sending. The actual
// key value is NEVER placed in this string or returned to the caller.
let AUTH_HINT = "";

/**
 * Read a secret exactly as configured, then remove only the paste artifacts
 * that cause silent 401s: surrounding whitespace (spaces/tabs/newlines/CR),
 * a single layer of enclosing quotes/backticks, and an accidental leading
 * "Bearer " prefix. There is no fallback, no hardcoded value, and no default —
 * an empty result stays empty and fails loudly as not_configured.
 *
 * Returns the cleaned value plus `modified` (true iff artifacts were stripped)
 * so the proxy can tell the builder the stored secret should be re-saved
 * cleanly — without ever exposing the value itself.
 */
function sanitizeSecret(raw: any): { value: string; modified: boolean } {
  let v = String(raw ?? "");
  let modified = false;
  const trimmed = v.trim();
  if (trimmed !== v) { v = trimmed; modified = true; }
  if (v.length >= 2 && /^["'`].*["'`]$/.test(v)) { v = v.slice(1, -1); modified = true; }
  if (/^bearer\s+/i.test(v)) { v = v.replace(/^bearer\s+/i, ""); modified = true; }
  // Reject any residual internal whitespace — a real key never contains it.
  if (/\s/.test(v)) { v = v.replace(/\s+/g, ""); modified = true; }
  return { value: v, modified };
}

// Normalize the configured base URL to the API ROOT (no trailing slash, no /v1).
// Accepts both "https://hermes.example.com" and "https://hermes.example.com/v1".
function normalizeRoot(configuredBase: string): string {
  let b = (configuredBase || "").trim().replace(/\/+$/, "");
  if (b.endsWith("/v1")) b = b.slice(0, -3);
  return b;
}

function classifyUpstream(status: number, errText: string) {
  const t = (errText || "").slice(0, 300);
  if (status === 401 || status === 403)
    return { status: "auth_error", error: `Hermes rejected credentials (HTTP ${status}). Verify HERMES_API_KEY.${t ? " " + t : ""}${AUTH_HINT}` };
  if (status === 404)
    return { status: "not_found", error: `Hermes endpoint not found (HTTP 404). Check HERMES_BASE_URL points to the gateway root.${t ? " " + t : ""}` };
  if (status === 429)
    return { status: "rate_limited", error: `Hermes rate limit (HTTP 429). Retry later.${t ? " " + t : ""}` };
  if (status >= 500)
    return { status: "gateway_error", error: `Hermes gateway error (HTTP ${status}).${t ? " " + t : ""}` };
  return { status: "http_error", error: `Hermes HTTP ${status}.${t ? " " + t : ""}` };
}

function classifyNetwork(e: any) {
  const msg = String(e?.message || e || "");
  if (e?.name === "AbortError")
    return { status: "timeout", error: `Hermes request timed out after ${TIMEOUT_MS / 1000}s` };
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|resolve|dns/i.test(msg))
    return { status: "dns_error", error: `DNS resolution failed for Hermes gateway: ${msg}` };
  if (/ECONNREFUSED|ECONNRESET|ECONNABORTED|connect|socket|network/i.test(msg))
    return { status: "connection_error", error: `Connection to Hermes gateway failed: ${msg}` };
  return { status: "network_error", error: msg };
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

// Build the investigations endpoint URL from the normalized gateway ROOT.
// Handles three HERMES_BASE_URL shapes without double-appending the path:
//   - "https://host"                      → "https://host/v1/investigations"
//   - "https://host/v1"                   → "https://host/v1/investigations"
//   - "https://host/v1/investigations"    → used as-is (already the full path)
// Any other trailing path is treated as part of the root and appended to.
function buildInvestigationsUrl(root: string): string {
  const b = (root || "").trim().replace(/\/+$/, "");
  if (/\/v1\/investigations$/.test(b)) return b;
  if (b.endsWith("/v1")) return `${b}/investigations`;
  return `${b}/v1/investigations`;
}

// Hermes investigation-lifecycle request. Uses X-API-Key authentication as
// required by the investigation gateway. Returns a structured body so the
// SDK never collapses a 404/401 into a generic error and the UI gets the real
// upstream status.
async function investigationFetch(
  url: string,
  { method, body, apiKey }: { method: string; body?: any; apiKey: string }
) {
  const { controller, timer } = withTimeout(60000);
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

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { prompt, response_json_schema, model, temperature, max_tokens } = payload || {};

    // Read the secrets exactly as configured and strip only paste artifacts.
    // No fallback, no hardcoded value, no default. An empty/whitespace-only
    // secret fails loudly below as not_configured so a bad value is never
    // silently sent upstream.
    const rawKey = secrets.get("HERMES_API_KEY");
    const rawBase = secrets.get("HERMES_BASE_URL");
    const { value: apiKey, modified: keySanitized } = sanitizeSecret(rawKey);
    const { value: configuredBase } = sanitizeSecret(rawBase);

    AUTH_HINT = keySanitized
      ? " (the stored HERMES_API_KEY had surrounding whitespace/quotes and was cleaned before sending — re-save the secret cleanly in Secrets if this persists)"
      : "";

    if (!apiKey) {
      return Response.json({
        ok: false, status: "not_configured", configured: false,
        error: "HERMES_API_KEY secret is not configured (empty or whitespace-only). Set it in Secrets to the live Hermes gateway key.",
      });
    }
    if (!configuredBase) {
      return Response.json({
        ok: false, status: "not_configured", configured: false,
        error: "HERMES_BASE_URL secret is not configured (empty or whitespace-only). Point it to the real Hermes Agent gateway (e.g. https://hermes.example.com). Do not use 127.0.0.1.",
      });
    }

    const root = normalizeRoot(configuredBase);
    const chatUrl = `${root}/v1/chat/completions`;
    const modelsUrl = `${root}/v1/models`;

    // ── Health ─────────────────────────────────────────────────────────────
    if (payload?.action === "health") {
      const healthUrls = [`${root}/health`, `${root}/v1/health`];
      let last: any = null;
      for (const url of healthUrls) {
        const { controller, timer } = withTimeout(15000);
        try {
          const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal });
          clearTimeout(timer);
          const text = await res.text().catch(() => "");
          if (res.ok) {
            let json: any = null;
            try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
            return Response.json({ ok: true, status: "ok", configured: true, data: json, endpoint: url });
          }
          last = { kind: "upstream", status: res.status, text };
        } catch (e: any) {
          clearTimeout(timer);
          last = { kind: "network", text: e?.message || String(e) };
        }
      }
      const cls = last?.kind === "upstream"
        ? classifyUpstream(last.status, last.text)
        : classifyNetwork({ message: last?.text });
      return Response.json({
        ok: false, status: cls.status, configured: true,
        upstream_status: last?.kind === "upstream" ? last.status : undefined,
        error: `Hermes gateway health check failed: ${cls.error}`,
        tried: healthUrls,
      });
    }

    // ── Model discovery ────────────────────────────────────────────────────
    if (payload?.action === "models") {
      const { controller, timer } = withTimeout(15000);
      try {
        const res = await fetch(modelsUrl, { headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal });
        clearTimeout(timer);
        const text = await res.text().catch(() => "");
        if (!res.ok) {
          const cls = classifyUpstream(res.status, text);
          return Response.json({ ok: false, status: cls.status, configured: true, upstream_status: res.status, error: cls.error });
        }
        let json: any = null;
        try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
        return Response.json({ ok: true, status: "ok", data: json });
      } catch (e: any) {
        clearTimeout(timer);
        const cls = classifyNetwork(e);
        return Response.json({ ok: false, status: cls.status, configured: true, error: cls.error });
      }
    }

    // ── Investigation lifecycle (real Hermes pipeline) ──────────────────────
    // POST /v1/investigations              → create
    // POST /v1/investigations/{id}/start   → start
    // GET  /v1/investigations/{id}         → status / results
    // The browser never sees HERMES_BASE_URL or the key; it requests these
    // actions and the proxy performs the authenticated call server-side.
    if (payload?.action === "create_investigation") {
      const investigationsUrl = buildInvestigationsUrl(root);
      const result = await investigationFetch(investigationsUrl, {
        method: "POST",
        body: payload.body || payload.payload || {},
        apiKey,
      });
      return Response.json({ ...result, configured: true, endpoint: investigationsUrl });
    }
    if (payload?.action === "start_investigation") {
      const id = payload.investigation_id;
      if (!id) return Response.json({ ok: false, status: "bad_request", error: "investigation_id is required" });
      const url = `${buildInvestigationsUrl(root)}/${encodeURIComponent(String(id))}/start`;
      const result = await investigationFetch(url, { method: "POST", body: payload.body || {}, apiKey });
      return Response.json({ ...result, configured: true });
    }
    if (payload?.action === "get_investigation") {
      const id = payload.investigation_id;
      if (!id) return Response.json({ ok: false, status: "bad_request", error: "investigation_id is required" });
      const url = `${buildInvestigationsUrl(root)}/${encodeURIComponent(String(id))}`;
      const result = await investigationFetch(url, { method: "GET", apiKey });
      return Response.json({ ...result, configured: true });
    }

    // ── Inference ──────────────────────────────────────────────────────────
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ ok: false, status: "bad_request", error: "prompt is required" });
    }
    const useModel = model || DEFAULT_MODEL;

    let finalPrompt = prompt;
    if (response_json_schema) {
      finalPrompt +=
        "\n\nRespond with a single JSON object matching this schema. Output JSON only — no markdown fences, no prose outside the JSON:\n" +
        JSON.stringify(response_json_schema);
    }
    const body: any = {
      model: useModel,
      messages: [{ role: "user", content: finalPrompt }],
      temperature: typeof temperature === "number" ? temperature : 0.2,
    };
    if (typeof max_tokens === "number") body.max_tokens = max_tokens;

    let lastDiag: any = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { controller, timer } = withTimeout(TIMEOUT_MS);
      try {
        const res = await fetch(chatUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json().catch(() => null);
          const content = json?.choices?.[0]?.message?.content;
          if (response_json_schema && content) {
            const parsed = tryParseJson(content);
            if (parsed) return Response.json({ ok: true, data: parsed, model: useModel });
          }
          return Response.json({ ok: true, data: content, model: useModel });
        }
        const text = await res.text().catch(() => "");
        const cls = classifyUpstream(res.status, text);
        lastDiag = cls;
        // Retry transient upstream errors once.
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        return Response.json({ ok: false, status: cls.status, configured: true, upstream_status: res.status, error: cls.error });
      } catch (e: any) {
        clearTimeout(timer);
        const cls = classifyNetwork(e);
        lastDiag = cls;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        return Response.json({ ok: false, status: cls.status, configured: true, error: cls.error });
      }
    }
    return Response.json({ ok: false, status: lastDiag?.status || "error", configured: true, error: lastDiag?.error || "Hermes request failed" });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error) }, { status: 500 });
  }
}

function tryParseJson(content: string): any | null {
  if (!content) return null;
  try { return JSON.parse(content); } catch {}
  const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const obj = content.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]); } catch {} }
  return null;
}