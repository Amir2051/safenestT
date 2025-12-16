import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Search, FileText, TrendingUp, AlertCircle,
  Loader2, Database, Activity, Download, UserPlus, RefreshCw
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
import CreateCaseForUserDialog from "@/components/admin/CreateCaseForUserDialog.jsx";
import CaseRecoveryPanel from "@/components/admin/CaseRecoveryPanel.jsx";

export default function AdminInvestigation() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    base44.auth.me().then(userData => {
      if (mounted) {
        setUser(userData);
        if (userData.role !== 'admin' && !userData.is_admin) {
          navigate(createPageUrl('Dashboard'));
          toast.error('Admin access required');
        }
      }
    }).catch(() => {
      if (mounted) navigate(createPageUrl('Dashboard'));
    });
    return () => { mounted = false; };
  }, [navigate]);

  const { data: clientCases = [], isLoading: loadingCases, refetch: refetchCases } = useQuery({
    queryKey: ['client-cases-admin'],
    queryFn: async () => {
      // Use asServiceRole to ensure we get ALL cases regardless of RLS (though admin RLS allows it)
      // Switched to MyCase to match user submissions
      const cases = await base44.asServiceRole.entities.MyCase.list('-created_date', 1000);
      return cases;
    },
    enabled: !!user && (user.role === 'admin' || user.is_admin),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes cache
  });

  const { data: recoveryFunds = [] } = useQuery({
    queryKey: ['recovery-funds'],
    queryFn: () => base44.asServiceRole.entities.RecoveryFund.list('-created_date', 1000),
    enabled: !!user && (user.role === 'admin' || user.is_admin)
  });

  if (!user || loadingCases) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const allCases = clientCases;

  const activeCases = allCases.filter(c => c.status !== 'Closed' && c.status !== 'Resolved');
  const totalRecovered = allCases.filter(c => c.status === 'Resolved').reduce((sum, c) => 
    sum + (c.amount_lost || 0), 0
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
        <Button 
          variant="outline" 
          onClick={() => {
            if (confirm("Run Case ID Migration? This will assign SN- IDs to old cases.")) {
              base44.functions.invoke('caseManagement', { action: 'migrate' })
                .then(res => toast.success(`Migrated ${res.data.migrated_count} cases`))
                .catch(err => toast.error("Migration failed"));
            }
          }}
          className="border-cyan-500/30 text-cyan-400"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Run ID Migration
        </Button>
        <Button 
          variant="outline" 
          onClick={() => {
            if (confirm("Run Full Case Audit & Recovery?\n\nThis will:\n1. Scan ALL cases and users\n2. Re-link orphaned cases to owners (case-insensitive)\n3. Fix missing dates from Case IDs\n4. Restore user visibility for legacy cases")) {
              const toastId = toast.loading("Running Audit & Recovery... This may take a moment.");
              base44.functions.invoke('caseManagement', { action: 'recover_access' })
                .then(res => {
                    toast.dismiss(toastId);
                    toast.success("Recovery Complete", { description: res.data.message, duration: 8000 });
                })
                .catch(err => {
                    toast.dismiss(toastId);
                    toast.error("Recovery failed: " + err.message);
                });
            }
          }}
          className="border-green-500/30 text-green-400 hover:bg-green-500/10"
        >
          <Shield className="w-4 h-4 mr-2" />
          Recover & Audit Data
          </Button>
          <Button 
          variant="outline"
          onClick={() => {
             const toastId = toast.loading("Running Full Archive Import... This may take a minute.");
             base44.functions.invoke('caseManagement', { action: 'import_all_legacy_cases' })
                .then(res => {
                    toast.dismiss(toastId);
                    toast.success("Import Complete", { description: res.data.message, duration: 10000 });
                    refetchCases(); // Manual refresh after import
                })
                .catch(err => {
                    toast.dismiss(toastId);
                    toast.error("Import failed: " + err.message);
                });
          }}
          className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
          >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync / Import Cases
          </Button>
          <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          >
          <UserPlus className="w-4 h-4 mr-2" />
          Create Case for User
          </Button>
          </div>

      <CreateCaseForUserDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)} 
      />

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
            <TabsTrigger value="recovery">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recovery Tool
            </TabsTrigger>
            </TabsList>

            <TabsContent value="recovery" className="mt-6">
            <CaseRecoveryPanel />
            </TabsContent>

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