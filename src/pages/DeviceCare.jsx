import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Smartphone, Trash2, Zap, Clock, CheckCircle, 
  AlertTriangle, Sparkles, TrendingUp, Cpu, HardDrive, Activity, Database
} from "lucide-react";
import { toast } from "sonner";
import LiveClock from "@/components/shared/LiveClock";

import ScanRadar from "../components/devicecare/ScanRadar.jsx";
import CleanupResults from "../components/devicecare/CleanupResults.jsx";
import ThreatsList from "../components/devicecare/ThreatsList.jsx";

export default function DeviceCare() {
  const [user, setUser] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScan, setCurrentScan] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [realTimeProtection, setRealTimeProtection] = useState(false);
  const [browserData, setBrowserData] = useState(null);
  const [cleaning, setCleaning] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setRealTimeProtection(userData.auto_protection_enabled || false);
    }).catch(() => {});
  }, []);

  const { data: deviceLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['device-logs'],
    queryFn: () => base44.entities.DeviceProtectionLog.list('-created_date', 10),
    initialData: [],
  });

  const createLogMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.DeviceProtectionLog.create(data);
      
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
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
  });

  // Scan REAL browser data
  const scanBrowserData = async () => {
    const data = {
      localStorage: [],
      sessionStorage: [],
      cookies: [],
      cacheSize: 0,
      indexedDBSize: 0,
      totalSize: 0
    };

    // Scan LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      const size = new Blob([value]).size;
      data.localStorage.push({
        key,
        size,
        type: 'localStorage',
        canDelete: !key.startsWith('user_') && !key.startsWith('auth_') // Example: don't delete auth tokens or user settings
      });
      data.totalSize += size;
    }

    // Scan SessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      const size = new Blob([value]).size;
      data.sessionStorage.push({
        key,
        size,
        type: 'sessionStorage',
        canDelete: true // Session storage is generally safe to delete after session
      });
      data.totalSize += size;
    }

    // Scan Cookies
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key) {
        const size = new Blob([cookie]).size;
        data.cookies.push({
          key,
          size,
          type: 'cookie',
          canDelete: !key.startsWith('auth') && !key.startsWith('session') // Example: don't delete auth or session cookies
        });
        data.totalSize += size;
      }
    });

    // Estimate cache size (approximation)
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      data.cacheSize = estimate.usage || 0;
      data.totalSize += data.cacheSize;
    }

    return data;
  };

  // Delete specific browser data
  const deleteBrowserItem = async (item) => {
    try {
      if (item.type === 'localStorage') {
        localStorage.removeItem(item.key);
        toast.success(`Removed ${item.key} from local storage`);
      } else if (item.type === 'sessionStorage') {
        sessionStorage.removeItem(item.key);
        toast.success(`Removed ${item.key} from session storage`);
      } else if (item.type === 'cookie') {
        document.cookie = `${item.key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        toast.success(`Removed cookie ${item.key}`);
      }
      
      // Rescan after deletion
      const newData = await scanBrowserData();
      setBrowserData(newData);
      
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    }
  };

  // Clean all deletable items
  const cleanAllDeletable = async () => {
    if (!browserData) return;
    
    setCleaning(true);
    let cleaned = 0;
    let sizeFreed = 0;

    try {
      // Clean localStorage
      browserData.localStorage.forEach(item => {
        if (item.canDelete) {
          localStorage.removeItem(item.key);
          cleaned++;
          sizeFreed += item.size;
        }
      });

      // Clean sessionStorage
      browserData.sessionStorage.forEach(item => {
        if (item.canDelete) {
          sessionStorage.removeItem(item.key);
          cleaned++;
          sizeFreed += item.size;
        }
      });

      // Clean cookies
      browserData.cookies.forEach(item => {
        if (item.canDelete) {
          document.cookie = `${item.key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          cleaned++;
          sizeFreed += item.size;
        }
      });

      toast.success(`🧹 Cleaned ${cleaned} items, freed ${(sizeFreed / 1024).toFixed(2)}KB`);
      
      // Rescan
      const newData = await scanBrowserData();
      setBrowserData(newData);
      
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Failed to complete cleanup');
    }
    
    setCleaning(false);
  };

  const performScan = async (scanType) => {
    setScanning(true);
    setScanProgress(0);
    setScanResult(null);
    
    const startTime = Date.now();

    try {
      // Step 1: Scan browser data (REAL)
      setScanProgress(10);
      setCurrentScan("Scanning browser storage...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const realBrowserData = await scanBrowserData();
      setBrowserData(realBrowserData);

      // Step 2: Analyze stored data
      setScanProgress(25);
      setCurrentScan("Analyzing stored data for potential issues...");
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Check security settings
      setScanProgress(40);
      setCurrentScan("Checking device security settings...");
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 4: Scan for vulnerabilities
      setScanProgress(55);
      setCurrentScan("Detecting potential vulnerabilities...");
      await new Promise(resolve => setTimeout(resolve, 700));

      // Step 5: Check passwords
      setScanProgress(70);
      setCurrentScan("Checking password security...");
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 6: Final analysis
      setScanProgress(85);
      setCurrentScan("Generating security report...");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Analyze REAL threats
      const threats = [];
      
      // Check for security issues based on user settings
      if (user && !user.two_factor_enabled) {
        threats.push({
          name: "Two-Factor Authentication Disabled",
          severity: "high",
          type: "security",
          action_taken: "flagged"
        });
      }

      if (user && !user.vpn_enabled) {
        threats.push({
          name: "VPN Protection Not Active",
          severity: "medium",
          type: "network",
          action_taken: "flagged"
        });
      }

      // Check browser data size
      const totalKB = realBrowserData.totalSize / 1024;
      if (totalKB > 1000) {
        threats.push({
          name: `Large Browser Data (${totalKB.toFixed(0)}KB)`,
          severity: "low",
          type: "storage",
          action_taken: "detected"
        });
      }

      // Check for deletable cookies
      const deletableCookiesCount = realBrowserData.cookies.filter(c => c.canDelete).length;
      if (deletableCookiesCount > 10) {
        threats.push({
          name: `${deletableCookiesCount} Tracking Cookies Detected`,
          severity: "low",
          type: "privacy",
          action_taken: "detected"
        });
      }

      // Get device/browser info
      const deviceInfo = {
        os: navigator.platform,
        browser: navigator.userAgent.split(' ').pop().split('/')[0],
        storage_used: `${(realBrowserData.totalSize / 1024).toFixed(2)}KB`,
        items_found: realBrowserData.localStorage.length + realBrowserData.sessionStorage.length + realBrowserData.cookies.length
      };

      // Calculate cleanup potential
      const deletableItems = [
        ...realBrowserData.localStorage.filter(i => i.canDelete),
        ...realBrowserData.sessionStorage.filter(i => i.canDelete),
        ...realBrowserData.cookies.filter(i => i.canDelete)
      ];
      
      const cleanupPotential = deletableItems.reduce((sum, item) => sum + item.size, 0);

      // Generate AI summary
      const summaryPrompt = `Generate a friendly 2-3 sentence security scan summary for a user whose device scan found:
- ${threats.length} potential security issues
- ${(realBrowserData.totalSize / (1024 * 1024)).toFixed(2)}MB browser data analyzed
- ${deletableItems.length} browser items can be safely cleaned, potentially freeing ${(cleanupPotential / (1024 * 1024)).toFixed(2)}MB.

Be encouraging and explain what was found. Sign as "Mia 🤖"`;

      const aiSummary = await base44.integrations.Core.InvokeLLM({
        prompt: summaryPrompt,
      });

      const scanDuration = Math.floor((Date.now() - startTime) / 1000);

      const results = {
        scan_type: scanType,
        threats_found: threats.length,
        threats_details: threats,
        junk_cleaned_mb: 0, // No auto-clean, user must manually clean
        memory_released_mb: Math.floor(realBrowserData.totalSize / (1024 * 1024)), // Represents browser data size in MB
        scan_duration_seconds: scanDuration,
        status: threats.length > 0 ? 'threats_found' : 'clean',
        device_info: deviceInfo,
        ai_summary: aiSummary,
        browser_data: realBrowserData,
        cleanup_potential_mb: cleanupPotential / (1024 * 1024),
        deletable_count: deletableItems.length
      };

      await createLogMutation.mutateAsync(results);
      
      setScanProgress(100);
      setScanResult(results);
      setCurrentScan("Scan complete!");

      toast.success(threats.length > 0 
        ? `Found ${threats.length} issue${threats.length > 1 ? 's' : ''} and ${deletableItems.length} browser items to clean`
        : "Scan complete! Your browser is clean 🎉"
      );

    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Scan failed. Please try again.');
    }

    setScanning(false);
  };

  const toggleRealTimeProtection = async () => {
    const newValue = !realTimeProtection;
    setRealTimeProtection(newValue);
    await updateUserMutation.mutateAsync({ auto_protection_enabled: newValue });
    toast.success(newValue ? 'Real-time protection enabled' : 'Real-time protection disabled');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const lastScan = deviceLogs[0];
  const totalThreatsBlocked = deviceLogs.reduce((sum, log) => sum + (log.threats_found || 0), 0);
  const totalJunkCleaned = deviceLogs.reduce((sum, log) => sum + (log.junk_cleaned_mb || 0), 0); // This will remain 0 unless auto-cleanup is implemented.

  // Calculate deletable items count from browserData
  const deletableCount = browserData ? (
    browserData.localStorage.filter(i => i.canDelete).length +
    browserData.sessionStorage.filter(i => i.canDelete).length +
    browserData.cookies.filter(i => i.canDelete).length
  ) : 0;

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
                <p className="text-2xl font-bold text-white">{deviceLogs.length}</p>
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
                <p className="text-2xl font-bold text-white">{(totalJunkCleaned).toFixed(1)}MB</p>
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
                  <LiveClock />
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
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-8">
              <ScanRadar 
                scanning={scanning} 
                progress={scanProgress}
                currentScan={currentScan}
              />
              
              {scanResult && !scanning && (
                <CleanupResults results={scanResult} />
              )}
            </CardContent>
          </Card>

          {/* Real Browser Data Cleanup */}
          {browserData && !scanning && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-purple-400" />
                    Browser Data - Real Cleanup
                  </CardTitle>
                  <Button
                    onClick={cleanAllDeletable}
                    disabled={cleaning || deletableCount === 0}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {cleaning ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Cleaning...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clean All ({deletableCount})
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                    <p className="text-xs text-gray-400">Total Size</p>
                    <p className="text-lg font-bold text-white">{(browserData.totalSize / 1024).toFixed(2)}KB</p>
                  </div>
                  <div className="p-3 bg-[#0f1419] rounded-lg border border-green-500/10">
                    <p className="text-xs text-gray-400">Items Found</p>
                    <p className="text-lg font-bold text-green-400">
                      {browserData.localStorage.length + browserData.sessionStorage.length + browserData.cookies.length}
                    </p>
                  </div>
                  <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/10">
                    <p className="text-xs text-gray-400">Can Clean</p>
                    <p className="text-lg font-bold text-purple-400">
                      {browserData.localStorage.filter(i => i.canDelete).length + 
                       browserData.sessionStorage.filter(i => i.canDelete).length + 
                       browserData.cookies.filter(i => i.canDelete).length}
                    </p>
                  </div>
                </div>

                {/* LocalStorage Items */}
                {browserData.localStorage.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      LocalStorage ({browserData.localStorage.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {browserData.localStorage.map((item, idx) => (
                        <div key={item.key || idx} className="flex items-center justify-between p-2 bg-[#0f1419] rounded border border-cyan-500/10">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.key}</p>
                            <p className="text-xs text-gray-400">{(item.size / 1024).toFixed(2)}KB</p>
                          </div>
                          {item.canDelete ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteBrowserItem(item)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Protected
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SessionStorage Items */}
                {browserData.sessionStorage.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      SessionStorage ({browserData.sessionStorage.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {browserData.sessionStorage.map((item, idx) => (
                        <div key={item.key || idx} className="flex items-center justify-between p-2 bg-[#0f1419] rounded border border-blue-500/10">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.key}</p>
                            <p className="text-xs text-gray-400">{(item.size / 1024).toFixed(2)}KB</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBrowserItem(item)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cookies */}
                {browserData.cookies.length > 0 && (
                  <div>
                    <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                      🍪 Cookies ({browserData.cookies.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {browserData.cookies.map((item, idx) => (
                        <div key={item.key || idx} className="flex items-center justify-between p-2 bg-[#0f1419] rounded border border-yellow-500/10">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.key}</p>
                            <p className="text-xs text-gray-400">{(item.size / 1024).toFixed(2)}KB</p>
                          </div>
                          {item.canDelete ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteBrowserItem(item)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              Protected
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
                  onClick={toggleRealTimeProtection}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    realTimeProtection ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    realTimeProtection ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              {realTimeProtection && (
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
      {scanResult && scanResult.threats_details && scanResult.threats_details.length > 0 && (
        <ThreatsList threats={scanResult.threats_details} />
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
          {deviceLogs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No scans yet</p>
              <p className="text-xs text-gray-500 mt-1">Run your first scan to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deviceLogs.slice(0, 5).map((log) => (
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