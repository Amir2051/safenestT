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
    return { status: "auth_error", error: `Hermes rejected credentials (HTTP ${status}). Verify HERMES_API_KEY.${t ? " " + t : ""}` };
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

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { prompt, response_json_schema, model, temperature, max_tokens } = payload || {};

    const apiKey = secrets.get("HERMES_API_KEY");
    const configuredBase = secrets.get("HERMES_BASE_URL");

    if (!apiKey) {
      return Response.json({
        ok: false, status: "not_configured", configured: false,
        error: "HERMES_API_KEY secret is not configured.",
      });
    }
    if (!configuredBase) {
      return Response.json({
        ok: false, status: "not_configured", configured: false,
        error: "HERMES_BASE_URL secret is not configured. Point it to the real Hermes Agent gateway (e.g. https://hermes.example.com). Do not use 127.0.0.1.",
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