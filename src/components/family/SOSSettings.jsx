import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, Mail, MessageSquare, Bell, MapPin, 
  Volume2, Shield, Loader2, CheckCircle, Info
} from "lucide-react";
import { toast } from "sonner";

export default function SOSSettings({ groupId }) {
  const [settings, setSettings] = useState({
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    auto_share_location: true,
    audio_recording: true
  });

  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['sos-settings', groupId],
    queryFn: async () => {
      const response = await base44.functions.invoke('sosFamilyService', {
        endpoint: 'get-sos-settings'
      });
      return response.data;
    },
    enabled: !!groupId
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setSettings(settingsData.settings);
    }
  }, [settingsData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings) => {
      const response = await base44.functions.invoke('sosFamilyService', {
        endpoint: 'update-sos-settings',
        group_id: groupId,
        settings: newSettings
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sos-settings'] });
      toast.success('✅ SOS settings updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    }
  });

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-red-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading SOS settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            SOS Emergency Settings
          </CardTitle>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            Critical
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-semibold text-sm mb-1">
                About SOS Emergency Alerts
              </p>
              <p className="text-red-200 text-xs">
                Configure how you want to be notified when family members trigger SOS alerts.
                All notifications are sent immediately with location details and recommended actions.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Notification Channels
          </h3>

          {/* Email Notifications */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-cyan-400" />
                <div>
                  <Label className="text-white font-semibold">Email Notifications</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Receive detailed HTML emails with maps and directions
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={() => handleToggle('email_enabled')}
              />
            </div>
            {settings.email_enabled && (
              <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-green-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  Enabled - Instant delivery with retry logic
                </p>
              </div>
            )}
          </div>

          {/* SMS Notifications */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <div>
                  <Label className="text-white font-semibold">SMS Notifications</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Text messages with location link (requires phone number)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.sms_enabled}
                onCheckedChange={() => handleToggle('sms_enabled')}
              />
            </div>
            {!settings.sms_enabled && (
              <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                <p className="text-yellow-400 text-xs">
                  Coming soon - SMS integration
                </p>
              </div>
            )}
          </div>

          {/* Push Notifications */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-orange-400" />
                <div>
                  <Label className="text-white font-semibold">Push Notifications</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Browser notifications with quick action buttons
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.push_enabled}
                onCheckedChange={() => handleToggle('push_enabled')}
              />
            </div>
            {!settings.push_enabled && (
              <div className="mt-2 p-2 bg-yellow-500/10 rounded border border-yellow-500/20">
                <p className="text-yellow-400 text-xs">
                  Coming soon - Push notification integration
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SOS Features */}
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            SOS Features
          </h3>

          {/* Auto Location Sharing */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-400" />
                <div>
                  <Label className="text-white font-semibold">Auto-Share Location</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Automatically capture and share GPS location when SOS is triggered
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.auto_share_location}
                onCheckedChange={() => handleToggle('auto_share_location')}
              />
            </div>
            {settings.auto_share_location && (
              <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-green-400 text-xs flex items-center gap-2">
                  <CheckCircle className="w-3 h-3" />
                  High accuracy GPS with battery status
                </p>
              </div>
            )}
          </div>

          {/* Audio Recording */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-blue-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-blue-400" />
                <div>
                  <Label className="text-white font-semibold">Audio Recording</Label>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Record 10 seconds of audio when SOS is triggered (optional)
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.audio_recording}
                onCheckedChange={() => handleToggle('audio_recording')}
              />
            </div>
            {settings.audio_recording && (
              <div className="mt-2 p-2 bg-blue-500/10 rounded border border-blue-500/20">
                <p className="text-blue-400 text-xs">
                  ⚠️ Requires microphone permission
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Security Info */}
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-cyan-300 font-semibold text-sm mb-1">
                🔒 Security & Privacy
              </p>
              <ul className="text-cyan-200 text-xs space-y-1">
                <li>• All location data encrypted with AES-256</li>
                <li>• Data transmitted over HTTPS only</li>
                <li>• Email delivery with 3-retry logic</li>
                <li>• All alerts logged for review</li>
                <li>• Audio recordings stored securely (encrypted)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={updateSettingsMutation.isPending}
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 h-12 text-lg font-bold"
        >
          {updateSettingsMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Saving Settings...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Save SOS Settings
            </>
          )}
        </Button>

        {/* Test Alert Info */}
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-300 text-xs text-center">
            💡 Tip: Test your SOS system periodically to ensure notifications work correctly
          </p>
        </div>
      </CardContent>
    </Card>
  );
}