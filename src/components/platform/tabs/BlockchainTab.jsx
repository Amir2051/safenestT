import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Crosshair, Wallet, ArrowRightLeft, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/platform/EmptyState";
import { toast } from "sonner";

/**
 * BlockchainTab — real on-chain lookups via the server-side osintProxy
 * (Etherscan + Alchemy). The frontend never calls blockchain APIs directly and
 * never sees the API keys. Results are returned live with honest loading /
 * empty / error / not-configured states.
 */
export default function BlockchainTab({ caseId }) {
  const [sub, setSub] = useState("trace");

  const { data: targets = [] } = useQuery({
    queryKey: ["targets", caseId],
    queryFn: () => base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });
  const walletTargets = targets.filter((t) => t.type === "wallet_address" || t.type === "token_contract");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        {[
          { key: "trace", label: "Lookup", icon: Crosshair },
          { key: "wallets", label: "Wallets", icon: Wallet },
          { key: "transactions", label: "Transactions", icon: ArrowRightLeft },
        ].map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${sub === t.key ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/[0.04]" : "text-gray-400 hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {sub === "trace" && <LookupView />}
      {sub === "wallets" && <WalletsView wallets={walletTargets} />}
      {sub === "transactions" && <TransactionsView wallets={walletTargets} />}
    </div>
  );
}

function LookupView() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!address.trim()) { toast.error("Enter a wallet address"); return; }
    setLoading(true); setResult(null);
    try {
      const [es, al] = await Promise.all([
        base44.functions.invoke("osintProxy", { provider: "etherscan", target: address.trim() }).catch((e) => ({ ok: false, error: e?.message || String(e) })),
        base44.functions.invoke("osintProxy", { provider: "alchemy", target: address.trim() }).catch((e) => ({ ok: false, error: e?.message || String(e) })),
      ]);
      const esBody = es?.data ?? es;
      const alBody = al?.data ?? al;
      setResult({ etherscan: esBody, alchemy: alBody });
    } catch (e) { toast.error("Lookup failed: " + (e?.message || e)); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 p-4">
        <p className="text-sm text-gray-300 mb-2">Look up an Ethereum mainnet address via Etherscan + Alchemy (server-side, keys never exposed).</p>
        <div className="flex gap-2">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… wallet address" className="font-mono bg-[#0f1419] border-white/10 text-white" />
          <Button onClick={run} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
            {loading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Crosshair className="w-4 h-4 mr-1.5" />}Lookup
          </Button>
        </div>
      </div>
      {loading && <EmptyState variant="loading" title="Querying Etherscan + Alchemy…" />}
      {result && <LookupResult result={result} />}
    </div>
  );
}

function LookupResult({ result }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <ProviderCard label="Etherscan" body={result.etherscan} />
      <ProviderCard label="Alchemy" body={result.alchemy} />
    </div>
  );
}

function ProviderCard({ label, body }) {
  const ok = body && body.ok !== false && body.status !== "error";
  const notConfigured = body?.configured === false;
  return (
    <div className={`rounded-lg border p-4 ${ok ? "border-cyan-500/20 bg-cyan-500/[0.03]" : notConfigured ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-red-500/20 bg-red-500/[0.03]"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className={`text-[10px] ${ok ? "border-cyan-500/30 text-cyan-400" : notConfigured ? "border-amber-500/30 text-amber-400" : "border-red-500/30 text-red-400"}`}>{label}</Badge>
        {notConfigured && <span className="text-[11px] text-amber-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Not configured</span>}
      </div>
      {ok ? (
        <div className="space-y-1 text-xs">
          {body.data?.balance_eth != null && <p className="text-gray-300">Balance: <span className="font-mono text-white">{body.data.balance_eth} ETH</span> <span className="text-gray-600">({body.data.balance_wei} wei)</span></p>}
          {body.data?.tx_count != null && <p className="text-gray-400">{body.data.tx_count} recent txs (Etherscan)</p>}
          {body.data?.token_count != null && <p className="text-gray-400">{body.data.token_count} token balances (Alchemy)</p>}
          {body.data?.recent_txs?.length > 0 && (
            <div className="mt-2 space-y-1 max-h-48 overflow-auto">
              {body.data.recent_txs.map((tx, i) => (
                <div key={i} className="text-[10px] text-gray-500 font-mono truncate">
                  {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : ""} {tx.from?.slice(0,10)}…→{tx.to?.slice(0,10)}… {tx.value_eth} ETH
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-red-300">{body?.error || "Lookup failed"}</p>
      )}
    </div>
  );
}

function WalletsView({ wallets }) {
  if (wallets.length === 0) return <EmptyState variant="empty" icon={Wallet} title="No wallet targets" description="Add wallet addresses as targets to see on-chain balances via Etherscan + Alchemy." />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {wallets.map((w) => <WalletCard key={w.id} address={w.value} network={w.network} />)}
    </div>
  );
}

function WalletCard({ address, network }) {
  const { data, isLoading } = useQuery({
    queryKey: ["wallet-balance", address],
    queryFn: async () => {
      const res = await base44.functions.invoke("osintProxy", { provider: "etherscan", target: address });
      return res?.data ?? res;
    },
    enabled: !!address,
    staleTime: 60000,
  });
  const ok = data && data.ok !== false && data.status !== "error";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="w-4 h-4 text-cyan-400" />
        <p className="text-sm font-mono text-white truncate">{address}</p>
      </div>
      {isLoading ? <p className="text-xs text-gray-500">Loading balance…</p>
        : ok ? <p className="text-xs text-gray-300">Balance: <span className="font-mono text-white">{data.data?.balance_eth} ETH</span> • {data.data?.tx_count} txs</p>
        : <p className="text-xs text-amber-400">{data?.configured === false ? "Etherscan not configured" : (data?.error || "Lookup failed")}</p>}
    </div>
  );
}

function TransactionsView({ wallets }) {
  const [active, setActive] = useState(wallets[0]?.value || "");
  if (wallets.length === 0) return <EmptyState variant="empty" icon={ArrowRightLeft} title="No wallet targets" description="Add wallet addresses as targets to fetch recent transactions via Etherscan." />;
  const addr = active || wallets[0].value;
  const { data, isLoading } = useQuery({
    queryKey: ["wallet-txs", addr],
    queryFn: async () => {
      const res = await base44.functions.invoke("osintProxy", { provider: "etherscan", target: addr });
      return res?.data ?? res;
    },
    enabled: !!addr,
    staleTime: 60000,
  });
  const txs = data?.ok !== false && data?.data?.recent_txs ? data.data.recent_txs : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {wallets.map((w) => (
          <button key={w.id} onClick={() => setActive(w.value)} className={`text-xs px-2.5 py-1 rounded-md border font-mono ${addr === w.value ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-200" : "border-white/10 text-gray-400"}`}>{w.value.slice(0, 12)}…</button>
        ))}
      </div>
      {isLoading ? <EmptyState variant="loading" title="Fetching transactions…" />
        : data?.ok === false ? <p className="text-xs text-amber-400">{data?.configured === false ? "Etherscan not configured" : (data?.error || "Lookup failed")}</p>
        : txs.length === 0 ? <EmptyState variant="empty" icon={ArrowRightLeft} title="No transactions" description="No recent transactions returned for this address." />
        : (
          <div className="rounded-lg border border-white/10 divide-y divide-white/5">
            {txs.map((tx, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <ArrowRightLeft className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-white truncate">{tx.hash}</p>
                  <p className="text-xs text-gray-500">{tx.from?.slice(0, 12)}… → {tx.to?.slice(0, 12)}… • {tx.value_eth} ETH</p>
                </div>
                {tx.is_error && <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">failed</Badge>}
                <span className="text-xs text-gray-500">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "—"}</span>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}