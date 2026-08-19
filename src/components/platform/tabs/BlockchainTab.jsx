import React, { useState } from "react";
import { Crosshair, Wallet, ArrowRightLeft, Network as NetworkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import HermesPanel from "@/components/platform/HermesPanel";
import { HermesAPI } from "@/lib/hermesClient";
import { toast } from "sonner";

const SUB_TABS = [
  { key: "trace", label: "Trace", icon: Crosshair },
  { key: "wallets", label: "Wallets", icon: Wallet },
  { key: "transactions", label: "Transactions", icon: ArrowRightLeft },
];

const NETWORKS = [
  { value: "ethereum", label: "Ethereum", available: true },
  { value: "bitcoin", label: "Bitcoin", available: false },
  { value: "polygon", label: "Polygon", available: false },
  { value: "bsc", label: "BNB Chain", available: false },
  { value: "arbitrum", label: "Arbitrum", available: false },
  { value: "base", label: "Base", available: false },
  { value: "solana", label: "Solana", available: false },
];

export default function BlockchainTab({ caseId, hermesState }) {
  const [sub, setSub] = useState("trace");
  const [network, setNetwork] = useState("ethereum");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        {SUB_TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${sub === t.key ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/[0.04]" : "text-gray-400 hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <NetworkIcon className="w-4 h-4 text-gray-500" />
        <Select value={network} onValueChange={setNetwork}>
          <SelectTrigger className="w-48 bg-[#0f1419] border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {NETWORKS.map((n) => <SelectItem key={n.value} value={n.value} disabled={!n.available} className="capitalize">{n.label}{!n.available && " (coming soon)"}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-500">Etherscan V2 ingestion is performed by Hermes — the frontend never calls blockchain APIs directly.</span>
      </div>

      {sub === "trace" && <TraceView caseId={caseId} hermesState={hermesState} network={network} />}
      {sub === "wallets" && <WalletsView caseId={caseId} hermesState={hermesState} />}
      {sub === "transactions" && <TransactionsView caseId={caseId} hermesState={hermesState} />}
    </div>
  );
}

function TraceView({ caseId, hermesState, network }) {
  const [tracing, setTracing] = useState(false);
  const [target, setTarget] = useState("");

  const runTrace = async () => {
    if (!target.trim()) { toast.error("Enter a wallet address or transaction hash"); return; }
    setTracing(true);
    try {
      const res = await HermesAPI.traceBlockchain(caseId, { target: target.trim(), network });
      if (res.status === "not_connected") toast.error("Hermes not connected");
      else if (res.status === "backend_unavailable") toast.error("Hermes backend unavailable — upgrade required");
      else if (res.status === "ok") toast.success("Trace request submitted to Hermes");
      else toast.error("Trace failed: " + (res.error || "unknown"));
    } catch (e) { toast.error("Failed: " + (e.message || e)); }
    finally { setTracing(false); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 p-4">
        <p className="text-sm text-gray-300 mb-2">Submit a wallet address or transaction hash for Hermes to trace on {network}.</p>
        <div className="flex gap-2">
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0x... wallet or tx hash" className="flex-1 bg-[#0f1419] border border-white/10 rounded-md px-3 py-2 text-sm text-white font-mono" />
          <Button onClick={runTrace} disabled={tracing || hermesState === "not_connected"} className="bg-cyan-600 hover:bg-cyan-700">
            {tracing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Crosshair className="w-4 h-4 mr-1.5" />}Trace
          </Button>
        </div>
        {hermesState === "not_connected" && <p className="text-xs text-amber-400 mt-2">Hermes is not connected. Connect Hermes to enable blockchain tracing.</p>}
      </div>
      <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="blockchain-trace" fetcher={HermesAPI.getBlockchainTrace}
        emptyTitle="No trace results yet" emptyDescription="Submit a target above for Hermes to trace. Results will appear here."
        render={(data) => (
          <div className="rounded-lg border border-white/10 p-4">
            <pre className="text-xs text-gray-300 overflow-auto max-h-[400px] font-mono">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )} />
    </div>
  );
}

function WalletsView({ caseId, hermesState }) {
  return (
    <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="wallets" fetcher={HermesAPI.getTargets}
      emptyTitle="No wallet data yet" emptyDescription="Wallet analysis is performed by Hermes. When available, wallet balances, transaction counts, and counterparties will appear here."
      render={(data) => {
        const wallets = Array.isArray(data) ? data.filter((d) => d.type === "wallet_address" || d.address) : [];
        if (wallets.length === 0) return <HermesEmptyState message="No wallet analysis returned by Hermes yet." />;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wallets.map((w, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-cyan-400" />
                  <p className="text-sm font-mono text-white truncate">{w.address || w.value}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="Network" value={w.network} />
                  <Info label="Balance" value={w.balance} />
                  <Info label="Tx Count" value={w.transaction_count} />
                  <Info label="First Activity" value={w.first_activity} />
                  <Info label="Last Activity" value={w.last_activity} />
                </div>
              </div>
            ))}
          </div>
        );
      }} />
  );
}

function TransactionsView({ caseId, hermesState }) {
  return (
    <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="transactions" fetcher={HermesAPI.getTransactions}
      emptyTitle="No transaction data yet" emptyDescription="Transaction analysis is performed by Hermes. When available, transaction details will appear here."
      render={(data) => {
        const txs = Array.isArray(data) ? data : data?.transactions || [];
        if (txs.length === 0) return <HermesEmptyState message="No transactions returned by Hermes yet." />;
        return (
          <div className="rounded-lg border border-white/10 divide-y divide-white/5">
            {txs.map((tx, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <ArrowRightLeft className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono text-white truncate">{tx.hash || tx.transaction_hash}</p>
                  <p className="text-xs text-gray-500">{tx.from?.slice(0, 12)}… → {tx.to?.slice(0, 12)}… • {tx.value} {tx.asset}</p>
                </div>
                <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{tx.block || "—"}</Badge>
                <span className="text-xs text-gray-500">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : "—"}</span>
              </div>
            ))}
          </div>
        );
      }} />
  );
}

function Info({ label, value }) {
  return <div><p className="text-gray-600 text-[10px] uppercase">{label}</p><p className="text-gray-200 truncate">{value != null ? String(value) : "—"}</p></div>;
}

function HermesEmptyState({ message }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center"><p className="text-sm text-gray-500">{message}</p></div>;
}