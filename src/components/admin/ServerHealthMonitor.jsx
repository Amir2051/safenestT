import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, TrendingUp, TrendingDown, Zap } from "lucide-react";

export default function ServerHealthMonitor({ servers, onHealthCheck, isChecking }) {
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthBg = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const avgHealth = servers.length > 0
    ? servers.reduce((sum, s) => sum + (s.health_score || 0), 0) / servers.length
    : 100;

  const healthyServers = servers.filter(s => (s.health_score || 0) >= 80).length;
  const degradedServers = servers.filter(s => (s.health_score || 0) < 80 && (s.health_score || 0) >= 40).length;
  const criticalServers = servers.filter(s => (s.health_score || 0) < 40).length;

  return (
    <div className="space-y-6">
      {/* Overall Health */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Infrastructure Health
            </CardTitle>
            <Button
              onClick={onHealthCheck}
              disabled={isChecking}
              size="sm"
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Health Check
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-[#0f1419] rounded-lg text-center">
              <p className={`text-4xl font-bold ${getHealthColor(avgHealth)}`}>
                {avgHealth.toFixed(0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Avg Health Score</p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <p className="text-4xl font-bold text-green-400">{healthyServers}</p>
              <p className="text-xs text-gray-400 mt-1">Healthy</p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg text-center">
              <p className="text-4xl font-bold text-yellow-400">{degradedServers}</p>
              <p className="text-xs text-gray-400 mt-1">Degraded</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg text-center">
              <p className="text-4xl font-bold text-red-400">{criticalServers}</p>
              <p className="text-xs text-gray-400 mt-1">Critical</p>
            </div>
          </div>

          <div className="w-full h-3 bg-[#0f1419] rounded-full overflow-hidden">
            <div 
              className={`h-full ${getHealthBg(avgHealth)} transition-all duration-500`}
              style={{ width: `${avgHealth}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Individual Server Health */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Server Health Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {servers.map((server) => {
              const health = server.health_score || 0;
              const cpuLoad = server.capacity?.cpu_usage || 0;
              const memoryLoad = server.capacity?.memory_usage || 0;
              const peerLoad = ((server.capacity?.current_peers || 0) / (server.capacity?.max_peers || 1000)) * 100;

              return (
                <div
                  key={server.id}
                  className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{server.location?.flag || '🌐'}</div>
                      <div>
                        <h4 className="text-white font-bold">{server.server_name}</h4>
                        <p className="text-xs text-gray-400">
                          {server.location?.city}, {server.location?.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${getHealthColor(health)}`}>
                        {health.toFixed(0)}
                      </p>
                      <p className="text-xs text-gray-400">Health Score</p>
                    </div>
                  </div>

                  {/* Health Bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">CPU Usage</span>
                        <span className="text-xs text-cyan-400 font-semibold">
                          {cpuLoad.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#1a2332] rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            cpuLoad < 50 ? 'bg-green-500' : 
                            cpuLoad < 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${cpuLoad}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Memory Usage</span>
                        <span className="text-xs text-purple-400 font-semibold">
                          {memoryLoad.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#1a2332] rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            memoryLoad < 50 ? 'bg-green-500' : 
                            memoryLoad < 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${memoryLoad}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Peer Capacity</span>
                        <span className="text-xs text-blue-400 font-semibold">
                          {server.capacity?.current_peers || 0} / {server.capacity?.max_peers || 1000}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#1a2332] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${peerLoad}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="p-2 bg-[#1a2332] rounded text-center">
                      <p className="text-yellow-400 font-bold text-sm">
                        {server.performance?.avg_latency_ms?.toFixed(0) || 0}ms
                      </p>
                      <p className="text-xs text-gray-400">Latency</p>
                    </div>
                    <div className="p-2 bg-[#1a2332] rounded text-center">
                      <p className="text-green-400 font-bold text-sm">
                        {server.performance?.uptime_percentage?.toFixed(1) || 99.9}%
                      </p>
                      <p className="text-xs text-gray-400">Uptime</p>
                    </div>
                    <div className="p-2 bg-[#1a2332] rounded text-center">
                      <p className="text-orange-400 font-bold text-sm">
                        {server.performance?.packet_loss?.toFixed(2) || 0}%
                      </p>
                      <p className="text-xs text-gray-400">Loss</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Health Check Info */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-white font-semibold text-sm mb-1">
                Automated Health Monitoring
              </p>
              <p className="text-gray-400 text-xs">
                Server health is automatically updated every 5 seconds. Run manual checks to get instant status updates for all servers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}