import { base44 } from "@/api/base44Client";

/**
 * Investigation provider registry.
 *
 * Exactly two investigation providers exist — Hermes Agent and MIA Multi-Agent.
 * There is no third provider and no default fallback: `getProvider` returns null
 * for anything else so callers must handle an invalid selection explicitly
 * instead of silently running a different engine.
 *
 * Hermes Agent executes through the server-side Hermes gateway proxy.
 * MIA Multi-Agent is not a single inference call — it is executed end-to-end by
 * the backend (startCaseInvestigation -> shared/miaEngine.ts), so its `run` here
 * refuses rather than pretending a one-shot completion is a multi-agent run.
 */

export const PROVIDER_IDS = ["hermes", "mia"];
export const DEFAULT_PROVIDER = "hermes";
export const DEFAULT_MODEL = "hermes-agent";
export const MIA_MODEL = "mia-multi-agent";

const REGISTRY = {
  hermes: {
    id: "hermes",
    label: "Hermes Agent",
    description: "Hermes Agent gateway — create → start → poll. Credentials stay server-side.",
    available: true,
    model: "hermes-agent",
    models: [{ id: "hermes-agent", label: "Hermes Agent", free: true }],
    run: async ({ prompt, model, responseJsonSchema, temperature, maxTokens }) => {
      const resp = await base44.functions.invoke("hermesProxy", {
        prompt,
        model: model || "hermes-agent",
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
  mia: {
    id: "mia",
    label: "MIA Multi-Agent",
    description: "Multi-agent workflow — planning, evidence, three specialist analysts, reality-check, deterministic risk, evidence-gated dossier.",
    available: true,
    model: "mia-multi-agent",
    models: [{ id: "mia-multi-agent", label: "MIA Multi-Agent", free: true }],
    run: async () => {
      throw new Error("MIA Multi-Agent is executed end-to-end by the backend (startCaseInvestigation), not by a single inference call.");
    },
  },
};

export const PROVIDERS = PROVIDER_IDS.map((id) => REGISTRY[id]);

/** Strict lookup — null when the id is not one of the two providers. */
export function getProvider(id) {
  return REGISTRY[id] || null;
}

export function providerLabel(id) {
  return REGISTRY[id]?.label || "Unknown provider";
}

export function providerStatus(id) {
  const p = getProvider(id);
  if (!p) return null;
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
  if (!p) throw new Error(`Unsupported investigation provider: ${provider}`);
  return p.run({ prompt, model, responseJsonSchema, fileUrls });
}