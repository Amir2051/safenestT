import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Server, Loader2, Globe, MapPin } from "lucide-react";
import { toast } from "sonner";

const regions = [
  { value: 'us-east-1', label: 'US East (N. Virginia)', country: 'United States', city: 'Virginia', flag: '🇺🇸' },
  { value: 'us-west-1', label: 'US West (N. California)', country: 'United States', city: 'California', flag: '🇺🇸' },
  { value: 'eu-west-1', label: 'EU West (Ireland)', country: 'Ireland', city: 'Dublin', flag: '🇮🇪' },
  { value: 'eu-central-1', label: 'EU Central (Frankfurt)', country: 'Germany', city: 'Frankfurt', flag: '🇩🇪' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', country: 'Singapore', city: 'Singapore', flag: '🇸🇬' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)', country: 'Japan', city: 'Tokyo', flag: '🇯🇵' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)', country: 'India', city: 'Mumbai', flag: '🇮🇳' },
  { value: 'sa-east-1', label: 'South America (São Paulo)', country: 'Brazil', city: 'São Paulo', flag: '🇧🇷' },
];

export default function ServerEditor({ server, onClose, onSuccess }) {
  const isEdit = !!server;
  
  const [formData, setFormData] = useState({
    server_name: '',
    region: '',
    public_ip: '',
    public_key: '',
    endpoint: '',
    max_peers: 1000,
    bandwidth_mbps: 1000
  });

  useEffect(() => {
    if (server) {
      setFormData({
        server_name: server.server_name || '',
        region: server.region || '',
        public_ip: server.public_ip || '',
        public_key: server.public_key || '',
        endpoint: server.endpoint || '',
        max_peers: server.capacity?.max_peers || 1000,
        bandwidth_mbps: server.capacity?.bandwidth_mbps || 1000
      });
    }
  }, [server]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const regionData = regions.find(r => r.value === data.region);
      
      const serverData = {
        server_name: data.server_name,
        region: data.region,
        public_ip: data.public_ip,
        public_key: data.public_key,
        endpoint: data.endpoint || `${data.public_ip}:51820`,
        location: regionData ? {
          country: regionData.country,
          city: regionData.city,
          flag: regionData.flag
        } : { country: 'Unknown', city: 'Unknown', flag: '🌐' }
      };

      if (isEdit) {
        const response = await base44.functions.invoke('vpnServerManagement', {
          endpoint: 'update-server',
          server_id: server.server_id,
          updates: serverData
        });
        return response.data;
      } else {
        const response = await base44.functions.invoke('vpnServerManagement', {
          endpoint: 'create-server',
          ...serverData
        });
        return response.data;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Server updated!' : 'Server created!');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save server');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.server_name || !formData.region || !formData.public_ip || !formData.public_key) {
      toast.error('Please fill in all required fields');
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" />
            {isEdit ? 'Edit VPN Server' : 'Add VPN Server'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-gray-300">Server Name *</Label>
            <Input
              value={formData.server_name}
              onChange={(e) => setFormData(prev => ({ ...prev, server_name: e.target.value }))}
              placeholder="e.g., New York VPN Server"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              required
            />
          </div>

          <div>
            <Label className="text-gray-300">Region *</Label>
            <Select
              value={formData.region}
              onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
            >
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                <SelectValue placeholder="Select region..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                {regions.map(region => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.flag} {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Public IP Address *</Label>
            <Input
              value={formData.public_ip}
              onChange={(e) => setFormData(prev => ({ ...prev, public_ip: e.target.value }))}
              placeholder="e.g., 203.0.113.42"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              required
            />
          </div>

          <div>
            <Label className="text-gray-300">WireGuard Public Key *</Label>
            <Input
              value={formData.public_key}
              onChange={(e) => setFormData(prev => ({ ...prev, public_key: e.target.value }))}
              placeholder="Base64 encoded public key"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2 font-mono text-xs"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Generate with: wg genkey | tee privatekey | wg pubkey
            </p>
          </div>

          <div>
            <Label className="text-gray-300">Endpoint (Optional)</Label>
            <Input
              value={formData.endpoint}
              onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
              placeholder="Will default to {IP}:51820"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Max Peers</Label>
              <Input
                type="number"
                value={formData.max_peers}
                onChange={(e) => setFormData(prev => ({ ...prev, max_peers: parseInt(e.target.value) }))}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                min="1"
                max="10000"
              />
            </div>
            <div>
              <Label className="text-gray-300">Bandwidth (Mbps)</Label>
              <Input
                type="number"
                value={formData.bandwidth_mbps}
                onChange={(e) => setFormData(prev => ({ ...prev, bandwidth_mbps: parseInt(e.target.value) }))}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                min="10"
                max="10000"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-cyan-500/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 min-w-[120px]"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4 mr-2" />
                  {isEdit ? 'Update' : 'Create'} Server
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}