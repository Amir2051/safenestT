import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

/**
 * osintReputationProxy — server-side dispatcher for OPTIONAL reputation
 * providers (VirusTotal, Shodan, Firecrawl). These keys are not configured by
 * default; when absent the function returns { ok:false, configured:false } so
 * the UI can show "Not configured" honestly and the investigation continues
 * with the tools that are available. Keys are never returned to the browser.
 *
 * Contract:
 *   IN  { provider: "virustotal"|"shodan"|"firecrawl", target? }
 *   OUT { ok, configured, provider, data?, error? }
 */
const TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string, opts: any = {}, ms = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    const payload = await req.json().catch(() => ({}));
    const { provider, target } = payload || {};

    switch (provider) {
      case "virustotal": return await runVirusTotal(target);
      case "shodan": return await runShodan(target);
      case "firecrawl": return await runFirecrawl(target);
      default: return Response.json({ ok: false, error: `Unknown provider: ${provider}` }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}

async function runVirusTotal(target: string) {
  const key = secrets.get("VIRUSTOTAL_API_KEY");
  if (!key) return Response.json({ ok: false, configured: false, provider: "virustotal", error: "VIRUSTOTAL_API_KEY is not configured" }, { status: 503 });
  if (!target) return Response.json({ ok: false, configured: true, provider: "virustotal", error: "target is required" }, { status: 400 });
  try {
    const res = await fetchWithTimeout(`https://www.virustotal.com/api/v3/domains/${encodeURIComponent(String(target).trim())}`, { headers: { "x-apikey": key } });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return Response.json({ ok: false, configured: true, provider: "virustotal", error: `VirusTotal ${res.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const json = await res.json();
    const stats = json?.data?.attributes?.last_analysis_stats || {};
    return Response.json({ ok: true, configured: true, provider: "virustotal", data: { target, stats, source: "virustotal" } });
  } catch (e: any) {
    return Response.json({ ok: false, configured: true, provider: "virustotal", error: e?.name === "AbortError" ? "VirusTotal lookup timed out" : (e?.message || String(e)) }, { status: 502 });
  }
}

async function runShodan(target: string) {
  const key = secrets.get("SHODAN_API_KEY");
  if (!key) return Response.json({ ok: false, configured: false, provider: "shodan", error: "SHODAN_API_KEY is not configured" }, { status: 503 });
  if (!target) return Response.json({ ok: false, configured: true, provider: "shodan", error: "target (IP) is required" }, { status: 400 });
  try {
    const res = await fetchWithTimeout(`https://api.shodan.io/shodan/host/${encodeURIComponent(String(target).trim())}?key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return Response.json({ ok: false, configured: true, provider: "shodan", error: `Shodan ${res.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const json = await res.json();
    return Response.json({ ok: true, configured: true, provider: "shodan", data: { ip: json.ip_str, org: json.org, os: json.os, ports: json.ports, hostnames: json.hostnames, source: "shodan" } });
  } catch (e: any) {
    return Response.json({ ok: false, configured: true, provider: "shodan", error: e?.name === "AbortError" ? "Shodan lookup timed out" : (e?.message || String(e)) }, { status: 502 });
  }
}

async function runFirecrawl(target: string) {
  const key = secrets.get("FIRECRAWL_API_KEY");
  if (!key) return Response.json({ ok: false, configured: false, provider: "firecrawl", error: "FIRECRAWL_API_KEY is not configured" }, { status: 503 });
  if (!target) return Response.json({ ok: false, configured: true, provider: "firecrawl", error: "target (URL) is required" }, { status: 400 });
  try {
    const res = await fetchWithTimeout("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: String(target).trim() }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return Response.json({ ok: false, configured: true, provider: "firecrawl", error: `Firecrawl ${res.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const json = await res.json();
    return Response.json({ ok: true, configured: true, provider: "firecrawl", data: { url: target, markdown: (json?.data?.markdown || "").slice(0, 2000), source: "firecrawl" } });
  } catch (e: any) {
    return Response.json({ ok: false, configured: true, provider: "firecrawl", error: e?.name === "AbortError" ? "Firecrawl lookup timed out" : (e?.message || String(e)) }, { status: 502 });
  }
}