import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Activity, Wallet, Plus, Trash2, Eye, AlertTriangle,
  Loader2, RefreshCw, Bell, BellOff, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export default function CryptoTrackerPanel({ user }) {
  const [newWallet, setNewWallet] = useState("");
  const [newBlockchain, setNewBlockchain] = useState("ethereum");
  const [adding, setAdding] = useState(false);

  const queryClient = useQueryClient();

  const { data: monitors = [], isLoading, refetch } = useQuery({
    queryKey: ['wallet-monitors'],
    queryFn: () => base44.entities.WalletMonitor.list('-created_date', 100)
  });

  const handleAddWallet = async () => {
    if (!newWallet) {
      toast.error('Please enter a wallet address');
      return;
    }

    setAdding(true);
    try {
      await base44.entities.WalletMonitor.create({
        wallet_address: newWallet,
        blockchain: newBlockchain,
        monitoring_status: 'active',
        alert_enabled: true,
        risk_score: 0,
        wallet_type: 'unknown'
      });

      toast.success('Wallet added to monitoring');
      setNewWallet("");
      queryClient.invalidateQueries(['wallet-monitors']);
    } catch (error) {
      toast.error('Failed to add wallet');
    }
    setAdding(false);
  };

  const handleToggleAlert = async (monitor) => {
    try {
      await base44.entities.WalletMonitor.update(monitor.id, {
        alert_enabled: !monitor.alert_enabled
      });
      queryClient.invalidateQueries(['wallet-monitors']);
      toast.success(`Alerts ${!monitor.alert_enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (monitor) => {
    if (!confirm('Remove this wallet from monitoring?')) return;
    
    try {
      await base44.entities.WalletMonitor.delete(monitor.id);
      queryClient.invalidateQueries(['wallet-monitors']);
      toast.success('Wallet removed');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'paused': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'completed': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getRiskColor = (score) => {
    if (score >= 75) return 'text-red-400';
    if (score >= 50) return 'text-orange-400';
    if (score >= 25) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getExplorerUrl = (address, blockchain) => {
    const explorers = {
      ethereum: 'https://etherscan.io/address/',
      bitcoin: 'https://www.blockchain.com/explorer/addresses/btc/',
      bsc: 'https://bscscan.com/address/',
      polygon: 'https://polygonscan.com/address/',
      solana: 'https://solscan.io/account/',
      tron: 'https://tronscan.org/#/address/'
    };
    return (explorers[blockchain] || explorers.ethereum) + address;
  };

  return (
    <div className="space-y-6">
      {/* Add Wallet Card */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-cyan-400" />
            Add Wallet to Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              value={newWallet}
              onChange={(e) => setNewWallet(e.target.value)}
              placeholder="Enter wallet address..."
              className="flex-1 bg-[#0f1419] border-cyan-500/30 text-white font-mono"
            />
            <Select value={newBlockchain} onValueChange={setNewBlockchain}>
              <SelectTrigger className="w-full md:w-40 bg-[#0f1419] border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="bitcoin">Bitcoin</SelectItem>
                <SelectItem value="bsc">BSC</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="solana">Solana</SelectItem>
                <SelectItem value="tron">Tron</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddWallet}
              disabled={adding || !newWallet}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Add</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Monitors List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Monitored Wallets ({monitors.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-purple-500/30 text-purple-400"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
            </div>
          ) : monitors.length > 0 ? (
            <div className="space-y-3">
              {monitors.map((monitor) => (
                <div
                  key={monitor.id}
                  className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Wallet className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="text-white font-mono text-sm truncate">
                          {monitor.wallet_address}
                        </span>
                        <Badge className={getStatusColor(monitor.monitoring_status)}>
                          {monitor.monitoring_status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="capitalize">{monitor.blockchain}</span>
                        <span className="flex items-center gap-1">
                          Risk: <span className={getRiskColor(monitor.risk_score || 0)}>
                            {monitor.risk_score || 0}
                          </span>
                        </span>
                        {monitor.last_check && (
                          <span>Last check: {new Date(monitor.last_check).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleAlert(monitor)}
                        className={monitor.alert_enabled ? 'text-green-400' : 'text-gray-500'}
                        title={monitor.alert_enabled ? 'Disable alerts' : 'Enable alerts'}
                      >
                        {monitor.alert_enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(getExplorerUrl(monitor.wallet_address, monitor.blockchain), '_blank')}
                        className="text-cyan-400"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(monitor)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Risk Indicators */}
                  {monitor.risk_indicators?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle className="w-3 h-3 text-orange-400" />
                        {monitor.risk_indicators.map((indicator, i) => (
                          <Badge key={i} variant="outline" className="text-xs text-orange-400 border-orange-500/30">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Wallets Monitored</h3>
              <p className="text-gray-400">Add a wallet address above to start monitoring</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}