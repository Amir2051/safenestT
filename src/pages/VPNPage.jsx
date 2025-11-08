
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wifi, Shield, Globe, Lock, Zap, TrendingUp, 
  MapPin, Activity, CheckCircle, AlertTriangle, Eye, Server, Clock, ArrowUpDown, Users, Signal, Gauge, Star, Award, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const INITIAL_SERVERS = [
  { id: 'us-east', name: 'US East', location: '🇺🇸 New York', ip: '198.51.100.42', basePing: 12, baseLoad: 45, baseUsers: 1247 },
  { id: 'us-west', name: 'US West', location: '🇺🇸 Los Angeles', ip: '198.51.100.43', basePing: 28, baseLoad: 62, baseUsers: 1842 },
  { id: 'uk', name: 'United Kingdom', location: '🇬🇧 London', ip: '198.51.100.44', basePing: 45, baseLoad: 38, baseUsers: 2156 },
  { id: 'germany', name: 'Germany', location: '🇩🇪 Frankfurt', ip: '198.51.100.45', basePing: 52, baseLoad: 41, baseUsers: 1923 },
  { id: 'japan', name: 'Japan', location: '🇯🇵 Tokyo', ip: '198.51.100.46', basePing: 89, baseLoad: 55, baseUsers: 1634 },
  { id: 'singapore', name: 'Singapore', location: '🇸🇬 Singapore', ip: '198.51.100.47', basePing: 105, baseLoad: 48, baseUsers: 1512 },
  { id: 'canada', name: 'Canada', location: '🇨🇦 Toronto', ip: '198.51.100.48', basePing: 18, baseLoad: 29, baseUsers: 987 },
  { id: 'france', name: 'France', location: '🇫🇷 Paris', ip: '198.51.100.49', basePing: 42, baseLoad: 51, baseUsers: 1765 },
  { id: 'australia', name: 'Australia', location: '🇦🇺 Sydney', ip: '198.51.100.50', basePing: 156, baseLoad: 34, baseUsers: 876 },
  { id: 'netherlands', name: 'Netherlands', location: '🇳🇱 Amsterdam', ip: '198.51.100.51', basePing: 31, baseLoad: 47, baseUsers: 1456 },
  { id: 'switzerland', name: 'Switzerland', location: '🇨🇭 Zurich', ip: '198.51.100.52', basePing: 38, baseLoad: 22, baseUsers: 1123 },
  { id: 'brazil', name: 'Brazil', location: '🇧🇷 São Paulo', ip: '198.51.100.53', basePing: 125, baseLoad: 68, baseUsers: 1398 },
  { id: 'india', name: 'India', location: '🇮🇳 Mumbai', ip: '198.51.100.54', basePing: 142, baseLoad: 73, baseUsers: 2341 },
  { id: 'south-korea', name: 'South Korea', location: '🇰🇷 Seoul', ip: '198.51.100.55', basePing: 95, baseLoad: 59, baseUsers: 1789 },
  { id: 'spain', name: 'Spain', location: '🇪🇸 Madrid', ip: '198.51.100.56', basePing: 48, baseLoad: 44, baseUsers: 1456 },
  { id: 'italy', name: 'Italy', location: '🇮🇹 Milan', ip: '198.51.100.57', basePing: 50, baseLoad: 52, baseUsers: 1298 },
  { id: 'sweden', name: 'Sweden', location: '🇸🇪 Stockholm', ip: '198.51.100.58', basePing: 35, baseLoad: 33, baseUsers: 892 },
  { id: 'norway', name: 'Norway', location: '🇳🇴 Oslo', ip: '198.51.100.59', basePing: 40, baseLoad: 28, baseUsers: 654 },
  { id: 'denmark', name: 'Denmark', location: '🇩🇰 Copenhagen', ip: '198.51.100.60', basePing: 37, baseLoad: 31, baseUsers: 723 },
  { id: 'belgium', name: 'Belgium', location: '🇧🇪 Brussels', ip: '198.51.100.61', basePing: 43, baseLoad: 46, baseUsers: 987 },
  { id: 'ireland', name: 'Ireland', location: '🇮🇪 Dublin', ip: '198.51.100.62', basePing: 41, baseLoad: 39, baseUsers: 1123 },
  { id: 'poland', name: 'Poland', location: '🇵🇱 Warsaw', ip: '198.51.100.63', basePing: 55, baseLoad: 57, baseUsers: 1456 },
  { id: 'austria', name: 'Austria', location: '🇦🇹 Vienna', ip: '198.51.100.64', basePing: 46, baseLoad: 42, baseUsers: 876 },
  { id: 'portugal', name: 'Portugal', location: '🇵🇹 Lisbon', ip: '198.51.100.65', basePing: 51, baseLoad: 49, baseUsers: 765 },
  { id: 'greece', name: 'Greece', location: '🇬🇷 Athens', ip: '198.51.100.66', basePing: 60, baseLoad: 54, baseUsers: 654 },
  { id: 'czech', name: 'Czech Republic', location: '🇨🇿 Prague', ip: '198.51.100.67', basePing: 49, baseLoad: 45, baseUsers: 934 },
  { id: 'romania', name: 'Romania', location: '🇷🇴 Bucharest', ip: '198.51.100.68', basePing: 58, baseLoad: 61, baseUsers: 1087 },
  { id: 'finland', name: 'Finland', location: '🇫🇮 Helsinki', ip: '198.51.100.69', basePing: 44, baseLoad: 36, baseUsers: 723 },
  { id: 'new-zealand', name: 'New Zealand', location: '🇳🇿 Auckland', ip: '198.51.100.70', basePing: 178, baseLoad: 41, baseUsers: 543 },
  { id: 'south-africa', name: 'South Africa', location: '🇿🇦 Johannesburg', ip: '198.51.100.71', basePing: 168, baseLoad: 65, baseUsers: 987 },
  { id: 'argentina', name: 'Argentina', location: '🇦🇷 Buenos Aires', ip: '198.51.100.72', basePing: 138, baseLoad: 58, baseUsers: 876 },
  { id: 'chile', name: 'Chile', location: '🇨🇱 Santiago', ip: '198.51.100.73', basePing: 145, baseLoad: 53, baseUsers: 765 },
  { id: 'mexico', name: 'Mexico', location: '🇲🇽 Mexico City', ip: '198.51.100.74', basePing: 68, baseLoad: 71, baseUsers: 1654 },
  { id: 'turkey', name: 'Turkey', location: '🇹🇷 Istanbul', ip: '198.51.100.75', basePing: 72, baseLoad: 67, baseUsers: 1876 },
  { id: 'uae', name: 'UAE', location: '🇦🇪 Dubai', ip: '198.51.100.76', basePing: 118, baseLoad: 63, baseUsers: 1234 },
  { id: 'israel', name: 'Israel', location: '🇮🇱 Tel Aviv', ip: '198.51.100.77', basePing: 85, baseLoad: 56, baseUsers: 987 },
  { id: 'hong-kong', name: 'Hong Kong', location: '🇭🇰 Hong Kong', ip: '198.51.100.78', basePing: 98, baseLoad: 69, baseUsers: 2156 },
  { id: 'taiwan', name: 'Taiwan', location: '🇹🇼 Taipei', ip: '198.51.100.79', basePing: 102, baseLoad: 64, baseUsers: 1543 },
  { id: 'thailand', name: 'Thailand', location: '🇹🇭 Bangkok', ip: '198.51.100.80', basePing: 128, baseLoad: 72, baseUsers: 1876 },
  { id: 'malaysia', name: 'Malaysia', location: '🇲🇾 Kuala Lumpur', ip: '198.51.100.81', basePing: 115, baseLoad: 66, baseUsers: 1456 },
  { id: 'indonesia', name: 'Indonesia', location: '🇮🇩 Jakarta', ip: '198.51.100.82', basePing: 135, baseLoad: 75, baseUsers: 1987 },
  { id: 'vietnam', name: 'Vietnam', location: '🇻🇳 Hanoi', ip: '198.51.100.83', basePing: 132, baseLoad: 70, baseUsers: 1654 },
  { id: 'philippines', name: 'Philippines', location: '🇵🇭 Manila', ip: '198.51.100.84', basePing: 140, baseLoad: 74, baseUsers: 1543 },
];

export default function VPNPage() {
  const [user, setUser] = useState(null);
  const [selectedServer, setSelectedServer] = useState('us-east');
  const [servers, setServers] = useState(INITIAL_SERVERS);
  const [isRotating, setIsRotating] = useState(false);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(false);
  const [rotationInterval, setRotationInterval] = useState(30);
  const [connectionTime, setConnectionTime] = useState(0);
  const [dataTransferred, setDataTransferred] = useState({ download: 0, upload: 0 });
  const [rotationCount, setRotationCount] = useState(0);
  const [nextRotationIn, setNextRotationIn] = useState(30);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  
  const rotationTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const dataUpdateTimerRef = useRef(null);
  
  const queryClient = useQueryClient();

  // Fetch active VPN sessions
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['vpn-sessions'],
    queryFn: () => base44.entities.VPNSession.filter({ status: 'active' }, '-created_date', 10),
    enabled: !!user,
    refetchInterval: 5000, // Update every 5 seconds
    initialData: [],
  });

  // Get current user's active session
  const currentUserSession = activeSessions.find(s => s.user_email === user?.email && s.status === 'active');

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      const savedAutoRotate = localStorage.getItem('vpn_auto_rotate') === 'true';
      const savedInterval = localStorage.getItem('vpn_rotation_interval');
      
      setAutoRotateEnabled(savedAutoRotate);
      if (savedInterval) setRotationInterval(parseInt(savedInterval));

      // Restore session state if there's an active session
      if (userData.vpn_enabled) {
        base44.entities.VPNSession.filter({ 
          user_email: userData.email, 
          status: 'active' 
        }, '-created_date', 1).then(sessions => {
          if (sessions && sessions.length > 0) {
            const session = sessions[0];
            setCurrentSessionId(session.session_id);
            setRotationCount(session.total_rotations || 0);
            setSelectedServer(session.current_server.id);
            
            const duration = Math.floor((new Date().getTime() - new Date(session.started_at).getTime()) / 1000);
            setConnectionTime(duration);
            setDataTransferred({
              download: session.data_transferred?.download_kb || 0,
              upload: session.data_transferred?.upload_kb || 0,
            });
          }
        });
      }
    }).catch(() => {});
  }, []);

  // Real-time server statistics update
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setServers(prevServers => prevServers.map(server => ({
        ...server,
        ping: server.basePing + Math.floor(Math.random() * 10 - 5),
        load: Math.max(10, Math.min(95, server.baseLoad + Math.floor(Math.random() * 10 - 5))),
        users: Math.max(100, server.baseUsers + Math.floor(Math.random() * 100 - 50)),
        bandwidth: (Math.random() * 800 + 200).toFixed(1),
        uptime: (99.9 - Math.random() * 0.2).toFixed(1)
      })));
    }, 3000);

    return () => clearInterval(updateInterval);
  }, []);

  // Connection duration timer
  useEffect(() => {
    let interval;
    if (user?.vpn_enabled) {
      interval = setInterval(() => {
        setConnectionTime(prev => prev + 1);
        setDataTransferred(prev => ({
          download: prev.download + Math.random() * 50,
          upload: prev.upload + Math.random() * 20
        }));
      }, 1000);
    } else {
      setConnectionTime(0);
      setDataTransferred({ download: 0, upload: 0 });
      setRotationCount(0);
    }
    return () => clearInterval(interval);
  }, [user?.vpn_enabled]);

  // Update session data in database periodically
  useEffect(() => {
    if (user?.vpn_enabled && currentSessionId) {
      dataUpdateTimerRef.current = setInterval(async () => {
        try {
          await base44.entities.VPNSession.update(currentSessionId, {
            duration_seconds: connectionTime,
            data_transferred: {
              download_kb: dataTransferred.download,
              upload_kb: dataTransferred.upload
            },
            total_rotations: rotationCount,
            current_server: {
              id: selectedServer,
              name: servers.find(s => s.id === selectedServer)?.name,
              location: servers.find(s => s.id === selectedServer)?.location,
              ip: servers.find(s => s.id === selectedServer)?.ip
            }
          });
          
          // Refresh session data
          queryClient.invalidateQueries({ queryKey: ['vpn-sessions'] });
        } catch (error) {
          console.error('Failed to update session:', error);
        }
      }, 10000); // Update every 10 seconds
    }

    return () => {
      if (dataUpdateTimerRef.current) {
        clearInterval(dataUpdateTimerRef.current);
      }
    };
  }, [user?.vpn_enabled, currentSessionId, connectionTime, dataTransferred, rotationCount, selectedServer, servers]);

  // FIXED: Auto-rotation with useRef to prevent stale closures
  useEffect(() => {
    console.log('🔄 Auto-rotation effect triggered', {
      vpnEnabled: user?.vpn_enabled,
      autoRotateEnabled,
      rotationInterval
    });

    if (rotationTimerRef.current) {
      console.log('🧹 Clearing existing rotation timer');
      clearInterval(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      console.log('🧹 Clearing existing countdown timer');
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (user?.vpn_enabled && autoRotateEnabled) {
      console.log(`🚀 Starting auto-rotation: every ${rotationInterval} seconds`);
      
      setNextRotationIn(rotationInterval);
      
      countdownTimerRef.current = setInterval(() => {
        setNextRotationIn(prev => {
          const next = prev - 1;
          if (next <= 0) return rotationInterval;
          return next;
        });
      }, 1000);
      
      rotationTimerRef.current = setInterval(() => {
        console.log('⏰ ROTATION TIMER FIRED!', new Date().toLocaleTimeString());
        rotateToRandomServer();
      }, rotationInterval * 1000);
      
      console.log(`✅ Timers started - Rotation every ${rotationInterval}s`);
    } else {
      console.log('⏹️ Auto-rotation not active');
      setNextRotationIn(rotationInterval);
    }

    return () => {
      console.log('🧹 Cleaning up rotation timers');
      if (rotationTimerRef.current) {
        clearInterval(rotationTimerRef.current);
        rotationTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [user?.vpn_enabled, autoRotateEnabled, rotationInterval]);

  // Calculate server performance score (lower is better)
  const calculateServerScore = (server) => {
    const load = server.load || server.baseLoad;
    const ping = server.ping || server.basePing;
    
    // Weighted score: load is more important than ping
    // Lower score = better performance
    const loadWeight = 0.7;
    const pingWeight = 0.3;
    
    return (load * loadWeight) + (ping * pingWeight);
  };

  // Get best server based on load and ping
  const getBestServer = () => {
    const scoredServers = servers.map(server => ({
      ...server,
      score: calculateServerScore(server)
    }));
    
    scoredServers.sort((a, b) => a.score - b.score);
    
    console.log('🎯 Best server selected:', scoredServers[0].name, 'Score:', scoredServers[0].score.toFixed(2));
    return scoredServers[0];
  };

  // Get smart random server (avoid overloaded servers)
  const getSmartRandomServer = () => {
    // Filter out current server and critically overloaded servers (>85% load)
    const availableServers = servers.filter(s => 
      s.id !== selectedServer && 
      (s.load || s.baseLoad) < 85
    );
    
    if (availableServers.length === 0) {
      console.log('⚠️ All servers overloaded, using any available server');
      // If all other servers are overloaded, rotate to a random one, even if slightly overloaded
      const fallbackServers = servers.filter(s => s.id !== selectedServer);
      if (fallbackServers.length === 0) return servers[0]; // Fallback if only one server exists
      return fallbackServers[Math.floor(Math.random() * fallbackServers.length)];
    }
    
    // Prioritize servers with lower load
    const scoredServers = availableServers.map(server => ({
      ...server,
      score: calculateServerScore(server)
    }));
    
    scoredServers.sort((a, b) => a.score - b.score);
    
    // Select from top 50% performers randomly
    const topHalf = scoredServers.slice(0, Math.max(1, Math.ceil(scoredServers.length / 2))); // Ensure at least one server
    const selected = topHalf[Math.floor(Math.random() * topHalf.length)];
    
    console.log('🎲 Smart random server:', selected.name, 'Load:', selected.load || selected.baseLoad);
    return selected;
  };

  // Get server status based on performance
  const getServerStatus = (server) => {
    const load = server.load || server.baseLoad;
    const ping = server.ping || server.basePing;
    
    if (load < 40 && ping < 50) {
      return { label: '⭐ Excellent', color: 'bg-green-500/20 text-green-400 border-green-500/50', priority: 1 };
    } else if (load < 60 && ping < 80) {
      return { label: '✓ Optimal', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', priority: 2 };
    } else if (load < 75) {
      return { label: '⚡ Moderate', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', priority: 3 };
    } else {
      return { label: '⚠️ Busy', color: 'bg-red-500/20 text-red-400 border-red-500/50', priority: 4 };
    }
  };

  const updateVPNMutation = useMutation({
    mutationFn: async (enabled) => {
      let serverToConnect = servers.find(s => s.id === selectedServer);
      
      if (enabled && !autoRotateEnabled) {
        const bestServer = getBestServer();
        setSelectedServer(bestServer.id);
        serverToConnect = bestServer;
        
        toast.success(`🎯 Auto-selected best server: ${bestServer.name}`, { duration: 3000 });
        console.log('✅ Intelligent server selection:', bestServer.name);
      } else if (!enabled && currentSessionId) {
         // Ensure currentServer is correctly identified for disconnection audit log
         const disconnectedServer = servers.find(s => s.id === selectedServer);
         serverToConnect = disconnectedServer;
      }
      
      const result = await base44.auth.updateMe({ vpn_enabled: enabled });
      
      // Create or end VPN session
      if (enabled) {
        const sessionId = `vpn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentSessionId(sessionId);
        
        await base44.entities.VPNSession.create({
          session_id: sessionId,
          user_email: user.email,
          status: 'active',
          current_server: {
            id: serverToConnect.id,
            name: serverToConnect.name,
            location: serverToConnect.location,
            ip: serverToConnect.ip
          },
          started_at: new Date().toISOString(),
          auto_rotation_enabled: autoRotateEnabled,
          rotation_interval: rotationInterval,
          total_rotations: 0,
          data_transferred: {
            download_kb: 0,
            upload_kb: 0
          },
          rotation_history: []
        });
      } else if (currentSessionId) {
        await base44.entities.VPNSession.update(currentSessionId, {
          status: 'disconnected',
          ended_at: new Date().toISOString(),
          duration_seconds: connectionTime,
          data_transferred: {
            download_kb: dataTransferred.download,
            upload_kb: dataTransferred.upload
          },
          total_rotations: rotationCount
        });
        setCurrentSessionId(null);
      }
      
      await base44.entities.AuditLog.create({
        action_type: enabled ? 'vpn_connected' : 'vpn_disconnected',
        action_category: 'vpn',
        description: enabled 
          ? `VPN connected to ${serverToConnect.name} (Auto-selected: ${!autoRotateEnabled}) with auto-rotation ${autoRotateEnabled ? 'enabled' : 'disabled'}`
          : `VPN disconnected after ${Math.floor(connectionTime / 60)} minutes`,
        metadata: {
          server: serverToConnect.location,
          ip_address: enabled ? serverToConnect.ip : null,
          device_info: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
          auto_rotation: autoRotateEnabled ? 'enabled' : 'disabled',
          rotation_interval: autoRotateEnabled ? `${rotationInterval}s` : 'N/A',
          server_load: enabled ? `${serverToConnect.load || serverToConnect.baseLoad}%` : null,
          server_ping: enabled ? `${serverToConnect.ping || serverToConnect.basePing}ms` : null,
          selection_method: enabled ? (autoRotateEnabled ? 'auto-rotation' : 'intelligent-load-balancing') : null,
          total_rotations: enabled ? 0 : rotationCount,
          data_transferred: enabled ? null : `↓${(dataTransferred.download / 1024).toFixed(2)}MB ↑${(dataTransferred.upload / 1024).toFixed(2)}MB`,
          session_id: currentSessionId || undefined
        },
        severity: 'info',
        status: 'success'
      });
      
      return result;
    },
    onSuccess: (updatedUser, enabled) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['vpn-sessions'] });
      
      if (updatedUser.vpn_enabled) {
        toast.success(`🛡️ VPN Connected ${autoRotateEnabled ? `(Auto-rotating every ${rotationInterval}s)` : '(Best server selected)'}`);
        setRotationCount(0); // Reset rotation count for new session
      } else {
        toast.success('VPN disconnected');
        setRotationCount(0); // Reset rotation count on disconnect
      }
    },
    onError: async (error) => {
      console.error("VPN mutation error:", error);
      await base44.entities.AuditLog.create({
        action_type: 'vpn_connection_failed',
        action_category: 'vpn',
        description: 'Failed to connect/disconnect VPN',
        severity: 'high',
        status: 'failed',
        metadata: {
          error_message: error.message,
          session_id: currentSessionId || undefined
        }
      });
      toast.error('Failed to update VPN status');
    }
  });

  const toggleVPN = () => {
    updateVPNMutation.mutate(!user?.vpn_enabled);
  };

  const rotateToRandomServer = async () => {
    console.log('🔄 rotateToRandomServer() called');
    
    if (!user?.vpn_enabled) {
      console.log('❌ VPN not enabled, cannot rotate');
      return;
    }
    
    setIsRotating(true);
    
    const oldServer = servers.find(s => s.id === selectedServer);
    const newServer = getSmartRandomServer();
    
    console.log(`🔄 Smart rotation: ${oldServer?.name} (${oldServer?.load || oldServer?.baseLoad}%) → ${newServer.name} (${newServer.load || newServer.baseLoad}%)`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSelectedServer(newServer.id);
    const newRotationCount = rotationCount + 1;
    setRotationCount(newRotationCount);
    setIsRotating(false);
    setNextRotationIn(rotationInterval);
    
    console.log(`✅ Rotation #${newRotationCount} complete`);
    
    // Update session with rotation history
    if (currentSessionId) {
      try {
        const currentSession = await base44.entities.VPNSession.filter({ 
          session_id: currentSessionId 
        }, '-created_date', 1).then(sessions => sessions[0]);
        
        const rotationHistory = currentSession?.rotation_history || [];
        rotationHistory.push({
          timestamp: new Date().toISOString(),
          from_server: oldServer.name,
          to_server: newServer.name,
          from_load: oldServer.load || oldServer.baseLoad,
          to_load: newServer.load || newServer.baseLoad,
          reason: 'intelligent-load-balancing'
        });
        
        await base44.entities.VPNSession.update(currentSessionId, {
          total_rotations: newRotationCount,
          current_server: {
            id: newServer.id,
            name: newServer.name,
            location: newServer.location,
            ip: newServer.ip
          },
          rotation_history: rotationHistory.slice(-20) // Keep last 20 rotations
        });
        
        queryClient.invalidateQueries({ queryKey: ['vpn-sessions'] });
      } catch (error) {
        console.error('Failed to update session rotation:', error);
      }
    }
    
    await base44.entities.AuditLog.create({
      action_type: 'vpn_server_changed',
      action_category: 'vpn',
      description: `VPN auto-rotated from ${oldServer.name} to ${newServer.name} (Smart selection)`,
      metadata: {
        previous_value: oldServer.location,
        new_value: newServer.location,
        server: newServer.location,
        rotation_type: 'automatic',
        rotation_count: newRotationCount,
        server_load: `${newServer.load || newServer.baseLoad}%`,
        server_ping: `${newServer.ping || newServer.basePing}ms`,
        selection_reason: 'intelligent-load-balancing',
        session_id: currentSessionId
      },
      severity: 'info',
      status: 'success'
    });
    
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    toast.success(`🔄 Rotated to ${newServer.name} (${newServer.load || newServer.baseLoad}% load)`, { duration: 2000 });
  };

  const changeServer = async (serverId) => {
    if (user?.vpn_enabled) {
      toast.info('Disconnect VPN to change server manually');
      return;
    }
    
    const previousServer = servers.find(s => s.id === selectedServer);
    const newServer = servers.find(s => s.id === serverId);
    
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
    
    console.log(`🔄 Auto-rotation ${newValue ? 'ENABLED' : 'DISABLED'}`);
    toast.success(newValue ? `🔄 Auto-rotation enabled - rotating every ${rotationInterval}s` : 'Auto-rotation disabled - will use intelligent server selection');
  };

  const updateRotationInterval = (seconds) => {
    setRotationInterval(seconds);
    localStorage.setItem('vpn_rotation_interval', seconds.toString());
    console.log(`⏱️ Rotation interval changed to ${seconds}s`);
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

  const getLoadColor = (load) => {
    if (load < 50) return 'text-green-400';
    if (load < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLoadBgColor = (load) => {
    if (load < 50) return 'from-green-500 to-emerald-500';
    if (load < 70) return 'from-yellow-500 to-amber-500';
    return 'from-red-500 to-orange-500';
  };

  const getPingColor = (ping) => {
    if (ping < 50) return 'text-green-400';
    if (ping < 100) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const isEnabled = user.vpn_enabled;
  const currentServer = servers.find(s => s.id === selectedServer);
  const bestServer = getBestServer();

  // Calculate real-time activity stats
  const activeUsersCount = activeSessions.length;
  const totalActiveRotations = activeSessions.reduce((sum, s) => sum + (s.total_rotations || 0), 0);
  const avgConnectionTime = activeSessions.length > 0
    ? activeSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / activeSessions.length
    : 0;

  // Sort servers by performance for display
  const sortedServers = [...servers].map(server => ({
    ...server,
    status: getServerStatus(server),
    score: calculateServerScore(server)
  })).sort((a, b) => a.status.priority - b.status.priority);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header with Auto-Rotation Toggle */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wifi className="w-8 h-8 text-cyan-400" />
            Auto-Rotating VPN Protection
          </h1>
          <p className="text-gray-400 mt-1">
            Intelligent load balancing • Free for all users • {activeUsersCount} active users
          </p>
        </div>

        {/* Prominent Auto-Rotation Toggle */}
        <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 transition-all ${
          autoRotateEnabled ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' : 'border-gray-700'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  autoRotateEnabled 
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                    : 'bg-gray-700'
                }`}>
                  <ArrowUpDown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Auto-Rotation</h3>
                  <p className="text-xs text-gray-400">
                    {autoRotateEnabled ? `Every ${rotationInterval}s` : 'Smart Selection'}
                  </p>
                </div>
              </div>
              <Switch
                checked={autoRotateEnabled}
                onCheckedChange={toggleAutoRotation}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <p className="text-xs text-gray-400">Active Users</p>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{activeUsersCount}</p>
            <p className="text-xs text-gray-500 mt-1 animate-pulse">Live</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <ArrowUpDown className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-gray-400">Total Rotations</p>
            </div>
            <p className="text-3xl font-bold text-purple-400">{totalActiveRotations}</p>
            <p className="text-xs text-gray-500 mt-1">Network-wide</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Avg Connection</p>
            </div>
            <p className="text-3xl font-bold text-green-400">
              {Math.floor(avgConnectionTime / 60)}m
            </p>
            <p className="text-xs text-gray-500 mt-1">{avgConnectionTime > 0 ? Math.floor(avgConnectionTime % 60) : 0}s</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-gray-400">Your Rotations</p>
            </div>
            <p className="text-3xl font-bold text-orange-400">{rotationCount}</p>
            <p className="text-xs text-gray-500 mt-1">This session</p>
          </CardContent>
        </Card>
      </div>

      {/* Intelligent Selection Info Banner */}
      {!autoRotateEnabled && (
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold">🧠 Intelligent Server Selection Active</p>
                <p className="text-cyan-300 text-sm">
                  We'll automatically connect you to the best server based on load and ping • Current best: {bestServer.name} ({bestServer.baseLoad}% load, {bestServer.basePing}ms)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Banner */}
      {autoRotateEnabled && (
        <Card className={`border-2 transition-all ${
          autoRotateEnabled && isEnabled
            ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/50'
            : autoRotateEnabled
            ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/50'
            : 'bg-gradient-to-r from-gray-500/10 to-gray-600/10 border-gray-700'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {autoRotateEnabled ? (
                  isEnabled ? (
                    <>
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
                        <ArrowUpDown className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold">🔄 Auto-Rotation Active</p>
                        <p className="text-purple-300 text-sm">
                          Smart rotation every {rotationInterval}s • Avoiding overloaded servers • Next in {nextRotationIn}s
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold">⚠️ Auto-Rotation Enabled</p>
                        <p className="text-yellow-300 text-sm">Connect VPN to start intelligent automatic rotation</p>
                      </div>
                    </>
                  )
                ) : null}
              </div>
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
                  {isEnabled && autoRotateEnabled && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center animate-pulse">
                      <ArrowUpDown className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {isEnabled && !autoRotateEnabled && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                <h2 className={`text-3xl font-bold mb-2 ${isEnabled ? 'text-green-400' : 'text-gray-400'}`}>
                  {isRotating ? 'ROTATING...' : isEnabled ? 'CONNECTED' : 'DISCONNECTED'}
                </h2>
                
                {isEnabled && currentServer && (
                  <div className="mb-4">
                    <p className="text-4xl mb-2">{currentServer.location.split(' ')[0]}</p>
                    <p className="text-xl text-white">{currentServer.name}</p>
                    <p className="text-sm text-gray-400">IP: {currentServer.ip}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Badge className={getServerStatus(currentServer).color}>
                        {getServerStatus(currentServer).label}
                      </Badge>
                      <Badge className="bg-gray-500/20 text-gray-400">
                        {currentServer.load || currentServer.baseLoad}% load
                      </Badge>
                    </div>
                  </div>
                )}
                
                <p className="text-gray-400 mb-6">
                  {isEnabled 
                    ? autoRotateEnabled 
                      ? `🔄 Smart rotation every ${rotationInterval}s • ${rotationCount} rotations`
                      : '🎯 Optimal server selected • Manual mode'
                    : autoRotateEnabled
                    ? 'Connect to start smart auto-rotation'
                    : 'Connect to use intelligent server selection'
                  }
                </p>

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
                      {isEnabled ? 'Disconnect VPN' : autoRotateEnabled ? 'Connect & Auto-Rotate' : 'Connect to Best Server'}
                      <Wifi className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              {isEnabled && (
                <>
                  {autoRotateEnabled && (
                    <div className="mb-6 p-5 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-2 border-cyan-500/30 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-cyan-400 font-bold flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Next rotation in:
                        </span>
                        <span className="text-3xl font-bold text-white tabular-nums">{nextRotationIn}s</span>
                      </div>
                      <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-1000 animate-pulse"
                          style={{ width: `${(nextRotationIn / rotationInterval) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-3 text-center">
                        ⚡ Intelligent rotation • Avoiding servers over 85% load • {rotationCount} rotations
                      </p>
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
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-cyan-400" />
                Rotation Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <SelectItem value="10">10 seconds (Ultra Fast)</SelectItem>
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
                  <strong>💡 Smart Selection:</strong> {autoRotateEnabled 
                    ? `Auto-rotation avoids servers over 85% load and prioritizes optimal performance.`
                    : `When connecting, we automatically select the best server based on load and ping.`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
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
                <span className="text-sm text-gray-400">Selection</span>
                <Badge className={autoRotateEnabled ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}>
                  {autoRotateEnabled ? 'Auto-Rotating' : 'Intelligent'}
                </Badge>
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
                { icon: Star, text: 'Intelligent load balancing', active: true },
                { icon: ArrowUpDown, text: 'Auto-rotation', active: isEnabled && autoRotateEnabled },
                { icon: Lock, text: 'Kill switch protection', active: isEnabled }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2">
                  <feature.icon className={`w-4 h-4 ${feature.active ? 'text-green-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${feature.active ? 'text-gray-300' : 'text-gray-500'}`}>
                    {feature.text}
                  </span>
                  {feature.text === 'Auto-rotation' && feature.active && (
                    <Badge className="ml-auto bg-purple-500/20 text-purple-400 text-xs animate-pulse">
                      Every {rotationInterval}s
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Server List with Real-time Stats */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            Available Servers ({servers.length}) - Live Statistics
            <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs animate-pulse">
              Updating every 3s
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-cyan-400 text-sm">
              <strong>🎯 Recommended Server:</strong> {bestServer.name} - {bestServer.location} 
              <span className="text-gray-400"> • {bestServer.baseLoad}% load, {bestServer.basePing}ms ping</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedServers.map((server) => {
              const isBest = server.id === bestServer.id;
              const isOverloaded = (server.load || server.baseLoad) >= 85;
              
              return (
                <button
                  key={server.id}
                  onClick={() => changeServer(server.id)}
                  disabled={isEnabled}
                  className={`p-5 rounded-xl border-2 transition-all text-left relative ${
                    selectedServer === server.id
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                      : isBest && !isEnabled
                      ? 'border-green-500/50 bg-green-500/5'
                      : isOverloaded
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  } ${isEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                >
                  {/* Best Server Badge */}
                  {isBest && !isEnabled && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <Star className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        {server.name}
                        {selectedServer === server.id && isEnabled && (
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-400">{server.location}</p>
                      {isBest && !isEnabled && (
                        <p className="text-xs text-green-400 font-semibold mt-1">⭐ Best Performance</p>
                      )}
                    </div>
                    {selectedServer === server.id && (
                      <CheckCircle className="w-6 h-6 text-cyan-400" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Signal className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">Ping</span>
                      </div>
                      <span className={`text-sm font-bold ${getPingColor(server.ping || server.basePing)}`}>
                        {server.ping || server.basePing}ms
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-400">Load</span>
                        </div>
                        <span className={`text-sm font-bold ${getLoadColor(server.load || server.baseLoad)}`}>
                          {server.load || server.baseLoad}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${getLoadBgColor(server.load || server.baseLoad)} transition-all duration-500`}
                          style={{ width: `${server.load || server.baseLoad}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">Users</span>
                      </div>
                      <span className="text-sm font-bold text-purple-400">
                        {(server.users || server.baseUsers).toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">Bandwidth</span>
                      </div>
                      <span className="text-sm font-bold text-green-400">
                        {server.bandwidth || (Math.random() * 800 + 200).toFixed(1)} Mbps
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-400">Uptime</span>
                      </div>
                      <span className="text-sm font-bold text-cyan-400">
                        {server.uptime || (99.9 - Math.random() * 0.2).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <Badge className={`${server.status.color} border w-full justify-center`}>
                      {server.status.label}
                    </Badge>
                    {isOverloaded && (
                      <p className="text-xs text-red-400 text-center mt-2">⚠️ Skipped in auto-rotation</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {isEnabled && (
            <p className="text-yellow-400 text-sm mt-4 text-center">
              ⚠️ Disconnect VPN to select a different starting server
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Intelligent VPN Technology</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Smart Selection</h3>
              <p className="text-gray-400 text-sm">
                Automatically connects to the best server based on load and latency
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Smart Rotation</h3>
              <p className="text-gray-400 text-sm">
                Avoids overloaded servers (85%+) and prioritizes optimal performance
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Global Network</h3>
              <p className="text-gray-400 text-sm">
                {servers.length} servers across 43 countries • Real-time monitoring • Load balancing
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">Free Forever</h3>
              <p className="text-gray-400 text-sm">
                No subscription required - full VPN access with intelligent routing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
