import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, Navigation, RefreshCw, Loader2, 
  Battery, BatteryCharging, Users, Zap, Clock, Route, Shield, Crosshair
} from "lucide-react";
import InteractiveMap from "./InteractiveMap.jsx";
import { toast } from "sonner";

export default function FamilyMap({ groupId, members }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [historyHours, setHistoryHours] = useState(24);
  const [sharingMyLocation, setSharingMyLocation] = useState(false);
  const [myCurrentLocation, setMyCurrentLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ['family-locations-active', groupId],
    queryFn: async () => {
      const locs = await base44.entities.FamilyLocation.filter({
        group_id: groupId,
        is_current: true,
        share_status: true
      });
      return locs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },
    enabled: !!groupId,
    refetchInterval: 30000
  });

  const { data: geofences = [] } = useQuery({
    queryKey: ['geofences', groupId],
    queryFn: async () => {
      const fences = await base44.entities.Geofence.filter({ 
        group_id: groupId,
        active: true 
      });
      return fences;
    },
    enabled: !!groupId
  });

  const { data: routeHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['route-history', groupId, selectedMember?.user_id, historyHours],
    queryFn: async () => {
      if (!selectedMember) return [];
      
      const since = new Date();
      since.setHours(since.getHours() - historyHours);
      
      const allLocations = await base44.entities.FamilyLocation.filter({
        group_id: groupId,
        user_id: selectedMember.user_id
      }, '-timestamp', 200);
      
      return allLocations.filter(loc => 
        new Date(loc.timestamp) >= since
      );
    },
    enabled: !!groupId && !!selectedMember && showRouteHistory
  });

  // Auto-detect user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : null
          };
          
          // Get battery info if available
          if (navigator.getBattery) {
            try {
              const battery = await navigator.getBattery();
              locationData.battery_level = Math.round(battery.level * 100);
              locationData.is_charging = battery.charging;
            } catch (e) {
              // Battery API not available
            }
          }
          
          setMyCurrentLocation(locationData);
          setGettingLocation(false);
        },
        (error) => {
          console.error('Location detection error:', error);
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const shareMyLocationMutation = useMutation({
    mutationFn: async (locationData) => {
      const response = await base44.functions.invoke('familyLocationService', {
        endpoint: 'update-location',
        ...locationData
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['family-locations-active'] });
      
      if (data.triggered_geofences && data.triggered_geofences.length > 0) {
        const events = data.triggered_geofences.map(g => 
          `${g.event} ${g.zone_name}`
        ).join(', ');
        toast.success(`📍 Location shared! Geofence: ${events}`);
      } else {
        toast.success('📍 Your location has been shared with the family!');
      }
      setSharingMyLocation(false);
    },
    onError: (error) => {
      toast.error('Failed to share location: ' + error.message);
      setSharingMyLocation(false);
    }
  });

  const handleShareMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }

    setSharingMyLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData = {
          group_id: groupId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : null
        };
        
        // Get battery info if available
        if (navigator.getBattery) {
          try {
            const battery = await navigator.getBattery();
            locationData.battery_level = Math.round(battery.level * 100);
            locationData.is_charging = battery.charging;
          } catch (e) {
            // Battery API not available
          }
        }
        
        // Update current location state
        setMyCurrentLocation({
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          speed_kmh: locationData.speed_kmh,
          battery_level: locationData.battery_level,
          is_charging: locationData.is_charging
        });
        
        shareMyLocationMutation.mutate(locationData);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setSharingMyLocation(false);
        
        let message = 'Failed to get your location';
        if (error.code === 1) {
          message = 'Location permission denied. Please enable location access in your browser settings.';
        } else if (error.code === 2) {
          message = 'Location unavailable. Please check your GPS settings.';
        }
        
        toast.error(message, { duration: 5000 });
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 0 
      }
    );
  };

  const getTimeSince = (timestamp) => {
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

  const getStatusColor = (timestamp) => {
    const diffMins = (new Date() - new Date(timestamp)) / 60000;
    if (diffMins < 5) return 'text-green-400';
    if (diffMins < 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const calculateTotalDistance = (route) => {
    if (route.length < 2) return 0;
    
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      const prev = route[i - 1];
      const curr = route[i];
      
      const R = 6371;
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      total += R * c;
    }
    
    return total;
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Family Map ({locations.length} active)
            {myCurrentLocation && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 ml-2">
                <Crosshair className="w-3 h-3 mr-1" />
                Your location detected
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleShareMyLocation}
              disabled={sharingMyLocation}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              size="sm"
            >
              {sharingMyLocation ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 mr-2" />
                  Share My Location
                </>
              )}
            </Button>
            {selectedMember && (
              <Button
                onClick={() => {
                  setShowRouteHistory(!showRouteHistory);
                  if (!showRouteHistory && routeHistory.length > 0) {
                    toast.success(`📍 Loaded ${routeHistory.length} location points`);
                  }
                }}
                variant="outline"
                size="sm"
                className={`border-purple-500/20 ${
                  showRouteHistory ? 'bg-purple-500/20 text-purple-400' : 'text-purple-400'
                }`}
              >
                <Route className="w-4 h-4 mr-2" />
                Route History
              </Button>
            )}
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="border-cyan-500/20"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="bg-[#0f1419] border border-cyan-500/20 w-full">
            <TabsTrigger value="map" className="flex-1">
              <MapPin className="w-4 h-4 mr-2" />
              Live Map
            </TabsTrigger>
            <TabsTrigger value="list" className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              Location List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="mt-4">
            {gettingLocation && !myCurrentLocation && (
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-cyan-300 font-semibold text-sm">
                      Detecting your location...
                    </p>
                    <p className="text-cyan-400 text-xs">
                      This will show your position on the map (visible only to you until shared)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading family locations...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Quick Share Button Above Map */}
                {locations.length === 0 && (
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white font-semibold mb-1">
                          🗺️ Share your location with family
                        </p>
                        <p className="text-cyan-300 text-sm">
                          {myCurrentLocation 
                            ? "We detected your location! Click to share it with everyone."
                            : "Family members can see each other on the map"
                          }
                        </p>
                      </div>
                      <Button
                        onClick={handleShareMyLocation}
                        disabled={sharingMyLocation}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600"
                      >
                        {sharingMyLocation ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sharing...
                          </>
                        ) : (
                          <>
                            <Crosshair className="w-4 h-4 mr-2" />
                            Share Now
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Interactive Map */}
                <InteractiveMap
                  locations={locations}
                  geofences={geofences}
                  selectedMember={selectedMember}
                  routeHistory={showRouteHistory ? routeHistory : []}
                  onLocationSelect={setSelectedMember}
                  members={members}
                  myCurrentLocation={myCurrentLocation}
                />

                {/* Current Location Status */}
                {myCurrentLocation && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crosshair className="w-4 h-4 text-green-400" />
                        <div>
                          <p className="text-green-400 font-semibold text-sm">
                            Your Location: {myCurrentLocation.latitude.toFixed(4)}, {myCurrentLocation.longitude.toFixed(4)}
                          </p>
                          <p className="text-green-300 text-xs">
                            Accuracy: ±{Math.round(myCurrentLocation.accuracy)}m
                            {myCurrentLocation.battery_level && ` • Battery: ${myCurrentLocation.battery_level}%`}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        You
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Route History Stats */}
                {showRouteHistory && selectedMember && routeHistory.length > 0 && (
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-white font-semibold flex items-center gap-2">
                        <Route className="w-4 h-4 text-purple-400" />
                        Route History - {members.find(m => m.member_email === selectedMember.user_id)?.member_name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setHistoryHours(6)}
                          size="sm"
                          variant={historyHours === 6 ? "default" : "outline"}
                          className="text-xs h-7"
                        >
                          6h
                        </Button>
                        <Button
                          onClick={() => setHistoryHours(24)}
                          size="sm"
                          variant={historyHours === 24 ? "default" : "outline"}
                          className="text-xs h-7"
                        >
                          24h
                        </Button>
                        <Button
                          onClick={() => setHistoryHours(72)}
                          size="sm"
                          variant={historyHours === 72 ? "default" : "outline"}
                          className="text-xs h-7"
                        >
                          3d
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-2 bg-[#0f1419] rounded">
                        <p className="text-2xl font-bold text-purple-400">
                          {routeHistory.length}
                        </p>
                        <p className="text-xs text-gray-400">Points</p>
                      </div>
                      <div className="text-center p-2 bg-[#0f1419] rounded">
                        <p className="text-2xl font-bold text-cyan-400">
                          {calculateTotalDistance(routeHistory).toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-400">km Traveled</p>
                      </div>
                      <div className="text-center p-2 bg-[#0f1419] rounded">
                        <p className="text-2xl font-bold text-green-400">
                          {historyHours}
                        </p>
                        <p className="text-xs text-gray-400">Hours</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Geofence Legend */}
                {geofences.length > 0 && (
                  <div className="p-3 bg-[#0f1419] border border-cyan-500/10 rounded-lg">
                    <h4 className="text-white font-semibold text-sm mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" />
                      Active Geofences
                    </h4>
                    <div className="space-y-1">
                      {geofences.map((fence) => (
                        <div key={fence.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{fence.zone_name}</span>
                          <Badge className={
                            fence.zone_type === 'safe_zone' 
                              ? 'bg-green-500/20 text-green-400 border-green-500/50'
                              : fence.zone_type === 'restricted_zone'
                              ? 'bg-red-500/20 text-red-400 border-red-500/50'
                              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                          }>
                            {fence.radius_meters}m
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="mt-4">
            {/* Share My Location Button at Top of List */}
            <div className="mb-4">
              <Button
                onClick={handleShareMyLocation}
                disabled={sharingMyLocation}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-12"
              >
                {sharingMyLocation ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Getting Your Location...
                  </>
                ) : (
                  <>
                    <Crosshair className="w-5 h-5 mr-2" />
                    Share My Location with Family
                  </>
                )}
              </Button>
            </div>

            {/* Current Location Card */}
            {myCurrentLocation && (
              <div className="mb-4 p-4 bg-green-500/10 border-2 border-green-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Crosshair className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold flex items-center gap-2">
                      You (Current Location)
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        Live
                      </Badge>
                    </p>
                    <p className="text-green-300 text-sm mt-1">
                      📍 {myCurrentLocation.latitude.toFixed(6)}, {myCurrentLocation.longitude.toFixed(6)}
                    </p>
                    <p className="text-green-400 text-xs mt-1">
                      Accuracy: ±{Math.round(myCurrentLocation.accuracy)}m
                      {myCurrentLocation.battery_level && ` • Battery: ${myCurrentLocation.battery_level}%`}
                    </p>
                  </div>
                </div>
                <p className="text-green-300 text-xs mt-3 text-center">
                  👆 This is visible only to you. Click "Share My Location" to let family see it.
                </p>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-white font-semibold mb-2">No locations shared yet</p>
                <p className="text-gray-400 text-sm">
                  Click the button above to share your location
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {locations.map((location) => {
                  const member = members.find(m => m.member_email === location.user_id);
                  const statusColor = getStatusColor(location.timestamp);
                  
                  return (
                    <div
                      key={location.id}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        selectedMember?.id === location.id
                          ? 'bg-cyan-500/20 border-cyan-500/50'
                          : 'bg-[#0f1419] border-cyan-500/10 hover:border-cyan-500/30'
                      }`}
                      onClick={() => setSelectedMember(location)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center relative">
                            <span className="text-white font-bold">
                              {location.member_name?.[0]?.toUpperCase()}
                            </span>
                            {location.is_stationary && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-[#0f1419]" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-semibold flex items-center gap-2">
                              {member?.member_name || 'Unknown'}
                              {location.is_stationary && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                                  Stationary
                                </Badge>
                              )}
                            </p>
                            <p className={`text-xs font-medium ${statusColor}`}>
                              {getTimeSince(location.timestamp)}
                            </p>
                          </div>
                        </div>
                        
                        {location.battery_level !== null && (
                          <div className="flex items-center gap-1 text-xs">
                            {location.is_charging ? (
                              <BatteryCharging className="w-4 h-4 text-green-400" />
                            ) : (
                              <Battery className={`w-4 h-4 ${
                                location.battery_level < 20 ? 'text-red-400' : 'text-gray-400'
                              }`} />
                            )}
                            <span className={
                              location.battery_level < 20 ? 'text-red-400' : 'text-gray-400'
                            }>
                              {location.battery_level}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-300 text-sm flex-1">
                            {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                          </p>
                        </div>

                        {location.speed_kmh !== null && location.speed_kmh > 5 && (
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400 text-xs font-medium">
                              Moving • {Math.round(location.speed_kmh)} km/h
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Accuracy: ±{location.accuracy}m
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <Navigation className="w-3 h-3 mr-2" />
                          View on Map
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
                            window.open(url, '_blank');
                          }}
                        >
                          <Navigation className="w-3 h-3 mr-2" />
                          Get Directions
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}