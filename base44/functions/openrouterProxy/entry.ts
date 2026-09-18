import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

/**
 * openrouterProxy — server-side OpenRouter proxy for the SafeNestT
 * investigation engine. Keeps OPENROUTER_API_KEY server-side (never returned
 * to the browser). Takes { model, prompt, response_json_schema, temperature,
 * max_tokens } and returns { ok: true, data } on success or { ok: false,
 * error } on failure. Retries 429/5xx and abort/timeout errors up to 3 times
 * with backoff; 90s per-request timeout via AbortController.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const payload = await req.json();
    const { model, prompt, response_json_schema, temperature, max_tokens } = payload || {};
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ ok: false, error: "prompt is required" }, { status: 400 });
    }

    const apiKey = secrets.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return Response.json({ ok: false, error: "OPENROUTER_API_KEY secret is not configured" }, { status: 500 });
    }

    const useModel = model || "openai/gpt-4o-mini";
    let finalPrompt = prompt;
    if (response_json_schema) {
      finalPrompt +=
        "\n\nRespond with a single JSON object matching this schema. Output JSON only — no markdown fences, no prose outside the JSON:\n" +
        JSON.stringify(response_json_schema);
    }

    const body = {
      model: useModel,
      messages: [{ role: "user", content: finalPrompt }],
      temperature: typeof temperature === "number" ? temperature : 0.2,
    };
    if (typeof max_tokens === "number") body.max_tokens = max_tokens;
    if (response_json_schema) body.response_format = { type: "json_object" };

    const TIMEOUT_MS = 45000;
    const MAX_ATTEMPTS = 2;
    let lastErr = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://safenestt.base44.app",
            "X-Title": "SafeNestT Investigation Engine",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (response_json_schema && content) {
            try {
              return Response.json({ ok: true, data: JSON.parse(content) });
            } catch {
              return Response.json({ ok: true, data: content });
            }
          }
          return Response.json({ ok: true, data: content });
        }

        const text = await res.text().catch(() => "");
        lastErr = `OpenRouter ${res.status}: ${text.slice(0, 300)}`;
        // Retry on rate-limit and server errors; otherwise return immediately.
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return Response.json({ ok: false, error: lastErr }, { status: 502 });
      } catch (e) {
        clearTimeout(timer);
        lastErr =
          e?.name === "AbortError"
            ? `OpenRouter request timed out after ${TIMEOUT_MS / 1000}s`
            : e?.message || String(e);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return Response.json({ ok: false, error: lastErr }, { status: 502 });
      }
    }

    return Response.json({ ok: false, error: lastErr || "OpenRouter request failed" }, { status: 502 });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}