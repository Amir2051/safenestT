import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, AlertTriangle, ChevronRight, ShieldCheck, Gift, Users, Sparkles, Clock, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import LiveClock from "@/components/shared/LiveClock";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

import SecurityScoreCard from "../components/dashboard/SecurityScoreCard.jsx";
import QuickActionsGrid from "../components/dashboard/QuickActionsGrid.jsx";
import RecentAlertsCard from "../components/dashboard/RecentAlertsCard.jsx";
import MiaQuickChat from "@/components/dashboard/MiaQuickChat.jsx";
import InvestigatorCommandCenter from "@/components/dashboard/InvestigatorCommandCenter.jsx";
import ContactSection from "../components/shared/ContactSection.jsx";
import UpgradePrompt from "../components/shared/UpgradePrompt.jsx";
import GettingStartedChecklist from "../components/onboarding/GettingStartedChecklist.jsx";
import UserDetailsCard from "../components/dashboard/UserDetailsCard.jsx";
import MyCasesWidget from "../components/dashboard/MyCasesWidget.jsx";
import MessageNotifications from "../components/communication/MessageNotifications.jsx";

import { Panel, MetricStat, SectionLabel } from "@/components/investigation-shell/panelPrimitives";
import AgentGrid from "@/components/investigation-shell/AgentGrid";
import { ThreatIntelPanel } from "@/components/investigation-shell/IntelPanels";
import AuditPanel from "@/components/investigation-shell/AuditPanel";
import RiskPanel from "@/components/investigation-shell/RiskPanel";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const pullY = useMotionValue(0);
  const pullProgress = useTransform(pullY, [0, 100], [0, 1]);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.filter({ status: 'active' }, '-created_date', 5),
    enabled: !!user,
    initialData: [],
    staleTime: 60000,
    refetchInterval: false
  });

  const notifiedAlertIds = React.useRef(new Set(JSON.parse(localStorage.getItem('snt_notified_alerts') || '[]')));

  useEffect(() => {
    if (!user?.email || alerts.length === 0) return;

    const newAlerts = alerts.filter(a => !notifiedAlertIds.current.has(a.id));
    if (newAlerts.length === 0) return;

    newAlerts.forEach(async (alert) => {
      const severityEmoji = { critical: '🚨', high: '⚠️', medium: '🔶', low: 'ℹ️' }[alert.severity] || '🔔';
      try {
        await base44.integrations.Core.SendEmail({
          to: user.email,
          from_name: "SafeNestT Security",
          subject: `${severityEmoji} SafeNestT Alert: ${alert.alert_type || 'New Security Threat Detected'}`,
          body: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#06b6d4,#3b82f6);padding:24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:white;">🛡️ SafeNestT Security Alert</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);">A new security threat has been detected on your account</p>
  </div>
  <div style="padding:24px;">
    <div style="background:${alert.severity === 'critical' ? '#7f1d1d' : alert.severity === 'high' ? '#78350f' : '#1e3a5f'};border:1px solid ${alert.severity === 'critical' ? '#dc2626' : alert.severity === 'high' ? '#f59e0b' : '#3b82f6'};border-radius:8px;padding:16px;margin-bottom:20px;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:bold;">${severityEmoji} ${(alert.severity || 'unknown').toUpperCase()} Severity</p>
      <p style="margin:0;font-size:16px;">${alert.alert_type || 'Security Threat'}</p>
    </div>
    ${alert.description ? `<p style="color:#e2e8f0;line-height:1.6;">${alert.description}</p>` : ''}
    <div style="text-align:center;margin-top:24px;">
      <a href="${window.location.origin}/Alerts" style="background:linear-gradient(135deg,#06b6d4,#3b82f6);color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Alert →</a>
    </div>
    <p style="margin-top:20px;color:#64748b;font-size:12px;text-align:center;">You're receiving this because you have email notifications enabled on SafeNestT.</p>
  </div>
</div>`
        });
        notifiedAlertIds.current.add(alert.id);
      } catch (e) {
        console.warn('Failed to send alert email:', e);
      }
    });

    localStorage.setItem('snt_notified_alerts', JSON.stringify([...notifiedAlertIds.current]));
  }, [alerts, user]);

  const { data: passwords = [] } = useQuery({
    queryKey: ['passwords'],
    queryFn: () => base44.entities.Password.list('-created_date'),
    enabled: !!user,
    initialData: [],
    staleTime: 60000,
    refetchInterval: false
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date'),
    enabled: !!user,
    initialData: [],
    staleTime: 60000,
    refetchInterval: false
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
    staleTime: 120000,
    refetchInterval: false
  });

  useEffect(() => {
    let isMounted = true;

    base44.auth.me().then(async (userData) => {
      if (!isMounted) return;
      setUser(userData);

      if (!userData.trial_started && userData.subscription_plan !== 'basic' && userData.subscription_plan !== 'elite') {
        try {
          await base44.functions.invoke('subscriptionService', {
            endpoint: 'init-trial'
          });

          if (!isMounted) return;
          const updatedUser = await base44.auth.me();
          setUser(updatedUser);
        } catch (error) {
          console.error('Failed to init trial:', error);
        }
      }

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

        if (!isMounted) return;
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

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Dashboard refreshed!');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
      pullY.set(0);
    }
  };

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && diff < 120) {
      pullY.set(diff);
    }
  };

  const handleTouchEnd = () => {
    if (pullY.get() > 80 && !isRefreshing) {
      handleRefresh();
    } else {
      animate(pullY, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
    isPulling.current = false;
  };

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
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500/30 border-t-cyan-400" />
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

  const securityScore = user.risk_score ?? 0;

  return (
    <div
      ref={containerRef}
      className="p-3 sm:p-4 lg:p-5 space-y-4 font-sans"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh */}
      <motion.div
        style={{ y: pullY, opacity: pullProgress }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 lg:hidden"
      >
        <motion.div
          animate={{ rotate: isRefreshing ? 360 : 0 }}
          transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
          className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center border-2 border-cyan-500"
        >
          <RefreshCw className="w-5 h-5 text-cyan-400" />
        </motion.div>
      </motion.div>

      <MessageNotifications user={user} />

      {/* ── Command strip ─────────────────────────────────────────────── */}
      <div className="rounded-md border border-slate-700/60 bg-[#06090d] ic-grid-bg px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-mono font-bold tracking-wider text-slate-100 leading-none">
              SAFENESTT // MIA <span className="text-slate-600">·</span> INVESTIGATION OPERATIONS
            </p>
            <p className="text-[10px] font-mono text-cyan-500/80 tracking-wider mt-1">
              Welcome, {user.full_name?.split(' ')[0] || 'Operator'} · Last sync <LiveClock />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button
            onClick={runSecurityScan}
            disabled={scanning}
            size="sm"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-1.5" />
                Scanning
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 mr-1.5" />
                Run Scan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Top metrics (real-derived) ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricStat label="Active Alerts" value={alerts.length} tone="amber" hint="requires attention" />
        <MetricStat label="Critical" value={criticalAlerts} tone="red" hint="immediate action" />
        <MetricStat label="Security Score" value={securityScore} tone={securityScore >= 80 ? "green" : securityScore >= 60 ? "amber" : "red"} hint={securityScore >= 80 ? "healthy" : "review"} />
        <MetricStat label="Check-in Streak" value={user.check_in_streak || 0} tone="cyan" hint="days" />
      </div>

      {/* Onboarding checklist */}
      {user && !user.onboarding_completed && (
        <GettingStartedChecklist user={user} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['user'] })} />
      )}

      {/* Subscription status */}
      {subscriptionInfo && (
        <div className={`rounded-md border px-4 py-3 ${
          subscriptionInfo.subscription_plan === 'elite' ? 'border-fuchsia-500/30 bg-fuchsia-500/5' :
          subscriptionInfo.subscription_plan === 'basic' ? 'border-blue-500/30 bg-blue-500/5' :
          subscriptionInfo.is_trial_active ? 'border-cyan-500/30 bg-cyan-500/5' :
          'border-slate-700/60 bg-slate-800/20'
        }`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                subscriptionInfo.subscription_plan === 'elite' ? 'bg-gradient-to-br from-fuchsia-500 to-pink-500' :
                subscriptionInfo.subscription_plan === 'basic' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                'bg-gradient-to-br from-slate-600 to-slate-700'
              }`}>
                {subscriptionInfo.subscription_plan === 'elite' || subscriptionInfo.subscription_plan === 'basic' ? (
                  <Sparkles className="w-5 h-5 text-white" />
                ) : (
                  <Clock className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-slate-100 font-bold text-base capitalize">
                    {(subscriptionInfo.subscription_plan === 'elite' || subscriptionInfo.subscription_plan === 'basic') ? 'Premium Plan' :
                     subscriptionInfo.is_trial_active ? '7-Day Free Trial' : 'Free Plan'}
                  </h3>
                  {subscriptionInfo.subscription_status === 'active' && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">Active</Badge>
                  )}
                </div>
                <p className={`text-[12px] ${
                  subscriptionInfo.subscription_plan === 'elite' ? 'text-fuchsia-300' :
                  subscriptionInfo.subscription_plan === 'basic' ? 'text-blue-300' : 'text-cyan-300'
                }`}>
                  {subscriptionInfo.is_trial_active
                    ? `${subscriptionInfo.days_left} days remaining in free trial`
                    : (subscriptionInfo.subscription_plan === 'elite' || subscriptionInfo.subscription_plan === 'basic')
                      ? 'Investigation, evidence & threat-intelligence tools'
                      : 'Start your 7-day free trial today'}
                </p>
              </div>
            </div>
            {!subscriptionInfo.has_payment_method && subscriptionInfo.is_trial_active && (
              <Link to={createPageUrl("Subscription")}>
                <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-600">Subscribe</Button>
              </Link>
            )}
            {(!subscriptionInfo.subscription_plan || subscriptionInfo.subscription_plan === 'free') && !subscriptionInfo.is_trial_active && (
              <Link to={createPageUrl("Upgrade")}>
                <Button size="sm" className="bg-gradient-to-r from-fuchsia-500 to-pink-500">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Start Trial
                </Button>
              </Link>
            )}
            {subscriptionInfo.subscription_plan === 'basic' && (
              <Link to={createPageUrl("Upgrade")}>
                <Button size="sm" variant="outline" className="border-fuchsia-500/30 text-fuchsia-400 hover:bg-fuchsia-500/10">
                  Upgrade
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Critical alert banner */}
      {criticalAlerts > 0 && (
        <div className="rounded-md border border-red-500/40 bg-red-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500/15 rounded-md flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            </div>
            <div>
              <p className="text-slate-100 font-semibold text-sm">
                {criticalAlerts} Critical Alert{criticalAlerts > 1 ? 's' : ''} Require Immediate Attention
              </p>
              <p className="text-red-300 text-xs">Your identity may be at risk</p>
            </div>
          </div>
          <Link to={createPageUrl("Alerts")}>
            <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
              View <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Referral CTA */}
      {myReferrals.length < 3 && (
        <div className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/5 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-slate-100 font-bold text-sm">Earn Free Premium by Referring</h3>
              <p className="text-fuchsia-300 text-xs">1 month premium per friend who signs up — unlimited rewards.</p>
            </div>
          </div>
          <Link to={createPageUrl("Referrals")}>
            <Button size="sm" className="bg-gradient-to-r from-fuchsia-500 to-pink-500">
              <Gift className="w-3.5 h-3.5 mr-1.5" /> Start Referring
            </Button>
          </Link>
        </div>
      )}

      {/* Referral stats */}
      {myReferrals.length > 0 && (
        <Panel title="Referral Performance" bodyClass="p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-slate-100 font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-fuchsia-400" /> Your Referrals
            </h3>
            <Link to={createPageUrl("Referrals")}>
              <Button variant="outline" size="sm" className="border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/10">
                Details
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricStat label="Total Sent" value={myReferrals.length} tone="slate" />
            <MetricStat label="Completed" value={completedReferrals} tone="green" />
            <MetricStat label="Pending" value={pendingReferrals} tone="amber" />
            <MetricStat label="Months Earned" value={bonusMonthsEarned} tone="cyan" />
          </div>
        </Panel>
      )}

      {/* ── Multi-panel operational grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — live investigation activity */}
        <div className="lg:col-span-5 space-y-4">
          <SectionLabel>Live Investigation Activity</SectionLabel>
          <RecentAlertsCard alerts={alerts} isLoading={alertsLoading} />
          <AuditPanel />
        </div>

        {/* CENTER — case risk overview */}
        <div className="lg:col-span-4 space-y-4">
          <SectionLabel>Case Risk Overview</SectionLabel>
          <SecurityScoreCard score={securityScore} alerts={alerts} passwords={passwords} user={user} />
          <RiskPanel score={securityScore} title="RISK ANALYSIS" />
        </div>

        {/* RIGHT — AI agent status */}
        <div className="lg:col-span-3 space-y-4">
          <SectionLabel>AI Agent Status</SectionLabel>
          <MiaQuickChat user={user} />
          <AgentGrid />
        </div>
      </div>

      {/* ── Investigator command center (real local data) ─────────────── */}
      <div className="space-y-3">
        <SectionLabel>Investigator Command Center</SectionLabel>
        <InvestigatorCommandCenter />
      </div>

      {/* ── Recent investigations ─────────────────────────────────────── */}
      <div className="space-y-3">
        <SectionLabel>Recent Investigations</SectionLabel>
        <MyCasesWidget user={user} />
      </div>

      {/* ── Evidence queue + threat intelligence ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <SectionLabel>Evidence Queue</SectionLabel>
          <QuickActionsGrid user={user} alerts={alerts} passwords={passwords} />
        </div>
        <div className="space-y-3">
          <SectionLabel>Threat Intelligence</SectionLabel>
          <ThreatIntelPanel />
        </div>
      </div>

      {/* ── Account row ───────────────────────────────────────────────── */}
      <UserDetailsCard user={user} onUpdate={() => base44.auth.me().then(setUser)} />

      <ContactSection />

      {showUpgradePrompt && (user?.subscription_plan === 'free' || user?.subscription_plan === 'trial') && (
        <UpgradePrompt feature="premium protection" onClose={() => setShowUpgradePrompt(false)} />
      )}
    </div>
  );
}