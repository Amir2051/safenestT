import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Users, Clock, CheckCircle, XCircle, AlertTriangle,
  Activity, TrendingUp, Settings, FileText, Loader2, Key, 
  UserCheck, Lock, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import SecurityPolicies from "../components/admin/SecurityPolicies.jsx";
import ApprovalCriteria from "../components/admin/ApprovalCriteria.jsx";
import AdminAuditLog from "../components/admin/AdminAuditLog.jsx";
import UserGroupsManager from "../components/admin/UserGroupsManager.jsx";
import InviteCodeManager from "../components/admin/InviteCodeManager.jsx";
import FraudReportsManager from "../components/admin/FraudReportsManager.jsx";
import AdminGate from "../components/admin/AdminGate.jsx";
import MasterKeyManagement from "../components/admin/MasterKeyManagement.jsx";
import AccessHistory from "../components/admin/AccessHistory.jsx";
import TeamPerformanceWidget from "../components/admin/TeamPerformanceWidget.js";

export default function AdminDashboard() {
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

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('adminDashboardService', {
        endpoint: 'get-stats'
      });
      return response.data;
    },
    enabled: !!user && (user.role === 'admin' || user.is_admin),
    refetchInterval: 10000
  });

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <AdminGate>
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            Admin Command Center
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              ADMIN
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">Comprehensive system management and oversight</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats?.total_users || 0}</p>
              </div>
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20 relative">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats?.pending_approvals || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            {stats?.pending_approvals > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Active</p>
                <p className="text-2xl font-bold text-green-400">{stats?.active_users || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Invites</p>
                <p className="text-2xl font-bold text-purple-400">{stats?.active_invites || 0}</p>
              </div>
              <Key className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Alerts</p>
                <p className="text-2xl font-bold text-red-400">{stats?.critical_alerts || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Button
          onClick={() => navigate(createPageUrl('AdminUserApprovals'))}
          className="h-20 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
        >
          <UserCheck className="w-5 h-5 mr-2" />
          User Approvals
          {stats?.pending_approvals > 0 && (
            <Badge className="ml-2 bg-white text-orange-600">{stats.pending_approvals}</Badge>
          )}
        </Button>

        <Button
          onClick={() => navigate(createPageUrl('AdminInvites'))}
          className="h-20 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Key className="w-5 h-5 mr-2" />
          Manage Invites
        </Button>

        <Button
          onClick={() => navigate(createPageUrl('AdminVPNServers'))}
          className="h-20 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
        >
          <Lock className="w-5 h-5 mr-2" />
          VPN Servers
        </Button>

        <Button
          onClick={() => navigate(createPageUrl('SecurityDashboard'))}
          className="h-20 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
        >
          <Shield className="w-5 h-5 mr-2" />
          Security Monitor
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="fraud" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="fraud">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Fraud Reports
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Settings className="w-4 h-4 mr-2" />
            Security Policies
          </TabsTrigger>
          <TabsTrigger value="criteria">
            <Zap className="w-4 h-4 mr-2" />
            Approval Criteria
          </TabsTrigger>
          <TabsTrigger value="invites">
            <Key className="w-4 h-4 mr-2" />
            Invite Codes
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users className="w-4 h-4 mr-2" />
            User Groups
          </TabsTrigger>
          <TabsTrigger value="audit">
            <FileText className="w-4 h-4 mr-2" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            Admin Security
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="w-4 h-4 mr-2" />
            Team Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fraud" className="mt-6">
          <FraudReportsManager />
        </TabsContent>

        <TabsContent value="policies" className="mt-6">
          <SecurityPolicies />
        </TabsContent>

        <TabsContent value="criteria" className="mt-6">
          <ApprovalCriteria />
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <InviteCodeManager />
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          <UserGroupsManager />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AdminAuditLog />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MasterKeyManagement />
            <AccessHistory />
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamPerformanceWidget specialists={stats?.specialists || []} />
        </TabsContent>
      </Tabs>
    </div>
    </AdminGate>
  );
}