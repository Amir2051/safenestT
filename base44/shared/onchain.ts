import { matchLoss } from "./lossMatch.ts";
/**
 * On-chain lookups for MIA (Etherscan API V2, Ethereum mainnet, chainid=1).
 * Pulls real transaction history for every Ethereum wallet on the case and
 * stores it as an EvidenceItem with a tool_result, so the reality check can
 * cite actual chain data. Never fabricates: a wallet with no data, a missing
 * key or an API error is recorded as such.
 */
const V2 = "https://api.etherscan.io/v2/api";
const ETH_RE = /^0x[a-fA-F0-9]{40}$/;

export function collectEthWallets(caseItem: any, targets: any[] = []): string[] {
  const out = new Set<string>();
  const add = (w: any) => { const s = String(w || "").trim(); if (ETH_RE.test(s)) out.add(s.toLowerCase()); };
  for (const w of caseItem?.scammer_info?.wallet_addresses || []) add(w);
  for (const w of caseItem?.suspect_details?.wallet_addresses || []) add(w);
  for (const w of caseItem?.monitored_wallets || []) add(w);
  for (const t of targets || []) if (String(t?.type || "").includes("wallet")) add(t.value);
  return [...out].slice(0, 5);
}

async function call(params: Record<string, string>, key: string) {
  const qs = new URLSearchParams({ chainid: "1", ...params, apikey: key });
  const res = await fetch(`${V2}?${qs}`);
  const body = await res.json().catch(() => ({}));
  return body;
}

export async function lookupWallet(address: string) {
  const key = Deno.env.get("ETHERSCAN_API_KEY");
  if (!key) return { state: "error", summary: "ETHERSCAN_API_KEY is not configured", data: null };
  try {
    const [bal, txs, toks] = await Promise.all([
      call({ module: "account", action: "balance", address, tag: "latest" }, key),
      call({ module: "account", action: "txlist", address, startblock: "0", endblock: "99999999", page: "1", offset: "200", sort: "desc" }, key),
      call({ module: "account", action: "tokentx", address, page: "1", offset: "100", sort: "desc" }, key),
    ]);
    const apiErr = [bal, txs, toks].find((b) => b?.status === "0" && typeof b?.result === "string" && !/no transactions/i.test(b?.message + b?.result));
    if (apiErr) return { state: "error", summary: `Etherscan error: ${apiErr.result || apiErr.message}`, data: null };
    const list = Array.isArray(txs?.result) ? txs.result : [];
    const tokens = Array.isArray(toks?.result) ? toks.result : [];
    const a = address.toLowerCase();
    const inbound = list.filter((t: any) => String(t.to).toLowerCase() === a);
    const outbound = list.filter((t: any) => String(t.from).toLowerCase() === a);
    const sum = (xs: any[]) => xs.reduce((s, t) => s + Number(t.value || 0) / 1e18, 0);
    const top = (xs: any[], k: string) => {
      const m: Record<string, number> = {};
      for (const t of xs) m[String(t[k]).toLowerCase()] = (m[String(t[k]).toLowerCase()] || 0) + 1;
      return Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([addr, n]) => ({ addr, n }));
    };
    const balance = Number(bal?.result || 0) / 1e18;
    const data = {
      address, chain: "ethereum", balance_eth: Number(balance.toFixed(6)),
      tx_count: list.length, inbound_count: inbound.length, outbound_count: outbound.length,
      eth_in: Number(sum(inbound).toFixed(6)), eth_out: Number(sum(outbound).toFixed(6)),
      first_seen: list.length ? new Date(Number(list[list.length - 1].timeStamp) * 1000).toISOString() : null,
      last_seen: list.length ? new Date(Number(list[0].timeStamp) * 1000).toISOString() : null,
      top_senders: top(inbound, "from"), top_recipients: top(outbound, "to"),
      token_transfers: tokens.length,
      tokens: [...new Set(tokens.map((t: any) => t.tokenSymbol))].slice(0, 10),
      recent: list.slice(0, 15).map((t: any) => ({ hash: t.hash, time: new Date(Number(t.timeStamp) * 1000).toISOString(), from: t.from, to: t.to, eth: Number(t.value) / 1e18 })),
    };
    if (!list.length && !tokens.length) return { state: "empty", summary: `No on-chain transactions found for ${address}`, data };
    return {
      state: "data",
      summary: `${list.length} ETH tx (${inbound.length} in / ${outbound.length} out, ${data.eth_in} ETH in, ${data.eth_out} ETH out), ${tokens.length} token transfers, balance ${data.balance_eth} ETH, active ${data.first_seen?.slice(0,10)} to ${data.last_seen?.slice(0,10)}`,
      data,
    };
  } catch (e: any) {
    return { state: "error", summary: `Etherscan request failed: ${e?.message || e}`, data: null };
  }
}

/** Look up every case wallet, persist each result as evidence, return evidence records ready for ctx. */
export async function runOnchainEvidence(base44: any, caseItem: any, targets: any[], user: any) {
  const wallets = collectEthWallets(caseItem, targets);
  const out: any[] = [];
  for (const w of wallets) {
    const r = await lookupWallet(w);
    const now = new Date().toISOString();
    const json = r.data ? JSON.stringify(r.data) : "";
    const rec = {
      tenant_id: caseItem.tenant_id, case_id: caseItem.id,
      filename: `etherscan_${w.slice(0, 10)}.json`, file_url: `etherscan://ethereum/${w}`,
      evidence_type: "blockchain", source: "onchain_lookup",
      uploaded_by: user?.email || "mia_multi_agent", uploaded_by_name: "MIA on-chain lookup",
      uploaded_at: now, file_hash: `etherscan:${w}:${now.slice(0, 10)}`,
      description: `Etherscan V2 on-chain history · wallet ${w} · ${r.summary}`,
      tags: ["etherscan", "onchain", "ethereum"],
      processing_status: r.state === "data" ? "processed" : r.state === "error" ? "failed" : "review_required",
      detected_targets: [{ type: "wallet_address", value: w }], original_import: false,
      tool_result: {
        capability: "etherscan.v2.account", target: w, target_kind: "wallet_address", status: r.state === "error" ? "error" : "success",
        state: r.state, summary: r.summary, record_count: r.data?.tx_count ?? 0, retrieved_at: now,
        data_json: json.slice(0, 20000), data_bytes: json.length, truncated: json.length > 20000, source_reference: `https://etherscan.io/address/${w}`,
      },
    };
    const saved = await base44.entities.EvidenceItem.create(rec).catch(() => null);
    out.push({ ...(saved || rec), _result: `${r.state}: ${r.summary}` });

    // Multi-pass loss matching (proposal for human review).
    const loss = Number(caseItem?.amount_stolen_usd);
    if (r.state === "data" && Number.isFinite(loss) && loss > 0) {
      const m = await matchLoss(w, loss, caseItem?.incident_date).catch((e: any) => ({ state: "error", summary: String(e?.message || e), data: null }));
      const mt = new Date().toISOString(); const mj = m.data ? JSON.stringify(m.data) : "";
      const mrec = {
        tenant_id: caseItem.tenant_id, case_id: caseItem.id,
        filename: `loss_match_${w.slice(0, 10)}.json`, file_url: `etherscan://ethereum/${w}#loss-match`,
        evidence_type: "blockchain", source: "onchain_lookup",
        uploaded_by: user?.email || "mia_multi_agent", uploaded_by_name: "MIA loss matching",
        uploaded_at: mt, file_hash: `lossmatch:${w}:${mt.slice(0, 10)}`,
        description: `Loss matching (proposal, requires investigator review) · wallet ${w} · ${m.summary}`,
        tags: ["etherscan", "loss_match", "review_required"], processing_status: "review_required",
        detected_targets: [{ type: "wallet_address", value: w }], original_import: false,
        tool_result: { capability: "mia.loss_match", target: w, target_kind: "wallet_address", status: m.state === "error" ? "error" : "success", state: m.state, summary: m.summary, record_count: m.data?.best_match?.payments?.length ?? 0, retrieved_at: mt, data_json: mj.slice(0, 20000), data_bytes: mj.length, truncated: mj.length > 20000, source_reference: `https://etherscan.io/address/${w}` },
      };
      const ms = await base44.entities.EvidenceItem.create(mrec).catch(() => null);
      out.push({ ...(ms || mrec), _result: `${m.state}: ${m.summary}` });
    }
  }
  return out;
}
