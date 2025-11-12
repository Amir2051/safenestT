import React from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, Users, Zap, Activity, TrendingUp } from "lucide-react";

export default function LiveServerStatus({ server }) {
  const getLoadColor = (load) => {
    if (load < 30) return 'text-green-400';
    if (load < 60) return 'text-yellow-400';
    if (load < 80) return 'text-orange-400';
    return 'text-red-400';
  };

  const getLoadBg = (load) => {
    if (load < 30) return 'bg-green-500';
    if (load < 60) return 'bg-yellow-500';
    if (load < 80) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const cpuLoad = server.capacity?.cpu_usage || 0;
  const peerLoad = ((server.capacity?.current_peers || 0) / (server.capacity?.max_peers || 1000)) * 100;

  return (
    <div className={`p-4 bg-[#0f1419] rounded-lg border transition-all ${
      server.status === 'online'
        ? 'border-green-500/20 hover:border-green-500/40'
        : 'border-red-500/20'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{server.location?.flag || '🌐'}</div>
          <div>
            <h3 className="text-white font-bold flex items-center gap-2">
              {server.server_name}
              {server.status === 'online' && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </h3>
            <p className="text-sm text-gray-400">
              {server.location?.city}, {server.location?.country}
            </p>
            <p className="text-xs text-gray-500 mt-1">
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
            Score: {server.health_score}/100
          </Badge>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="p-3 bg-[#1a2332] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className={`w-4 h-4 ${getLoadColor(cpuLoad)}`} />
            <span className="text-xs text-gray-400">CPU Load</span>
          </div>
          <div className="flex items-end gap-2">
            <p className={`text-2xl font-bold ${getLoadColor(cpuLoad)}`}>
              {cpuLoad.toFixed(0)}
            </p>
            <span className="text-xs text-gray-400 mb-1">%</span>
          </div>
          <div className="w-full h-1.5 bg-[#0f1419] rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full ${getLoadBg(cpuLoad)} transition-all duration-500`}
              style={{ width: `${cpuLoad}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-[#1a2332] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-gray-400">Active Peers</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-cyan-400">
              {server.capacity?.current_peers || 0}
            </p>
            <span className="text-xs text-gray-400 mb-1">
              / {server.capacity?.max_peers || 1000}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0f1419] rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-cyan-500 transition-all duration-500"
              style={{ width: `${peerLoad}%` }}
            />
          </div>
        </div>

        <div className="p-3 bg-[#1a2332] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Latency</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-purple-400">
              {server.performance?.avg_latency_ms || 0}
            </p>
            <span className="text-xs text-gray-400 mb-1">ms</span>
          </div>
        </div>

        <div className="p-3 bg-[#1a2332] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Uptime</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold text-green-400">
              {server.performance?.uptime_percentage?.toFixed(1) || 99.9}
            </p>
            <span className="text-xs text-gray-400 mb-1">%</span>
          </div>
        </div>
      </div>

      {/* Bandwidth */}
      <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-purple-300 text-sm">Bandwidth Capacity</span>
          <span className="text-purple-400 font-bold">
            {server.capacity?.bandwidth_mbps || 0} Mbps
          </span>
        </div>
      </div>
    </div>
  );
}