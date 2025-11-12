import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone, Laptop, MonitorSmartphone, Wifi, Download,
  Trash2, CheckCircle, XCircle, Clock, Activity
} from "lucide-react";
import LiveConnectionIndicator from "./LiveConnectionIndicator.jsx";

export default function DeviceCard({ device, onRevoke, onViewConfig, servers }) {
  const deviceTypeIcons = {
    ios: Smartphone,
    android: Smartphone,
    windows: Laptop,
    macos: Laptop,
    linux: MonitorSmartphone,
    router: Wifi
  };

  const Icon = deviceTypeIcons[device.device_type] || Smartphone;
  
  const currentServer = servers.find(s => s.server_id === device.current_server_id);
  
  const totalTransferMB = (
    ((device.data_transfer?.rx_bytes || 0) + (device.data_transfer?.tx_bytes || 0)) / (1024 * 1024)
  ).toFixed(2);

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
    <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] transition-all ${
      device.connected 
        ? 'border-green-500/40 shadow-lg shadow-green-500/10' 
        : 'border-cyan-500/20 hover:border-cyan-500/40'
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center relative ${
              device.connected 
                ? 'bg-gradient-to-br from-green-500 to-green-600'
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }`}>
              <Icon className="w-6 h-6 text-white" />
              {device.connected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-[#1a2332] animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{device.device_name}</h3>
              <p className="text-sm text-gray-400 capitalize">
                {device.device_type} • {device.assigned_ip}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <Badge className={
              device.status === 'active'
                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                : device.status === 'revoked'
                ? 'bg-red-500/20 text-red-400 border-red-500/50'
                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
            }>
              {device.status}
            </Badge>
            <LiveConnectionIndicator device={device} server={currentServer} />
          </div>
        </div>

        {/* Connection Info */}
        {device.connected && currentServer && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-300 text-sm font-semibold">
                Connected to {currentServer.server_name}
              </span>
            </div>
            <p className="text-xs text-green-200">
              {currentServer.location?.city}, {currentServer.location?.country} • 
              {currentServer.performance?.avg_latency_ms || 0}ms latency
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-[#0f1419] rounded-lg text-center">
            <p className="text-xs text-gray-400 mb-1">Data Transfer</p>
            <p className="text-white font-bold">{totalTransferMB} MB</p>
          </div>
          <div className="p-3 bg-[#0f1419] rounded-lg text-center">
            <p className="text-xs text-gray-400 mb-1">Last Handshake</p>
            <p className="text-white font-bold text-xs">{getTimeSince(device.last_handshake)}</p>
          </div>
          <div className="p-3 bg-[#0f1419] rounded-lg text-center">
            <p className="text-xs text-gray-400 mb-1">Config Ver.</p>
            <p className="text-white font-bold">v{device.config_version}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onViewConfig}
            variant="outline"
            size="sm"
            className="flex-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
            disabled={device.status === 'revoked'}
          >
            <Download className="w-4 h-4 mr-2" />
            View Config
          </Button>
          <Button
            onClick={onRevoke}
            variant="outline"
            size="sm"
            className="border-red-500/20 text-red-400 hover:bg-red-500/10"
            disabled={device.status === 'revoked'}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Revoke
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}