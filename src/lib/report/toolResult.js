/**
 * Interprets what an automated OSINT lookup actually returned.
 *
 * A lookup that "completed" is not evidence. This decides, from the result
 * payload itself, whether the lookup produced data, came back empty, or was
 * the wrong kind of lookup for the indicator (e.g. a domain/DNS lookup run
 * against a crypto wallet address).
 *
 * KEEP IN SYNC with the copy in base44/functions/syncHermesInvestigation/entry.ts
 * (Deno functions cannot import from src/).
 */

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Keys that echo the query rather than carry a result.
const ECHO_KEYS = new Set(["domain", "target", "source", "query", "status", "type", "provider"]);

// Lookups that only make sense for a hostname / IP.
const NETWORK_TOOLS = /(shodan_domain|whois|dns|subdomain|ssl|cert|reverse_ip|passive_dns)/i;

export const RESULT_STATE = {
  data: { label: "Returned data", tone: "positive" },
  empty: { label: "No records found", tone: "neutral" },
  not_applicable: { label: "Not applicable", tone: "caution" },
  error: { label: "Lookup failed", tone: "negative" },
  unknown: { label: "Result not recorded", tone: "neutral" },
};

export function targetKind(target) {
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

/** Count of substantive values (ignores echoed query fields, nulls, empty lists). */
export function substantiveCount(value, key = "") {
  if (ECHO_KEYS.has(String(key).toLowerCase())) return 0;
  if (value === null || value === undefined) return 0;
  if (typeof value === "string") return value.trim() ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? 1 : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value)) return value.reduce((n, item) => n + (substantiveCount(item) > 0 ? 1 : 0), 0);
  if (isObj(value)) return Object.entries(value).reduce((n, [k, v]) => n + substantiveCount(v, k), 0);
  return 0;
}

/**
 * @param {object} p
 * @param {string} p.capability  e.g. "cyber_intel.threat_intel.shodan_domain"
 * @param {string} p.target      the value that was looked up
 * @param {string} p.status      tool status ("success", "error", ...)
 * @param {*}      p.data        the result payload
 */
export function summarizeToolResult({ capability = "", target = "", status = "", data } = {}) {
  const kind = targetKind(target);
  const st = String(status || "").toLowerCase();
  const tool = String(capability || "").split(".").pop();

  if (st && !["success", "ok", "completed"].includes(st)) {
    return { state: "error", record_count: 0, target_kind: kind, summary: `The lookup did not complete (status: ${st}).` };
  }
  if (NETWORK_TOOLS.test(tool) && kind && !["domain", "ip"].includes(kind)) {
    return {
      state: "not_applicable", record_count: 0, target_kind: kind,
      summary: `A domain/network lookup was run against a ${kind === "wallet" ? "wallet address" : kind}, which it cannot resolve. No result.`,
    };
  }
  if (data === undefined) {
    return { state: "unknown", record_count: 0, target_kind: kind, summary: "The result of this lookup was not recorded." };
  }
  // Lists of records are the usual shape: { items: [...] }, { results: [...] }, { dns: [...] }.
  let records = 0;
  if (Array.isArray(data)) records = data.length;
  else if (isObj(data)) {
    for (const [k, v] of Object.entries(data)) {
      if (ECHO_KEYS.has(k.toLowerCase())) continue;
      if (Array.isArray(v)) records += v.length;
      else if (substantiveCount(v, k) > 0) records += 1;
    }
  }
  if (records === 0 || substantiveCount(data) === 0) {
    return { state: "empty", record_count: 0, target_kind: kind, summary: "The lookup ran and returned no records." };
  }
  return { state: "data", record_count: records, target_kind: kind, summary: `The lookup returned ${records} record${records === 1 ? "" : "s"}.` };
}
