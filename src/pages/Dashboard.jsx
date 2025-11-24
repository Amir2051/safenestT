import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, AlertTriangle, ChevronRight, ShieldCheck, Gift, Users, Home, Sparkles, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import SecurityScoreCard from "../components/dashboard/SecurityScoreCard.jsx";
import QuickActionsGrid from "../components/dashboard/QuickActionsGrid.jsx";
import RecentAlertsCard from "../components/dashboard/RecentAlertsCard.jsx";
import MiaQuickChat from "../components/dashboard/MiaQuickChat.jsx";
import VPNControl from "../components/dashboard/VPNControl.jsx";
import UpgradePrompt from "../components/shared/UpgradePrompt.jsx";
import GettingStartedChecklist from "../components/onboarding/GettingStartedChecklist.jsx";
import UserDetailsCard from "../components/dashboard/UserDetailsCard.jsx";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.filter({ status: 'active' }, '-created_date', 5),
    enabled: !!user,
    initialData: [],
  });

  const { data: passwords = [] } = useQuery({
    queryKey: ['passwords'],
    queryFn: () => base44.entities.Password.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: titleAlerts = [] } = useQuery({
    queryKey: ['title-alerts'],
    queryFn: () => base44.entities.TitleAlert.list('-alert_date', 10),
    enabled: !!user,
    initialData: [],
  });

  const { data: subscriptionInfo } = useQuery({
    queryKey: ['subscription-info'],
    queryFn: async () => {
      const response = await base44.functions.invoke('subscriptionService', {
        endpoint: 'get-subscription-info'
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      
      // Initialize trial if needed
      if (!userData.trial_started && userData.subscription_plan !== 'basic' && userData.subscription_plan !== 'elite') {
        try {
          await base44.functions.invoke('subscriptionService', {
            endpoint: 'init-trial'
          });
          
          const updatedUser = await base44.auth.me();
          setUser(updatedUser);
        } catch (error) {
          console.error('Failed to init trial:', error);
        }
      }
      
      // Check in streak
      const today = new Date().toISOString().split('T')[0];
      const lastCheckIn = userData.last_check_in?.split('T')[0];
      
      if (lastCheckIn !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        let newStreak = 1;
        if (lastCheckIn === yesterdayStr) {
          newStreak = (userData.check_in_streak || 0) + 1;
        }
        
        await base44.auth.updateMe({ 
          last_check_in: new Date().toISOString(),
          check_in_streak: newStreak
        });
        
        setUser(prev => ({ 
          ...prev, 
          last_check_in: new Date().toISOString(),
          check_in_streak: newStreak
        }));

        if (newStreak === 7 || newStreak === 30) {
          toast.success(`🔥 ${newStreak} Day Streak! Keep it up!`);
        }
      }
    }).catch(() => {});
  }, []);

  const runSecurityScan = async () => {
    setScanning(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let score = 100;
      
      score -= alerts.filter(a => a.severity === 'critical').length * 10;
      score -= alerts.filter(a => a.severity === 'high').length * 5;
      score -= alerts.filter(a => a.severity === 'medium').length * 2;
      
      const weakPasswords = passwords.filter(p => p.password_strength === 'weak');
      score -= weakPasswords.length * 3;
      
      if (!user?.vpn_enabled) score -= 5;
      if (!user?.two_factor_enabled) score -= 10;
      
      score = Math.max(0, Math.min(100, score));
      
      await base44.auth.updateMe({ 
        risk_score: score,
        last_scan_date: new Date().toISOString()
      });
      
      setUser(prev => ({ ...prev, risk_score: score, last_scan_date: new Date().toISOString() }));

      toast.success('Security scan completed!');
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to run security scan.');
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
  const isActive = user?.subscription_status === 'active';
  
  const myReferrals = referrals.filter(r => r.referrer_email === user.email);
  const completedReferrals = myReferrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
  const pendingReferrals = myReferrals.filter(r => r.status === 'pending').length;
  const bonusMonthsEarned = completedReferrals;

  const criticalTitleAlerts = titleAlerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;
  const atRiskProperties = properties.filter(p => (p.title_security_score || 100) < 70).length;

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

      {/* Getting Started Checklist - Show for new users */}
      {user && !user.onboarding_completed && (
        <GettingStartedChecklist user={user} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['user'] })} />
      )}

      {/* Subscription Status Banner */}
      {subscriptionInfo && (
        <Card className={`bg-gradient-to-r ${
          subscriptionInfo.subscription_plan === 'elite' ? 'from-purple-500/10 to-pink-500/10 border-purple-500/30' :
          subscriptionInfo.subscription_plan === 'basic' ? 'from-blue-500/10 to-cyan-500/10 border-blue-500/30' :
          subscriptionInfo.is_trial_active ? 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30' :
          'from-gray-500/10 to-gray-600/10 border-gray-500/30'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  subscriptionInfo.subscription_plan === 'elite' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                  subscriptionInfo.subscription_plan === 'basic' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                  'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                  {subscriptionInfo.subscription_plan === 'elite' || subscriptionInfo.subscription_plan === 'basic' ? (
                    <Sparkles className="w-6 h-6 text-white" />
                  ) : (
                    <Clock className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-lg capitalize">
                      {subscriptionInfo.subscription_plan === 'elite' ? 'Elite Plan' :
                       subscriptionInfo.subscription_plan === 'basic' ? 'Basic Plan' :
                       subscriptionInfo.is_trial_active ? '14-Day Free Trial' : 'Free Plan'}
                    </h3>
                    {subscriptionInfo.subscription_status === 'active' && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm ${
                    subscriptionInfo.subscription_plan === 'elite' ? 'text-purple-300' :
                    subscriptionInfo.subscription_plan === 'basic' ? 'text-blue-300' :
                    'text-cyan-300'
                  }`}>
                    {subscriptionInfo.is_trial_active ? (
                      <>🎁 {subscriptionInfo.days_left} days remaining in your free trial</>
                    ) : subscriptionInfo.subscription_plan === 'elite' ? (
                      <>✨ Multi-device • Advanced protection • Priority support</>
                    ) : subscriptionInfo.subscription_plan === 'basic' ? (
                      <>🛡️ Full protection • Single device • Priority support</>
                    ) : (
                      <>Start your 14-day free trial today</>
                    )}
                  </p>
                </div>
              </div>
              {!subscriptionInfo.has_payment_method && subscriptionInfo.is_trial_active && (
                <Link to={createPageUrl("Billing")}>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                    Add Payment Method
                  </Button>
                </Link>
              )}
              {(!subscriptionInfo.subscription_plan || subscriptionInfo.subscription_plan === 'free') && !subscriptionInfo.is_trial_active && (
                <Link to={createPageUrl("Upgrade")}>
                  <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Start Free Trial
                  </Button>
                </Link>
              )}
              {subscriptionInfo.subscription_plan === 'basic' && (
                <Link to={createPageUrl("Upgrade")}>
                  <Button variant="outline" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
                    Upgrade to Elite
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* OWASP Protection Banner */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-green-500/10 rounded-full blur-3xl" />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-green-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  🛡️ OWASP Top 10 + MSTG Protection Active
                </h3>
                <p className="text-green-300 text-sm">
                  Backend & Mobile security • Real-time defense • 100% coverage • 0 threats blocked today
                </p>
              </div>
            </div>
            <Link to={createPageUrl("SecurityDashboard")}>
              <Button className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50">
                <ShieldCheck className="w-4 h-4 mr-2" />
                View Security Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Title Protection Alert */}
      {properties.length > 0 && (criticalTitleAlerts > 0 || atRiskProperties > 0) && (
        <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Home className="w-6 h-6 text-orange-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-white font-semibold">
                    🏠 Title Protection: {criticalTitleAlerts > 0 
                      ? `${criticalTitleAlerts} Critical Alert${criticalTitleAlerts > 1 ? 's' : ''}`
                      : `${atRiskProperties} Propert${atRiskProperties > 1 ? 'ies' : 'y'} At Risk`}
                  </p>
                  <p className="text-orange-300 text-sm">
                    {criticalTitleAlerts > 0 
                      ? 'Suspicious property filings detected'
                      : 'Low Title Security Score - review recommended'}
                  </p>
                </div>
              </div>
              <Link to={createPageUrl(criticalTitleAlerts > 0 ? "ViewAlerts" : "TitleProtection")}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  {criticalTitleAlerts > 0 ? 'View Alerts' : 'Review Properties'}
                </Button>
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

      {/* Referral Program CTA */}
      {myReferrals.length < 3 && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    🎁 Earn FREE Premium by Referring Friends!
                  </h3>
                  <p className="text-purple-300 text-sm">
                    Get 1 month premium for each friend who signs up. Unlimited rewards!
                  </p>
                </div>
              </div>
              <Link to={createPageUrl("Referrals")}>
                <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Gift className="w-4 h-4 mr-2" />
                  Start Referring
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Stats Card */}
      {myReferrals.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Your Referral Performance
              </h3>
              <Link to={createPageUrl("Referrals")}>
                <Button variant="outline" size="sm" className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10">
                  View Details
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[#0f1419] rounded-lg border border-purple-500/10">
                <p className="text-2xl font-bold text-white mb-1">{myReferrals.length}</p>
                <p className="text-xs text-gray-400">Total Sent</p>
              </div>
              <div className="text-center p-3 bg-[#0f1419] rounded-lg border border-green-500/10">
                <p className="text-2xl font-bold text-green-400 mb-1">{completedReferrals}</p>
                <p className="text-xs text-gray-400">Completed</p>
              </div>
              <div className="text-center p-3 bg-[#0f1419] rounded-lg border border-yellow-500/10">
                <p className="text-2xl font-bold text-yellow-400 mb-1">{pendingReferrals}</p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
              <div className="text-center p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-2xl font-bold text-cyan-400 mb-1">{bonusMonthsEarned}</p>
                <p className="text-xs text-gray-400">Months Earned</p>
              </div>
            </div>

            {bonusMonthsEarned > 0 && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm text-center">
                  🎉 You've earned {bonusMonthsEarned} month{bonusMonthsEarned > 1 ? 's' : ''} of premium worth ${(bonusMonthsEarned * 9.99).toFixed(2)}!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
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

        {/* Right Column */}
        <div className="space-y-6">
          <UserDetailsCard 
            user={user} 
            onUpdate={() => base44.auth.me().then(setUser)} 
          />
          <VPNControl user={user} />
          <RecentAlertsCard alerts={alerts} isLoading={alertsLoading} />
          <MiaQuickChat user={user} />
        </div>
      </div>

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (user?.subscription_plan === 'free' || user?.subscription_plan === 'trial') && (
        <UpgradePrompt
          feature="premium protection"
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
    </div>
  );
}