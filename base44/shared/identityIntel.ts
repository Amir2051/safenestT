/**
 * Breach-data search (Dehashed) for MIA, routed by indicator type:
 * emails, domains and person names only — never wallets.
 * Key: secret "Dehashed_api_key" (or DEHASHED_API_KEY). Uses the v2 API;
 * falls back to v1 basic auth when DEHASHED_EMAIL is also set.
 */
const FREEMAIL = /^(gmail|yahoo|outlook|hotmail|icloud|proton|protonmail|aol|live)\./i;

export function collectIdentityQueries(caseItem: any, targets: any[] = []) {
  const q: { field: string; value: string }[] = []; const seen = new Set<string>();
  const add = (field: string, v: any) => { const s = String(v || "").trim(); if (!s) return; const k = `${field}:${s.toLowerCase()}`; if (seen.has(k)) return; seen.add(k); q.push({ field, value: s }); };
  const si = caseItem?.scammer_info || {}, sd = caseItem?.suspect_details || {};
  for (const e of [si.email, sd.email, ...(targets || []).filter((t: any) => String(t?.type).includes("email")).map((t: any) => t.value)]) {
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || "").trim())) { add("email", e); const dom = String(e).split("@")[1]; if (!FREEMAIL.test(dom)) add("domain", dom); }
  }
  for (const w of [si.website, sd.website, ...(targets || []).filter((t: any) => /domain|url|website/.test(String(t?.type))).map((t: any) => t.value)]) {
    const m = String(w || "").match(/^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i); if (m) add("domain", m[1].toLowerCase());
  }
  for (const n of [si.name, sd.name]) { const s = String(n || "").trim(); if (s.split(/\s+/).length >= 2 && !/scammer|unknown|test/i.test(s)) add("name", s); }
  for (const p of [si.phone, sd.phone]) { const d = String(p || "").replace(/\D/g, ""); if (d.length >= 10) add("phone", d); }
  return q.slice(0, 6);
}

async function search(field: string, value: string) {
  const key = (Deno.env.get("Dehashed_api_key") || Deno.env.get("DEHASHED_API_KEY") || "").trim();
  if (!key) return { state: "error", summary: "Dehashed key not configured", data: null };
  const query = `${field}:"${value}"`;
  try {
    let r = await fetch("https://api.dehashed.com/v2/search", {
      method: "POST", headers: { "Content-Type": "application/json", "Dehashed-Api-Key": key },
      body: JSON.stringify({ query, page: 1, size: 50, de_dupe: true }), signal: AbortSignal.timeout(20000),
    });
    const email = Deno.env.get("DEHASHED_EMAIL");
    if ((r.status === 401 || r.status === 403) && email) {
      r = await fetch(`https://api.dehashed.com/search?query=${encodeURIComponent(query)}&size=50`, {
        headers: { Accept: "application/json", Authorization: "Basic " + btoa(`${email}:${key}`) }, signal: AbortSignal.timeout(20000),
      });
    }
    const body = await r.json().catch(() => null);
    // Dehashed v2: 401 = no auth header was seen; 403 = a header was seen but the key is not valid.
    if (r.status === 401) return { state: "error", summary: "Dehashed returned HTTP 401: no Authorization header was recognized (check how the Dehashed_api_key secret is stored/passed)", data: null };
    if (r.status === 403) return { state: "error", summary: "Dehashed returned HTTP 403: the API key was rejected (invalid, expired, or no API access/credits)", data: null };
    if (!r.ok) return { state: "error", summary: `Dehashed error HTTP ${r.status}${body?.message ? `: ${body.message}` : ""}`, data: null };
    const entries = (body?.entries || []).map((e: any) => ({
      database: e.database_name, email: e.email, username: e.username, name: e.name, phone: e.phone,
      address: e.address, ip: e.ip_address, has_password: !!(e.password || e.hashed_password),
    }));
    const total = Number(body?.total ?? entries.length) || 0;
    if (!total) return { state: "empty", summary: `No breach records for ${field} ${value}`, data: { query, total: 0 } };
    const uniq = (k: string) => [...new Set(entries.flatMap((e: any) => [].concat(e[k] || [])).filter(Boolean))].slice(0, 15);
    const data = { query, total, databases: uniq("database"), emails: uniq("email"), usernames: uniq("username"), names: uniq("name"), phones: uniq("phone"), ips: uniq("ip"), sample: entries.slice(0, 20) };
    return { state: "data", summary: `${total} breach record(s) for ${field} ${value} across ${data.databases.length} source(s); ${data.names.length} name(s), ${data.phones.length} phone(s), ${data.emails.length} email(s)`, data };
  } catch (e: any) {
    return { state: "error", summary: `Dehashed request failed: ${e?.message || e}`, data: null };
  }
}

export async function runIdentityEvidence(base44: any, caseItem: any, targets: any[], user: any) {
  const out: any[] = [];
  for (const { field, value } of collectIdentityQueries(caseItem, targets)) {
    const r = await search(field, value);
    const now = new Date().toISOString(); const json = r.data ? JSON.stringify(r.data) : "";
    const rec = {
      tenant_id: caseItem.tenant_id, case_id: caseItem.id,
      filename: `dehashed_${field}_${value.replace(/[^a-z0-9]+/gi, "_").slice(0, 40)}.json`, file_url: `osint://dehashed/${field}/${encodeURIComponent(value)}`,
      evidence_type: field === "domain" ? "domain" : field === "email" ? "email" : "other", source: "breach_lookup",
      uploaded_by: user?.email || "mia_multi_agent", uploaded_by_name: "MIA breach search", uploaded_at: now,
      file_hash: `dehashed:${field}:${value.toLowerCase()}:${now.slice(0, 10)}`, description: `Dehashed breach search · ${field} ${value} · ${r.summary}`,
      tags: ["dehashed", field], processing_status: r.state === "data" ? "processed" : r.state === "error" ? "failed" : "review_required",
      detected_targets: [{ type: field, value }], original_import: false,
      tool_result: { capability: "dehashed.search", target: value, target_kind: field, status: r.state === "error" ? "error" : "success", state: r.state, summary: r.summary, record_count: r.data?.total ?? 0, retrieved_at: now, data_json: json.slice(0, 20000), data_bytes: json.length, truncated: json.length > 20000, source_reference: "dehashed" },
    };
    const saved = await base44.entities.EvidenceItem.create(rec).catch(() => null);
    out.push({ ...(saved || rec), _result: `${r.state}: ${r.summary}` });
  }
  return out;
}
