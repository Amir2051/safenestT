import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Shield, Wallet, AlertTriangle, TrendingUp, Plus, Search,
  ExternalLink, Lock, Eye, CheckCircle, XCircle, Loader2,
  Activity, Upload, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

import AddWalletDialog from "../components/crypto/AddWalletDialog.jsx";
import WalletCard from "../components/crypto/WalletCard.jsx";
import TransactionScanner from "../components/crypto/TransactionScanner.jsx";
import ScamReporter from "../components/crypto/ScamReporter.jsx";

export default function CryptoProtection() {
  const [user, setUser] = useState(null);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: wallets = [], isLoading: walletsLoading } = useQuery({
    queryKey: ['crypto-wallets'],
    queryFn: () => base44.entities.CryptoWallet.list('-created_date'),
    enabled: !!user,
    initialData: []
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['crypto-transactions'],
    queryFn: () => base44.entities.CryptoTransaction.list('-timestamp', 50),
    enabled: !!user,
    initialData: []
  });

  const { data: scams = [] } = useQuery({
    queryKey: ['scam-database'],
    queryFn: () => base44.entities.ScamDatabase.filter({ status: 'active' }, '-created_date', 20),
    enabled: !!user,
    initialData: []
  });

  const deleteWalletMutation = useMutation({
    mutationFn: (id) => base44.entities.CryptoWallet.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
      toast.success('Wallet removed');
    }
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const monitoredWallets = wallets.filter(w => w.is_monitored);
  const totalBalance = wallets.reduce((sum, w) => sum + (w.balance_usd || 0), 0);
  const highRiskWallets = wallets.filter(w => w.risk_score > 70);
  const blockedTransactions = transactions.filter(t => t.status === 'blocked');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Crypto Protection
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
              AI-POWERED
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">Real-time scam detection and wallet monitoring</p>
        </div>
        <Button
          onClick={() => setShowAddWallet(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Wallet
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Monitored Wallets</p>
                <p className="text-2xl font-bold text-white">{monitoredWallets.length}</p>
              </div>
              <Wallet className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Balance</p>
                <p className="text-2xl font-bold text-green-400">${totalBalance.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Threats Blocked</p>
                <p className="text-2xl font-bold text-red-400">{blockedTransactions.length}</p>
              </div>
              <Shield className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">High Risk</p>
                <p className="text-2xl font-bold text-yellow-400">{highRiskWallets.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#0f1419] border-cyan-500/20 hover:border-cyan-500/50 transition-all group">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
              <AlertTriangle className="w-6 h-6 text-cyan-400" />
            </div>
            <CardTitle className="text-white">Report a Scam</CardTitle>
            <CardDescription className="text-gray-400">
              File a new report for crypto fraud, phishing, or theft.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('ReportScam')}>
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white group-hover:translate-x-1 transition-all">
                Start Report <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1419] border-purple-500/20 hover:border-purple-500/50 transition-all group">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4 group-hover:bg-purple-500/20 transition-colors">
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <CardTitle className="text-white">Track Case Status</CardTitle>
            <CardDescription className="text-gray-400">
              View the timeline and status of your submitted cases.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('MyCases')}>
              <Button variant="outline" className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                View My Cases
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1419] border-blue-500/20 hover:border-blue-500/50 transition-all group">
          <CardHeader>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
              <Upload className="w-6 h-6 text-blue-400" />
            </div>
            <CardTitle className="text-white">Upload Evidence</CardTitle>
            <CardDescription className="text-gray-400">
              Securely submit documents, screenshots, and logs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={createPageUrl('MyCases')}>
              <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                Submit Files
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="wallets" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="wallets">
            <Wallet className="w-4 h-4 mr-2" />
            My Wallets
          </TabsTrigger>
          <TabsTrigger value="scanner">
            <Search className="w-4 h-4 mr-2" />
            Transaction Scanner
          </TabsTrigger>
          <TabsTrigger value="scams">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Known Scams
          </TabsTrigger>
          <TabsTrigger value="report">
            <Shield className="w-4 h-4 mr-2" />
            Report Scam
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallets" className="mt-6 space-y-4">
          {walletsLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
            </div>
          ) : wallets.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-12 text-center">
                <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg">No wallets added yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Add your first wallet to start monitoring</p>
                <Button
                  onClick={() => setShowAddWallet(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Wallet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {wallets.map(wallet => (
                <WalletCard
                  key={wallet.id}
                  wallet={wallet}
                  onDelete={() => deleteWalletMutation.mutate(wallet.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scanner" className="mt-6">
          <TransactionScanner />
        </TabsContent>

        <TabsContent value="scams" className="mt-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Known Scam Database ({scams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {scams.map(scam => (
                  <div
                    key={scam.id}
                    className="p-4 bg-[#0f1419] rounded-lg border border-red-500/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={
                            scam.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                            scam.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            scam.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {scam.risk_level.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{scam.scam_type}</Badge>
                          {scam.verified && (
                            <Badge className="bg-green-500/20 text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-white font-mono text-sm mb-2 break-all">
                          {scam.identifier}
                        </p>
                        <p className="text-gray-400 text-sm">{scam.scam_description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{scam.victim_count} victims</span>
                          <span>${scam.total_stolen_usd?.toLocaleString()} stolen</span>
                          <span>{new Date(scam.first_reported).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <ScamReporter />
        </TabsContent>
      </Tabs>

      {/* Add Wallet Dialog */}
      {showAddWallet && (
        <AddWalletDialog
          onClose={() => setShowAddWallet(false)}
          onSuccess={() => {
            setShowAddWallet(false);
            queryClient.invalidateQueries({ queryKey: ['crypto-wallets'] });
          }}
        />
      )}
    </div>
  );
}