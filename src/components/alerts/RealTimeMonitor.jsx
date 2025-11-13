import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, Shield, Zap, Loader2, CheckCircle, 
  AlertTriangle, RefreshCw 
} from "lucide-react";
import { toast } from "sonner";

export default function RealTimeMonitor() {
  const [lastScan, setLastScan] = useState(null);
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const queryClient = useQueryClient();

  const scanMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('securityAlertService', {
        endpoint: 'detect-threats'
      });
      return response.data;
    },
    onSuccess: (data) => {
      setLastScan(data);
      
      if (data.threats_detected > 0) {
        queryClient.invalidateQueries({ queryKey: ['alerts'] });
        
        // Send in-app notification for new threats
        data.threats.forEach(threat => {
          if (threat.severity === 'critical' || threat.severity === 'high') {
            const notification = {
              id: crypto.randomUUID(),
              title: '🚨 Security Threat Detected',
              message: threat.alert.title,
              type: 'security',
              priority: 'high',
              actionUrl: window.location.origin + '/Alerts',
              timestamp: Date.now(),
              read: false
            };
            
            const stored = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
            stored.unshift(notification);
            localStorage.setItem('inAppNotifications', JSON.stringify(stored.slice(0, 100)));
            window.dispatchEvent(new Event('notificationAdded'));
          }
        });

        toast.warning(`⚠️ ${data.threats_detected} security threat${data.threats_detected > 1 ? 's' : ''} detected!`, {
          description: 'Check the alerts below for details',
          duration: 5000
        });
      } else {
        toast.success('✅ No threats detected - all clear!');
      }
    },
    onError: (error) => {
      toast.error('Failed to scan for threats: ' + error.message);
    }
  });

  // Auto-scan every 2 minutes when enabled
  useEffect(() => {
    if (!autoScanEnabled) return;

    const interval = setInterval(() => {
      scanMutation.mutate();
    }, 120000); // 2 minutes

    // Initial scan
    scanMutation.mutate();

    return () => clearInterval(interval);
  }, [autoScanEnabled]);

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Real-Time Threat Detection
            {autoScanEnabled && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
                LIVE
              </Badge>
            )}
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setAutoScanEnabled(!autoScanEnabled)}
            variant="outline"
            className={`border-cyan-500/20 ${
              autoScanEnabled ? 'text-green-400' : 'text-gray-400'
            }`}
          >
            {autoScanEnabled ? 'Auto-Scan: ON' : 'Auto-Scan: OFF'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span className="text-white font-semibold">Continuous Monitoring</span>
            </div>
            {scanMutation.isPending && (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            )}
          </div>

          {lastScan && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Last Scan:</span>
                <span className="text-white">
                  {new Date(lastScan.scanned_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Threats Detected:</span>
                <Badge className={
                  lastScan.threats_detected === 0
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : 'bg-red-500/20 text-red-400 border-red-500/50'
                }>
                  {lastScan.threats_detected}
                </Badge>
              </div>
              {autoScanEnabled && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Next Scan:</span>
                  <span className="text-cyan-400">~2 minutes</span>
                </div>
              )}
            </div>
          )}
        </div>

        {lastScan && lastScan.threats_detected > 0 && (
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm">Detected Threats:</h4>
            {lastScan.threats.map((threat, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  threat.severity === 'critical'
                    ? 'bg-red-500/10 border-red-500/30'
                    : threat.severity === 'high'
                    ? 'bg-orange-500/10 border-orange-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${
                    threat.severity === 'critical' ? 'text-red-400' :
                    threat.severity === 'high' ? 'text-orange-400' :
                    'text-yellow-400'
                  }`} />
                  <span className="text-white font-semibold text-sm">
                    {threat.threat.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <Badge className={`ml-auto text-xs ${
                    threat.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                    threat.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {threat.severity}
                  </Badge>
                </div>
                <p className="text-gray-300 text-xs">
                  {threat.alert.message}
                </p>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
          variant="outline"
          className="w-full border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
        >
          {scanMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Scan Now
            </>
          )}
        </Button>

        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <p className="text-cyan-300 text-xs">
            <Zap className="w-3 h-3 inline mr-1" />
            <strong>Auto-Detection:</strong> System automatically scans for VPN anomalies, 
            suspicious IPs, unusual data transfers, and rapid server switching every 2 minutes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}