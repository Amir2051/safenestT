import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Loader2, ExternalLink, AlertCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

// Public APIs — no API key required
// Blockscout: free, open, CORS-enabled explorer for EVM chains
const BLOCKSCOUT_ENDPOINTS = {
  ethereum: 'https://eth.blockscout.com/api',
  bsc: 'https://bsc.blockscout.com/api',
  polygon: 'https://polygon.blockscout.com/api',
};

async function fetchEvmBalance(address, chain) {
  const apiBase = BLOCKSCOUT_ENDPOINTS[chain];
  const url = `${apiBase}?module=account&action=balance&address=${address}`;
  console.log('[WalletTracker] Balance URL:', url);
  const res = await fetch(url);
  console.log('[WalletTracker] Balance HTTP status:', res.status);
  if (!res.ok) throw new Error(`HTTP ${res.status} from balance API`);
  const json = await res.json();
  console.log('[WalletTracker] Balance raw response:', json);
  if (json.status !== '1') {
    throw new Error(`API Error: ${json.message || 'Unknown'} — ${json.result || ''}`);
  }
  return parseFloat(json.result) / 1e18;
}

async function fetchEvmTxns(address, chain) {
  const apiBase = BLOCKSCOUT_ENDPOINTS[chain];
  const url = `${apiBase}?module=account&action=txlist&address=${address}&sort=desc&offset=20&page=1`;
  console.log('[WalletTracker] Txns URL:', url);
  const res = await fetch(url);
  console.log('[WalletTracker] Txns HTTP status:', res.status);
  if (!res.ok) throw new Error(`HTTP ${res.status} from txns API`);
  const json = await res.json();
  console.log('[WalletTracker] Txns raw response status:', json.status, 'count:', json.result?.length);
  // status "0" with "No transactions found" is valid
  if (json.status !== '1' && json.message !== 'No transactions found') {
    throw new Error(`API Error: ${json.message || 'Unknown'} — ${json.result || ''}`);
  }
  return Array.isArray(json.result) ? json.result : [];
}

export default function WalletTracker({ cases = [], caseData = null }) {
  const [selectedCase, setSelectedCase] = useState(caseData?.id || "");
  const [walletAddress, setWalletAddress] = useState("");
  const [blockchain, setBlockchain] = useState("ethereum");
  const [tracking, setTracking] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();\n\n  useEffect(() => {\n    if (caseData?.id) {\n      setSelectedCase(caseData.id);\n      const wallet = caseData.scammer_wallet || caseData.victim_wallet || (caseData.monitored_wallets || [])[0];\n      if (wallet) setWalletAddress(wallet);\n      if (caseData.blockchain) setBlockchain(String(caseData.blockchain).toLowerCase());\n    }\n  }, [caseData?.id, caseData?.scammer_wallet, caseData?.victim_wallet]);

  const addWalletMutation = useMutation({
    mutationFn: async ({ caseId, wallet }) => {
      const caseData = cases.find(c => c.id === caseId);
      const wallets = [...(caseData.monitored_wallets || [])];
      if (!wallets.includes(wallet)) {
        wallets.push(wallet);
        await base44.entities.MyCase.update(caseId, {
          monitored_wallets: wallets,
          last_activity: new Date().toISOString()
        });
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-cases'] });
      queryClient.invalidateQueries({ queryKey: ['client-cases-admin'] });
      toast.success("Wallet added to case monitoring");
    }
  });

  const trackWallet = async () => {
    if (!walletAddress.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }
    setTracking(true);
    setError(null);
    setActivityData(null);
    try {
      const response = await base44.functions.invoke("cryptoInvestigation", {
        action: "track-wallet",
        data: { address: walletAddress.trim(), blockchain, caseId: selectedCase || caseData?.id || undefined, walletType: "scammer" }
      });
      const payload = response?.data ?? response;
      if (!payload?.success) throw new Error(payload?.error || "Wallet intelligence failed");
      const data = payload.data || {};
      const txns = Array.isArray(data.transactions) ? data.transactions : [];
      const balance = data.balance || {};
      setActivityData({
        address: data.address || walletAddress.trim(),
        blockchain: data.blockchain || blockchain,
        balance: balance.amount ?? "N/A",
        balanceCurrency: blockchain === "ethereum" ? "ETH" : blockchain.toUpperCase(),
        balanceUSD: balance.usd ?? "N/A",
        transactionCount: txns.length,
        firstSeen: txns.length ? new Date(txns[txns.length - 1].timestamp).toLocaleDateString() : "N/A",
        lastActivity: txns.length ? new Date(txns[0].timestamp).toLocaleDateString() : "N/A",
        riskScore: data.riskScore?.score ?? "N/A",
        riskIndicators: data.riskScore?.indicators || [],
        interactions: new Set(txns.flatMap(t => [t.from, t.to].filter(Boolean))).size,
        transactions: txns.slice(0, 20)
      });
      toast.success(`Live wallet intelligence loaded — ${txns.length} transactions`);
    } catch (err) {
      console.error("[WalletTracker] Error:", err);
      const msg = err?.message || "Unknown error";
      setError(msg);
      toast.error("Wallet fetch failed: " + msg);
    } finally {
      setTracking(false);
    }
  };

  const handleAddToCase = () => {
    if (!selectedCase || !walletAddress) {
      toast.error("Please select a case and enter a wallet address");
      return;
    }
    addWalletMutation.mutate({ caseId: selectedCase, wallet: walletAddress });
  };

  return (
    <div className="space-y-6">
      {/* Tracker Interface */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Wallet Activity Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label className="text-white mb-2 block">Wallet Address</Label>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... or bc1..."
                className="bg-[#0f1419] border-cyan-500/20 text-white font-mono"
              />
            </div>
            
            <div>
              <Label className="text-white mb-2 block">Blockchain</Label>
              <Select value={blockchain} onValueChange={setBlockchain}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="bsc">BSC</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={trackWallet}
              disabled={tracking}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {tracking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Track Wallet
                </>
              )}
            </Button>

            {activityData && (
              <div className="flex gap-2">
                <Select value={selectedCase} onValueChange={setSelectedCase}>
                  <SelectTrigger className="w-[200px] bg-[#0f1419] border-cyan-500/20 text-white">
                    <SelectValue placeholder="Select case..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleAddToCase}
                  disabled={addWalletMutation.isPending}
                  className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Case
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold">Fetch Failed</p>
            <p className="text-sm text-gray-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Activity Results */}
      {activityData && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Wallet Activity Report</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const explorers = { ethereum: 'etherscan.io', bsc: 'bscscan.com', polygon: 'polygonscan.com', bitcoin: 'blockstream.info/address' };
                  const domain = explorers[activityData.blockchain] || 'etherscan.io';
                  window.open(`https://${domain}/address/${activityData.address}`, '_blank');
                }}
                className="text-cyan-400 hover:bg-cyan-500/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <p className="text-xs text-gray-400 mb-2">Wallet Address</p>
              <p className="text-white font-mono text-sm break-all">{activityData.address}</p>
              <Badge className="mt-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/50">{activityData.blockchain}</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Balance</p>
                <p className="text-xl font-bold text-white">{activityData.balance}</p>
                <p className="text-xs text-cyan-400">{activityData.balanceCurrency}</p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Transactions</p>
                <p className="text-xl font-bold text-white">{activityData.transactionCount}</p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Risk Score</p>
                <p className={`text-xl font-bold ${activityData.riskScore > 70 ? 'text-red-400' : activityData.riskScore > 40 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {activityData.riskScore}/100
                </p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Unique Addresses</p>
                <p className="text-xl font-bold text-white">{activityData.interactions}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-gray-400" /><p className="text-xs text-gray-400">First Activity</p></div>
                <p className="text-white">{activityData.firstSeen}</p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-gray-400" /><p className="text-xs text-gray-400">Last Activity</p></div>
                <p className="text-white">{activityData.lastActivity}</p>
              </div>
            </div>

            {activityData.riskScore > 50 && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-400 font-semibold mb-1">Elevated Risk Detected</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {activityData.riskIndicators.map((ind, i) => (
                        <Badge key={i} variant="outline" className="text-xs text-orange-400">{ind}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Transactions */}
            {activityData.transactions?.length > 0 && (
              <div>
                <p className="text-white font-semibold mb-3 text-sm">Recent Transactions (latest 20)</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activityData.transactions.map((tx, i) => (
                    <div key={i} className="p-3 bg-[#0f1419] rounded border border-cyan-500/10 text-xs flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-gray-400 truncate">From: <span className="text-white font-mono">{tx.from}</span></p>
                        <p className="text-gray-400 truncate">To: <span className="text-white font-mono">{tx.to}</span></p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-cyan-400 font-bold">{(parseFloat(tx.value)/1e18).toFixed(4)} {activityData.balanceCurrency}</p>
                        <p className="text-gray-500">{new Date(parseInt(tx.timeStamp)*1000).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Monitors */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Monitored Wallets Across Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {(cases || []).filter(c => c.monitored_wallets?.length > 0).length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No wallets being monitored yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(cases || []).filter(c => c.monitored_wallets?.length > 0).map((caseItem) => (
                <div key={caseItem.id} className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-semibold">{caseItem.case_title}</p>
                      <Badge className="mt-1 bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono text-xs">
                        {caseItem.case_number}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {caseItem.monitored_wallets.length} wallets
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {caseItem.monitored_wallets.slice(0, 3).map((wallet, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-[#1a2332] rounded">
                        <p className="text-white font-mono text-xs">{wallet}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`https://etherscan.io/address/${wallet}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </Button>
                      </div>
                    ))}
                    {caseItem.monitored_wallets.length > 3 && (
                      <p className="text-xs text-gray-400 mt-2">
                        +{caseItem.monitored_wallets.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}