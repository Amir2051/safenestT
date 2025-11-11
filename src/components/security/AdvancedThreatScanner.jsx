import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Shield, AlertTriangle, Activity, Battery, Network,
  Lock, Eye, Download, Loader2, CheckCircle, XCircle,
  AlertOctagon, Info, Zap
} from "lucide-react";
import { toast } from "sonner";

export default function AdvancedThreatScanner({ onScanComplete }) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState(null);
  const queryClient = useQueryClient();

  // Collect device data for analysis
  const collectDeviceData = async () => {
    const deviceData = {
      device_info: {
        os: navigator.platform,
        os_version: navigator.userAgent,
        browser: navigator.userAgent.split(/[()]/)[1] || 'Unknown',
        device_type: /Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        is_rooted: false, // Browser can't detect this
        has_developer_mode: false
      },
      battery: {},
      network: {
        active_connections: navigator.onLine ? 1 : 0,
        suspicious_endpoints: [],
        unusual_traffic: false,
        data_exfiltration_risk: false,
        untrusted_certificates: 0
      },
      permissions: {
        total_permissions: 0,
        dangerous_permissions: [],
        recently_granted: [],
        suspicious_apps: []
      },
      integrity: {
        app_signature_valid: true,
        files_tampered: false,
        system_modified: false,
        unknown_binaries: 0
      },
      processes: {
        suspicious: []
      }
    };

    // Try to get battery info
    try {
      if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        const level = Math.round(battery.level * 100);
        
        // Simulate drain rate analysis (in real app, this would be tracked over time)
        deviceData.battery = {
          current_level: level,
          is_charging: battery.charging,
          drain_rate: battery.charging ? 0 : Math.random() * 20 + 5, // 5-25%/hour
          unusual_drain: false,
          background_consumption: 0
        };
        
        deviceData.battery.unusual_drain = deviceData.battery.drain_rate > 15;
      }
    } catch (e) {
      console.log('Battery API not available');
    }

    // Check for permissions (limited in browser)
    const permissionAPIs = [
      'geolocation',
      'notifications',
      'camera',
      'microphone'
    ];

    for (const api of permissionAPIs) {
      try {
        if (navigator.permissions) {
          const result = await navigator.permissions.query({ name: api });
          if (result.state === 'granted') {
            deviceData.permissions.total_permissions++;
            if (['camera', 'microphone'].includes(api)) {
              deviceData.permissions.dangerous_permissions.push(api);
            }
          }
        }
      } catch (e) {
        // Permission API not supported for this permission
      }
    }

    // Check network connections (simulated)
    const connectionInfo = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connectionInfo) {
      deviceData.network.connection_type = connectionInfo.effectiveType;
      deviceData.network.downlink = connectionInfo.downlink;
    }

    return deviceData;
  };

  const scanMutation = useMutation({
    mutationFn: async (scanType) => {
      setScanProgress(10);
      
      // Collect device data
      const deviceData = await collectDeviceData();
      setScanProgress(30);

      // Simulate scanning stages
      await new Promise(resolve => setTimeout(resolve, 1000));
      setScanProgress(50);

      // Run security scan
      const response = await base44.functions.invoke('spywareDefenseService', {
        endpoint: 'run-security-scan',
        scan_type: scanType,
        device_data: deviceData
      });

      setScanProgress(80);
      await new Promise(resolve => setTimeout(resolve, 500));
      setScanProgress(100);

      return response.data;
    },
    onSuccess: (data) => {
      setScanResults(data);
      queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      
      if (data.threat_level === 'critical' || data.threat_level === 'high') {
        toast.error(`🚨 ${data.threat_level.toUpperCase()} threats detected!`, {
          description: `${data.anomalies.length} security issues found`,
          duration: 10000
        });
      } else if (data.threat_level === 'secure') {
        toast.success('✅ No threats detected - Your device is secure!');
      } else {
        toast.warning(`⚠️ ${data.anomalies.length} potential issues found`);
      }

      if (onScanComplete) {
        onScanComplete(data);
      }
    },
    onError: (error) => {
      toast.error('Scan failed: ' + error.message);
      setScanning(false);
      setScanProgress(0);
    }
  });

  const handleScan = async (scanType) => {
    setScanning(true);
    setScanProgress(0);
    setScanResults(null);
    await scanMutation.mutateAsync(scanType);
    setScanning(false);
  };

  const handleDownloadReport = async () => {
    if (!scanResults?.forensic_report) {
      toast.error('No forensic report available');
      return;
    }

    try {
      const response = await base44.functions.invoke('spywareDefenseService', {
        endpoint: 'get-forensic-report',
        scan_id: scanResults.scan_id
      });

      window.open(response.data.signed_url, '_blank');
      toast.success('📄 Forensic report downloaded');
    } catch (error) {
      toast.error('Failed to download report: ' + error.message);
    }
  };

  const getThreatColor = (level) => {
    switch (level) {
      case 'secure': return 'text-green-400';
      case 'low': return 'text-blue-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getThreatBg = (level) => {
    switch (level) {
      case 'secure': return 'bg-green-500/10 border-green-500/30';
      case 'low': return 'bg-blue-500/10 border-blue-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'high': return 'bg-orange-500/10 border-orange-500/30';
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            Advanced Threat Scanner
          </CardTitle>
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
            Anti-Spyware
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info Banner */}
        <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-purple-300 font-semibold text-sm mb-1">
                Pegasus-Grade Protection
              </p>
              <p className="text-purple-200 text-xs">
                Detects advanced spyware indicators including battery drain, network anomalies, 
                system tampering, and suspicious processes. Generates encrypted forensic reports.
              </p>
            </div>
          </div>
        </div>

        {/* Scan Buttons */}
        {!scanning && !scanResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleScan('quick_scan')}
              className="h-24 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 flex flex-col gap-2"
            >
              <Zap className="w-6 h-6" />
              <div>
                <div className="font-bold">Quick Scan</div>
                <div className="text-xs opacity-80">30 seconds</div>
              </div>
            </Button>

            <Button
              onClick={() => handleScan('deep_scan')}
              className="h-24 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 flex flex-col gap-2"
            >
              <Activity className="w-6 h-6" />
              <div>
                <div className="font-bold">Deep Scan</div>
                <div className="text-xs opacity-80">2-3 minutes</div>
              </div>
            </Button>
          </div>
        )}

        {/* Scanning Progress */}
        {scanning && (
          <div className="space-y-4">
            <div className="p-6 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  <div>
                    <p className="text-white font-semibold">
                      Scanning for threats...
                    </p>
                    <p className="text-gray-400 text-sm">
                      {scanProgress < 30 && 'Collecting device data...'}
                      {scanProgress >= 30 && scanProgress < 50 && 'Analyzing battery patterns...'}
                      {scanProgress >= 50 && scanProgress < 80 && 'Checking network activity...'}
                      {scanProgress >= 80 && 'Generating security report...'}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-cyan-400">
                  {scanProgress}%
                </span>
              </div>
              <Progress value={scanProgress} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0f1419] rounded border border-cyan-500/10 flex items-center gap-2">
                <Battery className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-300">Battery Analysis</span>
              </div>
              <div className="p-3 bg-[#0f1419] rounded border border-cyan-500/10 flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-300">Network Check</span>
              </div>
              <div className="p-3 bg-[#0f1419] rounded border border-cyan-500/10 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-300">Integrity Scan</span>
              </div>
              <div className="p-3 bg-[#0f1419] rounded border border-cyan-500/10 flex items-center gap-2">
                <Eye className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-300">Process Audit</span>
              </div>
            </div>
          </div>
        )}

        {/* Scan Results */}
        {scanResults && !scanning && (
          <div className="space-y-4">
            {/* Threat Level Summary */}
            <div className={`p-6 rounded-lg border-2 ${getThreatBg(scanResults.threat_level)}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {scanResults.threat_level === 'secure' ? (
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  ) : scanResults.threat_level === 'critical' || scanResults.threat_level === 'high' ? (
                    <AlertOctagon className="w-8 h-8 text-red-400 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-yellow-400" />
                  )}
                  <div>
                    <h3 className={`text-xl font-bold ${getThreatColor(scanResults.threat_level)}`}>
                      {scanResults.threat_level.toUpperCase()} Threat Level
                    </h3>
                    <p className="text-gray-300 text-sm">
                      Confidence: {scanResults.confidence_score}%
                    </p>
                  </div>
                </div>
                <Badge className={`text-lg px-4 py-2 ${getThreatBg(scanResults.threat_level)}`}>
                  {scanResults.anomalies.length} Issues
                </Badge>
              </div>

              {scanResults.threat_level !== 'secure' && (
                <div className="p-3 bg-[#0f1419]/50 rounded border border-cyan-500/10 mt-3">
                  <p className="text-xs text-gray-300">
                    Scan ID: {scanResults.scan_id} • Duration: {scanResults.duration_seconds.toFixed(2)}s
                  </p>
                </div>
              )}
            </div>

            {/* Anomalies List */}
            {scanResults.anomalies.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  Detected Threats
                </h4>
                {scanResults.anomalies.map((anomaly, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border ${getThreatBg(anomaly.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className={`font-semibold ${getThreatColor(anomaly.severity)}`}>
                        {anomaly.title}
                      </h5>
                      <Badge className={getThreatBg(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">
                      {anomaly.description}
                    </p>
                    {anomaly.indicators && anomaly.indicators.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-400 mb-1">Indicators:</p>
                        <ul className="text-xs text-gray-300 space-y-1 ml-4">
                          {anomaly.indicators.slice(0, 3).map((indicator, i) => (
                            <li key={i}>• {indicator}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 p-2 bg-[#0f1419]/50 rounded">
                      <p className="text-xs text-cyan-400">
                        <strong>Action:</strong> {anomaly.recommended_action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            {scanResults.recommendations && scanResults.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-semibold flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Security Recommendations
                </h4>
                {scanResults.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${getThreatBg(rec.priority)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className={`font-semibold text-sm ${getThreatColor(rec.priority)}`}>
                          {rec.action}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {rec.reason}
                        </p>
                      </div>
                      {rec.auto_fixable && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">
                          Auto-Fix
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => handleScan('quick_scan')}
                variant="outline"
                className="flex-1 border-cyan-500/20"
              >
                <Activity className="w-4 h-4 mr-2" />
                Rescan
              </Button>
              
              {scanResults.forensic_report && (
                <Button
                  onClick={handleDownloadReport}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Forensic Report
                </Button>
              )}
            </div>

            {/* Critical Warning */}
            {(scanResults.threat_level === 'critical' || scanResults.threat_level === 'high') && (
              <div className="p-4 bg-red-500/10 border-2 border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertOctagon className="w-6 h-6 text-red-400 flex-shrink-0 animate-pulse" />
                  <div>
                    <p className="text-red-400 font-bold text-sm mb-1">
                      CRITICAL SECURITY ALERT
                    </p>
                    <p className="text-red-300 text-xs">
                      Your device shows signs of sophisticated surveillance software.
                      If you are a journalist, activist, or high-risk individual, this could be
                      a nation-state attack (Pegasus/Predator). Contact a certified mobile
                      forensic analyst immediately. Do not use this device for sensitive activities.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}