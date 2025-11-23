import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Play, Pause, Loader2, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function WalletMonitoringEngine({ monitors }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [blockchain, setBlockchain] = useState("ethereum");
  const [walletType, setWalletType] = useState("scammer");
  const queryClient = useQueryClient();

  const addWalletMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('blockchainIntelligence', {
        action: 'track-wallet',
        data
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-monitors'] });
      toast.success("✅ Wallet tracking started");
      setWalletAddress("");
    },
    onError: (error) => {
      toast.error("Failed to start tracking: " + error.message);
    }
  });

  const toggleMonitoringMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await base44.asServiceRole.entities.WalletMonitor.update(id, {
        monitoring_status: status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-monitors'] });
      toast.success("Monitoring status updated");
    }
  });

  const deleteMonitorMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.asServiceRole.entities.WalletMonitor.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-monitors'] });
      toast.success("Monitor removed");
    }
  });

  const handleAddWallet = () => {
    if (!walletAddress) {
      toast.error("Please enter a wallet address");
      return;
    }

    addWalletMutation.mutate({
      wallet_address: walletAddress,
      blockchain,
      wallet_type: walletType
    });
  };

  return (
    <div className="space-y-6">
      {/* Add Wallet Form */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Add Wallet to Track
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <SelectItem value="tron">Tron</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white mb-2 block">Wallet Type</Label>
              <Select value={walletType} onValueChange={setWalletType}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="scammer">Scammer</SelectItem>
                  <SelectItem value="victim">Victim</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleAddWallet}
            disabled={addWalletMutation.isPending}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            {addWalletMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting Monitoring...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Start Tracking Wallet
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Monitored Wallets List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">
            Active Monitors ({monitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {monitors.map((monitor) => (
              <div
                key={monitor.id}
                className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={
                        monitor.wallet_type === 'scammer' ? 'bg-red-500/20 text-red-400' :
                        monitor.wallet_type === 'victim' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }>
                        {monitor.wallet_type}
                      </Badge>
                      <Badge variant="outline">{monitor.blockchain}</Badge>
                      <Badge className={
                        monitor.monitoring_status === 'active' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-500/20 text-gray-400'
                      }>
                        {monitor.monitoring_status}
                      </Badge>
                    </div>
                    <p className="text-white font-mono text-sm break-all mb-2">
                      {monitor.wallet_address}
                    </p>
                    <div className="grid grid-cols-5 gap-3 text-xs">
                      <div>
                        <p className="text-gray-400">Risk Score</p>
                        <p className={`font-bold ${
                          monitor.risk_score > 70 ? 'text-red-400' :
                          monitor.risk_score > 40 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {monitor.risk_score}/100
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Balance</p>
                        <p className="text-white font-bold">${monitor.balance_usd?.toLocaleString() || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Asset</p>
                        <p className="text-cyan-400 font-bold">
                          {monitor.current_balance?.toFixed(4) || '0.0000'} {monitor.blockchain === 'ethereum' ? 'ETH' : 'BNB'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Transactions</p>
                        <p className="text-white">{monitor.total_transactions || 0}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Last Activity</p>
                        <p className="text-white">
                          {monitor.last_transaction_date ? 
                            new Date(monitor.last_transaction_date).toLocaleDateString() : 
                            'N/A'}
                        </p>
                      </div>
                    </div>
                    {monitor.exchange_detected && (
                      <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded">
                        <p className="text-green-400 text-xs flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          Exchange detected: {monitor.exchange_name}
                        </p>
                      </div>
                    )}
                    {monitor.risk_indicators && monitor.risk_indicators.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {monitor.risk_indicators.slice(0, 3).map((indicator, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs text-orange-400">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMonitoringMutation.mutate({
                        id: monitor.id,
                        status: monitor.monitoring_status === 'active' ? 'paused' : 'active'
                      })}
                      className="text-cyan-400"
                    >
                      {monitor.monitoring_status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMonitorMutation.mutate(monitor.id)}
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}