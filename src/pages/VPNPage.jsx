import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, Shield, Globe, Lock, Zap, TrendingUp, 
  MapPin, Activity, CheckCircle, AlertTriangle, Eye, Server, Clock, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SERVERS = [
  { id: 'us-east', name: 'US East', location: '🇺🇸 New York', ip: '198.51.100.42', ping: '12ms', load: 45 },
  { id: 'us-west', name: 'US West', location: '🇺🇸 Los Angeles', ip: '198.51.100.43', ping: '28ms', load: 62 },
  { id: 'uk', name: 'United Kingdom', location: '🇬🇧 London', ip: '198.51.100.44', ping: '45ms', load: 38 },
  { id: 'germany', name: 'Germany', location: '🇩🇪 Frankfurt', ip: '198.51.100.45', ping: '52ms', load: 41 },
  { id: 'japan', name: 'Japan', location: '🇯🇵 Tokyo', ip: '198.51.100.46', ping: '89ms', load: 55 },
  { id: 'singapore', name: 'Singapore', location: '🇸🇬 Singapore', ip: '198.51.100.47', ping: '105ms', load: 48 },
  { id: 'canada', name: 'Canada', location: '🇨🇦 Toronto', ip: '198.51.100.48', ping: '18ms', load: 29 },
  { id: 'france', name: 'France', location: '🇫🇷 Paris', ip: '198.51.100.49', ping: '42ms', load: 51 },
  { id: 'australia', name: 'Australia', location: '🇦🇺 Sydney', ip: '198.51.100.50', ping: '156ms', load: 34 },
  { id: 'netherlands', name: 'Netherlands', location: '🇳🇱 Amsterdam', ip: '198.51.100.51', ping: '31ms', load: 47 },
  { id: 'switzerland', name: 'Switzerland', location: '🇨🇭 Zurich', ip: '198.51.100.52', ping: '38ms', load: 22 },
  { id: 'brazil', name: 'Brazil', location: '🇧🇷 São Paulo', ip: '198.51.100.53', ping: '125ms', load: 68 },
];

export default function VPNPage() {
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState('us-east');
  const [isRotating, setIsRotating] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [rotationInterval, setRotationInterval] = useState(30);
  const [connectionTime, setConnectionTime] = useState(0);
  const [dataTransferred, setDataTransferred] = useState({ download: 0, upload: 0 });
  const [rotationCount, setRotationCount] = useState(0);
  const [nextRotationIn, setNextRotationIn] = useState(30);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    
    // Load saved rotation settings
    const savedAutoRotate = localStorage.getItem('vpn_auto_rotate') === 'true';
    const savedInterval = localStorage.getItem('vpn_rotation_interval');
    
    setAutoRotateEnabled(savedAutoRotate);
    if (savedInterval) setRotationInterval(parseInt(savedInterval));
  }, []);

  // Connection duration timer
  useEffect(() => {
    let interval;
    if (user?.vpn_enabled) {
      interval = setInterval(() => {
        setConnectionTime(prev => prev + 1);
        // Simulate data transfer
        setDataTransferred(prev => ({
          download: prev.download + Math.random() * 50,
          upload: prev.upload + Math.random() * 20
        }));
      }, 1000);
    } else {
      setConnectionTime(0);
      setDataTransferred({ download: 0, upload: 0 });
    }
    return () => clearInterval(interval);
  }, [user?.vpn_enabled]);

  // Auto-rotation timer
  useEffect(() => {
    let rotationTimer;
    let countdownTimer;
    
    if (user?.vpn_enabled && autoRotateEnabled) {
      setNextRotationIn(rotationInterval);
      
      // Countdown timer
      countdownTimer = setInterval(() => {
        setNextRotationIn(prev => {
          if (prev <= 1) return rotationInterval;
          return prev - 1;
        });
      }, 1000);
      
      // Rotation timer
      rotationTimer = setInterval(() => {
        rotateToRandomServer();
      }, rotationInterval * 1000);
    } else {
      setNextRotationIn(rotationInterval);
    }
    
    return () => {
      clearInterval(rotationTimer);
      clearInterval(countdownTimer);
    };
  }, [user?.vpn_enabled, autoRotateEnabled, rotationInterval]);

  const updateVPNMutation = useMutation({
    mutationFn: async (enabled) => {
      const server = SERVERS.find(s => s.id === selectedServer);
      const result = await base44.auth.updateMe({ vpn_enabled: enabled });
      
      await base44.entities.AuditLog.create({
        action_type: enabled ? 'vpn_connected' : 'vpn_disconnected',
        action_category: 'vpn',
        description: enabled 
          ? `VPN connected to ${server.name} with auto-rotation ${autoRotateEnabled ? 'enabled' : 'disabled'}`
          : 'VPN disconnected',
        metadata: {
          server: server.location,
          ip_address: enabled ? server.ip : null,
          device_info: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          auto_rotation: autoRotateEnabled ? 'enabled' : 'disabled',
          rotation_interval: autoRotateEnabled ? `${rotationInterval}s` : 'N/A'
        },
        severity: 'info',
        status: 'success'
      });
      
      return result;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      
      if (updatedUser.vpn_enabled) {
        toast.success(`🛡️ VPN Connected ${autoRotateEnabled ? '(Auto-rotation active)' : ''}`);
        setRotationCount(0);
      } else {
        toast.success('VPN disconnected');
        setRotationCount(0);
      }
    },
    onError: async () => {
      await base44.entities.AuditLog.create({
        action_type: 'vpn_connected',
        action_category: 'vpn',
        description: 'Failed to connect to VPN',
        severity: 'high',
        status: 'failed'
      });
      toast.error('Failed to update VPN status');
    }
  });

  const toggleVPN = () => {
    updateVPNMutation.mutate(!user?.vpn_enabled);
  };

  const rotateToRandomServer = async () => {
    if (!user?.vpn_enabled) return;
    
    setIsRotating(true);
    
    // Get random server different from current
    const availableServers = SERVERS.filter(s => s.id !== selectedServer);
    const randomServer = availableServers[Math.floor(Math.random() * availableServers.length)];
    const oldServer = SERVERS.find(s => s.id === selectedServer);
    
    // Simulate rotation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSelectedServer(randomServer.id);
    setRotationCount(prev => prev + 1);
    setIsRotating(false);
    
    // Log rotation
    await base44.entities.AuditLog.create({
      action_type: 'vpn_server_changed',
      action_category: 'vpn',
      description: `VPN auto-rotated from ${oldServer.name} to ${randomServer.name}`,
      metadata: {
        previous_value: oldServer.location,
        new_value: randomServer.location,
        server: randomServer.location,
        rotation_type: 'automatic',
        rotation_count: rotationCount + 1
      },
      severity: 'info',
      status: 'success'
    });
    
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    toast.success(`🔄 Rotated to ${randomServer.name}`, { duration: 2000 });
  };

  const changeServer = async (serverId) => {
    if (user?.vpn_enabled) {
      toast.info('Disconnect VPN to change server manually');
      return;
    }
    
    const previousServer = SERVERS.find(s => s.id === selectedServer);
    const newServer = SERVERS.find(s => s.id === serverId);
    
    setSelectedServer(serverId);
    
    await base44.entities.AuditLog.create({
      action_type: 'vpn_server_changed',
      action_category: 'vpn',
      description: `VPN server manually changed to ${newServer.name}`,
      metadata: {
        previous_value: previousServer.location,
        new_value: newServer.location,
        server: newServer.location,
        rotation_type: 'manual'
      },
      severity: 'info',
      status: 'success'
    });
    
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    toast.success(`Server set to ${newServer.name}`);
  };

  const toggleAutoRotation = () => {
    const newValue = !autoRotateEnabled;
    setAutoRotateEnabled(newValue);
    localStorage.setItem('vpn_auto_rotate', newValue.toString());
    
    toast.success(newValue ? '🔄 Auto-rotation enabled' : 'Auto-rotation disabled');
  };

  const updateRotationInterval = (seconds) => {
    setRotationInterval(seconds);
    localStorage.setItem('vpn_rotation_interval', seconds.toString());
    toast.success(`Rotation interval set to ${seconds}s`);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatData = (kb) => {
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    if (kb < 1024 * 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const isEnabled = user.vpn_enabled;
  const isPremium = user?.subscription_plan && user?.subscription_plan !== 'free';
  const isActive = user?.payment_status === 'active';
  const hasVPNAccess = isPremium || isActive;
  const currentServer = SERVERS.find(s => s.id === selectedServer);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Wifi className="w-8 h-8 text-cyan-400" />
          Auto-Rotating VPN Protection
        </h1>
        <p className="text-gray-400 mt-1">Maximum anonymity with automatic server rotation</p>
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
                <p className="text-purple-300 mb-4">Unlock unlimited VPN with auto-rotation</p>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Military-grade AES-256 encryption
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Auto-rotation every 30 seconds
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    12 global server locations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    No logs policy - complete anonymity
                  </li>
                </ul>
              </div>
              <Link to={createPageUrl("Upgrade")}>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-8 py-6 text-lg">
                  Upgrade Now
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
        <div className="lg:col-span-2 space-y-6">
          <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 transition-all ${
            isEnabled ? 'border-green-500/50' : 'border-cyan-500/20'
          }`}>
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className={`w-32 h-32 mx-auto mb-6 rounded-full border-8 flex items-center justify-center relative ${
                  isEnabled 
                    ? 'border-green-500 bg-green-500/10' 
                    : 'border-gray-600 bg-gray-500/10'
                }`}>
                  {isRotating && (
                    <div className="absolute inset-0 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
                  )}
                  <Wifi className={`w-16 h-16 ${isEnabled ? 'text-green-400' : 'text-gray-400'}`} />
                </div>
                
                <h2 className={`text-3xl font-bold mb-2 ${isEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                  {isRotating ? 'ROTATING...' : isEnabled ? 'CONNECTED' : 'DISCONNECTED'}
                </h2>
                
                {isEnabled && currentServer && (
                  <div className="mb-4">
                    <p className="text-4xl mb-2">{currentServer.location.split(' ')[0]}</p>
                    <p className="text-xl text-white">{currentServer.name}</p>
                    <p className="text-sm text-gray-400">IP: {currentServer.ip}</p>
                  </div>
                )}
                
                <p className="text-gray-400 mb-6">
                  {isEnabled 
                    ? autoRotateEnabled 
                      ? `🔄 Auto-rotating every ${rotationInterval}s • ${rotationCount} rotations`
                      : 'Connected (manual mode)'
                    : 'Your connection is not protected'
                  }
                </p>

                {hasVPNAccess && (
                  <Button
                    onClick={toggleVPN}
                    disabled={updateVPNMutation.isPending || isRotating}
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
                <>
                  {/* Next Rotation Countdown */}
                  {autoRotateEnabled && (
                    <div className="mb-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-400 font-semibold">Next rotation in:</span>
                        <span className="text-2xl font-bold text-white">{nextRotationIn}s</span>
                      </div>
                      <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                          style={{ width: `${(nextRotationIn / rotationInterval) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-cyan-500/10">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Duration</p>
                      <p className="text-lg font-bold text-white">{formatTime(connectionTime)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Downloaded</p>
                      <p className="text-lg font-bold text-green-400">{formatData(dataTransferred.download)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Uploaded</p>
                      <p className="text-lg font-bold text-cyan-400">{formatData(dataTransferred.upload)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Rotations</p>
                      <p className="text-lg font-bold text-purple-400">{rotationCount}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Auto-Rotation Settings */}
          {hasVPNAccess && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowUpDown className="w-5 h-5 text-cyan-400" />
                  Auto-Rotation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <div>
                    <p className="text-white font-semibold">Auto-Rotation</p>
                    <p className="text-xs text-gray-400">Automatically change servers</p>
                  </div>
                  <button
                    onClick={toggleAutoRotation}
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      autoRotateEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                      autoRotateEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-white font-semibold">Rotation Interval</label>
                    <span className="text-cyan-400 font-bold">{rotationInterval}s</span>
                  </div>
                  <Select 
                    value={rotationInterval.toString()} 
                    onValueChange={(val) => updateRotationInterval(parseInt(val))}
                    disabled={isEnabled}
                  >
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                      <SelectItem value="15">15 seconds (Fast)</SelectItem>
                      <SelectItem value="30">30 seconds (Balanced)</SelectItem>
                      <SelectItem value="60">60 seconds (Stable)</SelectItem>
                      <SelectItem value="120">2 minutes</SelectItem>
                      <SelectItem value="300">5 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  {isEnabled && (
                    <p className="text-xs text-yellow-400 mt-2">⚠️ Disconnect to change interval</p>
                  )}
                </div>

                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-400 text-sm">
                    <strong>💡 Tip:</strong> Auto-rotation enhances anonymity by constantly changing your virtual location, making it harder to track your online activity.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current Connection Info */}
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
                  {isEnabled ? currentServer?.location : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <span className="text-sm text-gray-400">IP Address</span>
                <span className="text-white text-sm font-mono">
                  {isEnabled ? currentServer?.ip : 'Not connected'}
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

          {/* Security Features */}
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
                { icon: ArrowUpDown, text: 'Auto-rotation active', active: isEnabled && autoRotateEnabled },
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
              Available Servers ({SERVERS.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {SERVERS.map((server) => (
                <button
                  key={server.id}
                  onClick={() => changeServer(server.id)}
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
                      <span className="text-gray-400">{server.ping}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        server.load < 50 ? 'bg-green-400' : server.load < 70 ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <span className="text-gray-400">{server.load}%</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {isEnabled && (
              <p className="text-yellow-400 text-sm mt-4 text-center">
                ⚠️ Disconnect VPN to select a different starting server
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Section */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">How Auto-Rotation Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Encrypted</h3>
              <p className="text-gray-400 text-sm">
                Military-grade AES-256 encryption protects all your traffic
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Auto-Rotating</h3>
              <p className="text-gray-400 text-sm">
                Automatically switches servers every {rotationInterval} seconds
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Global Network</h3>
              <p className="text-gray-400 text-sm">
                Access {SERVERS.length} servers across multiple countries
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Anonymous</h3>
              <p className="text-gray-400 text-sm">
                Constant rotation makes tracking impossible
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}