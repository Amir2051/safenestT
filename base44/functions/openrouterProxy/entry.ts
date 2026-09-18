import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

/**
 * openrouterProxy — server-side OpenRouter proxy for the SafeNestT
 * investigation engine. Keeps OPENROUTER_API_KEY server-side (never returned
 * to the browser). Takes { model, prompt, response_json_schema, temperature,
 * max_tokens } and returns { ok: true, data } on success or { ok: false,
 * error } on failure.
 *
 * SECURITY: Only approved FREE OpenRouter models are permitted. Paid model IDs
 * are rejected server-side with 403. "automatic"/missing model resolves to the
 * primary free model. On a model-not-found (404) error, the proxy falls back to
 * the secondary free model once.
 * Retries 429/5xx and abort/timeout errors up to 3 times with backoff; 60s
 * per-request timeout via AbortController.
 */
const PRIMARY = "stepfun/step-3.5-flash:free";
const FALLBACK = "nvidia/nemotron-3-super-120b-a12b:free";
const FREE_MODELS = new Set([PRIMARY, FALLBACK, "nvidia/nemotron-3.5-lightning:free"]);

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

    let useModel = model && model !== "automatic" ? model : PRIMARY;
    if (!FREE_MODELS.has(useModel)) {
      return Response.json({ ok: false, error: `Model "${useModel}" is not permitted. Only approved free OpenRouter models are allowed.` }, { status: 403 });
    }

    let finalPrompt = prompt;
    if (response_json_schema) {
      finalPrompt +=
        "\n\nRespond with a single JSON object matching this schema. Output JSON only — no markdown fences, no prose outside the JSON:\n" +
        JSON.stringify(response_json_schema);
    }

    const buildBody = (m) => {
      const b: any = {
        model: m,
        messages: [{ role: "user", content: finalPrompt }],
        temperature: typeof temperature === "number" ? temperature : 0.2,
      };
      if (typeof max_tokens === "number") b.max_tokens = max_tokens;
      if (response_json_schema) b.response_format = { type: "json_object" };
      return b;
    };

    const TIMEOUT_MS = 60000;
    const MAX_ATTEMPTS = 3;
    let lastErr: string | null = null;
    let triedFallback = false;

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
          body: JSON.stringify(buildBody(useModel)),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (response_json_schema && content) {
            try {
              return Response.json({ ok: true, data: JSON.parse(content), model: useModel });
            } catch {
              return Response.json({ ok: true, data: content, model: useModel });
            }
          }
          return Response.json({ ok: true, data: content, model: useModel });
        }

        const text = await res.text().catch(() => "");
        lastErr = `OpenRouter ${res.status}: ${text.slice(0, 300)}`;

        // Model not found / invalid → fall back to the secondary free model once.
        if (res.status === 404 && !triedFallback && useModel !== FALLBACK) {
          triedFallback = true;
          useModel = FALLBACK;
          attempt = 0; // restart loop with the fallback model
          continue;
        }
        // Retry on rate-limit and server errors.
        if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        return Response.json({ ok: false, error: lastErr }, { status: 502 });
      } catch (e: any) {
        clearTimeout(timer);
        lastErr =
          e?.name === "AbortError"
            ? `OpenRouter request timed out after ${TIMEOUT_MS / 1000}s`
            : e?.message || String(e);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        return Response.json({ ok: false, error: lastErr }, { status: 502 });
      }
    }

    return Response.json({ ok: false, error: lastErr || "OpenRouter request failed" }, { status: 502 });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}