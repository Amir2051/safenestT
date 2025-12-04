import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Search, FileText, TrendingUp, AlertCircle,
  Loader2, Database, Activity, Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import WalletTracker from "../components/investigation/WalletTracker.jsx";
import BlockchainFlowMap from "../components/investigation/BlockchainFlowMap.jsx";
import ExchangeDetector from "../components/investigation/ExchangeDetector.jsx";
import EvidenceCollector from "../components/investigation/EvidenceCollector.jsx";
import ReportGenerator from "../components/investigation/ReportGenerator.jsx";
import CaseManager from "../components/investigation/CaseManager.jsx";

export default function AdminInvestigation() {
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (userData.role !== 'admin' && !userData.is_admin) {
        navigate(createPageUrl('Dashboard'));
        toast.error('Admin access required');
      }
    }).catch(() => {
      navigate(createPageUrl('Dashboard'));
    });
  }, [navigate]);

  const { data: clientCases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['client-cases-admin'],
    queryFn: async () => {
      // Use asServiceRole to ensure we get ALL cases regardless of RLS (though admin RLS allows it)
      const cases = await base44.asServiceRole.entities.ClientCase.list('-created_date');
      return cases;
    },
    enabled: !!user && (user.role === 'admin' || user.is_admin),
    refetchInterval: 10000
  });

  const { data: recoveryFunds = [] } = useQuery({
    queryKey: ['recovery-funds'],
    queryFn: () => base44.asServiceRole.entities.RecoveryFund.list('-created_date'),
    enabled: !!user && (user.role === 'admin' || user.is_admin)
  });

  if (!user || loadingFraud || loadingInvestigation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  // Combine both case types
  const allCases = [
    ...fraudCases.map(c => ({ ...c, case_type: 'fraud' })),
    ...investigationCases.map(c => ({ ...c, case_type: 'investigation' }))
  ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const activeCases = allCases.filter(c => c.status !== 'closed' && c.status !== 'recovered');
  const totalRecovered = allCases.reduce((sum, c) => 
    sum + ((c.amount_stolen_usd || 0) * (c.recovery_progress || 0)) / 100, 0
  );
  const totalFundBalance = recoveryFunds
    .filter(f => f.transaction_type === 'contribution' && f.status === 'confirmed')
    .reduce((sum, f) => sum + f.amount_usd, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-400" />
            Crypto Fraud Investigation Center
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              ADMIN ACCESS
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            Advanced blockchain forensics & law enforcement reporting
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Active Cases</p>
                <p className="text-2xl font-bold text-red-400">{activeCases.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Cases</p>
                <p className="text-2xl font-bold text-orange-400">{allCases.length}</p>
              </div>
              <Database className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Recovered</p>
                <p className="text-2xl font-bold text-green-400">
                  ${totalRecovered.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Recovery Fund</p>
                <p className="text-2xl font-bold text-cyan-400">
                  ${totalFundBalance.toLocaleString()}
                </p>
              </div>
              <Activity className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Investigation Tabs */}
      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="bg-[#1a2332] border border-red-500/20">
          <TabsTrigger value="cases">
            <Database className="w-4 h-4 mr-2" />
            Cases
          </TabsTrigger>
          <TabsTrigger value="wallet-tracker">
            <Search className="w-4 h-4 mr-2" />
            Wallet Tracker
          </TabsTrigger>
          <TabsTrigger value="flow-map">
            <Activity className="w-4 h-4 mr-2" />
            Flow Map
          </TabsTrigger>
          <TabsTrigger value="exchange">
            <TrendingUp className="w-4 h-4 mr-2" />
            Exchange Detection
          </TabsTrigger>
          <TabsTrigger value="evidence">
            <FileText className="w-4 h-4 mr-2" />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="report">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          <CaseManager 
            cases={allCases}
            onSelectCase={setSelectedCase}
            selectedCase={selectedCase}
            recoveryFunds={recoveryFunds}
            user={user}
          />
        </TabsContent>

        <TabsContent value="wallet-tracker" className="mt-6">
          <WalletTracker selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="flow-map" className="mt-6">
          <BlockchainFlowMap selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="exchange" className="mt-6">
          <ExchangeDetector selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="evidence" className="mt-6">
          <EvidenceCollector selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <ReportGenerator selectedCase={selectedCase} />
        </TabsContent>
      </Tabs>
    </div>
  );
}