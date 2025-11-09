import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Plus, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AddPropertyDialog({ open, onClose, canAddFree, isPremium, isAdmin }) {
  const [formData, setFormData] = useState({
    address: '',
    city: 'New York',
    state: 'NY',
    zip_code: '',
    borough: '',
    borough_block_lot: '',
    owner_names: [''],
    property_type: 'residential'
  });
  const [deedFile, setDeedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const createPropertyMutation = useMutation({
    mutationFn: async (propertyData) => {
      let deedFileUrl = null;

      if (deedFile) {
        setUploading(true);
        try {
          const uploadResult = await base44.integrations.Core.UploadPrivateFile({
            file: deedFile
          });
          deedFileUrl = uploadResult.file_uri;
        } catch (error) {
          console.error('Failed to upload deed:', error);
          toast.error('Failed to upload deed file');
        }
        setUploading(false);
      }

      const property = await base44.entities.Property.create({
        ...propertyData,
        property_owner: (await base44.auth.me()).email,
        deed_file_url: deedFileUrl,
        verification_status: !!deedFileUrl,
        verification_method: deedFileUrl ? 'deed_upload' : 'pending',
        monitoring_enabled: true,
        last_checked: new Date().toISOString(),
        is_premium: !canAddFree && isPremium,
        scan_frequency: (isPremium || isAdmin) ? 'daily' : 'weekly'
      });

      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'monitoring',
        description: `Property added for title protection monitoring: ${propertyData.address}`,
        metadata: {
          property_id: property.id,
          address: propertyData.address,
          bbl: propertyData.borough_block_lot,
          deed_uploaded: !!deedFileUrl
        },
        severity: 'info',
        status: 'success'
      });

      return property;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('✅ Property added successfully! Monitoring started.');
      onClose();
      setFormData({
        address: '',
        city: 'New York',
        state: 'NY',
        zip_code: '',
        borough: '',
        borough_block_lot: '',
        owner_names: [''],
        property_type: 'residential'
      });
      setDeedFile(null);
    },
    onError: (error) => {
      console.error('Failed to add property:', error);
      toast.error('Failed to add property. Please try again.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.address || !formData.borough || !formData.borough_block_lot) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Admin bypass subscription check
    if (!canAddFree && !isPremium && !isAdmin) {
      toast.error('Upgrade to Premium to add more properties');
      return;
    }

    createPropertyMutation.mutate(formData);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      setDeedFile(file);
      toast.success('Deed file selected');
    }
  };

  const addOwnerName = () => {
    setFormData(prev => ({
      ...prev,
      owner_names: [...prev.owner_names, '']
    }));
  };

  const updateOwnerName = (index, value) => {
    const newNames = [...formData.owner_names];
    newNames[index] = value;
    setFormData(prev => ({ ...prev, owner_names: newNames }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            Add Property for Monitoring
            {isAdmin && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                <Shield className="w-3 h-3 mr-1" />
                ADMIN
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Address */}
          <div className="space-y-2">
            <Label className="text-gray-300">Street Address *</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="123 Main Street"
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300">City</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">State</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">ZIP Code</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                placeholder="10001"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
          </div>

          {/* Borough */}
          <div className="space-y-2">
            <Label className="text-gray-300">NYC Borough *</Label>
            <Select value={formData.borough} onValueChange={(val) => setFormData(prev => ({ ...prev, borough: val }))}>
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                <SelectValue placeholder="Select borough..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                <SelectItem value="Manhattan">Manhattan</SelectItem>
                <SelectItem value="Brooklyn">Brooklyn</SelectItem>
                <SelectItem value="Queens">Queens</SelectItem>
                <SelectItem value="Bronx">Bronx</SelectItem>
                <SelectItem value="Staten Island">Staten Island</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* BBL */}
          <div className="space-y-2">
            <Label className="text-gray-300">Borough-Block-Lot (BBL) *</Label>
            <Input
              value={formData.borough_block_lot}
              onChange={(e) => setFormData(prev => ({ ...prev, borough_block_lot: e.target.value }))}
              placeholder="1-00123-0456 or 1001230456"
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              required
            />
            <p className="text-xs text-gray-400">
              Find your BBL on your property tax bill or{' '}
              <a 
                href="https://a836-acris.nyc.gov/DS/DocumentSearch/BBL" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline"
              >
                NYC ACRIS
              </a>
            </p>
          </div>

          {/* Property Type */}
          <div className="space-y-2">
            <Label className="text-gray-300">Property Type</Label>
            <Select value={formData.property_type} onValueChange={(val) => setFormData(prev => ({ ...prev, property_type: val }))}>
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                <SelectItem value="residential">Residential</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="mixed_use">Mixed Use</SelectItem>
                <SelectItem value="land">Land</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Owner Names */}
          <div className="space-y-2">
            <Label className="text-gray-300">Registered Owner Name(s)</Label>
            {formData.owner_names.map((name, idx) => (
              <Input
                key={idx}
                value={name}
                onChange={(e) => updateOwnerName(idx, e.target.value)}
                placeholder="John Doe"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
            ))}
            <Button
              type="button"
              onClick={addOwnerName}
              variant="outline"
              size="sm"
              className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Owner
            </Button>
          </div>

          {/* Deed Upload */}
          <div className="space-y-2">
            <Label className="text-gray-300">Upload Deed (Optional)</Label>
            <div className="border-2 border-dashed border-cyan-500/20 rounded-lg p-6 text-center hover:border-cyan-500/40 transition-colors">
              <input
                type="file"
                id="deed-upload"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="deed-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-sm text-gray-300">
                  {deedFile ? deedFile.name : 'Click to upload deed (PDF, JPG, PNG)'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Max 10MB • AES-256 encrypted</p>
              </label>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-sm text-cyan-300">
              <strong>🛡️ Privacy & Security:</strong> Your deed is encrypted with AES-256 and stored securely. 
              Only you can access it. We use your BBL to monitor NYC ACRIS for any suspicious filings.
            </p>
          </div>

          {isAdmin && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-300">
                <strong>👑 Admin Access:</strong> You have unlimited property slots and all premium features enabled.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-500/20 text-gray-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPropertyMutation.isPending || uploading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {createPropertyMutation.isPending || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {uploading ? 'Uploading...' : 'Adding Property...'}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}