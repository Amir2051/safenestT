import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Radio, Shield, AlertTriangle, TrendingUp, MapPin, 
  Loader2, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

import SignalMonitoringControl from "../components/signal/SignalMonitoringControl.jsx";
import TowerList from "../components/signal/TowerList.jsx";
import ActivityFeed from "../components/signal/ActivityFeed.jsx";
import ReportTowerDialog from "../components/signal/ReportTowerDialog.jsx";
import SignalSettings from "../components/signal/SignalSettings.jsx";

export default function SignalWatch() {
  const [user, setUser] = useState(null);
  const [reportTower, setReportTower] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [towers, setTowers] = useState([]);
  const [fetchingTowers, setFetchingTowers] = useState(false);
  const [monitoringActive, setMonitoringActive] = useState(false);

  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['signal-watch-stats'],
    queryFn: async () => {
      try {
        console.log('Fetching signal watch stats...');
        const response = await base44.functions.invoke('signalWatchService', {
          endpoint: 'stats'
        });
        
        console.log('Stats response:', response);
        
        if (response.status >= 400) {
          throw new Error('Stats fetch failed');
        }
        
        const data = response.data || {
          monitoring_active: false,
          health_score: 100,
          total_towers_seen: 0,
          suspicious_towers_count: 0,
          recent_anomalies: [],
          current_tower: null,
          signal_history: []
        };
        
        console.log('Stats data:', data);
        
        // Update monitoring state
        setMonitoringActive(data.monitoring_active || false);
        
        return data;
      } catch (error) {
        console.error('Failed to fetch signal watch stats:', error);
        return {
          monitoring_active: false,
          health_score: 100,
          total_towers_seen: 0,
          suspicious_towers_count: 0,
          recent_anomalies: [],
          current_tower: null,
          signal_history: []
        };
      }
    },
    enabled: !!user,
    refetchInterval: monitoringActive ? 5000 : false,
    retry: 1
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Get user location automatically on mount
  useEffect(() => {
    if (user && !userLocation && !fetchingLocation) {
      getUserLocation();
    }
  }, [user]);

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setFetchingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        setUserLocation(location);
        setFetchingLocation(false);
        toast.success('📍 Location detected!');
        // Auto-fetch towers after getting location
        fetchNearbyTowers(location);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setFetchingLocation(false);
        
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location permission denied. Please enable location access in your browser settings.', { duration: 6000 });
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error('Location information unavailable');
        } else if (error.code === error.TIMEOUT) {
          toast.error('Location request timed out');
        } else {
          toast.error('Failed to get location');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const fetchNearbyTowers = async (location = userLocation) => {
    if (!location) {
      toast.error('Location required to scan for towers');
      return;
    }

    setFetchingTowers(true);
    
    try {
      console.log('Fetching nearby towers:', location);
      
      const response = await base44.functions.invoke('signalWatchService', {
        endpoint: 'fetch-towers',
        lat: location.lat,
        lon: location.lon,
        range: 5000 // 5km radius
      });

      console.log('Fetch towers response:', response);

      if (response.status >= 400) {
        throw new Error(response.data?.error || 'Failed to fetch towers');
      }

      const fetchedTowers = response.data.towers || [];
      
      console.log('Fetched towers:', fetchedTowers.length);
      
      setTowers(fetchedTowers);
      
      const unverifiedCount = response.data.unverified || 0;
      const criticalCount = response.data.critical || 0;

      // Show appropriate toast based on results
      if (fetchedTowers.length === 0) {
        toast.info('No towers found in this area. Try a different location.');
      } else if (criticalCount > 0) {
        toast.error(`⚠️ ${criticalCount} unverified tower(s) detected nearby!`, { duration: 5000 });
      } else if (unverifiedCount > 0) {
        toast.warning(`${unverifiedCount} tower(s) with low verification found`, { duration: 4000 });
      } else {
        toast.success(`✅ Scanned ${fetchedTowers.length} towers - All verified!`);
      }

      // Invalidate stats to update UI
      queryClient.invalidateQueries({ queryKey: ['signal-watch-stats'] });
    } catch (error) {
      console.error('Fetch towers error:', error);
      toast.error(error.message || 'Failed to fetch nearby towers', { duration: 5000 });
    } finally {
      setFetchingTowers(false);
    }
  };

  const handleReport = (tower) => {
    setReportTower(tower);
    setShowReportDialog(true);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-white font-bold text-xl mb-2">Service Unavailable</p>
            <p className="text-gray-400 mb-6">
              Signal Watch service is temporarily unavailable. Please check that OPENCELLID_TOKEN is configured.
            </p>
            <Button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['signal-watch-stats'] })}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monitoring = monitoringActive;
  const healthScore = stats?.health_score || 100;
  const totalTowers = towers.length || stats?.total_towers_seen || 0;
  const suspiciousTowers = towers.filter(t => t.warning_level !== 'none').length || stats?.suspicious_towers_count || 0;
  const recentAnomalies = stats?.recent_anomalies || [];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3 flex-wrap">
            <Radio className="w-8 h-8 text-sky-400" />
            Signal Watch
            <Badge className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-none animate-pulse">
              BETA
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time cell tower monitoring • Powered by OpenCelliD
          </p>
        </div>
      </div>

      {/* API Token Info Banner */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-1">Real OpenCelliD Data</p>
              <p className="text-cyan-300 text-sm">
                Connected to OpenCelliD API with 40+ million verified cell tower records worldwide. 
                All tower data is fetched in real-time from the OpenCelliD database.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Banner */}
      {!userLocation && !fetchingLocation && (
        <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-orange-400" />
                <div>
                  <p className="text-white font-semibold">Location Required</p>
                  <p className="text-orange-300 text-sm">
                    Enable location access to scan for nearby cell towers
                  </p>
                </div>
              </div>
              <Button
                onClick={getUserLocation}
                className="bg-gradient-to-r from-orange-500 to-red-500"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Enable Location
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fetching Location Spinner */}
      {fetchingLocation && (
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <div>
                <p className="text-white font-semibold">Detecting Location...</p>
                <p className="text-cyan-300 text-sm">
                  Please allow location access when prompted
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Detected Banner */}
      {userLocation && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">Location Enabled</p>
                  <p className="text-green-300 text-sm">
                    📍 {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)} • 
                    <button 
                      onClick={() => fetchNearbyTowers()}
                      className="ml-2 underline hover:text-white"
                      disabled={fetchingTowers}
                    >
                      {fetchingTowers ? 'Scanning...' : 'Scan for Towers'}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Alerts Banner */}
      {suspiciousTowers > 0 && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-10 h-10 text-red-400 animate-pulse" />
              <div>
                <p className="text-white font-semibold">
                  ⚠️ {suspiciousTowers} Suspicious Tower{suspiciousTowers > 1 ? 's' : ''} Detected
                </p>
                <p className="text-red-300 text-sm">
                  Unverified towers nearby. Avoid sensitive transactions and enable VPN.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MapPin className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-3xl font-bold text-cyan-400">{totalTowers}</p>
            <p className="text-sm text-gray-400">Towers Scanned</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-red-400">{suspiciousTowers}</p>
            <p className="text-sm text-gray-400">Suspicious</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-green-400">{healthScore}</p>
            <p className="text-sm text-gray-400">Health Score</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-3xl font-bold text-purple-400">{recentAnomalies.length}</p>
            <p className="text-sm text-gray-400">Anomalies</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
            <div>
              <h3 className="text-white font-bold mb-2">How Signal Watch Works</h3>
              <ul className="space-y-1 text-sm text-cyan-300">
                <li>• <strong>Location Detection:</strong> Uses your device location to find nearby cell towers</li>
                <li>• <strong>OpenCelliD Database:</strong> Compares towers against 40+ million verified cell tower records</li>
                <li>• <strong>Threat Detection:</strong> Flags towers with low verification samples (&lt;5 reports)</li>
                <li>• <strong>Carrier Verification:</strong> Checks if towers belong to known carriers (Verizon, AT&T, T-Mobile)</li>
                <li>• <strong>Community Reports:</strong> Help others by reporting suspicious towers anonymously</li>
                <li>• <strong>Real-Time Monitoring:</strong> Enable monitoring to continuously track signal changes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SignalMonitoringControl 
            monitoring={monitoring}
            healthScore={healthScore}
            user={user}
          />
          
          <TowerList 
            towers={towers}
            onReport={handleReport}
            onRefresh={() => fetchNearbyTowers()}
            loading={fetchingTowers}
          />
        </div>

        <div className="space-y-6">
          <ActivityFeed 
            anomalies={recentAnomalies}
            signalHistory={stats?.signal_history || []}
          />
          <SignalSettings user={user} />
        </div>
      </div>

      {/* Report Dialog */}
      {reportTower && (
        <ReportTowerDialog
          tower={reportTower}
          open={showReportDialog}
          onClose={() => {
            setShowReportDialog(false);
            setReportTower(null);
          }}
          user={user}
        />
      )}
    </div>
  );
}