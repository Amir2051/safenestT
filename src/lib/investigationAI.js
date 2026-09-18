import { base44 } from "@/api/base44Client";

/**
 * Investigation AI — provider abstraction.
 *
 *   • `invokellm`  — Base44 Core.InvokeLLM integration. LIVE on the current
 *                    plan: real execution, real model selection, real errors.
 *   • `openrouter` — server-side OpenRouter proxy backend function
 *                    (`openrouterProxy`). Keeps OPENROUTER_API_KEY server-side.
 *                    Live when the `openrouterProxy` backend function is deployed.
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
    label: "OpenRouter (server-side)",
    description: "Live — server-side proxy through the openrouterProxy backend function. Keeps the API key server-side.",
    available: true,
    models: [
      { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (free)" },
      { id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning (free)" },
      { id: "nvidia/nemotron-3.5-lightning", label: "Nemotron 3.5 Lightning (paid)" },
      { id: "nvidia/llama-3.3-nemotron-super-49b-v1.5", label: "Llama 3.3 Nemotron Super 49B" },
      { id: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra 550B" },
    ],
    run: async ({ prompt, model, responseJsonSchema, temperature, maxTokens }) => {
      const resp = await base44.functions.invoke("openrouterProxy", {
        model,
        prompt,
        response_json_schema: responseJsonSchema,
        temperature,
        max_tokens: maxTokens,
      });
      const body = resp?.data ?? resp;
      if (!body || body.ok === false || body.status === "error") {
        throw new Error(body?.error || "OpenRouter proxy returned an error");
      }
      return body.data ?? body;
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