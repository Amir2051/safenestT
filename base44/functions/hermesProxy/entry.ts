import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

/**
 * hermesProxy — server-side proxy to the Hermes investigation engine.
 *
 * Hermes is exposed as an OpenAI-compatible chat-completions API (Nous Research
 * Inference API). The HERMES_API_KEY is read from app secrets and NEVER returned
 * to the browser. The base URL is public (overridable via the HERMES_API_URL
 * secret) and safe to reference here.
 *
 * Contract:
 *   IN  { prompt, response_json_schema?, model?, temperature?, max_tokens? }
 *   OUT { ok: true, data, model } | { ok: false, error }
 *
 * Retries 429/5xx and abort/timeout errors (max 2 attempts, 60s timeout).
 * Never logs or returns the API key.
 */
const DEFAULT_BASE = "https://inference-api.nousresearch.com/v1";
// Hermes-4-70B is retired and the account has no credits for paid models.
// Default to a live free model from the catalog so the proxy works out of the
// box (e.g. health pings that don't pass an explicit model).
const DEFAULT_MODEL = "meituan/longcat-2.0:free";
const TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 2;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { prompt, response_json_schema, model, temperature, max_tokens } = payload || {};

    const apiKey = secrets.get("HERMES_API_KEY");
    if (!apiKey) {
      return Response.json({ ok: false, error: "HERMES_API_KEY secret is not configured", configured: false }, { status: 503 });
    }
    const configuredBase = secrets.get("HERMES_BASE_URL") || secrets.get("HERMES_API_URL") || DEFAULT_BASE;
    const baseUrl = configuredBase.replace(/\/$/, "");

    // Discovery mode: list available models so the UI can show what's live.
    if (payload?.action === "models") {
      const res = await fetch(`${baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
      return Response.json({ ok: res.ok, status: res.status, data: json });
    }

    if (!prompt || typeof prompt !== "string") {
      return Response.json({ ok: false, error: "prompt is required" }, { status: 400 });
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

    let lastErr: string | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (response_json_schema && content) {
            const parsed = tryParseJson(content);
            if (parsed) return Response.json({ ok: true, data: parsed, model: useModel });
          }
          return Response.json({ ok: true, data: content, model: useModel });
        }
        const text = await res.text().catch(() => "");
        lastErr = `Hermes ${res.status}: ${text.slice(0, 300)}`;
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        return Response.json({ ok: false, error: lastErr, configured: true }, { status: 502 });
      } catch (e: any) {
        clearTimeout(timer);
        lastErr = e?.name === "AbortError"
          ? `Hermes request timed out after ${TIMEOUT_MS / 1000}s`
          : e?.message || String(e);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        return Response.json({ ok: false, error: lastErr, configured: true }, { status: 502 });
      }
    }
    return Response.json({ ok: false, error: lastErr || "Hermes request failed", configured: true }, { status: 502 });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
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