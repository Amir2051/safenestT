import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, Zap, Lock, Wifi, AlertTriangle, CheckCircle, 
  Clock, Bot, TrendingUp, Activity, Ban, Eye
} from "lucide-react";
import { toast } from "sonner";

export default function AutoProtection() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({
    auto_vpn_enable: false,
    auto_2fa_enable: false,
    auto_password_fix: false,
    threat_blocking: false,
    auto_alert_remediation: false,
    score_threshold: 70,
  });

  const queryClient = useQueryClient();

  const { data: remediations = [] } = useQuery({
    queryKey: ['remediations'],
    queryFn: () => base44.entities.AutomatedRemediation.list('-created_date', 20),
    initialData: [],
  });

  const { data: blockedThreats = [] } = useQuery({
    queryKey: ['blocked-threats'],
    queryFn: () => base44.entities.BlockedThreat.filter({ status: 'active' }, '-created_date', 50),
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setSettings({
        auto_vpn_enable: userData.auto_vpn_enable || false,
        auto_2fa_enable: userData.auto_2fa_enable || false,
        auto_password_fix: userData.auto_password_fix || false,
        threat_blocking: userData.threat_blocking || false,
        auto_alert_remediation: userData.auto_alert_remediation || false,
        score_threshold: userData.auto_protection_threshold || 70,
      });
    }).catch(() => {});
  }, []);

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Auto-protection settings updated');
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AutomatedRemediation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remediations'] });
    },
  });

  const toggleSetting = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    const updateData = {};
    if (key === 'score_threshold') {
      updateData.auto_protection_threshold = value;
    } else {
      updateData[key] = value;
    }
    
    await updateUserMutation.mutateAsync(updateData);
  };

  const approveRemediation = async (id) => {
    await updateSettingMutation.mutateAsync({
      id,
      data: { status: 'user_approved' }
    });
    toast.success('Remediation approved');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const pendingRemediations = remediations.filter(r => r.status === 'pending').length;
  const completedToday = remediations.filter(r => 
    r.status === 'completed' && 
    new Date(r.created_date).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Zap className="w-8 h-8 text-yellow-400" />
          Automated Protection
        </h1>
        <p className="text-gray-400 mt-1">Let SafeNest automatically fix security issues</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Pending Actions</p>
                <p className="text-2xl font-bold text-white">{pendingRemediations}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Fixed Today</p>
                <p className="text-2xl font-bold text-white">{completedToday}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Threats Blocked</p>
                <p className="text-2xl font-bold text-white">{blockedThreats.length}</p>
              </div>
              <Ban className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Actions</p>
                <p className="text-2xl font-bold text-white">{remediations.length}</p>
              </div>
              <Activity className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Automation */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              Security Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 flex-1">
                <Wifi className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Auto-Enable VPN</p>
                  <p className="text-xs text-gray-400">Activate VPN on critical alerts</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_vpn_enable}
                onCheckedChange={(val) => toggleSetting('auto_vpn_enable', val)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 flex-1">
                <Lock className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Auto-Enable 2FA</p>
                  <p className="text-xs text-gray-400">Turn on 2FA if score drops</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_2fa_enable}
                onCheckedChange={(val) => toggleSetting('auto_2fa_enable', val)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 flex-1">
                <Lock className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Auto Password Fixes</p>
                  <p className="text-xs text-gray-400">Generate strong passwords automatically</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_password_fix}
                onCheckedChange={(val) => toggleSetting('auto_password_fix', val)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 flex-1">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Auto Alert Remediation</p>
                  <p className="text-xs text-gray-400">Fix resolvable alerts automatically</p>
                </div>
              </div>
              <Switch
                checked={settings.auto_alert_remediation}
                onCheckedChange={(val) => toggleSetting('auto_alert_remediation', val)}
              />
            </div>

            <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-yellow-400">Score Threshold</p>
                <span className="text-2xl font-bold text-white">{settings.score_threshold}</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={settings.score_threshold}
                onChange={(e) => toggleSetting('score_threshold', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-2">
                Trigger auto-protections when score drops below {settings.score_threshold}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Threat Intelligence */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-400" />
              Threat Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 flex-1">
                <Eye className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-white font-semibold text-sm">Automatic Threat Blocking</p>
                  <p className="text-xs text-gray-400">Block malicious IPs and domains</p>
                </div>
              </div>
              <Switch
                checked={settings.threat_blocking}
                onCheckedChange={(val) => toggleSetting('threat_blocking', val)}
              />
            </div>

            {settings.threat_blocking && (
              <>
                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                  <p className="text-sm font-semibold text-green-400 mb-2">✅ Protection Active</p>
                  <p className="text-xs text-gray-300">
                    We're monitoring threat intelligence feeds and automatically blocking known malicious sources
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-semibold text-gray-300">Recently Blocked</p>
                  {blockedThreats.slice(0, 5).map((threat) => (
                    <div
                      key={threat.id}
                      className="bg-[#0f1419] rounded-lg p-3 border border-red-500/10"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-mono truncate">{threat.threat_value}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">
                              {threat.threat_type.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {threat.attempts_blocked} blocked
                            </span>
                          </div>
                        </div>
                        <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remediation History */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Recent Automated Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {remediations.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No automated actions yet</p>
              <p className="text-xs text-gray-500 mt-1">Enable auto-protection to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {remediations.slice(0, 10).map((rem) => (
                <div
                  key={rem.id}
                  className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${
                          rem.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                          rem.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                          rem.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        } border text-xs`}>
                          {rem.action_type.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(rem.created_date).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{rem.trigger_reason}</p>
                      {rem.details && rem.details.score_impact && (
                        <div className="flex items-center gap-2 text-xs">
                          <TrendingUp className="w-3 h-3 text-green-400" />
                          <span className="text-green-400">
                            +{rem.details.score_impact} security score
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {rem.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => approveRemediation(rem.id)}
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-xs"
                        >
                          Approve
                        </Button>
                      )}
                      {rem.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : rem.status === 'failed' ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}