import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Bell, Mail, Smartphone, Clock, Shield, Wifi, Lock, 
  Eye, AlertTriangle, Save, Loader2, TestTube
} from "lucide-react";
import { toast } from "sonner";

export default function AlertPreferences() {
  const [preferences, setPreferences] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  const queryClient = useQueryClient();

  const { data: prefsData, isLoading } = useQuery({
    queryKey: ['alert-preferences'],
    queryFn: async () => {
      const response = await base44.functions.invoke('securityAlertService', {
        endpoint: 'get-alert-preferences'
      });
      return response.data.preferences;
    }
  });

  useEffect(() => {
    if (prefsData) {
      setPreferences(prefsData);
    }
  }, [prefsData]);

  const updatePrefsMutation = useMutation({
    mutationFn: async (prefs) => {
      const response = await base44.functions.invoke('securityAlertService', {
        endpoint: 'update-alert-preferences',
        preferences: prefs
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-preferences'] });
      toast.success('Alert preferences saved!');
    },
    onError: () => {
      toast.error('Failed to save preferences');
    }
  });

  const testAlertMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('securityAlertService', {
        endpoint: 'test-alert'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      
      // Send in-app notification
      const notification = {
        id: crypto.randomUUID(),
        title: 'Test Alert Created',
        message: 'A test security alert has been created. Check your Alerts page!',
        type: 'security',
        priority: 'normal',
        actionUrl: window.location.origin + '/Alerts',
        timestamp: Date.now(),
        read: false
      };
      
      const stored = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
      stored.unshift(notification);
      localStorage.setItem('inAppNotifications', JSON.stringify(stored.slice(0, 100)));
      window.dispatchEvent(new Event('notificationAdded'));
      
      toast.success('Test alert created! Check your notifications.');
      setIsTesting(false);
    },
    onError: () => {
      toast.error('Failed to create test alert');
      setIsTesting(false);
    }
  });

  const handleSave = () => {
    updatePrefsMutation.mutate(preferences);
  };

  const handleTestAlert = () => {
    setIsTesting(true);
    testAlertMutation.mutate();
  };

  const updatePref = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const updateAlertType = (type, value) => {
    setPreferences(prev => ({
      ...prev,
      alert_types: { ...prev.alert_types, [type]: value }
    }));
  };

  if (isLoading || !preferences) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Alert Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-white font-semibold">Enable Security Alerts</p>
                <p className="text-xs text-gray-400">Master toggle for all alerts</p>
              </div>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(checked) => updatePref('enabled', checked)}
            />
          </div>

          {/* Test Alert Button */}
          <Button
            onClick={handleTestAlert}
            disabled={isTesting || !preferences.enabled}
            variant="outline"
            className="w-full border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Test Alert...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Send Test Alert
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Severity Levels */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Notification by Severity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <Label className="text-white">Critical Alerts</Label>
            </div>
            <Switch
              checked={preferences.notify_critical}
              onCheckedChange={(checked) => updatePref('notify_critical', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <Label className="text-white">High Alerts</Label>
            </div>
            <Switch
              checked={preferences.notify_high}
              onCheckedChange={(checked) => updatePref('notify_high', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <Label className="text-white">Medium Alerts</Label>
            </div>
            <Switch
              checked={preferences.notify_medium}
              onCheckedChange={(checked) => updatePref('notify_medium', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <Label className="text-white">Low Alerts</Label>
            </div>
            <Switch
              checked={preferences.notify_low}
              onCheckedChange={(checked) => updatePref('notify_low', checked)}
              disabled={!preferences.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert Types */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Alert Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-green-400" />
              <Label className="text-white">VPN Alerts</Label>
            </div>
            <Switch
              checked={preferences.alert_types.vpn}
              onCheckedChange={(checked) => updateAlertType('vpn', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400" />
              <Label className="text-white">Data Breach Alerts</Label>
            </div>
            <Switch
              checked={preferences.alert_types.breach}
              onCheckedChange={(checked) => updateAlertType('breach', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-purple-400" />
              <Label className="text-white">Password Alerts</Label>
            </div>
            <Switch
              checked={preferences.alert_types.password}
              onCheckedChange={(checked) => updateAlertType('password', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <Label className="text-white">Phishing Alerts</Label>
            </div>
            <Switch
              checked={preferences.alert_types.phishing}
              onCheckedChange={(checked) => updateAlertType('phishing', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-cyan-400" />
              <Label className="text-white">Dark Web Alerts</Label>
            </div>
            <Switch
              checked={preferences.alert_types.dark_web}
              onCheckedChange={(checked) => updateAlertType('dark_web', checked)}
              disabled={!preferences.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Channels */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-cyan-400" />
              <Label className="text-white">Email Notifications</Label>
            </div>
            <Switch
              checked={preferences.email_alerts}
              onCheckedChange={(checked) => updatePref('email_alerts', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-purple-400" />
              <Label className="text-white">In-App Push Notifications</Label>
            </div>
            <Switch
              checked={preferences.push_alerts}
              onCheckedChange={(checked) => updatePref('push_alerts', checked)}
              disabled={!preferences.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <Label className="text-white">Enable Quiet Hours</Label>
            <Switch
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => updatePref('quiet_hours_enabled', checked)}
              disabled={!preferences.enabled}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">Start Time</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) => updatePref('quiet_hours_start', e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/20 text-white"
                  disabled={!preferences.enabled}
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">End Time</Label>
                <Input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) => updatePref('quiet_hours_end', e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/20 text-white"
                  disabled={!preferences.enabled}
                />
              </div>
            </div>
          )}

          {preferences.quiet_hours_enabled && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-300 text-xs">
                ℹ️ Critical alerts will still be delivered during quiet hours
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updatePrefsMutation.isPending}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 min-w-[150px]"
        >
          {updatePrefsMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}