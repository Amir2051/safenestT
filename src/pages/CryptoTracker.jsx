import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, AlertTriangle, Activity, TrendingUp, Eye, FileText, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import WalletMonitoringEngine from "../components/tracker/WalletMonitoringEngine.jsx";
import FundFlowVisualization from "../components/tracker/FundFlowVisualization.jsx";
import RiskScoringDashboard from "../components/tracker/RiskScoringDashboard.jsx";
import AlertsCenter from "../components/tracker/AlertsCenter.jsx";
import LawEnforcementReports from "../components/tracker/LawEnforcementReports.jsx";
import InvestigationAuditLog from "../components/tracker/InvestigationAuditLog.jsx";

export default function CryptoTracker() {
  const [user, setUser] = useState(null);
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

  const { data: monitors = [], isLoading: monitorsLoading } = useQuery({
    queryKey: ['wallet-monitors'],
    queryFn: () => base44.asServiceRole.entities.WalletMonitor.list('-created_date'),
    enabled: !!user && (user.role === 'admin' || user.is_admin),
    refetchInterval: 30000
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['blockchain-alerts'],
    queryFn: () => base44.asServiceRole.entities.BlockchainAlert.list('-created_date', 50),
    enabled: !!user && (user.role === 'admin' || user.is_admin),
    refetchInterval: 10000
  });

  if (!user || monitorsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const activeMonitors = monitors.filter(m => m.monitoring_status === 'active');
  const highRiskWallets = monitors.filter(m => m.risk_score > 70);
  const exchangeDetections = monitors.filter(m => m.exchange_detected);
  const newAlerts = alerts.filter(a => a.status === 'new');
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400 animate-pulse" />
            Blockchain Intelligence & Crypto Tracker
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              ADMIN ONLY
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time wallet monitoring • Fund flow analysis • Law enforcement reporting
          </p>
        </div>
      </div>

      {/* Real-time Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 relative">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Tracked Wallets</p>
                <p className="text-2xl font-bold text-cyan-400">{activeMonitors.length}</p>
              </div>
              <Eye className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">High Risk</p>
                <p className="text-2xl font-bold text-red-400">{highRiskWallets.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20 relative">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">New Alerts</p>
                <p className="text-2xl font-bold text-orange-400">{newAlerts.length}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-400" />
            </div>
            {criticalAlerts.length > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Exchange Hits</p>
                <p className="text-2xl font-bold text-green-400">{exchangeDetections.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Investigations</p>
                <p className="text-2xl font-bold text-purple-400">{monitors.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tracking Interface */}
      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="monitoring">
            <Eye className="w-4 h-4 mr-2" />
            Wallet Monitoring
          </TabsTrigger>
          <TabsTrigger value="flow">
            <Activity className="w-4 h-4 mr-2" />
            Fund Flow
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Shield className="w-4 h-4 mr-2" />
            Risk Scoring
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts ({newAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" />
            LE Reports
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Activity className="w-4 h-4 mr-2" />
            Audit Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="mt-6">
          <WalletMonitoringEngine monitors={monitors} />
        </TabsContent>

        <TabsContent value="flow" className="mt-6">
          <FundFlowVisualization monitors={monitors} />
        </TabsContent>

        <TabsContent value="risk" className="mt-6">
          <RiskScoringDashboard monitors={monitors} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <AlertsCenter alerts={alerts} monitors={monitors} />
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <LawEnforcementReports />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <InvestigationAuditLog />
        </TabsContent>
      </Tabs>
    </div>
  );
}