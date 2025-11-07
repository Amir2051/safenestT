import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  HardDrive, Trash2, Image, FileText, Smartphone, 
  Battery, Zap, TrendingUp, AlertCircle, CheckCircle,
  Folder, Download, Settings as SettingsIcon
} from "lucide-react";

export default function StorageOptimizer() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const optimizationTips = [
    {
      category: "Cache & Temporary Files",
      icon: Trash2,
      color: "from-red-500 to-orange-500",
      tips: [
        "Clear browser cache regularly (Chrome: Settings → Privacy → Clear browsing data)",
        "Delete downloaded files you no longer need",
        "Remove temporary app files from your device",
        "Clear messaging app media cache (WhatsApp, Telegram, etc.)"
      ],
      potentialSavings: "500MB - 2GB"
    },
    {
      category: "Photos & Videos",
      icon: Image,
      color: "from-purple-500 to-pink-500",
      tips: [
        "Upload photos to cloud storage (Google Photos, iCloud)",
        "Delete duplicate photos and screenshots",
        "Compress large videos before storing",
        "Use 'Free up space' features in Google Photos/iCloud",
        "Review and delete old camera roll items"
      ],
      potentialSavings: "1GB - 10GB"
    },
    {
      category: "Apps & Games",
      icon: Smartphone,
      color: "from-blue-500 to-cyan-500",
      tips: [
        "Uninstall apps you haven't used in 30+ days",
        "Clear app caches: Settings → Apps → [App Name] → Clear Cache",
        "Delete old games and unused apps",
        "Move apps to SD card if available",
        "Use lightweight versions of apps (Facebook Lite, etc.)"
      ],
      potentialSavings: "2GB - 5GB"
    },
    {
      category: "Documents & Downloads",
      icon: FileText,
      color: "from-green-500 to-emerald-500",
      tips: [
        "Review and delete old PDFs and documents",
        "Clear Downloads folder regularly",
        "Move important files to cloud storage",
        "Delete duplicate files",
        "Use file manager apps to identify large files"
      ],
      potentialSavings: "500MB - 3GB"
    }
  ];

  const batteryTips = [
    {
      title: "Reduce Screen Brightness",
      description: "Lower brightness or enable auto-brightness",
      impact: "High",
      steps: ["Go to Settings", "Display → Brightness", "Reduce or enable Auto"]
    },
    {
      title: "Close Background Apps",
      description: "Stop apps running in the background",
      impact: "Medium",
      steps: ["Open Recent Apps", "Swipe away unused apps", "Or Settings → Apps → Force Stop"]
    },
    {
      title: "Disable Location Services",
      description: "Turn off GPS when not needed",
      impact: "High",
      steps: ["Settings → Location", "Toggle off or set to Battery Saving mode"]
    },
    {
      title: "Enable Battery Saver Mode",
      description: "Activates power-saving features",
      impact: "Very High",
      steps: ["Settings → Battery", "Enable Battery Saver or Power Saving Mode"]
    }
  ];

  const deviceChecklistItems = [
    { task: "Clear browser cache", frequency: "Weekly", benefit: "Faster browsing, more storage" },
    { task: "Delete old photos/videos", frequency: "Monthly", benefit: "Free up 1-5GB" },
    { task: "Uninstall unused apps", frequency: "Monthly", benefit: "Free up 500MB-2GB" },
    { task: "Clear app caches", frequency: "Bi-weekly", benefit: "Free up 200-800MB" },
    { task: "Review downloads folder", frequency: "Weekly", benefit: "Free up 100-500MB" },
    { task: "Update all apps", frequency: "Weekly", benefit: "Better performance & security" },
    { task: "Restart device", frequency: "Weekly", benefit: "Clear RAM, improve speed" }
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <HardDrive className="w-8 h-8 text-blue-400" />
          Storage Optimizer
        </h1>
        <p className="text-gray-400 mt-1">Guides and tips to free up space and improve performance</p>
      </div>

      {/* Quick Stats Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Potential Savings</p>
                <p className="text-2xl font-bold text-white">4-20GB</p>
                <p className="text-xs text-blue-400 mt-1">Follow our guides</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Optimization Tips</p>
                <p className="text-2xl font-bold text-white">20+</p>
                <p className="text-xs text-green-400 mt-1">Easy to follow</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Battery Saver</p>
                <p className="text-2xl font-bold text-white">30%+</p>
                <p className="text-xs text-yellow-400 mt-1">Extra battery life</p>
              </div>
              <Battery className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {optimizationTips.map((tip, idx) => (
          <Card key={idx} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tip.color} flex items-center justify-center`}>
                  <tip.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p>{tip.category}</p>
                  <p className="text-xs text-green-400 font-normal">Save: {tip.potentialSavings}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {tip.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Battery Optimization */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Battery className="w-5 h-5 text-yellow-400" />
            Battery Optimization Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {batteryTips.map((tip, idx) => (
              <div key={idx} className="bg-[#0f1419] rounded-lg p-4 border border-yellow-500/10">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-semibold text-sm">{tip.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{tip.description}</p>
                  </div>
                  <Badge className={`${
                    tip.impact === 'Very High' ? 'bg-green-500/20 text-green-400' :
                    tip.impact === 'High' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {tip.impact}
                  </Badge>
                </div>
                <div className="bg-yellow-500/5 rounded-lg p-3 border border-yellow-500/10">
                  <p className="text-xs text-yellow-400 font-semibold mb-2">Steps:</p>
                  <ol className="space-y-1">
                    {tip.steps.map((step, i) => (
                      <li key={i} className="text-xs text-gray-300">
                        {i + 1}. {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Checklist */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            Device Maintenance Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deviceChecklistItems.map((item, idx) => (
              <div key={idx} className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{item.task}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.benefit}</p>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                    {item.frequency}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform-Specific Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-400" />
              Android Optimization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
              <p className="text-sm font-semibold text-green-400 mb-2">Quick Steps:</p>
              <ul className="space-y-2 text-xs text-gray-300">
                <li>• Settings → Storage → Free up space</li>
                <li>• Settings → Apps → Clear cache for each app</li>
                <li>• Settings → Battery → Battery optimization</li>
                <li>• Use Files by Google for smart cleanup</li>
                <li>• Enable "Remove backed up photos" in Google Photos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              iOS Optimization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <p className="text-sm font-semibold text-blue-400 mb-2">Quick Steps:</p>
              <ul className="space-y-2 text-xs text-gray-300">
                <li>• Settings → General → iPhone Storage</li>
                <li>• Enable "Offload Unused Apps"</li>
                <li>• Settings → Safari → Clear History and Data</li>
                <li>• Photos → Albums → Recently Deleted → Delete All</li>
                <li>• iCloud → Manage Storage → Optimize storage</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}