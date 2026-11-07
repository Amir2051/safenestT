import { matchLoss } from "./lossMatch.ts";
import { esCall } from "./etherscanClient.ts";
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

const MAX_TX = 1000; // Etherscan page cap; beyond this totals are flagged as partial.

export async function lookupWallet(address: string) {
  const key = Deno.env.get("ETHERSCAN_API_KEY");
  if (!key) return { state: "error", summary: "ETHERSCAN_API_KEY is not configured", data: null };
  try {
    // Sequential through the shared throttled client: near-simultaneous calls trip the free-tier rate limit.
    const bal = await esCall({ module: "account", action: "balance", address, tag: "latest" }, key);
    const txs = await esCall({ module: "account", action: "txlist", address, startblock: "0", endblock: "99999999", page: "1", offset: String(MAX_TX), sort: "desc" }, key);
    // Internal transfers (contract payouts, routers, exchanges) are real inbound/outbound ETH that txlist never shows.
    const itx = await esCall({ module: "account", action: "txlistinternal", address, startblock: "0", endblock: "99999999", page: "1", offset: String(MAX_TX), sort: "desc" }, key);
    const toks = await esCall({ module: "account", action: "tokentx", address, page: "1", offset: "100", sort: "desc" }, key);

    const normalAll: any[] = Array.isArray(txs?.result) ? txs.result : [];
    const internalAll: any[] = Array.isArray(itx?.result) ? itx.result : [];
    const tokens: any[] = Array.isArray(toks?.result) ? toks.result : [];
    const ok = (t: any) => t?.isError !== "1"; // failed transactions move no ETH
    const failed = normalAll.filter((t) => !ok(t)).length;
    const normal = normalAll.filter(ok);
    const internal = internalAll.filter(ok);
    const a = address.toLowerCase();
    const val = (t: any) => Number(t.value || 0) / 1e18;
    const all = [...normal, ...internal];
    const inbound = all.filter((t) => String(t.to).toLowerCase() === a);
    const outbound = all.filter((t) => String(t.from).toLowerCase() === a);
    const inboundInternal = internal.filter((t) => String(t.to).toLowerCase() === a);
    const sum = (xs: any[]) => xs.reduce((s, t) => s + val(t), 0);
    const top = (xs: any[], k: string) => {
      const m: Record<string, number> = {};
      for (const t of xs) m[String(t[k]).toLowerCase()] = (m[String(t[k]).toLowerCase()] || 0) + 1;
      return Object.entries(m).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([addr, n]) => ({ addr, n }));
    };
    const truncated = normalAll.length >= MAX_TX || internalAll.length >= MAX_TX;
    const stamps = [...normalAll, ...internalAll].map((t) => Number(t.timeStamp)).filter((n) => Number.isFinite(n) && n > 0);
    const balance = Number(bal?.result || 0) / 1e18;
    const data = {
      address, chain: "ethereum", balance_eth: Number(balance.toFixed(6)),
      tx_count: normalAll.length, failed_tx_count: failed, internal_tx_count: internalAll.length,
      inbound_count: inbound.length, inbound_internal_count: inboundInternal.length, outbound_count: outbound.length,
      eth_in: Number(sum(inbound).toFixed(6)), eth_out: Number(sum(outbound).toFixed(6)),
      eth_in_internal: Number(sum(inboundInternal).toFixed(6)),
      history_truncated: truncated,
      first_seen: stamps.length ? new Date(Math.min(...stamps) * 1000).toISOString() : null,
      last_seen: stamps.length ? new Date(Math.max(...stamps) * 1000).toISOString() : null,
      top_senders: top(inbound, "from"), top_recipients: top(outbound, "to"),
      token_transfers: tokens.length,
      tokens: [...new Set(tokens.map((t: any) => t.tokenSymbol))].slice(0, 10),
      recent: normalAll.slice(0, 15).map((t: any) => ({ hash: t.hash, time: new Date(Number(t.timeStamp) * 1000).toISOString(), from: t.from, to: t.to, eth: val(t) })),
      recent_internal: internalAll.slice(0, 10).map((t: any) => ({ hash: t.hash, time: new Date(Number(t.timeStamp) * 1000).toISOString(), from: t.from, to: t.to, eth: val(t) })),
    };
    if (!normalAll.length && !internalAll.length && !tokens.length) return { state: "empty", summary: `No on-chain transactions found for ${address}`, data };
    return {
      state: "data",
      summary: `${normalAll.length} ETH tx${failed ? ` (${failed} failed)` : ""} + ${internalAll.length} internal transfers (${inbound.length} in / ${outbound.length} out, ${data.eth_in} ETH in incl. ${data.eth_in_internal} internal, ${data.eth_out} ETH out), ${tokens.length} token transfers, balance ${data.balance_eth} ETH, active ${data.first_seen?.slice(0, 10)} to ${data.last_seen?.slice(0, 10)}${truncated ? " [history truncated at " + MAX_TX + "; totals partial]" : ""}`,
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
