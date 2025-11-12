import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone, Laptop, MonitorSmartphone, Wifi, Plus,
  Loader2, Download, QrCode, Trash2, Shield, CheckCircle,
  AlertCircle, Clock, Activity, TrendingUp
} from "lucide-react";
import { toast } from "sonner";

import AddDeviceDialog from "../components/vpn/AddDeviceDialog.jsx";
import DeviceCard from "../components/vpn/DeviceCard.jsx";
import ConfigDownloadDialog from "../components/vpn/ConfigDownloadDialog.jsx";
import ConnectionHistory from "../components/vpn/ConnectionHistory.jsx";
import LiveServerStatus from "../components/vpn/LiveServerStatus.jsx";

export default function VPNDevices() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['vpn-devices'],
    queryFn: async () => {
      const response = await base44.functions.invoke('vpnDeviceService', {
        endpoint: 'list-devices'
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 3000, // Real-time updates every 3 seconds
    refetchIntervalInBackground: true
  });

  const { data: serversData } = useQuery({
    queryKey: ['vpn-servers'],
    queryFn: async () => {
      const servers = await base44.entities.VPNServer.list();
      return servers;
    },
    enabled: !!user,
    refetchInterval: 5000, // Update server status every 5 seconds
    refetchIntervalInBackground: true
  });

  const revokeDeviceMutation = useMutation({
    mutationFn: async (device_id) => {
      const response = await base44.functions.invoke('vpnDeviceService', {
        endpoint: 'revoke-device',
        device_id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vpn-devices'] });
      toast.success('Device revoked successfully');
    },
    onError: (error) => {
      toast.error('Failed to revoke device: ' + error.message);
    }
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const devices = devicesData?.devices || [];
  const servers = serversData || [];
  
  const activeDevices = devices.filter(d => d.status === 'active');
  const connectedDevices = devices.filter(d => d.connected);
  const totalDataTransfer = devices.reduce((sum, d) => 
    sum + (d.data_transfer?.rx_bytes || 0) + (d.data_transfer?.tx_bytes || 0), 0
  ) / (1024 * 1024 * 1024); // Convert to GB

  const deviceTypeIcons = {
    ios: Smartphone,
    android: Smartphone,
    windows: Laptop,
    macos: Laptop,
    linux: MonitorSmartphone,
    router: Wifi
  };

  const getTimeSince = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            VPN Device Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your WireGuard devices and configurations
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* Real-time Status Banner */}
      {connectedDevices.length > 0 && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-lg">
                  {connectedDevices.length} Device{connectedDevices.length > 1 ? 's' : ''} Connected
                </p>
                <p className="text-green-300 text-sm">
                  🔒 Protected • Live updates every 3 seconds
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">
                  {totalDataTransfer.toFixed(2)} GB
                </p>
                <p className="text-xs text-green-300">Total Transfer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <Smartphone className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-3xl font-bold text-cyan-400">{activeDevices.length}</p>
            <p className="text-sm text-gray-400">Active Devices</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20 relative overflow-hidden">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-green-400">{connectedDevices.length}</p>
            <p className="text-sm text-gray-400">Connected Now</p>
            {connectedDevices.length > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <Activity className="w-8 h-8 text-purple-400 mb-2" />
            <p className="text-3xl font-bold text-purple-400">{totalDataTransfer.toFixed(2)}</p>
            <p className="text-sm text-gray-400">GB Transferred</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6">
            <Wifi className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-3xl font-bold text-yellow-400">{servers.length}</p>
            <p className="text-sm text-gray-400">VPN Servers</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="devices">
            <Smartphone className="w-4 h-4 mr-2" />
            My Devices
          </TabsTrigger>
          <TabsTrigger value="servers">
            <Wifi className="w-4 h-4 mr-2" />
            Servers
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Devices Tab */}
        <TabsContent value="devices" className="mt-6 space-y-4">
          {/* Active Connections - Prominent Section */}
          {connectedDevices.length > 0 && (
            <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40 shadow-lg shadow-green-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  Active Connections ({connectedDevices.length})
                  <Badge className="bg-green-500/30 text-green-300 border-green-400/50 ml-auto">
                    LIVE
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {connectedDevices.map(device => {
                  const Icon = deviceTypeIcons[device.device_type] || Smartphone;
                  const server = servers.find(s => s.server_id === device.current_server_id);
                  const rxMB = ((device.data_transfer?.rx_bytes || 0) / (1024 * 1024)).toFixed(2);
                  const txMB = ((device.data_transfer?.tx_bytes || 0) / (1024 * 1024)).toFixed(2);
                  
                  return (
                    <div key={device.id} className="p-4 bg-[#0f1419] rounded-lg border-2 border-green-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#0f1419] animate-pulse" />
                          </div>
                          <div>
                            <p className="text-white font-bold">{device.device_name}</p>
                            <p className="text-xs text-green-400 font-semibold">
                              ⚡ Connected • {device.assigned_ip}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white font-semibold mb-1">
                            {server?.location?.flag || '🌐'} {server?.location?.city || 'Server'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {getTimeSince(device.last_handshake)}
                          </p>
                        </div>
                      </div>

                      {/* Live Stats */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 bg-[#1a2332] rounded text-center">
                          <p className="text-xs text-gray-400">↓ Download</p>
                          <p className="text-green-400 font-bold text-sm">{rxMB} MB</p>
                        </div>
                        <div className="p-2 bg-[#1a2332] rounded text-center">
                          <p className="text-xs text-gray-400">↑ Upload</p>
                          <p className="text-cyan-400 font-bold text-sm">{txMB} MB</p>
                        </div>
                        <div className="p-2 bg-[#1a2332] rounded text-center">
                          <p className="text-xs text-gray-400">Latency</p>
                          <p className="text-yellow-400 font-bold text-sm">
                            {server?.performance?.avg_latency_ms || 0}ms
                          </p>
                        </div>
                        <div className="p-2 bg-[#1a2332] rounded text-center">
                          <p className="text-xs text-gray-400">Server Load</p>
                          <p className="text-purple-400 font-bold text-sm">
                            {server?.capacity?.cpu_usage?.toFixed(0) || 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* All Devices */}
          {isLoading ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading devices...</p>
              </CardContent>
            </Card>
          ) : devices.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-12 text-center">
                <Smartphone className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white font-bold text-xl mb-2">No Devices Yet</h3>
                <p className="text-gray-400 mb-6">
                  Add your first device to start using SafeNest VPN
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Device
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {devices.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onRevoke={() => revokeDeviceMutation.mutate(device.device_id)}
                  onViewConfig={() => {
                    setSelectedDevice(device);
                    setShowConfigDialog(true);
                  }}
                  servers={servers}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Servers Tab */}
        <TabsContent value="servers" className="mt-6 space-y-6">
          {/* Live Server Map */}
          <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white font-semibold">
                  Live Server Status • Updates every 5 seconds
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2 bg-[#0f1419] rounded">
                  <span className="text-gray-400">Total Servers:</span>
                  <span className="text-white font-bold ml-2">{servers.length}</span>
                </div>
                <div className="p-2 bg-[#0f1419] rounded">
                  <span className="text-gray-400">Online:</span>
                  <span className="text-green-400 font-bold ml-2">
                    {servers.filter(s => s.status === 'online').length}
                  </span>
                </div>
                <div className="p-2 bg-[#0f1419] rounded">
                  <span className="text-gray-400">Total Peers:</span>
                  <span className="text-cyan-400 font-bold ml-2">
                    {servers.reduce((sum, s) => sum + (s.capacity?.current_peers || 0), 0)}
                  </span>
                </div>
                <div className="p-2 bg-[#0f1419] rounded">
                  <span className="text-gray-400">Avg Load:</span>
                  <span className="text-purple-400 font-bold ml-2">
                    {(servers.reduce((sum, s) => sum + (s.capacity?.cpu_usage || 0), 0) / servers.length).toFixed(0)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Available VPN Servers</CardTitle>
            </CardHeader>
            <CardContent>
              {servers.length === 0 ? (
                <div className="text-center py-12">
                  <Wifi className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No servers available</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {servers.map(server => (
                    <LiveServerStatus key={server.id} server={server} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <ConnectionHistory userEmail={user.email} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddDeviceDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={(data) => {
          queryClient.invalidateQueries({ queryKey: ['vpn-devices'] });
          setShowAddDialog(false);
          setSelectedDevice({ device_id: data.device.device_id });
          setShowConfigDialog(true);
        }}
      />

      {selectedDevice && (
        <ConfigDownloadDialog
          open={showConfigDialog}
          onClose={() => {
            setShowConfigDialog(false);
            setSelectedDevice(null);
          }}
          deviceId={selectedDevice.device_id}
        />
      )}
    </div>
  );
}