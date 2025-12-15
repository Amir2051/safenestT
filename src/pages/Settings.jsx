import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, Shield, User, Bell, Lock, 
  Wifi, Mail, Phone, Calendar, CreditCard, Save, Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import AlertPreferences from "../components/alerts/AlertPreferences.jsx";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    country: '',
    wallet_address: '',
    profile_image: '',
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
        username: userData.username || '',
        phone: userData.phone || '',
        country: userData.country || '',
        wallet_address: userData.wallet_address || '',
        profile_image: userData.profile_image || '',
        monitored_emails: userData.monitored_emails || [],
        vpn_enabled: userData.vpn_enabled || false,
        two_factor_enabled: userData.two_factor_enabled || false,
      });
    }).catch(() => {});
  }, []);

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      // Mark profile as completed if username is filled
      const updateData = { ...data };
      if (data.username && data.username.trim()) {
        updateData.onboarding_checklist = {
          ...(user.onboarding_checklist || {}),
          profile_completed: true
        };
        updateData.onboarding_completed = true;
      }
      
      // Use Backend Function to ensure DB Write and bypass potential sync overwrites
      const response = await base44.functions.invoke('updateUserProfile', {
        updates: updateData
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Update failed');
      }

      const result = response.data.user;
      
      const changes = [];
      if (user && data.vpn_enabled !== user.vpn_enabled) { // Added user check
        changes.push(`VPN ${data.vpn_enabled ? 'enabled' : 'disabled'}`);
        
        await base44.entities.AuditLog.create({
          action_type: data.vpn_enabled ? 'vpn_enabled' : 'vpn_disabled',
          action_category: 'settings',
          description: `VPN protection ${data.vpn_enabled ? 'enabled' : 'disabled'} in settings`,
          metadata: {
            previous_value: user.vpn_enabled ? 'enabled' : 'disabled',
            new_value: data.vpn_enabled ? 'enabled' : 'disabled'
          },
          severity: 'info',
          status: 'success'
        });
      }
      
      if (user && data.two_factor_enabled !== user.two_factor_enabled) { // Added user check
        changes.push(`2FA ${data.two_factor_enabled ? 'enabled' : 'disabled'}`);
        
        await base44.entities.AuditLog.create({
          action_type: data.two_factor_enabled ? '2fa_enabled' : '2fa_disabled',
          action_category: 'security',
          description: `Two-factor authentication ${data.two_factor_enabled ? 'enabled' : 'disabled'}`,
          metadata: {
            previous_value: user.two_factor_enabled ? 'enabled' : 'disabled',
            new_value: data.two_factor_enabled ? 'enabled' : 'disabled'
          },
          severity: data.two_factor_enabled ? 'low' : 'medium',
          status: 'success'
        });
      }
      
      if (user && (data.username !== user.username || data.phone !== user.phone)) {
        const profileChanges = {};
        if (data.username !== user.username) {
          profileChanges.username = {
            previous: user.username,
            new: data.username
          };
        }
        if (data.phone !== user.phone) {
          profileChanges.phone = {
            previous: user.phone,
            new: data.phone
          };
        }

        await base44.entities.AuditLog.create({
          action_type: 'profile_updated',
          action_category: 'settings',
          description: 'Profile information updated',
          metadata: profileChanges,
          severity: 'info',
          status: 'success'
        });
      }
      
      return result;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      setFormData({
        full_name: updatedUser.full_name || '',
        username: updatedUser.username || '',
        phone: updatedUser.phone || '',
        country: updatedUser.country || '',
        wallet_address: updatedUser.wallet_address || '',
        profile_image: updatedUser.profile_image || '',
        monitored_emails: updatedUser.monitored_emails || [],
        vpn_enabled: updatedUser.vpn_enabled || false,
        two_factor_enabled: updatedUser.two_factor_enabled || false,
      });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast.success('✅ Settings saved successfully!', {
        description: 'Your profile has been updated.',
        duration: 3000,
      });
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSave = async () => {
    if (!formData.username || formData.username.trim() === '') {
      toast.error('Please enter a username');
      return;
    }
    if (!formData.full_name || formData.full_name.trim() === '') {
      toast.error('Please enter your full name');
      return;
    }
    
    setLoading(true);
    try {
      await updateUserMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
    }
    setLoading(false);
  };

  const handleEmailAdd = async () => {
    const email = prompt('Enter email address to monitor:');
    if (email && email.includes('@')) {
      const newEmails = [...(formData.monitored_emails || []), email];
      setFormData(prev => ({
        ...prev,
        monitored_emails: newEmails
      }));
      
      await base44.entities.AuditLog.create({
        action_type: 'email_monitoring_added',
        action_category: 'monitoring',
        description: `Started monitoring email: ${email}`,
        metadata: {
          affected_item: email
        },
        severity: 'info',
        status: 'success'
      });
      
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    }
  };

  const handleEmailRemove = async (email) => {
    setFormData(prev => ({
      ...prev,
      monitored_emails: prev.monitored_emails.filter(e => e !== email)
    }));
    
    await base44.entities.AuditLog.create({
      action_type: 'email_monitoring_removed',
      action_category: 'monitoring',
      description: `Stopped monitoring email: ${email}`,
      metadata: {
        affected_item: email
      },
      severity: 'info',
      status: 'success'
    });
    
    queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
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

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="w-4 h-4 mr-2" />
            Alert Settings
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white font-semibold mb-2 block">Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="bg-[#0f1419] border-cyan-500/30 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label className="text-white font-semibold mb-2 block">Username *</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-[#0f1419] border-cyan-500/30 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Enter your username"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-white font-semibold mb-2 block">Email</Label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-[#0f1419]/50 border-gray-600/30 text-gray-300"
                />
                <p className="text-xs text-gray-400 mt-1">Email address cannot be changed</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white font-semibold mb-2 block">Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-[#0f1419] border-cyan-500/30 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label className="text-white font-semibold mb-2 block">Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    className="bg-[#0f1419] border-cyan-500/30 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    placeholder="Enter your country"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white font-semibold mb-2 block">Personal Wallet Address (Optional)</Label>
                <Input
                  value={formData.wallet_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, wallet_address: e.target.value }))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white font-mono text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="0x..."
                />
                <p className="text-xs text-gray-400 mt-1">Used for easier case creation and monitoring</p>
              </div>

              <div>
                <Label className="text-white font-semibold mb-2 block">Profile Image URL</Label>
                <Input
                  value={formData.profile_image}
                  onChange={(e) => setFormData(prev => ({ ...prev, profile_image: e.target.value }))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label className="text-white font-semibold mb-2 block">Subscription Plan</Label>
                <Badge className={`${
                  user.subscription_plan === 'premium' || user.subscription_plan === 'basic' || user.subscription_plan === 'elite'
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/50' 
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                } border text-sm py-1.5 px-3`}>
                  {user.subscription_plan === 'premium' || user.subscription_plan === 'basic' || user.subscription_plan === 'elite' ? '✨ Premium' : user.subscription_plan === 'trial' ? '🎁 Trial' : '🆓 Free'}
                </Badge>
                {(user.subscription_plan === 'free' || !user.subscription_plan) && (
                  <p className="text-xs text-gray-400 mt-2">
                    Upgrade to Premium for advanced features
                  </p>
                )}
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
                        ? new Date(user.last_scan_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button for Profile Tab */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-cyan-500/20 text-gray-300"
              onClick={() => {
                setFormData({
                  username: user.username || user.full_name || '',
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
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6">
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
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${formData.vpn_enabled ? 'text-green-400' : 'text-gray-500'}`}>
                    {formData.vpn_enabled ? 'ON' : 'OFF'}
                  </span>
                  <Switch
                    checked={formData.vpn_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vpn_enabled: checked }))}
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
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
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${formData.two_factor_enabled ? 'text-purple-400' : 'text-gray-500'}`}>
                    {formData.two_factor_enabled ? 'ON' : 'OFF'}
                  </span>
                  <Switch
                    checked={formData.two_factor_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, two_factor_enabled: checked }))}
                    className="data-[state=checked]:bg-purple-500"
                  />
                </div>
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

          {/* Save Button for Security Tab */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-cyan-500/20 text-gray-300"
              onClick={() => {
                setFormData({
                  username: user.username || user.full_name || '',
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
        </TabsContent>

        {/* Alert Settings Tab */}
        <TabsContent value="alerts" className="mt-6">
          <AlertPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}