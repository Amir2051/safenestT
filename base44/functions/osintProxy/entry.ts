import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

/**
 * osintProxy — server-side OSINT dispatcher for CONFIGURED + public providers.
 *
 * Keeps every API key server-side and NEVER returns a key to the browser.
 * Public providers (DNS-over-HTTPS, RDAP/WHOIS) need no key. Etherscan/Alchemy
 * use configured app secrets. Reputation providers (VirusTotal/Shodan/Firecrawl)
 * live in osintReputationProxy and are reported here as "Not configured" when
 * their keys are absent — the investigation continues with available tools.
 *
 * Contract:
 *   IN  { provider?: "status"|"dns"|"rdap"|"etherscan"|"alchemy", target?, network? }
 *   OUT { ok, configured, provider, data?, error? }
 */
const TIMEOUT_MS = 20000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { provider, target, network } = payload || {};

    if (!provider || provider === "status") {
      return Response.json({ ok: true, data: providerStatuses() });
    }

    switch (provider) {
      case "dns": return await runDns(target);
      case "rdap": return await runRdap(target);
      case "etherscan": return await runEtherscan(target);
      case "alchemy": return await runAlchemy(target, network);
      default: return Response.json({ ok: false, error: `Unknown/unsupported provider: ${provider}` }, { status: 400 });
    }
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message || String(error) }, { status: 500 });
  }
}

function providerStatuses() {
  return [
    { provider: "dns", label: "DNS (DoH)", configured: true, category: "network", note: "Public — Cloudflare DNS-over-HTTPS" },
    { provider: "rdap", label: "WHOIS / RDAP", configured: true, category: "network", note: "Public — RDAP" },
    { provider: "etherscan", label: "Etherscan", configured: !!secrets.get("ETHERSCAN_API_KEY"), category: "blockchain", note: "Ethereum mainnet address + tx lookup" },
    { provider: "alchemy", label: "Alchemy", configured: !!secrets.get("ALCHEMY_API_KEY"), category: "blockchain", note: "Ethereum mainnet balance + token balances" },
    { provider: "virustotal", label: "VirusTotal", configured: false, category: "reputation", note: "Not configured — add VIRUSTOTAL_API_KEY in Secrets (optional)" },
    { provider: "shodan", label: "Shodan", configured: false, category: "infrastructure", note: "Not configured — add SHODAN_API_KEY in Secrets (optional)" },
    { provider: "firecrawl", label: "Firecrawl", configured: false, category: "web", note: "Not configured — add FIRECRAWL_API_KEY in Secrets (optional)" },
  ];
}

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

async function runDns(target: string) {
  if (!target) return Response.json({ ok: false, configured: true, provider: "dns", error: "target (domain) is required" }, { status: 400 });
  const domain = String(target).trim().toLowerCase();
  const types = ["A", "NS", "MX"];
  const results: any = {};
  try {
    for (const t of types) {
      const res = await fetchWithTimeout(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${t}`,
        { headers: { accept: "application/dns-json" } }
      );
      const json = await res.json();
      results[t] = (json?.Answer || []).map((a: any) => a.data);
    }
    return Response.json({ ok: true, configured: true, provider: "dns", data: { domain, records: results, source: "dns" } });
  } catch (e: any) {
    return Response.json({ ok: false, configured: true, provider: "dns", error: e?.name === "AbortError" ? "DNS lookup timed out" : (e?.message || String(e)) }, { status: 502 });
  }
}

async function runRdap(target: string) {
  if (!target) return Response.json({ ok: false, configured: true, provider: "rdap", error: "target (domain) is required" }, { status: 400 });
  const domain = String(target).trim().toLowerCase();
  const tld = domain.split(".").pop() || "";
  // Verisign serves RDAP for .com/.net directly (reliable from serverless);
  // everything else falls back to the rdap.org bootstrap.
  const endpoint = (tld === "com" || tld === "net")
    ? `https://rdap.verisign.com/${tld}/v1/domain/${encodeURIComponent(domain)}`
    : `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  const headers = { "User-Agent": "SafeNestT-Investigation-Engine/1.0", Accept: "application/rdap+json" };
  try {
    const res = await fetchWithTimeout(endpoint, { headers });
    if (res.status === 404) return Response.json({ ok: true, configured: true, provider: "rdap", data: { domain, registered: false, note: "No RDAP record found.", source: "rdap" } });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return Response.json({ ok: false, configured: true, provider: "rdap", error: `RDAP ${res.status}: ${t.slice(0, 200)}` }, { status: 502 });
    }
    const json = await res.json();
    const events = (json?.events || []).map((e: any) => ({ event: e.eventAction, date: e.eventDate }));
    const nameservers = (json?.nameservers || []).map((n: any) => n.ldhName || n.unicodeName).filter(Boolean);
    const entities = (json?.entities || []).map((en: any) => ({ role: en.roles?.[0], handle: en.handle, name: en.vcardArray?.flat?.().find((v: any) => v?.[0] === "fn")?.[1] }));
    return Response.json({ ok: true, configured: true, provider: "rdap", data: { domain, registered: true, status: json?.status || [], events, nameservers, entities, source: "rdap" } });
  } catch (e: any) {
    return Response.json({ ok: false, configured: true, provider: "rdap", error: e?.name === "AbortError" ? "RDAP lookup timed out" : (e?.message || String(e)) }, { status: 502 });
  }
}

async function runEtherscan(target: string) {
  const key = secrets.get("ETHERSCAN_API_KEY");
  if (!key) return Response.json({ ok: false, configured: false, provider: "etherscan", error: "ETHERSCAN_API_KEY is not configured" }, { status: 503 });
  if (!target) return Response.json({ ok: false, configured: true, provider: "etherscan", error: "target (address) is required" }, { status: 400 });
  const address = String(target).trim();
  try {
    const balRes = await fetchWithTimeout(
      `https://api.etherscan.io/api?module=account&action=balance&address=${encodeURIComponent(address)}&tag=latest&apikey=${encodeURIComponent(key)}`
    );
    const balJson = await balRes.json();
    // Etherscan returns { status:"1", result:"<wei>" } on success; any other
    // status is a real error (rate limit, invalid key, invalid address) —
    // surface it honestly instead of returning a fabricated zero balance.
    if (balJson?.status !== "1") {
      return Response.json({ ok: false, configured: true, provider: "etherscan", error: `Etherscan: ${balJson?.message || balJson?.result || "unknown error"}` }, { status: 502 });
    }
    const balanceWei = Number(balJson.result) || 0;
    const balanceEth = balanceWei / 1e18;

    const txRes = await fetchWithTimeout(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${encodeURIComponent(address)}&startblock=0&page=1&offset=20&sort=desc&apikey=${encodeURIComponent(key)}`
    );
    const txJson = await txRes.json();
    const txs = Array.isArray(txJson?.result)
      ? txJson.result.slice(0, 20).map((t: any) => ({
          hash: t.hash, from: t.from, to: t.to, value_wei: t.value, value_eth: Number(t.value || 0) / 1e18,
          timestamp: t.timeStamp ? new Date(Number(t.timeStamp) * 1000).toISOString() : null,
          block: t.blockNumber, is_error: t.isError === "1",
        }))
      : [];

    return Response.json({
      ok: true, configured: true, provider: "etherscan",
      data: { address, balance_wei: balanceWei, balance_eth: balanceEth, tx_count: txs.length, recent_txs: txs, source: "etherscan" },
    });
  } catch (e: any) {
    return Response.json({ ok: false, configured: true, provider: "etherscan", error: e?.name === "AbortError" ? "Etherscan lookup timed out" : (e?.message || String(e)) }, { status: 502 });
  }
}

async function runAlchemy(target: string, network: string) {
  const key = secrets.get("ALCHEMY_API_KEY");
  if (!key) return Response.json({ ok: false, configured: false, provider: "alchemy", error: "ALCHEMY_API_KEY is not configured" }, { status: 503 });
  if (!target) return Response.json({ ok: false, configured: true, provider: "alchemy", error: "target (address) is required" }, { status: 400 });
  const address = String(target).trim();
  const net = network && network !== "ethereum" && network !== "other" ? network : "eth-mainnet";
  const endpoint = `https://${net}.g.alchemy.com/v2/${encodeURIComponent(key)}`;
  try {
    const balRes = await fetchWithTimeout(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "eth_getBalance", params: [address, "latest"] }),
    });
    const balJson = await balRes.json();
    // JSON-RPC error → surface honestly (invalid key, rate limit, bad network).
    if (balJson?.error) {
      return Response.json({ ok: false, configured: true, provider: "alchemy", error: `Alchemy: ${balJson.error.message || JSON.stringify(balJson.error)}` }, { status: 502 });
    }
    const balanceWei = parseInt(balJson?.result || "0x0", 16) || 0;
    const balanceEth = balanceWei / 1e18;

    const tokRes = await fetchWithTimeout(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 2, jsonrpc: "2.0", method: "alchemy_getTokenBalances", params: [address] }),
    });
    const tokJson = await tokRes.json();
    const tokenBalances = Array.isArray(tokJson?.result?.tokenBalances)
      ? tokJson.result.tokenBalances
          .filter((t: any) => t.tokenBalance && t.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000")
          .map((t: any) => ({ contract: t.contractAddress }))
      : [];

    return Response.json({
      ok: true, configured: true, provider: "alchemy",
      data: { address, network: net, balance_wei: balanceWei, balance_eth: balanceEth, token_count: tokenBalances.length, tokens: tokenBalances.slice(0, 20), source: "alchemy" },
    });
  } catch (e: any) {
    return Response.json({ ok: false, configured: true, provider: "alchemy", error: e?.name === "AbortError" ? "Alchemy lookup timed out" : (e?.message || String(e)) }, { status: 502 });
  }
}