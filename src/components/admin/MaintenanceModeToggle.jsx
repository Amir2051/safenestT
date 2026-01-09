import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MaintenanceModeToggle() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const configs = await base44.entities.SystemConfig.list();
      return configs[0] || null;
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled) => {
      if (config?.id) {
        await base44.entities.SystemConfig.update(config.id, {
          under_construction: enabled
        });
      } else {
        await base44.entities.SystemConfig.create({
          under_construction: enabled
        });
      }
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    },
    onError: (error) => {
      toast.error('Failed to toggle maintenance mode: ' + error.message);
    }
  });

  if (isLoading) {
    return <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />;
  }

  const isUnderConstruction = config?.under_construction || false;

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-orange-400" />
          Maintenance Mode
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <div>
                <Label className="text-white font-semibold">Under Construction Mode</Label>
                <p className="text-gray-400 text-sm mt-1">
                  {isUnderConstruction 
                    ? 'App is currently in maintenance mode. Only admins have access.' 
                    : 'App is fully operational. All users have access.'}
                </p>
              </div>
            </div>
            <Switch
              checked={isUnderConstruction}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
              disabled={toggleMutation.isPending}
              className="data-[state=checked]:bg-orange-500"
            />
          </div>

          {isUnderConstruction && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm font-semibold">⚠️ WARNING</p>
              <p className="text-gray-300 text-sm mt-2">
                All non-admin users are currently blocked from accessing the app. 
                They will see a maintenance message. Toggle off when ready to restore access.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}