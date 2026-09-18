import { base44 } from "@/api/base44Client";

/**
 * Investigation AI — provider abstraction.
 *
 *   • `invokellm`  — Base44 Core.InvokeLLM integration. LIVE on the current
 *                    plan: real execution, real model selection, real errors.
 *   • `openrouter` — server-side OpenRouter proxy backend function
 *                    (`openrouterProxy`). Keeps OPENROUTER_API_KEY server-side.
 *                    The backend function activates when the app's plan
 *                    includes backend functions; until then it surfaces an
 *                    honest "upgrade required" error instead of mocking.
 *
 * Both providers share the same run contract so the workflow runner and the
 * provider/model selector are provider-agnostic.
 */

export const DEFAULT_PROVIDER = "invokellm";
export const DEFAULT_MODEL = "automatic";

export const PROVIDERS = {
  invokellm: {
    id: "invokellm",
    label: "Base44 InvokeLLM",
    description: "Live now — real execution via the Base44 AI integration.",
    available: true,
    models: [
      { id: "automatic", label: "Automatic" },
      { id: "gemini_3_flash", label: "Gemini 3 Flash (fast)" },
      { id: "gpt_5_mini", label: "GPT-5 mini" },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
      { id: "claude_opus_5", label: "Claude Opus 5" },
      { id: "gpt_5_6_luna", label: "GPT-5.6 Luna" },
    ],
    run: async ({ prompt, model, responseJsonSchema, fileUrls }) => {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: model || undefined,
        response_json_schema: responseJsonSchema || undefined,
        file_urls: fileUrls || undefined,
      });
      return res; // object when a schema is supplied, else string
    },
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter (server-side proxy)",
    description:
      "Server-side OpenRouter proxy. Requires a Builder+ plan to activate the backend function.",
    available: false,
    models: [
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
      { id: "openai/gpt-4o", label: "GPT-4o" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
      { id: "nousresearch/hermes-4-405b", label: "Hermes-4 405B" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
    ],
    run: async ({ prompt, model, responseJsonSchema }) => {
      try {
        const res = await base44.functions.invoke("openrouterProxy", {
          model,
          prompt,
          response_json_schema: responseJsonSchema,
        });
        return res?.data ?? res;
      } catch (e) {
        const msg = String(e?.message || e || "");
        const blocked =
          msg.includes("402") ||
          /not (found|available)/i.test(msg) ||
          /function/i.test(msg);
        throw new Error(
          blocked
            ? "OpenRouter server-side proxy requires a Builder+ plan upgrade. Switch to the Base44 InvokeLLM provider to run investigations now."
            : `OpenRouter proxy error: ${msg}`
        );
      }
    },
  },
};

export function getProvider(id) {
  return PROVIDERS[id] || PROVIDERS.invokellm;
}

export function providerStatus(id) {
  const p = getProvider(id);
  return { id: p.id, label: p.label, available: p.available, models: p.models };
}

export async function runInference({
  provider = DEFAULT_PROVIDER,
  model,
  prompt,
  responseJsonSchema,
  fileUrls,
}) {
  const p = getProvider(provider);
  return p.run({ prompt, model, responseJsonSchema, fileUrls });
}