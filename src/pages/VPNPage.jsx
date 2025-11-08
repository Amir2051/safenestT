
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, Shield, Globe, Lock, Zap, TrendingUp, 
  MapPin, Activity, CheckCircle, AlertTriangle, Eye, Server
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VPNPage() {
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState('us-east');
  
  const queryClient = useQueryClient();

  // Define servers here so it's accessible within mutationFn and changeServer
  const servers = [
    { id: 'us-east', name: 'US East', location: '🇺🇸 New York', ping: '12ms', load: 45 },
    { id: 'us-west', name: 'US West', location: '🇺🇸 Los Angeles', ping: '28ms', load: 62 },
    { id: 'uk', name: 'United Kingdom', location: '🇬🇧 London', ping: '45ms', load: 38 },
    { id: 'germany', name: 'Germany', location: '🇩🇪 Frankfurt', ping: '52ms', load: 41 },
    { id: 'japan', name: 'Japan', location: '🇯🇵 Tokyo', ping: '89ms', load: 55 },
    { id: 'singapore', name: 'Singapore', location: '🇸🇬 Singapore', ping: '105ms', load: 48 }
  ];

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const updateVPNMutation = useMutation({
    mutationFn: async (enabled) => {
      const result = await base44.auth.updateMe({ vpn_enabled: enabled });
      
      // Log the VPN action
      await base44.entities.AuditLog.create({
        action_type: enabled ? 'vpn_connected' : 'vpn_disconnected',
        action_category: 'vpn',
        description: enabled 
          ? `VPN connected to ${servers.find(s => s.id === selectedServer)?.name || 'server'}`
          : 'VPN disconnected',
        metadata: {
          server_location: servers.find(s => s.id === selectedServer)?.location,
          server_id: selectedServer,
          ip_address: enabled ? '198.51.100.42' : null,
          device_info: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
        },
        severity: 'info',
        status: 'success'
      });
      
      return result;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] }); // Invalidate audit logs on success
      toast.success(updatedUser.vpn_enabled ? 'VPN connected successfully! 🛡️' : 'VPN disconnected');
    },
    onError: async (error) => {
      // Log failed attempt
      console.error("Failed to update VPN status:", error);
      await base44.entities.AuditLog.create({
        action_type: 'vpn_connected',
        action_category: 'vpn',
        description: 'Failed to connect to VPN',
        metadata: {
          error_message: error.message || 'Unknown error',
          server_id: selectedServer,
          device_info: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
        },
        severity: 'high',
        status: 'failed'
      });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] }); // Invalidate audit logs on error as well
      toast.error('Failed to update VPN status');
    }
  });

  const toggleVPN = () => {
    updateVPNMutation.mutate(!user?.vpn_enabled);
  };

  const changeServer = async (serverId) => {
    if (isEnabled) {
      toast.info('Please disconnect VPN before changing server location.');
      return;
    }
    const previousServer = servers.find(s => s.id === selectedServer);
    const newServer = servers.find(s => s.id === serverId);
    
    setSelectedServer(serverId);
    
    // Log server change
    await base44.entities.AuditLog.create({
      action_type: 'vpn_server_changed',
      action_category: 'vpn',
      description: `VPN server changed to ${newServer?.name || 'an unknown server'}`,
      metadata: {
        previous_value: previousServer?.location || 'Unknown',
        new_value: newServer?.location || 'Unknown',
        previous_server_id: previousServer?.id || 'Unknown',
        new_server_id: newServer?.id || 'Unknown',
        device_info: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
      },
      severity: 'info',
      status: 'success'
    });
    
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    toast.success(`Server changed to ${newServer?.name}`);
  };


  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const isEnabled = user.vpn_enabled;
  const isPremium = user?.subscription_plan && 
                   user?.subscription_plan !== 'free' && 
                   user?.subscription_plan !== null;
  const isActive = user?.payment_status === 'active';
  const hasVPNAccess = isPremium || isActive;

  const connectionStats = {
    dataTransferred: isEnabled ? '2.4 GB' : '0 GB',
    uptime: isEnabled ? '3h 42m' : '0m',
    downloadSpeed: isEnabled ? '245 Mbps' : '0 Mbps',
    uploadSpeed: isEnabled ? '89 Mbps' : '0 Mbps'
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Wifi className="w-8 h-8 text-cyan-400" />
          VPN Protection
        </h1>
        <p className="text-gray-400 mt-1">Secure your internet connection with military-grade encryption</p>
      </div>

      {/* Premium Gate */}
      {!hasVPNAccess && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  🔒 VPN Protection - Premium Feature
                </h2>
                <p className="text-purple-300 mb-4">Unlock unlimited VPN access with premium subscription</p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Military-grade AES-256 encryption
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Access to 6+ global server locations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    No logs policy - complete anonymity
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Unlimited bandwidth and speed
                  </li>
                </ul>
              </div>
              <Link to={createPageUrl("Upgrade")}>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-6 text-lg">
                  Upgrade to Premium
                  <Zap className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main VPN Control */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Status */}
        <div className="lg:col-span-2">
          <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 transition-all ${
            isEnabled ? 'border-green-500/50' : 'border-cyan-500/20'
          }`}>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className={`w-32 h-32 mx-auto mb-6 rounded-full border-8 flex items-center justify-center ${
                  isEnabled 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-600 bg-gray-500/10'
                }`}>
                  <Wifi className={`w-16 h-16 ${isEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                
                <h2 className={`text-3xl font-bold mb-2 ${isEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                  {isEnabled ? 'CONNECTED' : 'DISCONNECTED'}
                </h2>
                <p className="text-gray-400 mb-6">
                  {isEnabled ? 'Your connection is secure and encrypted' : 'Your connection is not protected'}
                </p>

                {hasVPNAccess && (
                  <Button
                    onClick={toggleVPN}
                    disabled={updateVPNMutation.isPending}
                    size="lg"
                    className={`px-8 py-6 text-lg ${
                      isEnabled
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                    }`}
                  >
                    {updateVPNMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        {isEnabled ? 'Disconnecting...' : 'Connecting...'}
                      </>
                    ) : (
                      <>
                        {isEnabled ? 'Disconnect VPN' : 'Connect VPN'}
                        <Wifi className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {isEnabled && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-cyan-500/10">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Data Transferred</p>
                    <p className="text-lg font-bold text-white">{connectionStats.dataTransferred}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Connected</p>
                    <p className="text-lg font-bold text-white">{connectionStats.uptime}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Download</p>
                    <p className="text-lg font-bold text-green-400">{connectionStats.downloadSpeed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Upload</p>
                    <p className="text-lg font-bold text-cyan-400">{connectionStats.uploadSpeed}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Current Connection Info */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                Connection Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <span className="text-sm text-gray-400">Status</span>
                <Badge className={isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                  {isEnabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <span className="text-sm text-gray-400">Server</span>
                <span className="text-white text-sm font-semibold">
                  {isEnabled ? servers.find(s => s.id === selectedServer)?.location : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <span className="text-sm text-gray-400">IP Address</span>
                <span className="text-white text-sm font-mono">
                  {isEnabled ? '198.51.100.42' : 'Not connected'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <span className="text-sm text-gray-400">Protocol</span>
                <span className="text-green-400 text-sm font-semibold">
                  {isEnabled ? 'OpenVPN' : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <span className="text-sm text-gray-400">Encryption</span>
                <span className="text-green-400 text-sm font-semibold">
                  {isEnabled ? 'AES-256' : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" />
                Security Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Shield, text: 'Military-grade encryption', active: isEnabled },
                { icon: Eye, text: 'No-logs policy', active: isEnabled },
                { icon: Globe, text: 'Anonymous browsing', active: isEnabled },
                { icon: Lock, text: 'Kill switch protection', active: isEnabled }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2">
                  <feature.icon className={`w-4 h-4 ${feature.active ? 'text-green-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${feature.active ? 'text-gray-300' : 'text-gray-500'}`}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Server List */}
      {hasVPNAccess && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Available Servers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servers.map((server) => (
                <button
                  key={server.id}
                  onClick={() => changeServer(server.id)} // Changed onClick handler
                  disabled={isEnabled}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedServer === server.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  } ${isEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{server.name}</h3>
                      <p className="text-sm text-gray-400">{server.location}</p>
                    </div>
                    {selectedServer === server.id && (
                      <CheckCircle className="w-5 h-5 text-cyan-400" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Activity className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-400">Ping: {server.ping}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        server.load < 50 ? 'bg-green-400' : server.load < 70 ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <span className="text-gray-400">{server.load}% load</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {isEnabled && (
              <p className="text-yellow-400 text-sm mt-4 text-center">
                ⚠️ Disconnect VPN to change server location
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Why Use VPN?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Enhanced Privacy</h3>
              <p className="text-gray-400 text-sm">
                Hide your IP address and browsing activity from ISPs and trackers
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Secure Public WiFi</h3>
              <p className="text-gray-400 text-sm">
                Protect your data on public networks with military-grade encryption
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Access Anywhere</h3>
              <p className="text-gray-400 text-sm">
                Bypass geo-restrictions and access content from anywhere in the world
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
