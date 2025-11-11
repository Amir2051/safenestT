import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, Shield, AlertTriangle, Trash2, Loader2, Map } from "lucide-react";
import { toast } from "sonner";
import GeofenceMapCreator from "./GeofenceMapCreator.jsx";

export default function GeofenceManager({ groupId, members, isAdmin }) {
  const [showDialog, setShowDialog] = useState(false);
  const [createMode, setCreateMode] = useState('manual'); // 'manual' or 'map'
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState('safe_zone');
  const [radius, setRadius] = useState(500);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [centerCoords, setCenterCoords] = useState(null);

  const queryClient = useQueryClient();

  const { data: geofences = [], isLoading } = useQuery({
    queryKey: ['geofences', groupId],
    queryFn: async () => {
      const fences = await base44.entities.Geofence.filter({ group_id: groupId });
      return fences;
    },
    enabled: !!groupId
  });

  const createGeofenceMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Geofence.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('✅ Geofence created successfully!');
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create geofence: ' + error.message);
    }
  });

  const deleteGeofenceMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Geofence.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      toast.success('Geofence deleted');
    }
  });

  const resetForm = () => {
    setZoneName('');
    setZoneType('safe_zone');
    setRadius(500);
    setSelectedMembers([]);
    setCenterCoords(null);
    setCreateMode('manual');
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenterCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
        setGettingLocation(false);
        toast.success('📍 Location captured!');
      },
      (error) => {
        setGettingLocation(false);
        toast.error('Failed to get location');
      }
    );
  };

  const handleMapCreate = (coords) => {
    setCenterCoords(coords);
    toast.success('📍 Pin dropped on map!');
  };

  const handleCreate = () => {
    if (!zoneName || !centerCoords) {
      toast.error('Please fill all required fields');
      return;
    }

    createGeofenceMutation.mutate({
      group_id: groupId,
      zone_name: zoneName,
      zone_type: zoneType,
      center_latitude: centerCoords.lat,
      center_longitude: centerCoords.lon,
      radius_meters: radius,
      address: `${centerCoords.lat.toFixed(4)}, ${centerCoords.lon.toFixed(4)}`,
      monitored_members: selectedMembers,
      notify_on_enter: true,
      notify_on_exit: true,
      active: true,
      trigger_count: 0
    });
  };

  const zoneTypeConfig = {
    safe_zone: { icon: Shield, color: 'text-green-400', bg: 'bg-green-500/10', name: 'Safe Zone' },
    restricted_zone: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', name: 'Restricted Zone' },
    alert_zone: { icon: MapPin, color: 'text-yellow-400', bg: 'bg-yellow-500/10', name: 'Alert Zone' }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Admin access required to manage geofences</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              Geofences ({geofences.length})
            </CardTitle>
            <Button
              onClick={() => setShowDialog(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            </div>
          ) : geofences.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No geofences configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {geofences.map((fence) => {
                const config = zoneTypeConfig[fence.zone_type];
                const Icon = config.icon;
                
                return (
                  <div
                    key={fence.id}
                    className={`p-4 ${config.bg} rounded-lg border border-${fence.zone_type === 'safe_zone' ? 'green' : fence.zone_type === 'restricted_zone' ? 'red' : 'yellow'}-500/20`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className={`w-6 h-6 ${config.color} mt-0.5`} />
                        <div className="flex-1">
                          <h3 className="text-white font-semibold">{fence.zone_name}</h3>
                          <p className="text-sm text-gray-400 mt-1">
                            {config.name} • Radius: {fence.radius_meters}m • {fence.monitored_members?.length || 0} members
                          </p>
                          {fence.trigger_count > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              Triggered {fence.trigger_count} times
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteGeofenceMutation.mutate(fence.id)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Geofence Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Create Geofence</DialogTitle>
          </DialogHeader>

          <Tabs value={createMode} onValueChange={setCreateMode} className="w-full">
            <TabsList className="w-full bg-[#0f1419] border border-cyan-500/20">
              <TabsTrigger value="manual" className="flex-1">
                <MapPin className="w-4 h-4 mr-2" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger value="map" className="flex-1">
                <Map className="w-4 h-4 mr-2" />
                Drop Pin on Map
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div>
                <Label>Zone Name</Label>
                <Input
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g., Home, School, Friend's House"
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                />
              </div>

              <div>
                <Label>Zone Type</Label>
                <Select value={zoneType} onValueChange={setZoneType}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe_zone">Safe Zone (notify when leaving)</SelectItem>
                    <SelectItem value="restricted_zone">Restricted Zone (notify when entering)</SelectItem>
                    <SelectItem value="alert_zone">Alert Zone (notify both)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Radius (meters)</Label>
                <Input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                />
              </div>

              <div>
                <Label>Center Location</Label>
                <Button
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="w-full mt-2 bg-cyan-500/20 border border-cyan-500/30"
                  variant="outline"
                >
                  {gettingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : centerCoords ? (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Location Captured ✓
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Get Current Location
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!zoneName || !centerCoords || createGeofenceMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  Create Zone
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="map" className="space-y-4 mt-4">
              <div>
                <Label>Zone Name</Label>
                <Input
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g., Home, School, Friend's House"
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Zone Type</Label>
                  <Select value={zoneType} onValueChange={setZoneType}>
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safe_zone">Safe Zone</SelectItem>
                      <SelectItem value="restricted_zone">Restricted</SelectItem>
                      <SelectItem value="alert_zone">Alert Zone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Radius (meters)</Label>
                  <Input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Drop Pin on Map</Label>
                <GeofenceMapCreator
                  onLocationSelect={handleMapCreate}
                  radius={radius}
                  zoneType={zoneType}
                  selectedLocation={centerCoords}
                />
              </div>

              {centerCoords && (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-cyan-300 text-sm">
                    📍 Pin Location: {centerCoords.lat.toFixed(6)}, {centerCoords.lon.toFixed(6)}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!zoneName || !centerCoords || createGeofenceMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  {createGeofenceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Zone'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}