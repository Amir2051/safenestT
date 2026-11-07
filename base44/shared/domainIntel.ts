/**
 * Domain intelligence for MIA. Routes ONLY domains/URLs here (never wallets).
 * Sources: RDAP (WHOIS), crt.sh certificate transparency, Wayback Machine
 * snapshots, Shodan DNS (if SHODAN_API_KEY), VirusTotal (if VIRUSTOTAL_API_KEY).
 * Each source is stored as its own evidence item with a real result state.
 */
const DOMAIN_RE = /^(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i;

export function normDomain(v: any): string | null {
  const m = String(v || "").trim().match(DOMAIN_RE);
  if (!m) return null;
  const d = m[1].toLowerCase();
  if (/^\d+\.\d+\.\d+\.\d+$/.test(d) || d === "example.com") return null;
  return d;
}

export function collectDomains(caseItem: any, targets: any[] = []): string[] {
  const out = new Set<string>();
  const add = (v: any) => { const d = normDomain(v); if (d) out.add(d); };
  const si = caseItem?.scammer_info || {}, sd = caseItem?.suspect_details || {};
  add(si.website); add(sd.website);
  for (const e of [si.email, sd.email]) { const at = String(e || "").split("@")[1]; if (at && !/gmail|yahoo|outlook|hotmail|icloud|proton/i.test(at)) add(at); }
  for (const t of targets || []) { const ty = String(t?.type || ""); if (ty.includes("domain") || ty.includes("url") || ty.includes("website")) add(t.value); }
  for (const m of String(caseItem?.description || "").matchAll(/\b([a-z0-9-]+\.(?:io|com|net|org|co|xyz|app|finance|energy))\b/gi)) add(m[1]);
  return [...out].slice(0, 4);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function retryMs(): number { const raw = Deno.env.get("DOMAIN_RETRY_MS"); const v = raw === undefined || raw === "" ? NaN : Number(raw); return Number.isFinite(v) && v >= 0 ? v : 1500; }

/**
 * Fetch JSON with one retry on transient failures (429/5xx or a non-JSON block page).
 * Never throws on a non-JSON body: the HTTP status and a short snippet are kept so the
 * recorded evidence says WHY a lookup failed instead of a bare JSON parse error.
 */
async function j(url: string, init?: RequestInit, ms = 15000) {
  let last: any = { ok: false, status: 0, body: null, err: "no attempt made" };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(url, { ...init, signal: c.signal });
      const txt = await r.text();
      let body: any = null; let parsed = true;
      if (txt) { try { body = JSON.parse(txt); } catch { parsed = false; } }
      if (parsed) { last = { ok: r.ok, status: r.status, body }; if (r.status !== 429 && r.status < 500) return last; }
      else {
        const type = (r.headers.get("content-type") || "unknown type").split(";")[0];
        last = { ok: false, status: r.status, body: null, err: `HTTP ${r.status} returned ${type}, not JSON (${txt.slice(0, 60).replace(/\s+/g, " ").trim()})` };
        if (r.status === 404) return last; // a definite "not found" is not transient
      }
    } catch (e: any) {
      return { ok: false, status: 0, body: null, err: e?.message || String(e) }; // timeouts/network: do not retry
    } finally { clearTimeout(t); }
    if (attempt < 2) await sleep(retryMs());
  }
  return last;
}

const why = (r: any) => (r.err ? r.err : `HTTP ${r.status}`);

async function rdap(d: string) {
  const r = await j(`https://rdap.org/domain/${d}`);
  if (r.status === 404 && /No RDAP service/i.test(JSON.stringify(r.body || ""))) return { state: "not_applicable", summary: `Registry for .${d.split(".").pop()} offers no public RDAP; WHOIS history needs a WHOIS provider`, data: null };
  if (r.status === 404) return { state: "empty", summary: `No WHOIS/RDAP record for ${d} (domain may be expired or unregistered)`, data: null };
  if (!r.ok || !r.body) return { state: "error", summary: `RDAP lookup failed (${why(r)})`, data: null };
  const ev = Object.fromEntries((r.body.events || []).map((e: any) => [e.eventAction, e.eventDate]));
  const ent = (r.body.entities || []).map((e: any) => ({ roles: e.roles, name: (e.vcardArray?.[1] || []).find((x: any) => x[0] === "fn")?.[3] || null, org: (e.vcardArray?.[1] || []).find((x: any) => x[0] === "org")?.[3] || null }));
  const registrar = ent.find((e: any) => (e.roles || []).includes("registrar"))?.name || null;
  const data = { domain: d, registered: ev.registration || null, expires: ev.expiration || null, updated: ev["last changed"] || null, registrar, entities: ent, nameservers: (r.body.nameservers || []).map((n: any) => n.ldhName), status: r.body.status };
  return { state: "data", summary: `Registered ${data.registered?.slice(0,10) || "?"} via ${registrar || "unknown registrar"}; nameservers ${data.nameservers.join(", ") || "none"}`, data };
}

async function crtsh(d: string) {
  const r = await j(`https://crt.sh/?q=${encodeURIComponent("%." + d)}&output=json`, undefined, 25000);
  if (!r.ok || !Array.isArray(r.body)) return { state: "error", summary: `crt.sh lookup failed (${why(r)})`, data: null };
  if (!r.body.length) return { state: "empty", summary: `No TLS certificates logged for ${d}`, data: null };
  const names = [...new Set(r.body.flatMap((c: any) => String(c.name_value).split("\n")))].slice(0, 40);
  const dates = r.body.map((c: any) => c.not_before).sort();
  const issuers = [...new Set(r.body.map((c: any) => c.issuer_name))].slice(0, 5);
  return { state: "data", summary: `${r.body.length} certificates, first ${dates[0]?.slice(0,10)}, last ${dates[dates.length-1]?.slice(0,10)}; ${names.length} hostnames`, data: { domain: d, count: r.body.length, first: dates[0], last: dates[dates.length-1], hostnames: names, issuers } };
}

async function wayback(d: string) {
  const r = await j(`https://web.archive.org/cdx/search/cdx?url=${d}&output=json&fl=timestamp,original,statuscode&collapse=timestamp:6&limit=200`, undefined, 25000);
  if (!r.ok || !Array.isArray(r.body)) return { state: "error", summary: `Wayback lookup failed (${why(r)})`, data: null };
  const rows = r.body.slice(1);
  if (!rows.length) return { state: "empty", summary: `No Wayback Machine snapshots for ${d}`, data: null };
  const ts = rows.map((x: any) => x[0]).sort();
  const fmt = (t: string) => `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;
  return { state: "data", summary: `${rows.length} monthly snapshots, ${fmt(ts[0])} to ${fmt(ts[ts.length-1])}`, data: { domain: d, snapshots: rows.length, first: fmt(ts[0]), last: fmt(ts[ts.length-1]), sample_urls: rows.slice(-10).map((x: any) => `https://web.archive.org/web/${x[0]}/${x[1]}`) } };
}

async function shodan(d: string) {
  const key = Deno.env.get("SHODAN_API_KEY"); if (!key) return { state: "error", summary: "SHODAN_API_KEY not configured", data: null };
  const r = await j(`https://api.shodan.io/dns/domain/${d}?key=${key}`);
  if (r.status === 404) return { state: "empty", summary: `Shodan has no DNS data for ${d}`, data: null };
  if (r.status === 403) return { state: "error", summary: "Shodan lookup failed (HTTP 403): the API key was refused or its plan does not include DNS domain lookups", data: null };
  if (!r.ok || !r.body) return { state: "error", summary: `Shodan lookup failed (${why(r)})`, data: null };
  const recs = (r.body.data || []).map((x: any) => ({ sub: x.subdomain, type: x.type, value: x.value, last_seen: x.last_seen }));
  if (!recs.length) return { state: "empty", summary: `Shodan returned no DNS records for ${d}`, data: null };
  const ips = [...new Set(recs.filter((x: any) => x.type === "A").map((x: any) => x.value))];
  return { state: "data", summary: `${recs.length} DNS records; IPs ${ips.slice(0,5).join(", ") || "none"}`, data: { domain: d, records: recs.slice(0, 50), ips } };
}

async function virustotal(d: string) {
  const key = Deno.env.get("VIRUSTOTAL_API_KEY"); if (!key) return { state: "error", summary: "VIRUSTOTAL_API_KEY not configured", data: null };
  const r = await j(`https://www.virustotal.com/api/v3/domains/${d}`, { headers: { "x-apikey": key } });
  if (r.status === 404) return { state: "empty", summary: `VirusTotal has no record of ${d}`, data: null };
  if (!r.ok || !r.body?.data) return { state: "error", summary: `VirusTotal lookup failed (${why(r)})`, data: null };
  const a = r.body.data.attributes || {}; const s = a.last_analysis_stats || {};
  return { state: "data", summary: `${s.malicious || 0} engines flag malicious, ${s.suspicious || 0} suspicious; categories ${Object.values(a.categories || {}).slice(0,3).join(", ") || "none"}`, data: { domain: d, stats: s, categories: a.categories, reputation: a.reputation, creation_date: a.creation_date ? new Date(a.creation_date * 1000).toISOString() : null, registrar: a.registrar } };
}

const SOURCES: [string, (d: string) => Promise<any>][] = [["rdap.whois", rdap], ["crtsh.certificates", crtsh], ["wayback.snapshots", wayback], ["shodan.dns", shodan], ["virustotal.domain", virustotal]];

export async function runDomainEvidence(base44: any, caseItem: any, targets: any[], user: any) {
  const domains = collectDomains(caseItem, targets);
  const out: any[] = [];
  for (const d of domains) {
    const results = await Promise.all(SOURCES.map(async ([cap, fn]) => [cap, await fn(d).catch((e: any) => ({ state: "error", summary: String(e?.message || e), data: null }))] as const));
    for (const [cap, r] of results) {
      const now = new Date().toISOString(); const json = r.data ? JSON.stringify(r.data) : "";
      const rec = {
        tenant_id: caseItem.tenant_id, case_id: caseItem.id,
        filename: `${cap}_${d}.json`, file_url: `osint://${cap}/${d}`, evidence_type: "domain", source: "domain_lookup",
        uploaded_by: user?.email || "mia_multi_agent", uploaded_by_name: "MIA domain intelligence", uploaded_at: now,
        file_hash: `${cap}:${d}:${now.slice(0,10)}`, description: `${cap} · ${d} · ${r.summary}`,
        tags: ["domain", cap.split(".")[0]], processing_status: r.state === "data" ? "processed" : r.state === "error" ? "failed" : "review_required",
        detected_targets: [{ type: "domain", value: d }], original_import: false,
        tool_result: { capability: cap, target: d, target_kind: "domain", status: r.state === "error" ? "error" : "success", state: r.state, summary: r.summary, record_count: r.data ? 1 : 0, retrieved_at: now, data_json: json.slice(0, 20000), data_bytes: json.length, truncated: json.length > 20000, source_reference: cap },
      };
      const saved = await base44.entities.EvidenceItem.create(rec).catch(() => null);
      out.push({ ...(saved || rec), _result: `${r.state}: ${r.summary}` });
    }
  }
  return out;
}
