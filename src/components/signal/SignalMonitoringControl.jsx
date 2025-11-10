import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SignalMonitoringControl({ monitoring, healthScore, user }) {
  const queryClient = useQueryClient();

  const toggleMonitoringMutation = useMutation({
    mutationFn: async (shouldStart) => {
      console.log('Toggle monitoring mutation called:', shouldStart);
      
      try {
        const response = await base44.functions.invoke('signalWatchService', {
          endpoint: shouldStart ? 'start' : 'stop'
        });
        
        console.log('Toggle monitoring response:', response);
        
        if (response.status >= 400) {
          throw new Error(response.data?.error || 'Failed to toggle monitoring');
        }
        
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        
        return response.data;
      } catch (err) {
        console.error('Toggle monitoring error:', err);
        throw err;
      }
    },
    onSuccess: (data, shouldStart) => {
      console.log('Monitoring toggled successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['signal-watch-stats'] });
      toast.success(shouldStart ? '📡 Monitoring started' : '⏸️ Monitoring paused');
    },
    onError: (error) => {
      console.error('Monitoring toggle error:', error);
      toast.error('Failed to toggle monitoring: ' + error.message);
    }
  });

  const getHealthColor = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-amber-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-pink-500';
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Animated Status Icon */}
            <div className="relative">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                monitoring 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-br from-gray-600 to-gray-700'
              }`}>
                <Radio className={`w-10 h-10 text-white ${monitoring ? 'animate-pulse' : ''}`} />
              </div>
              {monitoring && (
                <>
                  <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-20" />
                  <div className="absolute inset-0 rounded-full border-2 border-green-400 opacity-50" />
                </>
              )}
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {monitoring ? 'Monitoring Active' : 'Monitoring Paused'}
              </h3>
              <p className="text-gray-400 text-sm">
                {monitoring 
                  ? 'Real-time cellular network scanning enabled'
                  : 'Click Start Monitoring to detect suspicious tower activity'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            {/* Signal Health Score */}
            {monitoring && (
              <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getHealthColor(healthScore)} bg-opacity-20 border-2`}
                style={{ borderColor: `rgba(${healthScore >= 80 ? '34, 197, 94' : healthScore >= 60 ? '234, 179, 8' : '239, 68, 68'}, 0.5)` }}>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-white" />
                  <span className="text-white font-bold text-xl">{healthScore}</span>
                  <span className="text-white text-xs">Health</span>
                </div>
              </div>
            )}

            {/* Toggle Button */}
            <Button
              onClick={() => {
                console.log('Toggle button clicked, current monitoring:', monitoring);
                toggleMonitoringMutation.mutate(!monitoring);
              }}
              disabled={toggleMonitoringMutation.isPending}
              className={`${
                monitoring 
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
              } min-w-[140px]`}
            >
              {toggleMonitoringMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : monitoring ? (
                'Stop Monitoring'
              ) : (
                'Start Monitoring'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}