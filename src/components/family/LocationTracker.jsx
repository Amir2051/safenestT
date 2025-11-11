import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Battery, BatteryCharging, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function LocationTracker({ groupId, members, isAdmin }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const queryClient = useQueryClient();

  const { data: locations = [], isLoading, refetch } = useQuery({
    queryKey: ['family-locations', groupId],
    queryFn: async () => {
      const response = await base44.functions.invoke('familyLocationService', {
        endpoint: 'get-family-locations',
        group_id: groupId
      });
      return response.data.locations || [];
    },
    enabled: !!groupId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (locationData) => {
      const response = await base44.functions.invoke('familyLocationService', {
        endpoint: 'update-location',
        ...locationData
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['family-locations'] });
      
      if (data.triggered_geofences && data.triggered_geofences.length > 0) {
        const events = data.triggered_geofences.map(g => 
          `${g.event} ${g.zone_name}`
        ).join(', ');
        toast.success(`📍 Location updated! Geofence: ${events}`);
      } else {
        toast.success('📍 Location updated successfully');
      }
    },
    onError: (error) => {
      toast.error('Failed to update location: ' + error.message);
    }
  });

  const shareMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const locationData = {
          group_id: groupId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
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
        
        setUserLocation(locationData);
        updateLocationMutation.mutate(locationData);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(error.message);
        toast.error('Failed to get location. Please enable location access.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
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

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Family Locations
          </CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Share Location Button */}
        <Button
          onClick={shareMyLocation}
          disabled={updateLocationMutation.isPending}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          {updateLocationMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sharing Location...
            </>
          ) : (
            <>
              <Navigation className="w-4 h-4 mr-2" />
              Share My Location
            </>
          )}
        </Button>

        {locationError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{locationError}</p>
          </div>
        )}

        {/* Member Locations */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No locations shared yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location) => {
              const member = members.find(m => m.member_email === location.member_email);
              
              return (
                <div
                  key={location.id}
                  className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {location.member_name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-semibold">
                          {location.member_name}
                        </p>
                        <p className="text-xs text-gray-400">
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

                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-300 flex-1">
                      {location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                    </p>
                  </div>

                  {location.accuracy && (
                    <p className="text-xs text-gray-500 mt-2">
                      Accuracy: ±{Math.round(location.accuracy)}m
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-cyan-500/20 text-cyan-400"
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
                      window.open(url, '_blank');
                    }}
                  >
                    View on Map
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}