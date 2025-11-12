import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, QrCode, Copy, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ConfigDownloadDialog({ open, onClose, deviceId }) {
  const [copied, setCopied] = useState(false);

  const { data: configData, isLoading } = useQuery({
    queryKey: ['vpn-config', deviceId],
    queryFn: async () => {
      // Get device first
      const devices = await base44.entities.VPNDevice.filter({ device_id: deviceId });
      if (devices.length === 0) {
        throw new Error('Device not found');
      }

      // Get config
      const configs = await base44.entities.VPNConfig.filter({
        device_id: deviceId
      }, '-created_date', 1);

      if (configs.length === 0) {
        throw new Error('Config not found');
      }

      return {
        device: devices[0],
        config: configs[0]
      };
    },
    enabled: open && !!deviceId
  });

  const handleCopyConfig = () => {
    if (configData?.config?.config_content) {
      navigator.clipboard.writeText(configData.config.config_content);
      setCopied(true);
      toast.success('Configuration copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadConfig = () => {
    if (configData?.config?.config_content) {
      const blob = new Blob([configData.config.config_content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${configData.device.device_name.replace(/\s+/g, '_')}_wireguard.conf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Configuration downloaded');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/30 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Download className="w-6 h-6 text-cyan-400" />
            WireGuard Configuration
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading configuration...</p>
          </div>
        ) : !configData ? (
          <div className="py-12 text-center">
            <p className="text-red-400">Configuration not found</p>
          </div>
        ) : (
          <Tabs defaultValue="file" className="w-full">
            <TabsList className="bg-[#0f1419] border border-cyan-500/20 w-full">
              <TabsTrigger value="file" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Config File
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex-1">
                <QrCode className="w-4 h-4 mr-2" />
                QR Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="mt-6 space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-semibold">
                    Device: {configData.device.device_name}
                  </span>
                </div>
                <p className="text-green-200 text-sm">
                  VPN IP: {configData.device.assigned_ip}
                </p>
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Configuration File</Label>
                <pre className="bg-[#0f1419] border border-cyan-500/20 rounded-lg p-4 text-xs text-cyan-300 overflow-x-auto font-mono max-h-64 overflow-y-auto">
{configData.config.config_content}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyConfig}
                  variant="outline"
                  className="flex-1 border-cyan-500/20 text-cyan-400"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDownloadConfig}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download .conf File
                </Button>
              </div>

              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-purple-300 text-xs">
                  <strong>Setup Instructions:</strong><br/>
                  1. Install WireGuard app on your device<br/>
                  2. Import this config file or scan QR code<br/>
                  3. Activate the tunnel to connect
                </p>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="mt-6 space-y-4">
              <div className="text-center">
                <div className="bg-white p-6 rounded-xl inline-block mb-4">
                  <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-600 text-sm">
                      <QrCode className="w-16 h-16 mx-auto mb-3" />
                      <p>QR Code Generator</p>
                      <p className="text-xs mt-2">
                        Scan with WireGuard app
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Scan this QR code with the WireGuard mobile app
                </p>
                <Button
                  onClick={handleDownloadConfig}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Config Instead
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}