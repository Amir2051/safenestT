import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Wifi, Shield, Globe, Activity, Zap, AlertTriangle, 
  Lock, CheckCircle, Loader2, Info
} from "lucide-react";
import { toast } from "sonner";

export default function WebVPN() {
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [connectionTime, setConnectionTime] = useState(0);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Check connection status
  const { data: statusData, isLoading } = useQuery({
    queryKey: ['web-proxy-status'],
    queryFn: async () => {
      const response = await base44.functions.invoke('webProxyService', {
        endpoint: 'get-status'
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 3000
  });

  useEffect(() => {
    if (statusData) {
      setIsConnected(statusData.active);
      if (statusData.sessions && statusData.sessions.length > 0) {
        setSessionId(statusData.sessions[0].session_id);
        setConnectionTime(statusData.sessions[0].duration);
      }
    }
  }, [statusData]);

  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('webProxyService', {
        endpoint: 'start-session',
        device_id: 'web-browser',
        server_id: 'web-proxy-1'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setIsConnected(true);
      setSessionId(data.session_id);
      queryClient.invalidateQueries({ queryKey: ['web-proxy-status'] });
      queryClient.invalidateQueries({ queryKey: ['vpn-devices'] });
      toast.success('🔒 Web Proxy Connected', {
        description: 'Your browser traffic is now routed through SafeNest'
      });
    },
    onError: (error) => {
      toast.error('Failed to connect: ' + error.message);
    }
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('webProxyService', {
        endpoint: 'stop-session',
        session_id: sessionId
      });
      return response.data;
    },
    onSuccess: () => {
      setIsConnected(false);
      setSessionId(null);
      setConnectionTime(0);
      queryClient.invalidateQueries({ queryKey: ['web-proxy-status'] });
      queryClient.invalidateQueries({ queryKey: ['vpn-devices'] });
      toast.success('Proxy Disconnected');
    },
    onError: (error) => {
      toast.error('Failed to disconnect: ' + error.message);
    }
  });

  const handleToggle = () => {
    if (isConnected) {
      stopMutation.mutate();
    } else {
      startMutation.mutate();
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Globe className="w-8 h-8 text-cyan-400" />
          SafeNest Web VPN
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
            BETA
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Browser-based privacy protection for your web traffic
        </p>
      </div>

      {/* Main Control Card */}
      <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] transition-all ${
        isConnected 
          ? 'border-green-500/50 shadow-lg shadow-green-500/20' 
          : 'border-cyan-500/20'
      }`}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 relative transition-all ${
              isConnected
                ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-xl shadow-green-500/50'
                : 'bg-gradient-to-br from-gray-600 to-gray-700'
            }`}>
              {isConnected ? (
                <>
                  <Shield className="w-16 h-16 text-white" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-4 border-[#0f1419] animate-pulse" />
                </>
              ) : (
                <Shield className="w-16 h-16 text-gray-400" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              {isConnected ? 'Protected' : 'Not Protected'}
            </h2>
            <p className="text-gray-400 mb-6">
              {isConnected 
                ? 'Your browser traffic is secured through SafeNest' 
                : 'Click to start protecting your web browsing'
              }
            </p>

            {/* Toggle Switch */}
            <div className="flex items-center gap-4 mb-4">
              <span className={`text-sm font-semibold ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                {isConnected ? 'ON' : 'OFF'}
              </span>
              <Switch
                checked={isConnected}
                onCheckedChange={handleToggle}
                disabled={startMutation.isPending || stopMutation.isPending}
                className="scale-150"
              />
            </div>

            {(startMutation.isPending || stopMutation.isPending) && (
              <div className="flex items-center gap-2 text-cyan-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">
                  {isConnected ? 'Disconnecting...' : 'Connecting...'}
                </span>
              </div>
            )}
          </div>

          {/* Connection Stats */}
          {isConnected && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#0f1419] rounded-lg text-center">
                <Activity className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-400">
                  {formatTime(connectionTime)}
                </p>
                <p className="text-xs text-gray-400">Connected</p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg text-center">
                <Lock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-400">AES-256</p>
                <p className="text-xs text-gray-400">Encryption</p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg text-center">
                <Globe className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-cyan-400">Secure</p>
                <p className="text-xs text-gray-400">Connection</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
              What's Protected
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-300">Browser web traffic (HTTP/HTTPS)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-300">IP masking protected</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span className="text-gray-300">HTTPS encryption maintained</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Browser-only (not system-wide like native VPN)
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                Doesn't protect other apps on your device
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span className="text-gray-300">
                No system VPN icon in status bar
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}