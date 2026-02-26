import React, { useState } from "react";
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

// Etherscan API helper
const ETHERSCAN_API = 'https://api.etherscan.io/api';
const BSCSCAN_API = 'https://api.bscscan.com/api';
const POLYGONSCAN_API = 'https://api.polygonscan.com/api';

async function fetchEthBalance(address, apiBase, apiKey) {
  const url = `${apiBase}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
  console.log('[WalletTracker] Fetching balance from:', url);
  const res = await fetch(url);
  const json = await res.json();
  console.log('[WalletTracker] Balance response:', json);
  if (json.status !== '1') throw new Error(json.message || 'Balance fetch failed');
  return parseFloat(json.result) / 1e18;
}

async function fetchEthTxns(address, apiBase, apiKey) {
  const url = `${apiBase}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${apiKey}`;
  console.log('[WalletTracker] Fetching txns from:', url);
  const res = await fetch(url);
  const json = await res.json();
  console.log('[WalletTracker] Txns response (count):', json.result?.length);
  if (json.status !== '1' && json.message !== 'No transactions found') {
    throw new Error(json.message || 'Transaction fetch failed');
  }
  return Array.isArray(json.result) ? json.result : [];
}

export default function WalletTracker({ cases = [] }) {
  const [selectedCase, setSelectedCase] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [blockchain, setBlockchain] = useState("ethereum");
  const [tracking, setTracking] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

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
      console.log('[WalletTracker] Starting track for:', walletAddress, 'on', blockchain);

      if (blockchain === 'bitcoin') {
        // Bitcoin: use public Blockstream API (no key required)
        const addr = walletAddress.trim();
        const res = await fetch(`https://blockstream.info/api/address/${addr}`);
        if (!res.ok) throw new Error(`Blockstream API error: ${res.status}`);
        const data = await res.json();
        console.log('[WalletTracker] BTC data:', data);
        const balanceSats = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum);
        const balance = balanceSats / 1e8;
        const txCount = data.chain_stats.tx_count;

        setActivityData({
          address: addr,
          blockchain: 'bitcoin',
          balance: balance.toFixed(8),
          balanceCurrency: 'BTC',
          balanceUSD: 'N/A',
          transactionCount: txCount,
          firstSeen: 'N/A',
          lastActivity: 'N/A',
          riskScore: txCount > 1000 ? 75 : txCount > 100 ? 40 : 10,
          riskIndicators: txCount > 1000 ? ['High transaction volume'] : [],
          interactions: txCount,
          transactions: []
        });
        toast.success(`Bitcoin wallet loaded — ${txCount} transactions`);
        setTracking(false);
        return;
      }

      // EVM chains: use Etherscan-compatible APIs
      let apiBase = ETHERSCAN_API;
      if (blockchain === 'bsc') apiBase = BSCSCAN_API;
      if (blockchain === 'polygon') apiBase = POLYGONSCAN_API;

      // Use AI to get the API key from secrets or use a public limited key
      const apiKey = 'YourApiKeyToken'; // Public fallback — works with rate limits

      const addr = walletAddress.trim();
      const [balance, txns] = await Promise.all([
        fetchEthBalance(addr, apiBase, apiKey),
        fetchEthTxns(addr, apiBase, apiKey)
      ]);

      const uniqueInteractions = new Set([
        ...txns.map(t => t.to?.toLowerCase()).filter(Boolean),
        ...txns.map(t => t.from?.toLowerCase()).filter(Boolean)
      ]).size;

      const firstTx = txns.length > 0 ? txns[txns.length - 1] : null;
      const lastTx = txns.length > 0 ? txns[0] : null;

      // Simple risk heuristic (no backend needed)
      const highValueTxns = txns.filter(t => parseFloat(t.value) / 1e18 > 1).length;
      const riskScore = Math.min(100, (highValueTxns * 5) + (txns.length > 500 ? 30 : 0) + (balance > 10 ? 20 : 0));
      const riskIndicators = [];
      if (highValueTxns > 10) riskIndicators.push(`${highValueTxns} high-value transactions`);
      if (txns.length > 500) riskIndicators.push('Very high transaction volume');
      if (balance > 10) riskIndicators.push('Large current balance');

      console.log('[WalletTracker] Parsed result:', { balance, txCount: txns.length, riskScore });

      setActivityData({
        address: addr,
        blockchain,
        balance: balance.toFixed(6),
        balanceCurrency: blockchain === 'ethereum' ? 'ETH' : blockchain === 'bsc' ? 'BNB' : 'MATIC',
        balanceUSD: 'Live',
        transactionCount: txns.length,
        firstSeen: firstTx ? new Date(parseInt(firstTx.timeStamp) * 1000).toLocaleDateString() : 'N/A',
        lastActivity: lastTx ? new Date(parseInt(lastTx.timeStamp) * 1000).toLocaleDateString() : 'N/A',
        riskScore,
        riskIndicators,
        interactions: uniqueInteractions,
        transactions: txns.slice(0, 20) // Show latest 20
      });

      toast.success(`Wallet loaded — ${txns.length} transactions found`);
    } catch (err) {
      console.error('[WalletTracker] Error:', err);
      const msg = err.message || 'Unknown error';
      setError(msg);
      toast.error("Wallet fetch failed: " + msg);
    }

    setTracking(false);
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