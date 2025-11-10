import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Lock, Unlock, TrendingUp, Eye, EyeOff,
  AlertTriangle, Clock, Settings, Download, FileText
} from "lucide-react";
import { toast } from "sonner";

import VaultSetup from "../components/identity/VaultSetup.jsx";
import VaultUnlock from "../components/identity/VaultUnlock.jsx";
import ExposureTrends from "../components/identity/ExposureTrends.jsx";

export default function IdentityMonitor() {
  const [user, setUser] = useState(null);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const queryClient = useQueryClient();

  const { data: vault } = useQuery({
    queryKey: ['vault', user?.email],
    queryFn: async () => {
      const vaults = await base44.entities.Vault.filter({ user_id: user.email });
      return vaults[0] || null;
    },
    enabled: !!user,
    refetchInterval: 30000 // Check every 30s for auto-lock
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['vault-audit', user?.email],
    queryFn: () => base44.entities.VaultAudit.filter({ user_id: user.email }, '-timestamp', 20),
    enabled: !!user && !!vault,
    initialData: []
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const lockVaultMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('vaultService', {
        endpoint: 'lock'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast.success('🔒 Vault locked');
    }
  });

  const emergencyLockMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('vaultService', {
        endpoint: 'force-lock'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast.success('🚨 Emergency lock activated');
    }
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const vaultExists = !!vault;
  const vaultUnlocked = vault?.is_unlocked && 
                        vault?.token_expires_at && 
                        new Date(vault.token_expires_at) > new Date();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-400" />
          Identity Monitor
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
            Privacy-First
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Encrypted exposure tracking with Privacy Vault protection
        </p>
      </div>

      {/* Vault Status Card */}
      <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 ${
        vaultUnlocked ? 'border-green-500/30' : 'border-purple-500/30'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                vaultUnlocked 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
              }`}>
                {vaultUnlocked ? (
                  <Unlock className="w-8 h-8 text-white" />
                ) : (
                  <Lock className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-white font-bold text-xl mb-1">
                  Privacy Vault {vaultUnlocked ? 'Unlocked' : 'Locked'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {!vaultExists && 'Set up vault to encrypt your identity data'}
                  {vaultExists && vaultUnlocked && `Auto-locks in ${Math.floor((new Date(vault.token_expires_at) - new Date()) / 60000)} minutes`}
                  {vaultExists && !vaultUnlocked && 'Unlock to view raw PII and export data'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {!vaultExists ? (
                <Button
                  onClick={() => setActiveTab('setup')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Set Up Vault
                </Button>
              ) : vaultUnlocked ? (
                <>
                  <Button
                    onClick={() => lockVaultMutation.mutate()}
                    variant="outline"
                    className="border-orange-500/20 text-orange-400"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Lock Now
                  </Button>
                  <Button
                    onClick={() => emergencyLockMutation.mutate()}
                    variant="outline"
                    className="border-red-500/20 text-red-400"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Emergency Lock
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setShowUnlockDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  Unlock Vault
                </Button>
              )}
            </div>
          </div>

          {vault?.failed_attempts > 0 && !vaultUnlocked && (
            <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-orange-400 text-sm">
                ⚠️ {vault.failed_attempts} failed unlock attempt(s). {5 - vault.failed_attempts} remaining before lockout.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      {!vaultExists ? (
        <VaultSetup 
          user={user} 
          onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['vault'] });
          }} 
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1a2332] border border-cyan-500/20">
            <TabsTrigger value="overview">
              <Shield className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Exposure Trends
            </TabsTrigger>
            <TabsTrigger value="audit">
              <FileText className="w-4 h-4 mr-2" />
              Audit Log
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Eye className="w-8 h-8 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Identifiers Monitored</p>
                      <p className="text-2xl font-bold text-cyan-400">
                        {vaultUnlocked ? '5' : '•••'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {vaultUnlocked ? '3 emails, 1 SSN, 1 phone' : 'Unlock to view details'}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-8 h-8 text-purple-400" />
                    <div>
                      <p className="text-xs text-gray-400">Total Exposures</p>
                      <p className="text-2xl font-bold text-purple-400">
                        {vaultUnlocked ? '24' : '••'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Across 8 data breaches</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Lock className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-xs text-gray-400">Vault Security</p>
                      <p className="text-lg font-bold text-green-400">AES-256</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Zero-knowledge encryption</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-cyan-500/20 text-cyan-400 justify-start"
                  onClick={() => setActiveTab('trends')}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Exposure Trends
                </Button>
                <Button
                  variant="outline"
                  className="border-purple-500/20 text-purple-400 justify-start"
                  disabled={!vaultUnlocked}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export My Data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            <ExposureTrends user={user} vault={vault} />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4 mt-6">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white">Vault Audit Log</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No audit events yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-white font-semibold text-sm">
                              {log.summary}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(log.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge className={
                            log.success 
                              ? 'bg-green-500/20 text-green-400 border-green-500/50'
                              : 'bg-red-500/20 text-red-400 border-red-500/50'
                          }>
                            {log.action}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-6">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white">Vault Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-300 text-sm">
                    ⚠️ Settings management coming soon. Contact support to modify vault settings.
                  </p>
                </div>

                <div className="p-3 bg-[#0f1419] rounded-lg">
                  <p className="text-gray-400 text-sm">Auto-lock timeout:</p>
                  <p className="text-white font-semibold">{vault?.session_timeout_minutes || 5} minutes</p>
                </div>

                <div className="p-3 bg-[#0f1419] rounded-lg">
                  <p className="text-gray-400 text-sm">Biometric enabled:</p>
                  <p className="text-white font-semibold">
                    {vault?.biometric_enabled ? 'Yes' : 'No'}
                  </p>
                </div>

                <div className="p-3 bg-[#0f1419] rounded-lg">
                  <p className="text-gray-400 text-sm">Vault created:</p>
                  <p className="text-white font-semibold">
                    {vault?.setup_completed_at 
                      ? new Date(vault.setup_completed_at).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Unlock Dialog */}
      {vault && (
        <VaultUnlock
          vault={vault}
          open={showUnlockDialog}
          onClose={() => setShowUnlockDialog(false)}
          onUnlocked={() => {
            queryClient.invalidateQueries({ queryKey: ['vault'] });
          }}
        />
      )}
    </div>
  );
}