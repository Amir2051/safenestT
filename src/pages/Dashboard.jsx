
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, AlertTriangle, Lock, Wifi, Eye, TrendingUp, 
  CheckCircle, XCircle, Clock, Sparkles, ChevronRight 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner"; // Added toast import

import SecurityScoreCard from "../components/dashboard/SecurityScoreCard.jsx";
import QuickActionsGrid from "../components/dashboard/QuickActionsGrid.jsx";
import RecentAlertsCard from "../components/dashboard/RecentAlertsCard.jsx";
import MiaQuickChat from "../components/dashboard/MiaQuickChat.jsx";
import VPNControl from "../components/dashboard/VPNControl.jsx"; // New import

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [scanning, setScanning] = useState(false);

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.filter({ created_by: user?.email, status: 'active' }, '-created_date', 5),
    enabled: !!user,
    initialData: [],
  });

  const { data: passwords = [] } = useQuery({
    queryKey: ['passwords'],
    queryFn: () => base44.entities.Password.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const runSecurityScan = async () => {
    setScanning(true);
    try {
      // Simulate scan and update risk score
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate risk score based on various factors
      let score = 100;
      
      // Deduct points for active alerts
      score -= alerts.filter(a => a.severity === 'critical').length * 10;
      score -= alerts.filter(a => a.severity === 'high').length * 5;
      score -= alerts.filter(a => a.severity === 'medium').length * 2;
      
      // Deduct points for weak passwords
      const weakPasswords = passwords.filter(p => p.password_strength === 'weak');
      score -= weakPasswords.length * 3;
      
      // Deduct points if VPN not enabled
      if (!user?.vpn_enabled) score -= 5;
      
      // Deduct points if 2FA not enabled
      if (!user?.two_factor_enabled) score -= 10;
      
      score = Math.max(0, Math.min(100, score));
      
      await base44.auth.updateMe({ 
        risk_score: score,
        last_scan_date: new Date().toISOString()
      });
      
      setUser(prev => ({ ...prev, risk_score: score, last_scan_date: new Date().toISOString() }));

      // Check for automated protections
      const autoThreshold = user?.auto_protection_threshold || 70;
      
      // Auto-enable VPN if score drops below threshold
      if (score < autoThreshold && user?.auto_vpn_enable && !user?.vpn_enabled) {
        await base44.auth.updateMe({ vpn_enabled: true });
        await base44.entities.AutomatedRemediation.create({
          action_type: 'vpn_enable',
          trigger_reason: `Security score dropped to ${score}, below threshold of ${autoThreshold}`,
          status: 'completed',
          details: { before: 'disabled', after: 'enabled', score_impact: 5 },
          user_notified: true,
          auto_approved: true
        });
        toast.success('VPN automatically enabled for protection 🛡️');
      }

      // Auto-enable 2FA if score drops critically
      if (score < 60 && user?.auto_2fa_enable && !user?.two_factor_enabled) {
        await base44.auth.updateMe({ two_factor_enabled: true });
        await base44.entities.AutomatedRemediation.create({
          action_type: '2fa_enable',
          trigger_reason: `Critical: Security score at ${score}`,
          status: 'completed',
          details: { before: 'disabled', after: 'enabled', score_impact: 10 },
          user_notified: true,
          auto_approved: true
        });
        toast.success('Two-factor authentication automatically enabled 🔒');
      }

      // Check for critical alerts and enable auto-remediation
      const criticalAlertsCount = alerts.filter(a => a.severity === 'critical').length;
      if (criticalAlertsCount > 0 && user?.auto_alert_remediation) {
        for (const alert of alerts.filter(a => a.severity === 'critical' && a.status === 'active')) {
          if ((alert.alert_type === 'wifi' || alert.alert_type === 'vpn') && !user?.vpn_enabled) { // Added !user?.vpn_enabled check for idempotence
            await base44.auth.updateMe({ vpn_enabled: true });
            await base44.entities.AutomatedRemediation.create({
              action_type: 'vpn_enable',
              trigger_reason: `Critical ${alert.alert_type} alert: ${alert.title}`,
              status: 'completed',
              affected_entity: alert.id,
              details: { before: 'disabled', after: 'enabled', score_impact: 5 },
              user_notified: true,
              auto_approved: true
            });
            toast.success('VPN enabled to address critical alert');
          }
        }
      }

    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to run security scan.'); // Added error toast
    }
    setScanning(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            Welcome back, {user.full_name?.split(' ')[0] || 'there'}
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Your digital security dashboard • Last scan: {
              user.last_scan_date 
                ? new Date(user.last_scan_date).toLocaleString()
                : 'Never'
            }
          </p>
        </div>
        <Button
          onClick={runSecurityScan}
          disabled={scanning}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/20"
        >
          {scanning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Scanning...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Run Security Scan
            </>
          )}
        </Button>
      </div>

      {/* Critical Alert Banner */}
      {criticalAlerts > 0 && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
              </div>
              <div>
                <p className="text-white font-semibold">
                  {criticalAlerts} Critical Alert{criticalAlerts > 1 ? 's' : ''} Require Immediate Attention
                </p>
                <p className="text-red-300 text-sm">Your identity may be at risk</p>
              </div>
            </div>
            <Link to={createPageUrl("Alerts")}>
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                View Alerts <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Score & Stats */}
        <div className="lg:col-span-2 space-y-6">
          <SecurityScoreCard 
            score={user.risk_score || 85} 
            alerts={alerts}
            passwords={passwords}
            user={user}
          />
          
          <QuickActionsGrid 
            user={user}
            alerts={alerts}
            passwords={passwords}
          />
        </div>

        {/* Right Column - VPN, Alerts & Mia */}
        <div className="space-y-6">
          <VPNControl user={user} />
          <RecentAlertsCard alerts={alerts} isLoading={alertsLoading} />
          <MiaQuickChat user={user} />
        </div>
      </div>
    </div>
  );
}
