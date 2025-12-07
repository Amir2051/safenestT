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

export default function WalletTracker({ cases = [] }) {
  const [selectedCase, setSelectedCase] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [blockchain, setBlockchain] = useState("ethereum");
  const [tracking, setTracking] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const queryClient = useQueryClient();

  const addWalletMutation = useMutation({
    mutationFn: async ({ caseId, wallet }) => {
      const caseData = cases.find(c => c.id === caseId);
      const wallets = caseData.monitored_wallets || [];
      
      if (!wallets.includes(wallet)) {
        wallets.push(wallet);
        await base44.entities.InvestigationCase.update(caseId, {
          monitored_wallets: wallets,
          last_activity: new Date().toISOString()
        });
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation-cases'] });
      toast.success("Wallet added to case monitoring");
      setWalletAddress("");
    }
  });

  const trackWallet = async () => {
    if (!walletAddress) {
      toast.error("Please enter a wallet address");
      return;
    }

    setTracking(true);
    try {
      // Fetch real blockchain data
      const response = await base44.functions.invoke('blockchainIntelligence', {
        action: 'track-wallet',
        data: {
          wallet_address: walletAddress,
          blockchain: blockchain,
          wallet_type: 'unknown'
        }
      });

      const data = response.data.data;
      
      setActivityData({
        address: walletAddress,
        blockchain: blockchain,
        balance: data.balance?.amount || 0,
        balanceUSD: data.balance?.usd || 0,
        transactionCount: data.transactions?.length || 0,
        firstSeen: data.transactions?.[data.transactions.length - 1]?.timestamp 
          ? new Date(data.transactions[data.transactions.length - 1].timestamp).toLocaleDateString() 
          : 'N/A',
        lastActivity: data.transactions?.[0]?.timestamp 
          ? new Date(data.transactions[0].timestamp).toLocaleDateString() 
          : 'N/A',
        riskScore: data.riskScore?.score || 0,
        riskIndicators: data.riskScore?.indicators || [],
        interactions: new Set(data.transactions?.map(t => t.to) || []).size,
        monitor: data.monitor
      });

      toast.success(`Wallet tracked - ${data.transactions?.length || 0} transactions found`);
    } catch (error) {
      console.error('Track error:', error);
      toast.error("Failed to fetch wallet data: " + (error.message || 'Unknown error'));
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

      {/* Activity Results */}
      {activityData && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Wallet Activity Report</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://etherscan.io/address/${activityData.address}`, '_blank')}
                className="text-cyan-400 hover:bg-cyan-500/10"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Explorer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Address Info */}
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <p className="text-xs text-gray-400 mb-2">Wallet Address</p>
              <p className="text-white font-mono text-sm break-all">{activityData.address}</p>
              <Badge className="mt-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                {activityData.blockchain}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Balance</p>
                <p className="text-xl font-bold text-white">{activityData.balance} ETH</p>
                <p className="text-xs text-gray-400 mt-1">${activityData.balanceUSD}</p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Transactions</p>
                <p className="text-xl font-bold text-white">{activityData.transactionCount}</p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Risk Score</p>
                <p className={`text-xl font-bold ${
                  activityData.riskScore > 70 ? 'text-red-400' :
                  activityData.riskScore > 40 ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {activityData.riskScore}/100
                </p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Interactions</p>
                <p className="text-xl font-bold text-white">{activityData.interactions}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">First Activity</p>
                </div>
                <p className="text-white">{activityData.firstSeen}</p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-400">Last Activity</p>
                </div>
                <p className="text-white">{activityData.lastActivity}</p>
              </div>
            </div>

            {/* Risk Assessment */}
            {activityData.riskScore > 50 && (
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-400 font-semibold mb-1">Elevated Risk Detected</p>
                    <p className="text-sm text-gray-300">
                      This wallet shows patterns consistent with suspicious activity. 
                      Consider flagging for detailed investigation.
                    </p>
                    {activityData.riskIndicators && activityData.riskIndicators.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Risk Indicators:</p>
                        <div className="flex flex-wrap gap-1">
                          {activityData.riskIndicators.map((indicator, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs text-orange-400">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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