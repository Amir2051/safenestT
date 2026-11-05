/**
 * Lookup result interpretation, shared by the Hermes sync and the MIA engine.
 *
 * A lookup that "completed" is not evidence. This decides, from the result
 * payload itself, whether the lookup returned data, came back empty, or was the
 * wrong kind of lookup for the target (e.g. a DNS/WHOIS lookup on a wallet).
 *
 * KEEP IN SYNC with src/lib/report/toolResult.js (the app cannot import this
 * folder). A unit test in src/lib/report/reportModel.test.js compares the two.
 */
const ECHO_KEYS = new Set(["domain", "target", "source", "query", "status", "type", "provider"]);
const NETWORK_TOOLS = /(shodan_domain|whois|dns|subdomain|ssl|cert|reverse_ip|passive_dns)/i;

export function targetKind(target: unknown): string {
  const v = String(target ?? "").trim();
  if (!v) return "";
  if (/^0x[a-fA-F0-9]{40}$/.test(v) || /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(v) || /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(v)) return "wallet";
  if (/^0x[a-fA-F0-9]{64}$/.test(v)) return "transaction";
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "email";
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return "ip";
  const host = v.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  if (/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return "domain";
  if (/^\+?[\d\s().-]{7,20}$/.test(v)) return "phone";
  return "other";
}

function substantiveCount(value: unknown, key = ""): number {
  if (ECHO_KEYS.has(String(key).toLowerCase())) return 0;
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return value.trim() ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? 1 : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value)) return value.reduce((n, item) => n + (substantiveCount(item) > 0 ? 1 : 0), 0);
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>).reduce((n, [k, v]) => n + substantiveCount(v, k), 0);
  return 0;
}

export function summarizeToolResult({ capability = "", target = "", status = "", data }: { capability?: string; target?: string; status?: string; data?: unknown }) {
  const kind = targetKind(target);
  const st = String(status || "").toLowerCase();
  const tool = String(capability || "").split(".").pop() || "";
  if (st && !["success", "ok", "completed"].includes(st)) {
    return { state: "error", record_count: 0, target_kind: kind, summary: `The lookup did not complete (status: ${st}).` };
  }
  if (NETWORK_TOOLS.test(tool) && kind && !["domain", "ip"].includes(kind)) {
    return { state: "not_applicable", record_count: 0, target_kind: kind,
      summary: `A domain/network lookup was run against a ${kind === "wallet" ? "wallet address" : kind}, which it cannot resolve. No result.` };
  }
  if (data === undefined) return { state: "unknown", record_count: 0, target_kind: kind, summary: "The result of this lookup was not recorded." };
  let records = 0;
  if (Array.isArray(data)) records = data.length;
  else if (data && typeof data === "object") {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (ECHO_KEYS.has(k.toLowerCase())) continue;
      if (Array.isArray(v)) records += v.length;
      else if (substantiveCount(v, k) > 0) records += 1;
    }
  }
  if (records === 0 || substantiveCount(data) === 0) return { state: "empty", record_count: 0, target_kind: kind, summary: "The lookup ran and returned no records." };
  return { state: "data", record_count: records, target_kind: kind, summary: `The lookup returned ${records} record${records === 1 ? "" : "s"}.` };
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => (v == null ? "null" : canonicalJson(v))).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] != null).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}


/** Short description of an EvidenceItem's lookup result, for model prompts. */
export function evidenceResultNote(e: any, dossierResult?: any): string {
  const tr = e?.tool_result;
  if (tr && tr.state) return `${tr.state}: ${tr.summary || ""}`.trim();
  if (e?.source !== "hermes_extraction") return "primary record";
  const r = summarizeToolResult(dossierResult || {});
  return `${r.state}: ${r.summary}`;
}
