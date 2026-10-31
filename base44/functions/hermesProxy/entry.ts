import { createClientFromRequest } from "npm:@base44/sdk@0.8.51";
import { secrets } from "base44:runtime";
import {
  loadHermesCredentials,
  normalizeRoot,
  buildInvestigationsUrl,
  investigationFetch,
  classifyUpstream,
  classifyNetwork,
  withTimeout,
  correlationId,
} from "../../shared/hermesHttp.ts";

/**
 * hermesProxy — server-side proxy to the Hermes investigation gateway.
 *
 * The gateway (HERMES_BASE_URL) exposes exactly these routes (verified against
 * its own /openapi.json):
 *   GET  /v1/ready
 *   GET  /v1/health
 *   POST /v1/investigations
 *   POST /v1/investigations/{id}/start
 *   GET  /v1/investigations/{id}
 *   GET  /v1/investigations/{id}/evidence
 *   GET  /v1/investigations/{id}/findings
 *   GET  /v1/investigations/{id}/report
 *   GET  /v1/approvals
 *   POST /v1/approvals/{id}/decision
 *
 * There is NO /v1/models and NO /v1/chat/completions route. Model/provider
 * information comes from /v1/health, and inference is only performed by the
 * gateway as part of an investigation run.
 *
 * Authentication: a single authoritative implementation lives in
 * ../../shared/hermesHttp.ts — the secret "hermes-api_key" sent as X-API-Key.
 * Neither the key nor the gateway URL is ever returned to the browser or logs.
 *
 * All non-success cases are returned as HTTP 200 with a structured
 * { ok:false, status, error, correlation_id } body so the SDK does not collapse
 * them into a generic 503 and the real reason reaches the UI. Only
 * unauthenticated (401) and true internal (500) errors use non-200 status codes.
 *
 * Contract:
 *   IN  { prompt, response_json_schema?, model?, temperature?, max_tokens?, action? }
 *   OUT { ok: true, data, model } | { ok: false, status, error, correlation_id, upstream_status? }
 *
 * status values: not_configured | auth_error | not_found | rate_limited |
 *   gateway_error | http_error | timeout | dns_error | connection_error |
 *   network_error | bad_request | endpoint_not_supported | internal_error | ok
 */
const DEFAULT_MODEL = "hermes-agent";
const TIMEOUT_MS = 60000;
const MAX_ATTEMPTS = 2;

export default async function (req: Request): Promise<Response> {
  const correlation = correlationId("hm");
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ ok: false, status: "unauthorized", error: "Unauthorized", correlation_id: correlation }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { prompt, response_json_schema, model, temperature, max_tokens } = payload || {};

    const { apiKey, configuredBase, keySanitized } = loadHermesCredentials(secrets);
    const authHint = keySanitized
      ? " (the stored hermes-api_key had surrounding whitespace/quotes and was cleaned before sending — re-save the secret cleanly in Secrets if this persists)"
      : "";

    if (!apiKey) {
      return Response.json({
        ok: false, status: "not_configured", configured: false, correlation_id: correlation,
        error: "hermes-api_key secret is not configured (empty or whitespace-only). Set it in Secrets to the live Hermes gateway key.",
      });
    }
    if (!configuredBase) {
      return Response.json({
        ok: false, status: "not_configured", configured: false, correlation_id: correlation,
        error: "HERMES_BASE_URL secret is not configured (empty or whitespace-only). Point it to the real Hermes gateway root (e.g. https://api.example.com). Do not use 127.0.0.1.",
      });
    }

    const root = normalizeRoot(configuredBase);

    // ── Public liveness probe ──────────────────────────────────────────────
    // /v1/health is a public status route; it reports the live model provider,
    // available tools and environment. It is the authoritative source for
    // "is the engine reachable and which model is configured".
    const probeHealth = async (): Promise<{ ok: boolean; endpoint?: string; data?: any; last?: any }> => {
      const healthUrls = [`${root}/health`, `${root}/v1/health`];
      let last: any = null;
      for (const url of healthUrls) {
        const { controller, timer } = withTimeout(15000);
        try {
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "X-Correlation-ID": correlation },
            signal: controller.signal,
          });
          clearTimeout(timer);
          const text = await res.text().catch(() => "");
          if (res.ok) {
            let json: any = null;
            try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
            return { ok: true, endpoint: url, data: json };
          }
          last = { kind: "upstream", status: res.status, text };
        } catch (e: any) {
          clearTimeout(timer);
          last = { kind: "network", text: e?.message || String(e) };
        }
      }
      return { ok: false, last };
    };

    if (payload?.action === "health") {
      const h = await probeHealth();
      if (h.ok) {
        return Response.json({ ok: true, status: "ok", configured: true, data: h.data, endpoint: h.endpoint, correlation_id: correlation });
      }
      const cls = h.last?.kind === "upstream"
        ? classifyUpstream(h.last.status, h.last.text, authHint)
        : classifyNetwork({ message: h.last?.text });
      return Response.json({
        ok: false, status: cls.status, configured: true, correlation_id: correlation,
        upstream_status: h.last?.kind === "upstream" ? h.last.status : undefined,
        error: `Hermes gateway health check failed: ${cls.error}`,
        tried: [`${root}/health`, `${root}/v1/health`],
      });
    }

    // ── Model discovery ────────────────────────────────────────────────────
    // The gateway has no /v1/models route (it returns 404). The live model and
    // provider it runs on are reported by /v1/health, so that is the catalog.
    if (payload?.action === "models") {
      const h = await probeHealth();
      if (!h.ok) {
        const cls = h.last?.kind === "upstream"
          ? classifyUpstream(h.last.status, h.last.text, authHint)
          : classifyNetwork({ message: h.last?.text });
        return Response.json({ ok: false, status: cls.status, configured: true, correlation_id: correlation, error: `Model discovery failed: ${cls.error}` });
      }
      const m = h.data?.model || {};
      const id = m.model || m.id || null;
      if (!id) {
        return Response.json({
          ok: false, status: "endpoint_not_supported", configured: true, correlation_id: correlation,
          error: "The Hermes gateway exposes no model catalog (/v1/models returns 404) and its /v1/health response carried no model information.",
        });
      }
      return Response.json({
        ok: true, status: "ok", configured: true, source: "health", correlation_id: correlation,
        data: { object: "list", data: [{ id, provider: m.provider || null, status: m.status || null }] },
      });
    }

    // ── Investigation lifecycle (real Hermes pipeline) ──────────────────────
    // Creates and starts are NEVER retried: replaying them can create duplicate
    // investigations on the gateway. The caller's polling loop owns retries.
    if (payload?.action === "create_investigation") {
      const investigationsUrl = buildInvestigationsUrl(root);
      const result = await investigationFetch(investigationsUrl, {
        method: "POST",
        body: payload.body || payload.payload || {},
        apiKey,
        corrId: correlation,
        retry: 0,
        authHint,
      });
      return Response.json({ ...result, configured: true, endpoint: investigationsUrl });
    }

    if (payload?.action === "start_investigation") {
      const id = payload.investigation_id;
      if (!id) return Response.json({ ok: false, status: "bad_request", error: "investigation_id is required", correlation_id: correlation });

      // Async start is the safe default so the invocation returns before the
      // serverless edge timeout. Synchronous completion remains an explicit
      // opt-in for controlled callers that set wait_for_completion=true.
      const baseUrl = `${buildInvestigationsUrl(root)}/${encodeURIComponent(String(id))}/start`;
      const waitForCompletion = payload?.wait_for_completion === true;
      const url = waitForCompletion ? baseUrl : `${baseUrl}?wait=false`;

      const result = await investigationFetch(url, {
        method: "POST",
        body: payload.body || {},
        apiKey,
        corrId: correlation,
        retry: 0,
        authHint,
      });
      return Response.json({ ...result, configured: true, async_start: !waitForCompletion });
    }

    if (payload?.action === "get_investigation") {
      const id = payload.investigation_id;
      if (!id) return Response.json({ ok: false, status: "bad_request", error: "investigation_id is required", correlation_id: correlation });
      const url = `${buildInvestigationsUrl(root)}/${encodeURIComponent(String(id))}`;
      const result = await investigationFetch(url, { method: "GET", apiKey, corrId: correlation, retry: 0, authHint });
      return Response.json({ ...result, configured: true });
    }

    // Result sub-resources of a completed investigation. The base
    // GET /v1/investigations/{id} carries only lifecycle metadata, so the
    // evidence/findings/report are read from their own endpoints.
    if (payload?.action === "get_investigation_evidence" ||
        payload?.action === "get_investigation_findings" ||
        payload?.action === "get_investigation_report") {
      const id = payload.investigation_id;
      if (!id) return Response.json({ ok: false, status: "bad_request", error: "investigation_id is required", correlation_id: correlation });
      const sub = payload.action.replace("get_investigation_", "");
      const url = `${buildInvestigationsUrl(root)}/${encodeURIComponent(String(id))}/${sub}`;
      const result = await investigationFetch(url, { method: "GET", apiKey, corrId: correlation, retry: 0, authHint });
      return Response.json({ ...result, configured: true, endpoint: url });
    }

    // ── Inference ──────────────────────────────────────────────────────────
    // The gateway does not currently expose an OpenAI-compatible inference
    // route. This path is kept for forward compatibility and reports the
    // real upstream result instead of pretending the model ran.
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ ok: false, status: "bad_request", error: "prompt is required", correlation_id: correlation });
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

    const chatUrl = `${root}/v1/chat/completions`;
    let lastDiag: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const { controller, timer } = withTimeout(TIMEOUT_MS);
      const started = Date.now();
      try {
        const res = await fetch(chatUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Correlation-ID": correlation,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (res.ok) {
          const json = await res.json().catch(() => null);
          const content = json?.choices?.[0]?.message?.content;
          console.log(`[hermes] ${correlation} POST /v1/chat/completions -> 200 (${Date.now() - started}ms)`);
          if (response_json_schema && content) {
            const parsed = tryParseJson(content);
            if (parsed) return Response.json({ ok: true, data: parsed, model: useModel, correlation_id: correlation });
          }
          return Response.json({ ok: true, data: content, model: useModel, correlation_id: correlation });
        }

        const text = await res.text().catch(() => "");

        // The gateway has no inference route — report that precisely rather
        // than a misleading generic 404.
        if (res.status === 404) {
          console.error(`[hermes] ${correlation} POST /v1/chat/completions -> 404 endpoint_not_supported`);
          return Response.json({
            ok: false,
            status: "endpoint_not_supported",
            configured: true,
            upstream_status: 404,
            correlation_id: correlation,
            error: "The Hermes gateway does not expose an inference endpoint (POST /v1/chat/completions returned 404). It currently exposes only the investigations lifecycle (/v1/investigations), so standalone LLM inference cannot run against this gateway.",
          });
        }

        const cls = classifyUpstream(res.status, text, authHint);
        lastDiag = cls;
        console.error(`[hermes] ${correlation} POST /v1/chat/completions -> ${res.status} ${cls.status} (${Date.now() - started}ms)`);

        if ((res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        return Response.json({ ok: false, status: cls.status, configured: true, upstream_status: res.status, error: cls.error, correlation_id: correlation });
      } catch (e: any) {
        clearTimeout(timer);
        const cls = classifyNetwork(e);
        lastDiag = cls;
        console.error(`[hermes] ${correlation} POST /v1/chat/completions -> ${cls.status} (${Date.now() - started}ms)`);
        if (attempt < MAX_ATTEMPTS && cls.status !== "timeout") {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        return Response.json({ ok: false, status: cls.status, configured: true, error: cls.error, correlation_id: correlation });
      }
    }
    return Response.json({ ok: false, status: lastDiag?.status || "error", configured: true, error: lastDiag?.error || "Hermes request failed", correlation_id: correlation });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error), correlation_id: correlation }, { status: 500 });
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