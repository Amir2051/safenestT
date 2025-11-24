import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, AlertTriangle, Search, FileText, Upload, Plus,
  TrendingUp, Wallet, Activity, Building2, Lock, BarChart3,
  FolderOpen, Send, Eye, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

// Import sub-components
import CryptoFraudDashboard from "@/components/fraud-center/CryptoFraudDashboard";
import ActiveCasesPanel from "@/components/fraud-center/ActiveCasesPanel";
import ReportFraudPanel from "@/components/fraud-center/ReportFraudPanel";
import BlockchainTracePanel from "@/components/fraud-center/BlockchainTracePanel";
import CryptoTrackerPanel from "@/components/fraud-center/CryptoTrackerPanel";
import TransactionAnalyzerPanel from "@/components/fraud-center/TransactionAnalyzerPanel";
import DocumentsEvidencePanel from "@/components/fraud-center/DocumentsEvidencePanel";

export default function CryptoFraudCenter() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [accessGranted, setAccessGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Check permissions - investigators, admins, or verified users
        const hasAccess = 
          userData.role === 'admin' || 
          userData.is_investigator || 
          userData.is_verified ||
          userData.subscription_status === 'active' ||
          userData.subscription_plan === 'premium';
        
        setAccessGranted(hasAccess);
      } catch (error) {
        console.error('Auth error:', error);
        setAccessGranted(false);
      }
      setLoading(false);
    };
    
    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-6">
        <Card className="max-w-md w-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
            <p className="text-gray-400 mb-6">
              The Crypto Fraud Investigation Center is only available to verified investigators and premium users.
            </p>
            <Button 
              onClick={() => window.location.href = '/Subscription'}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Upgrade to Access
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'cases', label: 'Active Cases', icon: FolderOpen },
    { id: 'report', label: 'Report Fraud', icon: AlertTriangle },
    { id: 'trace', label: 'Blockchain Trace', icon: Search },
    { id: 'tracker', label: 'Crypto Tracker', icon: Activity },
    { id: 'analyzer', label: 'Transaction Analyzer', icon: TrendingUp },
    { id: 'documents', label: 'Documents & Evidence', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-6">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">
                🔥 Crypto Fraud Investigation Center
              </h1>
              <p className="text-gray-400">
                Unified platform for fraud recovery, blockchain tracing, and case management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />
              Investigation Tools Active
            </Badge>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
              {user?.role === 'admin' ? 'Admin Access' : 'Investigator Access'}
            </Badge>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#1a2332] border border-cyan-500/20 p-1 flex flex-wrap h-auto gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-cyan-400 flex items-center gap-2 px-4 py-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <CryptoFraudDashboard 
              user={user} 
              onNavigate={setActiveTab}
            />
          </TabsContent>

          <TabsContent value="cases" className="mt-0">
            <ActiveCasesPanel user={user} />
          </TabsContent>

          <TabsContent value="report" className="mt-0">
            <ReportFraudPanel user={user} onCaseCreated={() => setActiveTab('cases')} />
          </TabsContent>

          <TabsContent value="trace" className="mt-0">
            <BlockchainTracePanel user={user} />
          </TabsContent>

          <TabsContent value="tracker" className="mt-0">
            <CryptoTrackerPanel user={user} />
          </TabsContent>

          <TabsContent value="analyzer" className="mt-0">
            <TransactionAnalyzerPanel user={user} />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <DocumentsEvidencePanel user={user} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}