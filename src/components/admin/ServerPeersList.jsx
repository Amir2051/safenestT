import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Smartphone, Laptop, MonitorSmartphone, Wifi,
  Loader2, Activity, Download, Upload, Trash2
} from "lucide-react";
import { toast } from "sonner";

export default function ServerPeersList({ server, onClose }) {
  const queryClient = useQueryClient();

  const { data: peersData, isLoading } = useQuery({
    queryKey: ['server-peers', server.server_id],
    queryFn: async () => {
      const response = await base44.functions.invoke('vpnServerManagement', {
        endpoint: 'get-server-devices',
        server_id: server.server_id
      });
      return response.data;
    },
    refetchInterval: 3000, // Real-time updates every 3 seconds
    refetchIntervalInBackground: true
  });

  const disconnectMutation = useMutation({
    mutationFn: async (deviceId) => {
      const response = await base44.functions.invoke('vpnServerManagement', {
        endpoint: 'disconnect-device',
        device_id: deviceId,
        server_id: server.server_id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-peers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-vpn-servers'] });
      queryClient.invalidateQueries({ queryKey: ['vpn-devices'] });
      toast.success('Device disconnected');
    },
    onError: (error) => {
      toast.error('Failed to disconnect: ' + error.message);
    }
  });

  const deviceIcons = {
    ios: Smartphone,
    android: Smartphone,
    windows: Laptop,
    macos: Laptop,
    linux: MonitorSmartphone,
    router: Wifi
  };

  const devices = peersData?.devices || [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="text-3xl">{server.location?.flag || '🌐'}</div>
            <div>
              <div className="flex items-center gap-2">
                {server.server_name}
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
                  LIVE
                </Badge>
              </div>
              <p className="text-sm text-gray-400 font-normal">
                {peersData?.active_connections || 0} active connection{(peersData?.active_connections || 0) !== 1 ? 's' : ''} • 
                Total: {peersData?.total_connections || 0}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading connected devices...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-3" />
              <p className="text-white font-semibold mb-2">No Active Connections</p>
              <p className="text-gray-400 text-sm">
                No devices are currently connected to this server
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const Icon = deviceIcons[device.device_type] || Smartphone;
                const rxMB = ((device.data_transfer?.rx_bytes || 0) / (1024 * 1024)).toFixed(2);
                const txMB = ((device.data_transfer?.tx_bytes || 0) / (1024 * 1024)).toFixed(2);
                const lastHandshake = device.last_handshake 
                  ? Math.floor((Date.now() - new Date(device.last_handshake).getTime()) / 60000)
                  : null;

                return (
                  <div
                    key={device.id}
                    className="p-4 bg-[#0f1419] rounded-lg border-2 border-green-500/20 hover:border-green-500/40 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center relative">
                          <Icon className="w-6 h-6 text-white" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#0f1419] animate-pulse" />
                        </div>
                        <div>
                          <p className="text-white font-bold">{device.device_name}</p>
                          <p className="text-xs text-gray-400">
                            {device.assigned_ip} • {device.device_type}
                          </p>
                          <p className="text-xs text-cyan-400 mt-1">
                            Owner: {device.created_by}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(`Disconnect "${device.device_name}"?`)) {
                            disconnectMutation.mutate(device.device_id);
                          }
                        }}
                        disabled={disconnectMutation.isPending}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>

                    {/* Data Transfer Stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-[#1a2332] rounded text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Download className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-gray-400">RX</span>
                        </div>
                        <p className="text-blue-400 font-bold text-sm">{rxMB} MB</p>
                      </div>
                      <div className="p-2 bg-[#1a2332] rounded text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Upload className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-gray-400">TX</span>
                        </div>
                        <p className="text-purple-400 font-bold text-sm">{txMB} MB</p>
                      </div>
                      <div className="p-2 bg-[#1a2332] rounded text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Activity className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-gray-400">Active</span>
                        </div>
                        <p className="text-green-400 font-bold text-sm">
                          {lastHandshake !== null ? `${lastHandshake}m` : 'Now'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-cyan-500/20 flex justify-end">
          <Button onClick={onClose} variant="outline" className="border-cyan-500/20">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}