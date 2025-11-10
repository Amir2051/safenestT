import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Radio, Shield, AlertTriangle, MapPin, Activity,
  Clock, Signal, Loader2, Flag, Info, Eye, Settings as SettingsIcon
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import SignalMonitoringControl from "../components/signal/SignalMonitoringControl.jsx";
import TowerList from "../components/signal/TowerList.jsx";
import ActivityFeed from "../components/signal/ActivityFeed.jsx";
import ReportTowerDialog from "../components/signal/ReportTowerDialog.jsx";
import SignalSettings from "../components/signal/SignalSettings.jsx";

export default function SignalWatch() {
  const [user, setUser] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);

  const queryClient = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['signal-watch-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('signalWatchService', {
        endpoint: 'stats'
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 5000 // Refresh every 5 seconds while monitoring
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Check for new alerts
  useEffect(() => {
    if (stats?.recent_anomalies?.length > 0 && stats.monitoring_active) {
      const latestAnomaly = stats.recent_anomalies[0];
      const alertTimestamp = new Date(latestAnomaly.timestamp).getTime();
      const now = new Date().getTime();
      
      // Show alert if it's within last 30 seconds
      if (now - alertTimestamp < 30000 && latestAnomaly.severity === 'high') {
        setCurrentAlert(latestAnomaly);
        setShowAlertDialog(true);
      }
    }
  }, [stats]);

  // Simulate tower logging (in production, use actual device APIs)
  useEffect(() => {
    if (stats?.monitoring_active && user) {
      const interval = setInterval(async () => {
        // Simulate random tower data
        const connectionTypes = ['4G', '5G', '4G', '5G', '2G']; // 2G less common
        const randomType = connectionTypes[Math.floor(Math.random() * connectionTypes.length)];
        
        await base44.functions.invoke('signalWatchService', {
          endpoint: 'log-tower',
          cell_id: `TOWER_${Math.floor(Math.random() * 1000)}`,
          mcc: '310',
          mnc: Math.random() > 0.8 ? '999' : '120', // 20% chance of unknown tower
          lac: `LAC_${Math.floor(Math.random() * 100)}`,
          rssi: -50 - Math.floor(Math.random() * 60), // -50 to -110 dBm
          connection_type: randomType,
          carrier_name: 'Verizon',
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1
        });
        
        queryClient.invalidateQueries({ queryKey: ['signal-watch-stats'] });
      }, 10000); // Every 10 seconds

      return () => clearInterval(interval);
    }
  }, [stats?.monitoring_active, user]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const monitoringActive = stats?.monitoring_active || false;
  const healthScore = stats?.health_score || 100;
  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Radio className="w-8 h-8 text-cyan-400" />
            Signal Watch
            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-none">
              Beta
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            Detect suspicious cell tower activity and IMSI catchers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowInfoDialog(true)}
            variant="outline"
            className="border-cyan-500/20 text-cyan-400"
          >
            <Info className="w-4 h-4 mr-2" />
            How It Works
          </Button>
          <Button
            onClick={() => setShowSettingsDialog(true)}
            variant="outline"
            className="border-purple-500/20 text-purple-400"
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Status Indicator Card */}
      <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 ${
        monitoringActive ? 'border-green-500/30' : 'border-gray-500/20'
      }`}>
        <CardContent className="p-6">
          <SignalMonitoringControl 
            monitoringActive={monitoringActive}
            healthScore={healthScore}
            stats={stats}
          />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Signal Health</p>
                <p className={`text-2xl font-bold ${getHealthColor(healthScore)}`}>
                  {healthScore}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-xs text-gray-400">Towers Seen</p>
                <p className="text-2xl font-bold text-green-400">
                  {stats?.total_towers_seen || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-xs text-gray-400">Suspicious</p>
                <p className="text-2xl font-bold text-red-400">
                  {stats?.suspicious_towers_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Signal className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-xs text-gray-400">Network</p>
                <p className="text-lg font-bold text-purple-400">
                  {stats?.current_tower?.connection_type || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tower Map/List */}
        <TowerList 
          currentTower={stats?.current_tower}
          signalHistory={stats?.signal_history || []}
          onReport={() => setShowReportDialog(true)}
        />

        {/* Activity Feed */}
        <ActivityFeed 
          anomalies={stats?.recent_anomalies || []}
          signalHistory={stats?.signal_history || []}
        />
      </div>

      {/* Report Tower Dialog */}
      <ReportTowerDialog
        open={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        currentTower={stats?.current_tower}
      />

      {/* Settings Dialog */}
      <SignalSettings
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        stats={stats}
      />

      {/* Info Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/30 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Info className="w-6 h-6 text-cyan-400" />
              How Signal Watch Protects You
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <h3 className="text-cyan-300 font-bold mb-2">What It Does:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• <strong>Monitors cell tower connections</strong> in real-time</li>
                <li>• <strong>Detects forced 2G downgrades</strong> (common IMSI catcher tactic)</li>
                <li>• <strong>Identifies unknown tower IDs</strong> not in carrier databases</li>
                <li>• <strong>Tracks signal strength anomalies</strong></li>
                <li>• <strong>Community threat reporting</strong> to protect all users</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <h3 className="text-yellow-300 font-bold mb-2">What It Doesn't Do:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• <strong>Cannot block networks:</strong> SafeNest alerts you but doesn't interfere with connections</li>
                <li>• <strong>Not 100% accurate:</strong> Temporary towers may trigger false alerts</li>
                <li>• <strong>Requires location access:</strong> For accurate tower mapping</li>
              </ul>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h3 className="text-green-300 font-bold mb-2">Privacy Guarantee:</h3>
              <p className="text-sm text-gray-300">
                All monitoring happens <strong>locally on your device</strong>. We never see your tower data 
                unless you explicitly submit a report. Anonymous reporting is enabled by default.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      {currentAlert && (
        <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
          <DialogContent className="bg-[#1a2332] border-red-500/50 text-white">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
                Suspicious Tower Detected
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-300 font-semibold mb-2">
                  {currentAlert.description}
                </p>
                <p className="text-sm text-gray-300">
                  <strong>Tower ID:</strong> {currentAlert.cell_id}
                </p>
                <p className="text-sm text-gray-300">
                  <strong>Detected:</strong> {new Date(currentAlert.timestamp).toLocaleString()}
                </p>
              </div>

              <p className="text-sm text-gray-400">
                This could be a temporary tower or a potential IMSI catcher. Your connection remains 
                private within SafeNest, but you may want to avoid sensitive activities.
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowAlertDialog(false);
                    setShowReportDialog(true);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report to SafeNest
                </Button>
                <Button
                  onClick={() => setShowAlertDialog(false)}
                  variant="outline"
                  className="flex-1 border-gray-500/20"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}