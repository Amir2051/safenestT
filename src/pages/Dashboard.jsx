
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, AlertTriangle, Lock, Wifi, Eye, TrendingUp, 
  CheckCircle, XCircle, Clock, Sparkles, ChevronRight, Bell
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner"; // Added toast import

import SecurityScoreCard from "../components/dashboard/SecurityScoreCard.jsx";
import QuickActionsGrid from "../components/dashboard/QuickActionsGrid.jsx";
import RecentAlertsCard from "../components/dashboard/RecentAlertsCard.jsx";
import MiaQuickChat from "../components/dashboard/MiaQuickChat.jsx";
import VPNControl from "../components/dashboard/VPNControl.jsx"; // New import
import UpgradePrompt from "../components/shared/UpgradePrompt.jsx";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

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
    base44.auth.me().then(fetchedUser => {
      setUser(fetchedUser);
      // Store user tier in localStorage for prompt logic
      if (fetchedUser?.subscription_plan) {
        localStorage.setItem('userTier', fetchedUser.subscription_plan);
      } else {
        localStorage.setItem('userTier', 'free');
      }
    }).catch(() => {});
    
    // Check for upgrade prompt trigger
    const lastPrompt = localStorage.getItem('lastUpgradePrompt');
    const daysSincePrompt = lastPrompt ? (Date.now() - parseInt(lastPrompt)) / (1000 * 60 * 60 * 24) : 999;
    
    // Show upgrade prompt if free user and hasn't seen it in 3 days
    if (daysSincePrompt > 3) {
      setTimeout(() => {
        const tier = localStorage.getItem('userTier') || 'free';
        if (tier === 'free') {
          setShowUpgradePrompt(true);
          localStorage.setItem('lastUpgradePrompt', Date.now().toString());
        }
      }, 10000); // 10 seconds after page load
    }
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
  const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';
  const isActive = user?.payment_status === 'active';

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

      {/* Premium Welcome (if just upgraded) */}
      {isPremium && isActive && new URLSearchParams(window.location.search).get('upgraded') === 'true' && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
          <CardContent className="p-6 relative">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  🎊 Welcome to Premium!
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </h2>
                <p className="text-purple-300">Your account has been successfully upgraded. Here's what you can do now:</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Link to={createPageUrl("DarkWebMonitor")}>
                <div className="bg-[#0f1419] rounded-lg p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer text-center">
                  <Shield className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">Add More Emails</p>
                  <p className="text-gray-400 text-xs mt-1">Monitor multiple addresses</p>
                </div>
              </Link>
              
              <Link to={createPageUrl("Settings")}>
                <div className="bg-[#0f1419] rounded-lg p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer text-center">
                  <Bell className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">Enable Alerts</p>
                  <p className="text-gray-400 text-xs mt-1">Get instant notifications</p>
                </div>
              </Link>
              
              <Link to={createPageUrl("PasswordVault")}>
                <div className="bg-[#0f1419] rounded-lg p-4 border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer text-center">
                  <Lock className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-white font-semibold text-sm">Unlimited Vault</p>
                  <p className="text-gray-400 text-xs mt-1">Store unlimited passwords</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && !isPremium && (
        <UpgradePrompt
          feature="premium protection"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}
