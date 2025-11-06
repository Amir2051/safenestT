import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon, Shield, User, Bell, Lock, 
  Wifi, Mail, Phone, Calendar, CreditCard, Save, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    monitored_emails: [],
    vpn_enabled: false,
    two_factor_enabled: false,
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setFormData({
        full_name: userData.full_name || '',
        phone: userData.phone || '',
        monitored_emails: userData.monitored_emails || [],
        vpn_enabled: userData.vpn_enabled || false,
        two_factor_enabled: userData.two_factor_enabled || false,
      });
    }).catch(() => {});
  }, []);

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      toast.success('Settings saved successfully!');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSave = async () => {
    setLoading(true);
    await updateUserMutation.mutateAsync(formData);
    setLoading(false);
  };

  const handleEmailAdd = () => {
    const email = prompt('Enter email address to monitor:');
    if (email && email.includes('@')) {
      setFormData(prev => ({
        ...prev,
        monitored_emails: [...(prev.monitored_emails || []), email]
      }));
    }
  };

  const handleEmailRemove = (email) => {
    setFormData(prev => ({
      ...prev,
      monitored_emails: prev.monitored_emails.filter(e => e !== email)
    }));
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-cyan-400" />
          Settings
        </h1>
        <p className="text-gray-400 mt-1">Manage your account and security preferences</p>
      </div>

      {/* Profile Section */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-gray-300">Full Name</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <Label className="text-gray-300">Email</Label>
            <Input
              value={user.email}
              disabled
              className="bg-[#0f1419] border-cyan-500/20 text-gray-400 mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label className="text-gray-300">Phone Number</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">Subscription Plan</Label>
            <Badge className={`${
              user.subscription_plan === 'premium' 
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/50' 
                : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
            } border text-sm py-1.5 px-3`}>
              {user.subscription_plan === 'premium' ? '✨ Premium' : '🆓 Free'}
            </Badge>
            {user.subscription_plan !== 'premium' && (
              <p className="text-xs text-gray-400 mt-2">
                Upgrade to Premium for advanced features
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Wifi className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">VPN Protection</p>
                <p className="text-xs text-gray-400">Secure your internet connection</p>
              </div>
            </div>
            <Switch
              checked={formData.vpn_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vpn_enabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Two-Factor Authentication</p>
                <p className="text-xs text-gray-400">Add an extra layer of security</p>
              </div>
            </div>
            <Switch
              checked={formData.two_factor_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, two_factor_enabled: checked }))}
            />
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-400 mb-1">Security Recommendation</p>
                <p className="text-xs text-gray-300">
                  Enable both VPN and 2FA to maximize your security score and protect your data
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitored Emails */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-400" />
              Monitored Email Addresses
            </div>
            <Button
              size="sm"
              onClick={handleEmailAdd}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              Add Email
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            Monitor additional email addresses for security breaches and threats
          </p>
          {formData.monitored_emails && formData.monitored_emails.length > 0 ? (
            <div className="space-y-2">
              {formData.monitored_emails.map((email, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    <span className="text-white text-sm">{email}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEmailRemove(email)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <Mail className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No additional emails monitored</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Member Since</p>
                <p className="text-white text-sm font-semibold">
                  {new Date(user.created_date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Account Role</p>
                <p className="text-white text-sm font-semibold capitalize">{user.role}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Last Security Scan</p>
                <p className="text-white text-sm font-semibold">
                  {user.last_scan_date 
                    ? new Date(user.last_scan_date).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          className="border-cyan-500/20 text-gray-300"
          onClick={() => {
            setFormData({
              full_name: user.full_name || '',
              phone: user.phone || '',
              monitored_emails: user.monitored_emails || [],
              vpn_enabled: user.vpn_enabled || false,
              two_factor_enabled: user.two_factor_enabled || false,
            });
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 min-w-[120px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}