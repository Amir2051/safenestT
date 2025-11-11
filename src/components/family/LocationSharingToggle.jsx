import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, Battery, Zap, Shield, Settings, 
  Loader2, CheckCircle, AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";
import locationSharingService from "./LocationSharingService";

export default function LocationSharingToggle({ groupId, userEmail }) {
  const [serviceStatus, setServiceStatus] = useState({ isActive: false });
  const queryClient = useQueryClient();

  // Fetch location settings
  const { data: settings, isLoading, refetch } = useQuery({
    queryKey: ['location-settings', groupId, userEmail],
    queryFn: async () => {
      const existing = await base44.entities.LocationSettings.filter({
        user_email: userEmail,
        group_id: groupId
      });

      if (existing.length === 0) {
        // Create default settings
        const newSettings = await base44.entities.LocationSettings.create({
          user_email: userEmail,
          group_id: groupId,
          sharing_enabled: false,
          background_updates_enabled: true,
          update_interval_seconds: 120,
          battery_saver_mode: true,
          high_accuracy_mode: false,
          share_with_all_members: true,
          auto_pause_when_home: false,
          notification_preferences: {
            notify_on_battery_low: true,
            notify_on_gps_lost: true
          },
          consecutive_failures: 0,
          permissions_status: {
            location_granted: false,
            background_granted: false,
            last_checked: new Date().toISOString()
          }
        });
        return newSettings;
      }

      return existing[0];
    },
    enabled: !!groupId && !!userEmail
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.LocationSettings.update(settings.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['location-settings'] });
      refetch();
    }
  });

  // Toggle sharing
  const toggleSharing = async (enabled) => {
    if (!settings) return;

    if (enabled) {
      // Check permissions
      if (!navigator.permissions) {
        toast.error('Geolocation not supported by your browser');
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        
        if (result.state === 'denied') {
          toast.error(
            'Location permission denied. Please enable location access in your browser settings.',
            { duration: 6000 }
          );
          return;
        }

        // Update settings
        await updateSettingsMutation.mutateAsync({
          sharing_enabled: true,
          permissions_status: {
            location_granted: true,
            last_checked: new Date().toISOString()
          }
        });

        // Start service
        await locationSharingService.start({
          ...settings,
          sharing_enabled: true
        });

        toast.success('✅ Location sharing enabled!', { duration: 3000 });

      } catch (error) {
        console.error('Permission error:', error);
        toast.error('Failed to enable location sharing');
      }

    } else {
      // Stop sharing
      locationSharingService.stop();
      
      await updateSettingsMutation.mutateAsync({
        sharing_enabled: false
      });

      toast.info('Location sharing disabled');
    }
  };

  // Update service status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setServiceStatus(locationSharingService.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Restart service when settings change
  useEffect(() => {
    if (settings?.sharing_enabled && !serviceStatus.isActive) {
      locationSharingService.start(settings);
    }
  }, [settings]);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardContent className="p-6 space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              serviceStatus.isActive 
                ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                : 'bg-gray-700'
            }`}>
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Location Sharing</h3>
              <p className="text-sm text-gray-400">
                {serviceStatus.isActive 
                  ? '🟢 Active • Updates every 2 min' 
                  : '⚫ Disabled'}
              </p>
            </div>
          </div>
          
          <Switch
            checked={settings?.sharing_enabled || false}
            onCheckedChange={toggleSharing}
            disabled={updateSettingsMutation.isPending}
          />
        </div>

        {/* Status Info */}
        {serviceStatus.isActive && (
          <div className="space-y-3">
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-semibold">Sharing Active</span>
              </div>
              {serviceStatus.lastPosition && (
                <p className="text-xs text-gray-400">
                  Last update: {new Date(serviceStatus.lastPosition.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>

            {serviceStatus.consecutiveErrors > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">
                    {serviceStatus.consecutiveErrors} update failure{serviceStatus.consecutiveErrors > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Settings */}
        {settings && (
          <div className="space-y-4 pt-4 border-t border-cyan-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-gray-400" />
                <Label className="text-gray-300 text-sm">Battery Saver Mode</Label>
              </div>
              <Switch
                checked={settings.battery_saver_mode}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ battery_saver_mode: checked })
                }
                disabled={!settings.sharing_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gray-400" />
                <Label className="text-gray-300 text-sm">High Accuracy Mode</Label>
              </div>
              <Switch
                checked={settings.high_accuracy_mode}
                onCheckedChange={(checked) => 
                  updateSettingsMutation.mutate({ high_accuracy_mode: checked })
                }
                disabled={!settings.sharing_enabled}
              />
            </div>

            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-xs text-cyan-300">
                ℹ️ <strong>Battery Optimization:</strong> Updates reduce to 5 min when stationary, 
                10 min when battery &lt; 20%
              </p>
            </div>
          </div>
        )}

        {/* Permission Warning */}
        {settings?.consecutive_failures > 3 && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold text-sm mb-2">
                  Location Updates Failing
                </p>
                <p className="text-xs text-gray-400 mb-3">
                  Multiple consecutive failures detected. Please check:
                </p>
                <ul className="text-xs text-gray-400 space-y-1 mb-3">
                  <li>• GPS is enabled on your device</li>
                  <li>• Location permission granted in browser</li>
                  <li>• Internet connection is stable</li>
                </ul>
                <Button
                  onClick={() => {
                    updateSettingsMutation.mutate({ consecutive_failures: 0 });
                    locationSharingService.restart();
                  }}
                  size="sm"
                  className="bg-red-500/20 text-red-400 border border-red-500/50"
                >
                  Retry Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}