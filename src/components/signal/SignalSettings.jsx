import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SignalSettings({ open, onClose, stats }) {
  const [alertSensitivity, setAlertSensitivity] = useState(stats?.alert_sensitivity || 'normal');
  const [anonymousReporting, setAnonymousReporting] = useState(stats?.anonymous_reporting_enabled !== false);

  const queryClient = useQueryClient();

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('signalWatchService', {
        endpoint: 'update-settings',
        alert_sensitivity: alertSensitivity,
        anonymous_reporting_enabled: anonymousReporting
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signal-watch-stats'] });
      toast.success('⚙️ Settings updated');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    }
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('signalWatchService', {
        endpoint: 'clear-history'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signal-watch-stats'] });
      toast.success('🗑️ History cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear history: ' + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-purple-500/30 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            Signal Watch Preferences
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Sensitivity */}
          <div>
            <Label className="text-gray-300 mb-2 block">Alert Sensitivity</Label>
            <Select value={alertSensitivity} onValueChange={setAlertSensitivity}>
              <SelectTrigger className="bg-[#0f1419] border-purple-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-purple-500/20">
                <SelectItem value="low">
                  <div>
                    <p className="font-semibold">Low</p>
                    <p className="text-xs text-gray-400">Only critical threats</p>
                  </div>
                </SelectItem>
                <SelectItem value="normal">
                  <div>
                    <p className="font-semibold">Normal (Recommended)</p>
                    <p className="text-xs text-gray-400">Balanced detection</p>
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div>
                    <p className="font-semibold">High</p>
                    <p className="text-xs text-gray-400">All anomalies</p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Anonymous Reporting */}
          <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-purple-500/10">
            <div>
              <p className="text-white font-semibold">Anonymous Threat Reports</p>
              <p className="text-xs text-gray-400">Share threats without revealing identity</p>
            </div>
            <Switch
              checked={anonymousReporting}
              onCheckedChange={setAnonymousReporting}
            />
          </div>

          {/* Clear History */}
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-white font-semibold mb-1">Clear History</p>
                <p className="text-xs text-gray-400">
                  Remove all tower history and reset health score
                </p>
              </div>
              <Button
                onClick={() => clearHistoryMutation.mutate()}
                disabled={clearHistoryMutation.isPending}
                variant="outline"
                size="sm"
                className="border-red-500/20 text-red-400"
              >
                {clearHistoryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-cyan-300 text-xs">
              <strong>Privacy & Data Handling:</strong> All monitoring happens locally on your device. 
              We never see your tower data unless you submit a report. Anonymous reports contain no 
              identifying information.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-500/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateSettingsMutation.mutate()}
              disabled={updateSettingsMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}