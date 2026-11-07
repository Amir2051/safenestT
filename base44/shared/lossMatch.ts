/**
 * Multi-pass loss matching for a suspect Ethereum wallet.
 * Pass 1: full history (normal + internal txs) via Etherscan V2.
 * Pass 2: USD value of every transfer at its own date (CoinGecko daily price).
 * Pass 3: find inbound payments (often several installments, per sender) whose
 *         USD total matches the reported loss; prefer ones near the incident date.
 * Pass 4: follow where each matched payment went next (hop-1 outflows).
 * Pass 5: flag address-poisoning (dust from look-alike addresses).
 * Output is a proposal for human review, never an established fact.
 */
const V2 = "https://api.etherscan.io/v2/api";

async function es(params: Record<string, string>, key: string) {
  const r = await fetch(`${V2}?${new URLSearchParams({ chainid: "1", ...params, apikey: key })}`).catch(() => null);
  return r ? await r.json().catch(() => ({})) : {};
}

async function dailyPrices(fromSec: number, toSec: number): Promise<Record<string, number>> {
  const r = await fetch(`https://api.coingecko.com/api/v3/coins/ethereum/market_chart/range?vs_currency=usd&from=${fromSec - 86400}&to=${toSec + 86400}`).catch(() => null);
  const b = r ? await r.json().catch(() => ({})) : {};
  const out: Record<string, number> = {};
  for (const [ms, p] of (b?.prices || [])) out[new Date(ms).toISOString().slice(0, 10)] = p;
  return out;
}

const lookalike = (a: string, b: string) => a !== b && a.slice(0, 6) === b.slice(0, 6) && a.slice(-4) === b.slice(-4);

export async function matchLoss(address: string, lossUsd: number, incidentDate?: string) {
  const key = Deno.env.get("ETHERSCAN_API_KEY");
  if (!key) return { state: "error", summary: "ETHERSCAN_API_KEY is not configured", data: null };
  const a = address.toLowerCase();
  const [n, i] = await Promise.all([
    es({ module: "account", action: "txlist", address: a, startblock: "0", endblock: "99999999", page: "1", offset: "1000", sort: "asc" }, key),
    es({ module: "account", action: "txlistinternal", address: a, startblock: "0", endblock: "99999999", page: "1", offset: "1000", sort: "asc" }, key),
  ]);
  const norm = (Array.isArray(n?.result) ? n.result : []).map((t: any) => ({ ...t, kind: "normal" }));
  const intl = (Array.isArray(i?.result) ? i.result : []).map((t: any) => ({ ...t, kind: "internal" }));
  const txs = [...norm, ...intl].filter((t: any) => t.isError !== "1")
    .map((t: any) => ({ hash: t.hash, kind: t.kind, ts: Number(t.timeStamp), from: String(t.from).toLowerCase(), to: String(t.to).toLowerCase(), eth: Number(t.value) / 1e18 }))
    .sort((x: any, y: any) => x.ts - y.ts);
  if (!txs.length) return { state: "empty", summary: `No transactions for ${a}`, data: null };

  const prices = await dailyPrices(txs[0].ts, txs[txs.length - 1].ts);
  const priced = Object.keys(prices).length > 0;
  for (const t of txs as any[]) { const p = prices[new Date(t.ts * 1000).toISOString().slice(0, 10)]; t.usd = p ? Math.round(t.eth * p * 100) / 100 : null; t.date = new Date(t.ts * 1000).toISOString(); }

  const inbound = txs.filter((t: any) => t.to === a && t.eth > 0.0001);
  const outbound = txs.filter((t: any) => t.from === a && t.eth > 0);
  const dust = txs.filter((t: any) => t.to === a && t.eth <= 0.0001);
  const outTargets = [...new Set(outbound.map((t: any) => t.to))];
  const poisoning = dust.filter((d: any) => outTargets.some((o) => lookalike(o, d.from))).map((d: any) => ({ dust_from: d.from, mimics: outTargets.find((o) => lookalike(o, d.from)), hash: d.hash, date: d.date }));

  // Pass 3: candidate payment groups — per sender, plus time windows near the incident date.
  const tol = 0.1; const incidentTs = incidentDate ? Date.parse(incidentDate) / 1000 : null;
  const candidates: any[] = [];
  const bySender: Record<string, any[]> = {};
  for (const t of inbound as any[]) (bySender[t.from] ||= []).push(t);
  for (const [sender, list] of Object.entries(bySender)) {
    // contiguous runs of this sender's payments
    for (let s = 0; s < list.length; s++) {
      let usd = 0;
      for (let e = s; e < list.length; e++) {
        usd += list[e].usd || 0;
        const diff = lossUsd ? Math.abs(usd - lossUsd) / lossUsd : 1;
        if (diff <= tol) candidates.push({ sender, payments: list.slice(s, e + 1), usd: Math.round(usd * 100) / 100, diff_pct: Math.round(diff * 1000) / 10 });
      }
    }
  }
  for (const c of candidates) {
    const mid = c.payments[0].ts;
    c.days_from_incident = incidentTs ? Math.round(Math.abs(mid - incidentTs) / 86400) : null;
    c.score = c.diff_pct + (c.days_from_incident ?? 30) * 0.5 + (c.payments.length - 1) * 0.2;
  }
  candidates.sort((x, y) => x.score - y.score);
  const best = candidates[0] || null;

  // Pass 4: where each matched payment went next (first outflows within 72h).
  const followups = best ? best.payments.map((p: any) => ({
    in_hash: p.hash, in_eth: p.eth, in_usd: p.usd, in_date: p.date,
    next: outbound.filter((o: any) => o.ts >= p.ts && o.ts - p.ts <= 72 * 3600).slice(0, 3).map((o: any) => ({ hash: o.hash, to: o.to, eth: o.eth, usd: o.usd, hours_later: Math.round((o.ts - p.ts) / 360) / 10 })),
  })) : [];

  const sum = (xs: any[], k: string) => Math.round(xs.reduce((s, t) => s + (t[k] || 0), 0) * 1e6) / 1e6;
  const data = {
    address: a, priced, loss_usd: lossUsd, incident_date: incidentDate || null,
    totals: { inbound_count: inbound.length, outbound_count: outbound.length, eth_in: sum(inbound, "eth"), eth_out: sum(outbound, "eth"), usd_in: priced ? sum(inbound, "usd") : null, usd_out: priced ? sum(outbound, "usd") : null, internal_tx: intl.length },
    senders: Object.entries(bySender).map(([s, l]) => ({ sender: s, payments: l.length, eth: sum(l, "eth"), usd: priced ? sum(l, "usd") : null })).sort((x, y) => (y.usd || 0) - (x.usd || 0)).slice(0, 8),
    best_match: best, alternative_matches: candidates.slice(1, 4), followups, address_poisoning: poisoning,
  };
  let summary: string;
  if (!priced) summary = `Price data unavailable; ${inbound.length} inbound / ${outbound.length} outbound transfers listed without USD matching`;
  else if (best) summary = `Proposed match: ${best.payments.length} payment(s) from ${best.sender.slice(0, 10)}… totaling $${best.usd.toLocaleString()} (${best.diff_pct}% from reported $${lossUsd.toLocaleString()}), ${best.days_from_incident ?? "?"} day(s) from incident date`;
  else summary = `No group of inbound payments within 10% of the reported $${lossUsd.toLocaleString()} loss`;
  if (poisoning.length) summary += `; ${poisoning.length} address-poisoning dust transfer(s) detected`;
  return { state: priced && best ? "data" : priced ? "empty" : "partial", summary, data };
}
