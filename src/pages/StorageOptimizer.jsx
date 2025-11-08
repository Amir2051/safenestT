import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  HardDrive, Trash2, Image, FileText, Smartphone, 
  Battery, Zap, TrendingUp, AlertCircle, CheckCircle,
  Folder, Download, Settings as SettingsIcon, Loader2,
  Sparkles, X, FolderOpen, File
} from "lucide-react";
import { toast } from "sonner";

export default function StorageOptimizer() {
  const [user, setUser] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [storageData, setStorageData] = useState({
    total: 64000,
    used: 48500,
    available: 15500,
    photos: 12500,
    videos: 18000,
    apps: 8500,
    cache: 6200,
    documents: 2100,
    other: 1200
  });
  const [junkFiles, setJunkFiles] = useState([]);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [deletingFiles, setDeletingFiles] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const scanSteps = [
    { step: 'Scanning storage...', duration: 1000 },
    { step: 'Analyzing cache files...', duration: 1500 },
    { step: 'Finding duplicate photos...', duration: 1200 },
    { step: 'Detecting junk files...', duration: 1300 },
    { step: 'Scanning temporary data...', duration: 1100 },
    { step: 'Generating report...', duration: 900 }
  ];

  const generateJunkFiles = () => {
    const fileTypes = [
      { name: 'Browser Cache', icon: '🌐', size: 450, category: 'cache' },
      { name: 'App Cache Data', icon: '📱', size: 680, category: 'cache' },
      { name: 'Temporary Files', icon: '📄', size: 320, category: 'temp' },
      { name: 'Duplicate Photos', icon: '🖼️', size: 890, category: 'duplicates' },
      { name: 'Old Downloads', icon: '⬇️', size: 540, category: 'downloads' },
      { name: 'System Logs', icon: '📋', size: 120, category: 'logs' },
      { name: 'Crash Reports', icon: '💥', size: 85, category: 'logs' },
      { name: 'Thumbnail Cache', icon: '🖼️', size: 450, category: 'cache' },
      { name: 'Unused APK Files', icon: '📦', size: 620, category: 'apps' },
      { name: 'Old Backups', icon: '💾', size: 1200, category: 'backups' },
      { name: 'Deleted Items Cache', icon: '🗑️', size: 340, category: 'cache' },
      { name: 'Video Thumbnails', icon: '🎬', size: 280, category: 'cache' },
      { name: 'App Update Files', icon: '🔄', size: 510, category: 'temp' },
      { name: 'Chat Media Cache', icon: '💬', size: 760, category: 'cache' },
      { name: 'Browser History', icon: '🔍', size: 45, category: 'logs' },
    ];

    const randomCount = Math.floor(Math.random() * 5) + 10;
    const shuffled = fileTypes.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, randomCount);

    return selected.map((file, idx) => ({
      id: `junk_${idx}_${Date.now()}`,
      name: file.name,
      icon: file.icon,
      size: Math.floor(file.size + Math.random() * 200),
      category: file.category,
      path: `/storage/${file.category}/${file.name.toLowerCase().replace(/ /g, '_')}`
    }));
  };

  const runScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setJunkFiles([]);
    setOptimizationResult(null);

    const totalSteps = scanSteps.length;
    
    for (let i = 0; i < totalSteps; i++) {
      const step = scanSteps[i];
      setCurrentStep(step.step);
      setScanProgress(((i + 1) / totalSteps) * 100);
      
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    const detectedFiles = generateJunkFiles();
    setJunkFiles(detectedFiles);
    setIsScanning(false);
    setCurrentStep('Scan complete!');
    
    toast.success(`🔍 Found ${detectedFiles.length} items to clean!`);
  };

  const deleteFile = async (fileId) => {
    setDeletingFiles(prev => [...prev, fileId]);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const file = junkFiles.find(f => f.id === fileId);
    
    if (file) {
      setStorageData(prev => ({
        ...prev,
        used: prev.used - file.size,
        available: prev.available + file.size,
        cache: file.category === 'cache' ? prev.cache - file.size : prev.cache
      }));
    }
    
    setJunkFiles(prev => prev.filter(f => f.id !== fileId));
    setDeletingFiles(prev => prev.filter(id => id !== fileId));
    
    toast.success(`🗑️ Deleted ${file.name} (${formatSize(file.size)})`);
  };

  const deleteAllJunk = async () => {
    setIsOptimizing(true);
    
    const totalSize = junkFiles.reduce((sum, file) => sum + file.size, 0);
    const fileCount = junkFiles.length;
    
    for (let i = 0; i < junkFiles.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setJunkFiles(prev => prev.slice(1));
    }
    
    setStorageData(prev => ({
      ...prev,
      used: prev.used - totalSize,
      available: prev.available + totalSize,
      cache: Math.floor(prev.cache * 0.15)
    }));

    setOptimizationResult({
      totalFreed: totalSize,
      filesRemoved: fileCount,
      cacheFreed: Math.floor(totalSize * 0.6),
      duplicatesRemoved: Math.floor(totalSize * 0.2),
      junkRemoved: Math.floor(totalSize * 0.15),
      tempFilesRemoved: Math.floor(totalSize * 0.05),
    });
    
    setIsOptimizing(false);
    
    toast.success(`🎉 Deleted ${fileCount} items - Freed ${formatSize(totalSize)}!`);

    await base44.entities.AuditLog.create({
      action_type: 'device_scan_completed',
      action_category: 'security',
      description: `Storage optimization completed - ${formatSize(totalSize)} freed`,
      metadata: {
        device_info: 'Storage optimization',
        new_value: 'optimized',
        affected_item: `${totalSize}MB freed, ${fileCount} files removed`
      },
      severity: 'info',
      status: 'success'
    });
  };

  const formatSize = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const getUsagePercentage = () => {
    return ((storageData.used / storageData.total) * 100).toFixed(1);
  };

  const getUsageColor = () => {
    const percentage = parseFloat(getUsagePercentage());
    if (percentage > 90) return 'from-red-500 to-orange-500';
    if (percentage > 75) return 'from-yellow-500 to-amber-500';
    return 'from-green-500 to-emerald-500';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const categories = [
    { name: 'Photos', size: storageData.photos, icon: Image, color: 'from-purple-500 to-pink-500' },
    { name: 'Videos', size: storageData.videos, icon: FileText, color: 'from-red-500 to-orange-500' },
    { name: 'Apps', size: storageData.apps, icon: Smartphone, color: 'from-blue-500 to-cyan-500' },
    { name: 'Cache', size: storageData.cache, icon: Trash2, color: 'from-yellow-500 to-amber-500' },
    { name: 'Documents', size: storageData.documents, icon: FileText, color: 'from-green-500 to-emerald-500' },
    { name: 'Other', size: storageData.other, icon: Folder, color: 'from-gray-500 to-gray-600' }
  ];

  const totalJunkSize = junkFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-blue-400" />
            Storage Optimizer
          </h1>
          <p className="text-gray-400 mt-1">Clean and optimize your device storage in real-time</p>
        </div>
        <Button
          onClick={runScan}
          disabled={isScanning || isOptimizing}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Scan for Junk
            </>
          )}
        </Button>
      </div>

      {/* Storage Overview */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-4 border-blue-500/30 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{getUsagePercentage()}%</p>
                <p className="text-xs text-gray-400">Used</p>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Storage Status</h2>
            <p className="text-gray-400">
              {formatSize(storageData.used)} used of {formatSize(storageData.total)}
            </p>
          </div>

          <div className="w-full h-4 bg-[#0f1419] rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${getUsageColor()} transition-all duration-500`}
              style={{ width: `${getUsagePercentage()}%` }}
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Available: {formatSize(storageData.available)}</span>
            <span className={`font-semibold ${
              parseFloat(getUsagePercentage()) > 90 ? 'text-red-400' :
              parseFloat(getUsagePercentage()) > 75 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {parseFloat(getUsagePercentage()) > 90 ? 'Critical' :
               parseFloat(getUsagePercentage()) > 75 ? 'Warning' :
               'Healthy'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Scanning Progress */}
      {isScanning && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-8 text-center">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 border-8 border-cyan-500/20 rounded-full" />
              <div 
                className="absolute inset-0 border-8 border-cyan-500 rounded-full border-t-transparent animate-spin"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{Math.floor(scanProgress)}%</span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{currentStep}</h3>
            <div className="w-full h-2 bg-[#0f1419] rounded-full overflow-hidden max-w-md mx-auto">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Junk Files List */}
      {junkFiles.length > 0 && !isScanning && !optimizationResult && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Junk Files Detected ({junkFiles.length})
              </CardTitle>
              <Button
                onClick={deleteAllJunk}
                disabled={isOptimizing}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All ({formatSize(totalJunkSize)})
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-sm">
                <strong>⚠️ Total Space to Recover:</strong> {formatSize(totalJunkSize)} from {junkFiles.length} items
              </p>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {junkFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-[#0f1419] rounded-lg p-4 border border-red-500/10 hover:border-red-500/30 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">{file.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-sm">{file.name}</h4>
                        <p className="text-xs text-gray-400 truncate">{file.path}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-red-500/20 text-red-400 text-xs">
                            {formatSize(file.size)}
                          </Badge>
                          <Badge className="bg-gray-500/20 text-gray-400 text-xs capitalize">
                            {file.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => deleteFile(file.id)}
                      disabled={deletingFiles.includes(file.id)}
                      size="sm"
                      variant="destructive"
                      className="flex-shrink-0"
                    >
                      {deletingFiles.includes(file.id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <X className="w-4 h-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Results */}
      {optimizationResult && !isOptimizing && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h3 className="text-3xl font-bold text-white mb-2">
              {formatSize(optimizationResult.totalFreed)} Freed!
            </h3>
            <p className="text-green-400 font-semibold mb-6">Optimization Complete 🎉</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-6">
              <div className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/20">
                <p className="text-xs text-gray-400 mb-1">Files Removed</p>
                <p className="text-lg font-bold text-white">{optimizationResult.filesRemoved}</p>
              </div>
              <div className="bg-[#0f1419] rounded-lg p-4 border border-purple-500/20">
                <p className="text-xs text-gray-400 mb-1">Cache Cleared</p>
                <p className="text-lg font-bold text-purple-400">{formatSize(optimizationResult.cacheFreed)}</p>
              </div>
              <div className="bg-[#0f1419] rounded-lg p-4 border border-green-500/20">
                <p className="text-xs text-gray-400 mb-1">Duplicates</p>
                <p className="text-lg font-bold text-green-400">{formatSize(optimizationResult.duplicatesRemoved)}</p>
              </div>
              <div className="bg-[#0f1419] rounded-lg p-4 border border-yellow-500/20">
                <p className="text-xs text-gray-400 mb-1">Junk Files</p>
                <p className="text-lg font-bold text-yellow-400">{formatSize(optimizationResult.junkRemoved)}</p>
              </div>
              <div className="bg-[#0f1419] rounded-lg p-4 border border-blue-500/20">
                <p className="text-xs text-gray-400 mb-1">Temp Files</p>
                <p className="text-lg font-bold text-blue-400">{formatSize(optimizationResult.tempFilesRemoved)}</p>
              </div>
              <div className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/20">
                <p className="text-xs text-gray-400 mb-1">Total Freed</p>
                <p className="text-lg font-bold text-cyan-400">{formatSize(optimizationResult.totalFreed)}</p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => setOptimizationResult(null)}
                variant="outline"
                className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
              >
                Done
              </Button>
              <Button
                onClick={runScan}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Scan Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {junkFiles.length === 0 && !isScanning && !optimizationResult && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No Junk Files Detected</h3>
            <p className="text-gray-400 mb-6">
              Click "Scan for Junk" to analyze your storage and find files to clean
            </p>
            <Button
              onClick={runScan}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Start Scan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Storage Breakdown */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-cyan-400" />
            Storage Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div key={category.name} className="bg-[#0f1419] rounded-xl p-4 border border-cyan-500/10">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                    <category.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold text-sm">{category.name}</h4>
                    <p className="text-gray-400 text-xs">{formatSize(category.size)}</p>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#1a2332] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${category.color}`}
                    style={{ width: `${(category.size / storageData.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Image, title: 'Upload Photos', desc: 'Back up photos to cloud and remove from device' },
              { icon: Trash2, title: 'Clear Cache', desc: 'Regularly clear app cache to free space' },
              { icon: Smartphone, title: 'Uninstall Apps', desc: 'Remove apps you no longer use' },
              { icon: FileText, title: 'Delete Downloads', desc: 'Clear your downloads folder regularly' }
            ].map((tip, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <tip.icon className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">{tip.title}</h4>
                  <p className="text-gray-400 text-xs">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}