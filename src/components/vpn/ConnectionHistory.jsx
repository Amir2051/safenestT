import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Loader2, Activity, TrendingUp, TrendingDown } from "lucide-react";

export default function ConnectionHistory({ userEmail }) {
  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['vpn-connections', userEmail],
    queryFn: async () => {
      const conns = await base44.entities.VPNConnection.filter({
        user_email: userEmail
      }, '-created_date', 50);
      return conns;
    },
    enabled: !!userEmail
  });

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          Connection History ({connections.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-semibold mb-2">No connections yet</p>
            <p className="text-gray-400 text-sm">
              Your connection history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map(conn => (
              <div
                key={conn.id}
                className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      conn.connection_status === 'connected'
                        ? 'bg-green-500/20'
                        : 'bg-gray-600/20'
                    }`}>
                      <Activity className={`w-5 h-5 ${
                        conn.connection_status === 'connected'
                          ? 'text-green-400'
                          : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        Session {conn.session_id?.substring(0, 8)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(conn.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={
                    conn.connection_status === 'connected'
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : conn.connection_status === 'disconnected'
                      ? 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                      : 'bg-red-500/20 text-red-400 border-red-500/50'
                  }>
                    {conn.connection_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2 bg-[#1a2332] rounded text-center">
                    <p className="text-gray-400">Duration</p>
                    <p className="text-white font-semibold">
                      {formatDuration(conn.duration_seconds)}
                    </p>
                  </div>
                  <div className="p-2 bg-[#1a2332] rounded text-center">
                    <p className="text-gray-400">Download</p>
                    <p className="text-green-400 font-semibold flex items-center justify-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {(conn.data_usage?.download_mb || 0).toFixed(1)} MB
                    </p>
                  </div>
                  <div className="p-2 bg-[#1a2332] rounded text-center">
                    <p className="text-gray-400">Upload</p>
                    <p className="text-cyan-400 font-semibold flex items-center justify-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {(conn.data_usage?.upload_mb || 0).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                {conn.disconnect_reason && (
                  <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                    <span className="text-yellow-400">
                      Ended: {conn.disconnect_reason.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}