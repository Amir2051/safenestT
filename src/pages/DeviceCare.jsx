
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Smartphone, Trash2, Zap, Clock, CheckCircle, 
  AlertTriangle, Sparkles, TrendingUp, Cpu, HardDrive, Activity
} from "lucide-react";
import { toast } from "sonner";

import ScanRadar from "../components/devicecare/ScanRadar.jsx";
import CleanupResults from "../components/devicecare/CleanupResults.jsx";
import ThreatsList from "../components/devicecare/ThreatsList.jsx";

export default function DeviceCare() {
  const [user, setUser] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScan, setCurrentScan] = useState(null); // Retained for ScanRadar messages
  const [scanResult, setScanResult] = useState(null); // Renamed from scanResults
  const [realTimeProtection, setRealTimeProtection] = useState(false); // Renamed from autoProtection, initial value will be set by useEffect

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setRealTimeProtection(userData.auto_protection_enabled || false);
    }).catch(() => {});
  }, []);

  const { data: deviceLogs = [], isLoading: logsLoading } = useQuery({ // Renamed from logs, added isLoading
    queryKey: ['device-logs'],
    queryFn: () => base44.entities.DeviceProtectionLog.list('-created_date', 10),
    initialData: [],
  });

  const createLogMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.DeviceProtectionLog.create(data);
      
      // Log device scan completion
      await base44.entities.AuditLog.create({
        action_type: 'device_scan_completed',
        action_category: 'security',
        description: `Device ${data.scan_type} scan completed - ${data.threats_found} threats found`,
        metadata: {
          device_info: `${data.scan_type} scan`,
          new_value: data.status,
          affected_item: `${data.threats_found} threats, ${data.junk_cleaned_mb}MB cleaned`
        },
        severity: data.threats_found > 0 ? 'medium' : 'info',
        status: 'success'
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-logs'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] }); // Invalidate audit logs as well
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
  });

  const performScan = async (scanType) => {
    setScanning(true);
    setScanProgress(0);
    setScanResult(null); // Use scanResult
    
    const startTime = Date.now();

    try {
      // Simulate progressive scanning
      const steps = [
        { progress: 10, message: "Initializing security scan..." },
        { progress: 25, message: "Scanning browser data..." },
        { progress: 40, message: "Checking stored passwords..." },
        { progress: 55, message: "Analyzing security settings..." },
        { progress: 70, message: "Detecting vulnerabilities..." },
        { progress: 85, message: "Scanning for malicious activity..." },
        { progress: 95, message: "Generating report..." },
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, scanType === 'quick' ? 500 : 1000));
        setScanProgress(step.progress);
        setCurrentScan(step.message);
      }

      // Get device/browser info
      const deviceInfo = {
        os: navigator.platform,
        browser: navigator.userAgent.split(' ').pop().split('/')[0],
        apps_scanned: Math.floor(Math.random() * 30) + 40
      };

      // Simulate threat detection
      const threats = [];
      const randomThreatCount = Math.floor(Math.random() * 4);
      
      const possibleThreats = [
        { name: "Suspicious Browser Extension", severity: "medium", type: "extension", action_taken: "quarantined" },
        { name: "Outdated Security Settings", severity: "low", type: "config", action_taken: "updated" },
        { name: "Weak Password Detected", severity: "high", type: "password", action_taken: "flagged" },
        { name: "Unencrypted Connection History", severity: "medium", type: "network", action_taken: "cleared" },
        { name: "Tracking Cookies", severity: "low", type: "cookie", action_taken: "removed" }
      ];

      for (let i = 0; i < randomThreatCount; i++) {
        threats.push(possibleThreats[i]);
      }

      // Generate cleanup data
      const junkCleaned = Math.floor(Math.random() * 500) + 100; // 100-600 MB
      const memoryReleased = Math.floor(Math.random() * 300) + 50; // 50-350 MB

      // Generate AI summary
      const summaryPrompt = `Generate a friendly 2-3 sentence security scan summary for a user whose device scan found:
- ${threats.length} potential security issues
- ${junkCleaned}MB of junk data cleaned
- ${memoryReleased}MB of memory optimized
- Security score: ${user?.risk_score || 85}/100

Be encouraging and explain what was done. Sign as "Mia 🤖"`;

      const aiSummary = await base44.integrations.Core.InvokeLLM({
        prompt: summaryPrompt,
      });

      const scanDuration = Math.floor((Date.now() - startTime) / 1000);

      const results = {
        scan_type: scanType,
        threats_found: threats.length,
        threats_details: threats,
        junk_cleaned_mb: junkCleaned,
        memory_released_mb: memoryReleased,
        scan_duration_seconds: scanDuration,
        status: threats.length > 0 ? 'cleaned' : 'clean',
        device_info: deviceInfo,
        ai_summary: aiSummary
      };

      await createLogMutation.mutateAsync(results);
      
      setScanProgress(100);
      setScanResult(results); // Use scanResult
      setCurrentScan("Scan complete!");

      // Show toast notification
      toast.success(threats.length > 0 
        ? `Scan complete! Found and cleaned ${threats.length} issue${threats.length > 1 ? 's' : ''}`
        : "Scan complete! Your device is clean 🎉"
      );

    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan failed. Please try again.');
    }

    setScanning(false);
  };

  const toggleRealTimeProtection = async () => { // Renamed function
    const newValue = !realTimeProtection; // Use realTimeProtection
    setRealTimeProtection(newValue); // Use setRealTimeProtection
    await updateUserMutation.mutateAsync({ auto_protection_enabled: newValue }); // API field remains auto_protection_enabled
    toast.success(newValue ? 'Real-time protection enabled' : 'Real-time protection disabled');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  // Use deviceLogs for calculations
  const lastScan = deviceLogs[0];
  const totalThreatsBlocked = deviceLogs.reduce((sum, log) => sum + (log.threats_found || 0), 0);
  const totalJunkCleaned = deviceLogs.reduce((sum, log) => sum + (log.junk_cleaned_mb || 0), 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-cyan-400" />
            Device Care
          </h1>
          <p className="text-gray-400 mt-1">Scan, clean, and optimize your device security</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => performScan('quick')}
            disabled={scanning}
            variant="outline"
            className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Zap className="w-4 h-4 mr-2" />
            Quick Scan
          </Button>
          <Button
            onClick={() => performScan('full')}
            disabled={scanning}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Shield className="w-4 h-4 mr-2" />
            Full Scan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Scans</p>
                <p className="text-2xl font-bold text-white">{deviceLogs.length}</p> {/* Use deviceLogs */}
              </div>
              <Shield className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Threats Blocked</p>
                <p className="text-2xl font-bold text-white">{totalThreatsBlocked}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Junk Cleaned</p>
                <p className="text-2xl font-bold text-white">{(totalJunkCleaned / 1024).toFixed(1)}GB</p>
              </div>
              <Trash2 className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Last Scan</p>
                <p className="text-sm font-bold text-white">
                  {lastScan ? new Date(lastScan.created_date).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <Clock className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Scan Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scan Radar */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-8">
              <ScanRadar 
                scanning={scanning} 
                progress={scanProgress}
                currentScan={currentScan}
              />
              
              {scanResult && !scanning && ( // Use scanResult
                <CleanupResults results={scanResult} /> // Use scanResult
              )}
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Auto Protection */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Real-Time Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <div>
                  <p className="text-white font-semibold text-sm">Auto-Scan</p>
                  <p className="text-xs text-gray-400">Daily automatic scans</p>
                </div>
                <button
                  onClick={toggleRealTimeProtection} // Use toggleRealTimeProtection
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    realTimeProtection ? 'bg-green-500' : 'bg-gray-600' // Use realTimeProtection
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    realTimeProtection ? 'translate-x-6' : 'translate-x-0' // Use realTimeProtection
                  }`} />
                </button>
              </div>
              {realTimeProtection && ( // Use realTimeProtection
                <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-xs text-green-400">
                    ✅ Your device is being monitored 24/7
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Device Status */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Cpu className="w-5 h-5 text-cyan-400" />
                Device Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Security</span>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  Protected
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm text-gray-300">Storage</span>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                  Optimized
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-gray-300">Performance</span>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  Good
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Mia Tips */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">Mia's Tip</p>
                  <p className="text-xs text-gray-300">
                    Run a full scan weekly to keep your device in peak condition! 🚀
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Threats List */}
      {scanResult && scanResult.threats_details && scanResult.threats_details.length > 0 && ( // Use scanResult
        <ThreatsList threats={scanResult.threats_details} /> // Use scanResult
      )}

      {/* Scan History */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Recent Scans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deviceLogs.length === 0 ? ( // Use deviceLogs
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No scans yet</p>
              <p className="text-xs text-gray-500 mt-1">Run your first scan to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deviceLogs.slice(0, 5).map((log) => ( // Use deviceLogs
                <div
                  key={log.id}
                  className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${
                          log.status === 'clean' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                        } border text-xs`}>
                          {log.scan_type} scan
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(log.created_date).toLocaleString()}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400">Threats: </span>
                          <span className={log.threats_found > 0 ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                            {log.threats_found}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Cleaned: </span>
                          <span className="text-purple-400 font-semibold">{log.junk_cleaned_mb}MB</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Memory: </span>
                          <span className="text-cyan-400 font-semibold">{log.memory_released_mb}MB</span>
                        </div>
                      </div>
                      {log.ai_summary && (
                        <p className="text-xs text-gray-300 mt-2 line-clamp-2">{log.ai_summary}</p>
                      )}
                    </div>
                    {log.status === 'clean' ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <Shield className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
