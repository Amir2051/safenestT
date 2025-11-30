import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Server, Plus, Activity, Users, Zap, RefreshCw,
  Loader2, CheckCircle, AlertTriangle, Wifi, Settings
} from "lucide-react";
import { toast } from "sonner";

import ServerEditor from "../components/admin/ServerEditor.jsx";
import ServerHealthMonitor from "../components/admin/ServerHealthMonitor.jsx";
import ServerPeersList from "../components/admin/ServerPeersList.jsx";
import AdminGate from "@/components/admin/AdminGate";

export default function AdminVPNServers() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);
  const [healthChecking, setHealthChecking] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (userData.role !== 'admin') {
        toast.error('Access denied - Admin only');
      }
    }).catch(() => {});
  }, []);

  const { data: serversData, isLoading } = useQuery({
    queryKey: ['admin-vpn-servers'],
    queryFn: async () => {
      const response = await base44.functions.invoke('vpnServerManagement', {
        endpoint: 'list-servers'
      });
      return response.data;
    },
    enabled: !!user && user.role === 'admin',
    refetchInterval: 5000, // Real-time updates every 5 seconds
    refetchIntervalInBackground: true
  });

  const healthCheckAllMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('vpnServerManagement', {
        endpoint: 'health-check-all'
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-vpn-servers'] });
      queryClient.invalidateQueries({ queryKey: ['vpn-servers'] });
      toast.success(`Health check complete! ${data.checked} servers checked.`);
      setHealthChecking(false);
    },
    onError: (error) => {
      toast.error('Health check failed: ' + error.message);
      setHealthChecking(false);
    }
  });

  const deleteServerMutation = useMutation({
    mutationFn: async (serverId) => {
      const response = await base44.functions.invoke('vpnServerManagement', {
        endpoint: 'delete-server',
        server_id: serverId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vpn-servers'] });
      queryClient.invalidateQueries({ queryKey: ['vpn-servers'] });
      toast.success('Server deleted successfully');
      setSelectedServer(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete server');
    }
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="p-6 lg:p-8">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">This page is only accessible to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const servers = serversData?.servers || [];
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const totalPeers = servers.reduce((sum, s) => sum + (s.capacity?.current_peers || 0), 0);
  const avgHealth = servers.length > 0 
    ? servers.reduce((sum, s) => sum + (s.health_score || 0), 0) / servers.length 
    : 100;

  return (
    <AdminGate>
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-cyan-400" />
            VPN Server Management
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              ADMIN
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">Manage VPN infrastructure and monitor server health</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setHealthChecking(true);
              healthCheckAllMutation.mutate();
            }}
            disabled={healthChecking}
            variant="outline"
            className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
          >
            {healthChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Check All Health
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Server
          </Button>
        </div>
      </div>

      {/* Live Status Banner */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg">
                Live Infrastructure Status
              </p>
              <p className="text-green-300 text-sm">
                Real-time updates every 5 seconds • Auto health checks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <Server className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-3xl font-bold text-cyan-400">{servers.length}</p>
            <p className="text-sm text-gray-400">Total Servers</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20 relative">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-green-400">{onlineServers}</p>
            <p className="text-sm text-gray-400">Online</p>
            {onlineServers > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <Users className="w-8 h-8 text-purple-400 mb-2" />
            <p className="text-3xl font-bold text-purple-400">{totalPeers}</p>
            <p className="text-sm text-gray-400">Total Peers</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6">
            <Zap className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-3xl font-bold text-yellow-400">{avgHealth.toFixed(0)}</p>
            <p className="text-sm text-gray-400">Avg Health</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="servers" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="servers">
            <Server className="w-4 h-4 mr-2" />
            Servers ({servers.length})
          </TabsTrigger>
          <TabsTrigger value="health">
            <Activity className="w-4 h-4 mr-2" />
            Health Monitor
          </TabsTrigger>
        </TabsList>

        {/* Servers Tab */}
        <TabsContent value="servers" className="mt-6">
          {isLoading ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading servers...</p>
              </CardContent>
            </Card>
          ) : servers.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-12 text-center">
                <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg mb-2">No VPN Servers</p>
                <p className="text-gray-400 text-sm mb-4">Get started by adding your first server</p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Server
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {servers.map((server) => (
                <Card
                  key={server.id}
                  className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] transition-all ${
                    server.status === 'online'
                      ? 'border-green-500/30 hover:border-green-500/50'
                      : 'border-red-500/30 hover:border-red-500/50'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-5xl">{server.location?.flag || '🌐'}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-bold text-xl">{server.server_name}</h3>
                            {server.status === 'online' && (
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">
                            {server.location?.city}, {server.location?.country}
                          </p>
                          <p className="text-cyan-400 text-xs mt-1 font-mono">
                            {server.endpoint}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={
                          server.status === 'online'
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }>
                          {server.status}
                        </Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                          Health: {server.health_score}/100
                        </Badge>
                      </div>
                    </div>

                    {/* Live Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                      <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                        <p className="text-xs text-gray-400 mb-1">CPU Load</p>
                        <p className="text-lg font-bold text-cyan-400">
                          {server.capacity?.cpu_usage?.toFixed(0) || 0}%
                        </p>
                      </div>
                      <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/10">
                        <p className="text-xs text-gray-400 mb-1">Memory</p>
                        <p className="text-lg font-bold text-purple-400">
                          {server.capacity?.memory_usage?.toFixed(0) || 0}%
                        </p>
                      </div>
                      <div className="p-3 bg-[#0f1419] rounded-lg border border-green-500/10">
                        <p className="text-xs text-gray-400 mb-1">Active Peers</p>
                        <p className="text-lg font-bold text-green-400">
                          {server.capacity?.current_peers || 0} / {server.capacity?.max_peers || 1000}
                        </p>
                      </div>
                      <div className="p-3 bg-[#0f1419] rounded-lg border border-yellow-500/10">
                        <p className="text-xs text-gray-400 mb-1">Latency</p>
                        <p className="text-lg font-bold text-yellow-400">
                          {server.performance?.avg_latency_ms?.toFixed(0) || 0}ms
                        </p>
                      </div>
                      <div className="p-3 bg-[#0f1419] rounded-lg border border-orange-500/10">
                        <p className="text-xs text-gray-400 mb-1">Uptime</p>
                        <p className="text-lg font-bold text-orange-400">
                          {server.performance?.uptime_percentage?.toFixed(1) || 99.9}%
                        </p>
                      </div>
                    </div>

                    {/* Connected Devices */}
                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-300 text-sm font-semibold">
                            Connected Devices: {server.connected_devices_count || 0}
                          </span>
                        </div>
                        {(server.connected_devices_count || 0) > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedServer(server)}
                            className="text-purple-400 hover:bg-purple-500/10"
                          >
                            View Devices
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedServer(server);
                          setShowAddDialog(true);
                        }}
                        className="flex-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Delete server "${server.server_name}"?`)) {
                            deleteServerMutation.mutate(server.server_id);
                          }
                        }}
                        disabled={deleteServerMutation.isPending || (server.connected_devices_count || 0) > 0}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        Delete
                      </Button>
                    </div>

                    {server.last_health_check && (
                      <p className="text-xs text-gray-500 mt-3 text-center">
                        Last checked: {new Date(server.last_health_check).toLocaleString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Health Monitor Tab */}
        <TabsContent value="health" className="mt-6">
          <ServerHealthMonitor 
            servers={servers}
            onHealthCheck={() => healthCheckAllMutation.mutate()}
            isChecking={healthChecking}
          />
        </TabsContent>
      </Tabs>

      {/* Server Editor Dialog */}
      {showAddDialog && (
        <ServerEditor
          server={selectedServer}
          onClose={() => {
            setShowAddDialog(false);
            setSelectedServer(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-vpn-servers'] });
            queryClient.invalidateQueries({ queryKey: ['vpn-servers'] });
            setShowAddDialog(false);
            setSelectedServer(null);
          }}
        />
      )}

      {/* Server Peers Dialog */}
      {selectedServer && !showAddDialog && (
        <ServerPeersList
          server={selectedServer}
          onClose={() => setSelectedServer(null)}
        />
      )}
    </div>
    </AdminGate>
  );
}