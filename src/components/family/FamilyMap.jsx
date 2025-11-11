import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Navigation, RefreshCw, Loader2, 
  Battery, BatteryCharging, Users, Zap
} from "lucide-react";

export default function FamilyMap({ groupId, members }) {
  const [selectedMember, setSelectedMember] = useState(null);

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
    refetchInterval: 30000 // Refresh every 30 seconds
  });

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

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Family Map ({locations.length} active)
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
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading family locations...</p>
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-2">
              No Active Locations
            </p>
            <p className="text-gray-400 text-sm">
              Family members need to enable location sharing
            </p>
          </div>
        ) : (
          <>
            {/* Map View Placeholder */}
            <div className="relative w-full h-64 bg-[#0f1419] rounded-lg border border-cyan-500/20 overflow-hidden">
              {/* Simple map visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                  <p className="text-white font-semibold mb-1">
                    {locations.length} Member{locations.length > 1 ? 's' : ''} Sharing
                  </p>
                  <p className="text-xs text-gray-400">
                    Click "View on Map" below to see locations
                  </p>
                </div>
              </div>

              {/* Location markers overlay */}
              {locations.slice(0, 3).map((loc, idx) => (
                <div
                  key={loc.id}
                  className="absolute w-8 h-8 bg-cyan-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    left: `${20 + idx * 30}%`,
                    top: `${30 + idx * 20}%`
                  }}
                  onClick={() => setSelectedMember(loc)}
                >
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {loc.member_name?.[0]}
                  </div>
                </div>
              ))}
            </div>

            {/* Location List */}
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
                      
                      {/* Battery indicator */}
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

                    {/* Location details */}
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
                        {location.update_interval_seconds && (
                          <span className="text-xs text-gray-500">
                            • Updates: {location.update_interval_seconds}s
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
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
          </>
        )}
      </CardContent>
    </Card>
  );
}