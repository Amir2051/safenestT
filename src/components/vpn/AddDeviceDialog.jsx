import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Laptop, MonitorSmartphone, Wifi, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddDeviceDialog({ open, onClose, onSuccess }) {
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState('');

  const createDeviceMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('vpnDeviceService', {
        endpoint: 'create-device',
        device_name: deviceName,
        device_type: deviceType
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('🎉 ' + data.message);
      setDeviceName('');
      setDeviceType('');
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error('Failed to create device: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!deviceName.trim() || !deviceType) {
      toast.error('Please fill in all fields');
      return;
    }
    createDeviceMutation.mutate();
  };

  const deviceTypeOptions = [
    { value: 'ios', label: 'iPhone / iPad', icon: Smartphone },
    { value: 'android', label: 'Android Phone', icon: Smartphone },
    { value: 'windows', label: 'Windows PC', icon: Laptop },
    { value: 'macos', label: 'MacBook / Mac', icon: Laptop },
    { value: 'linux', label: 'Linux', icon: MonitorSmartphone },
    { value: 'router', label: 'Router', icon: Wifi }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/30 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-cyan-400" />
            Add New VPN Device
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-cyan-300 text-sm">
              🔐 Each device gets its own WireGuard keypair for maximum security
            </p>
          </div>

          <div>
            <Label className="text-gray-300">Device Name</Label>
            <Input
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g., My iPhone, Work Laptop"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              autoFocus
              disabled={createDeviceMutation.isPending}
            />
          </div>

          <div>
            <Label className="text-gray-300">Device Type</Label>
            <Select value={deviceType} onValueChange={setDeviceType}>
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                <SelectValue placeholder="Select device type" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                {deviceTypeOptions.map(option => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value} className="text-white">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-cyan-400" />
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-purple-300 text-xs">
              ℹ️ After creation, you'll receive a QR code and config file to set up WireGuard
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-500/20"
              disabled={createDeviceMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!deviceName.trim() || !deviceType || createDeviceMutation.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {createDeviceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Device'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}