import { base44 } from "@/api/base44Client";

/**
 * Investigation AI — provider abstraction.
 *
 * Full investigations use the Hermes lifecycle. Prompt-only workflow phases
 * use the server-side OpenRouter proxy because Hermes has no chat endpoint.
 */

export const DEFAULT_PROVIDER = "openrouter";
export const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export const PROVIDERS = {
  hermes: {
    id: "hermes",
    label: "Hermes Agent",
    description: "Hermes Agent gateway — authoritative investigation pipeline. Credentials stay server-side.",
    available: true,
    models: [
      { id: "hermes-agent", label: "Hermes Agent", free: true },
    ],
    run: async () => {
      throw new Error("Hermes supports full investigation lifecycle requests only. Use OpenRouter for standalone prompt analysis.");
    },
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter (free models)",
    description: "Live — server-side proxy. Only approved free models; paid IDs are blocked server-side.",
    available: true,
    // Only approved `:free` models. The server-side proxy rejects anything not
    // in this allowlist, so users can never spend on a paid model by accident.
    models: [
      { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B (free · primary)", free: true },
      { id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning (free · fallback)", free: true },
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
  return PROVIDERS[id] || PROVIDERS[DEFAULT_PROVIDER];
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