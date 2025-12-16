import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  User, Mail, Phone, MapPin, Edit, Save, X, Loader2, Calendar, Shield
} from "lucide-react";
import { toast } from "sonner";

export default function UserDetailsCard({ user, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || '',
    state: user?.state || '',
    country: user?.country || ''
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use explicit backend function for reliable updates
      const res = await base44.functions.invoke('updateUserProfile', {
        updates: {
            full_name: formData.full_name,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            country: formData.country
        }
      });

      if (!res.data.success) throw new Error(res.data.error);

      toast.success('Profile updated successfully!');
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      state: user?.state || '',
      country: user?.country || ''
    });
    setEditing(false);
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            User Details
          </CardTitle>
          {!editing ? (
            <Button
              size="sm"
              onClick={() => setEditing(true)}
              className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                className="border-gray-500/30"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing ? (
          /* Edit Mode */
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block">Full Name2</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-2 block">Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="bg-[#0f1419] border-cyan-500/30 text-white"
                placeholder="Street address"
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-300 mb-2 block">City</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="City"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-2 block">State</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="State"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-2 block">Country</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="Country"
                />
              </div>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <User className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Full Name</p>
                <p className="text-white font-medium">{user?.full_name || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <Mail className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-white font-medium">{user?.email || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <Phone className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-white font-medium">{user?.phone || 'Not set'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Location</p>
                <p className="text-white font-medium">
                  {[user?.address, user?.city, user?.state, user?.country].filter(Boolean).join(', ') || 'Not set'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Member Since</p>
                <p className="text-white font-medium">
                  {user?.created_date ? new Date(user.created_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <Shield className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-gray-400">Account Status</p>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50 mt-1">
                  Active
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}