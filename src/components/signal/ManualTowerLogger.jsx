import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radio, Plus, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function ManualTowerLogger({ open, onClose, user }) {
  const [formData, setFormData] = useState({
    cell_id: '',
    mcc: '',
    mnc: '',
    lac: '',
    rssi: '-85',
    connection_type: '4G',
    carrier_name: '',
    latitude: '',
    longitude: ''
  });

  const queryClient = useQueryClient();

  const logTowerMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('signalWatchService', {
        endpoint: 'log-tower',
        ...data
      });

      if (response.status >= 400 || response.data.error) {
        throw new Error(response.data?.error || 'Failed to log tower');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['signal-watch-stats'] });
      
      if (data.status === 'alert') {
        toast.error(`⚠️ Suspicious tower logged! ${data.anomaly?.description || ''}`, { duration: 5000 });
      } else if (data.status === 'anomaly') {
        toast.warning('Tower logged with anomaly detected', { duration: 4000 });
      } else {
        toast.success('✅ Tower logged successfully!');
      }

      // Reset form
      setFormData({
        cell_id: '',
        mcc: '',
        mnc: '',
        lac: '',
        rssi: '-85',
        connection_type: '4G',
        carrier_name: '',
        latitude: '',
        longitude: ''
      });

      onClose();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to log tower');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.cell_id || !formData.mcc || !formData.mnc) {
      toast.error('Cell ID, MCC, and MNC are required');
      return;
    }

    // Convert to proper types
    const payload = {
      cell_id: formData.cell_id,
      mcc: formData.mcc,
      mnc: formData.mnc,
      lac: formData.lac || '',
      rssi: parseInt(formData.rssi) || -85,
      connection_type: formData.connection_type,
      carrier_name: formData.carrier_name || 'Unknown',
      latitude: formData.latitude ? parseFloat(formData.latitude) : 0,
      longitude: formData.longitude ? parseFloat(formData.longitude) : 0
    };

    logTowerMutation.mutate(payload);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    toast.info('Getting location...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        toast.success('📍 Location detected!');
      },
      (error) => {
        toast.error('Failed to get location');
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-cyan-400" />
            Manual Tower Logger
          </DialogTitle>
          <p className="text-sm text-gray-400 mt-1">
            Manually log a cell tower's details for monitoring and analysis
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Cell ID */}
          <div>
            <Label className="text-gray-300">Cell ID *</Label>
            <Input
              value={formData.cell_id}
              onChange={(e) => setFormData(prev => ({ ...prev, cell_id: e.target.value }))}
              placeholder="e.g., 12345 or LAC-CID"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              required
            />
          </div>

          {/* MCC and MNC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">MCC (Mobile Country Code) *</Label>
              <Input
                value={formData.mcc}
                onChange={(e) => setFormData(prev => ({ ...prev, mcc: e.target.value.replace(/\D/g, '').substring(0, 3) }))}
                placeholder="e.g., 310 (USA)"
                maxLength={3}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">USA: 310-316</p>
            </div>

            <div>
              <Label className="text-gray-300">MNC (Mobile Network Code) *</Label>
              <Input
                value={formData.mnc}
                onChange={(e) => setFormData(prev => ({ ...prev, mnc: e.target.value.replace(/\D/g, '').substring(0, 3) }))}
                placeholder="e.g., 260 (T-Mobile)"
                maxLength={3}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Carrier code</p>
            </div>
          </div>

          {/* LAC */}
          <div>
            <Label className="text-gray-300">LAC (Location Area Code)</Label>
            <Input
              value={formData.lac}
              onChange={(e) => setFormData(prev => ({ ...prev, lac: e.target.value }))}
              placeholder="Optional"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
            />
          </div>

          {/* Signal Strength */}
          <div>
            <Label className="text-gray-300">Signal Strength (RSSI in dBm)</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                value={formData.rssi}
                onChange={(e) => setFormData(prev => ({ ...prev, rssi: e.target.value }))}
                placeholder="-85"
                min="-120"
                max="-50"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
              <span className="text-sm text-gray-400">
                {parseInt(formData.rssi) >= -70 ? '📶 Excellent' :
                 parseInt(formData.rssi) >= -85 ? '📶 Good' :
                 parseInt(formData.rssi) >= -95 ? '📶 Fair' :
                 parseInt(formData.rssi) >= -105 ? '📶 Poor' : '📶 Very Poor'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Range: -50 (excellent) to -120 (no signal)</p>
          </div>

          {/* Connection Type */}
          <div>
            <Label className="text-gray-300">Radio Type / Connection</Label>
            <Select 
              value={formData.connection_type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, connection_type: value }))}
            >
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/30">
                <SelectItem value="5G">5G / NR</SelectItem>
                <SelectItem value="4G">4G / LTE</SelectItem>
                <SelectItem value="3G">3G / UMTS</SelectItem>
                <SelectItem value="2G">2G / GSM</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.connection_type === '2G' && '⚠️ 2G connections are less secure and may indicate suspicious activity'}
            </p>
          </div>

          {/* Carrier Name */}
          <div>
            <Label className="text-gray-300">Carrier Name</Label>
            <Input
              value={formData.carrier_name}
              onChange={(e) => setFormData(prev => ({ ...prev, carrier_name: e.target.value }))}
              placeholder="e.g., Verizon, AT&T, T-Mobile"
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
            />
          </div>

          {/* Location */}
          <div>
            <Label className="text-gray-300">Location (Optional)</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <Input
                type="number"
                step="0.000001"
                value={formData.latitude}
                onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                placeholder="Latitude"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
              <Input
                type="number"
                step="0.000001"
                value={formData.longitude}
                onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                placeholder="Longitude"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
            <Button
              type="button"
              onClick={getCurrentLocation}
              variant="outline"
              className="border-cyan-500/20 text-cyan-400 mt-2 w-full"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Use Current Location
            </Button>
          </div>

          {/* Info Banner */}
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-xs text-cyan-300">
              <strong>ℹ️ Why log manually?</strong> Some devices don't expose tower info via web APIs. 
              You can manually log towers from dialer codes like *#*#4636#*#* (Android) or Field Test Mode (iOS).
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-500/20"
              disabled={logTowerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={logTowerMutation.isPending || !formData.cell_id || !formData.mcc || !formData.mnc}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {logTowerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Tower
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}