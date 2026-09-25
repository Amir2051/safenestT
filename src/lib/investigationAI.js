import { base44 } from "@/api/base44Client";

/**
 * Investigation AI — provider abstraction.
 *
 * Hermes Engine is the only provider exposed by the investigation pipeline.
 * Other Base44 AI integrations may still exist elsewhere in the application,
 * but they are not valid pipeline providers.
 */

export const DEFAULT_PROVIDER = "hermes";
export const DEFAULT_MODEL = "meituan/longcat-2.0:free";

export const PROVIDERS = {
  hermes: {
    id: "hermes",
    label: "Hermes Engine (Nous)",
    description: "Live — server-side hermesProxy. Free Nous Research inference models; key stays server-side.",
    available: true,
    // Only the 7 free models in the live Nous catalog (paid IDs need credits
    // we don't have). The server-side proxy reads HERMES_API_KEY from secrets.
    models: [
      { id: "meituan/longcat-2.0:free", label: "LongCat 2.0 (free · 1M ctx)", free: true },
      { id: "upstage/solar-pro4:free", label: "Solar Pro 4 (free · 512K)", free: true },
      { id: "inclusionai/ling-3.0-flash-fin:free", label: "Ling 3.0 Flash Fin (free)", free: true },
      { id: "inclusionai/ling-3.0-flash-sante:free", label: "Ling 3.0 Flash Sante (free)", free: true },
      { id: "stepfun/step-3.7-flash:free", label: "Step 3.7 Flash (free)", free: true },
      { id: "poolside/laguna-s-2.1:free", label: "Laguna S 2.1 (free)", free: true },
      { id: "poolside/laguna-xs-2.1:free", label: "Laguna XS 2.1 (free)", free: true },
    ],
    run: async ({ prompt, model, responseJsonSchema, temperature, maxTokens }) => {
      const resp = await base44.functions.invoke("hermesProxy", {
        prompt,
        model: model || "meituan/longcat-2.0:free",
        response_json_schema: responseJsonSchema,
        temperature,
        max_tokens: maxTokens,
      });
      const body = resp?.data ?? resp;
      if (!body || body.ok === false) {
        throw new Error(body?.error || "Hermes proxy returned an error");
      }
      if (body.data == null) {
        throw new Error("Hermes returned empty content");
      }
      return body.data;
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
  return PROVIDERS[id] || PROVIDERS.hermes;
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