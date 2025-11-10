import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, Users, TrendingUp, DollarSign, Home, 
  Scale, MousePointer, CheckCircle, Clock, AlertTriangle
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminReferralDashboard() {
  const [user, setUser] = useState(null);

  const { data: referrals = [] } = useQuery({
    queryKey: ['all-referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date', 1000),
    enabled: !!user?.role === 'admin',
    initialData: [],
  });

  const { data: clicks = [] } = useQuery({
    queryKey: ['referral-clicks'],
    queryFn: () => base44.entities.ReferralClick.list('-click_timestamp', 1000),
    enabled: !!user?.role === 'admin',
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list('-created_date', 1000),
    enabled: !!user?.role === 'admin',
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="bg-[#1a2332] border-red-500/30">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-white font-bold text-xl">Admin Access Required</p>
            <p className="text-gray-400 text-sm mt-2">
              This dashboard is only accessible to administrators
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate metrics
  const totalClicks = clicks.length;
  const totalReferrals = referrals.length;
  const completedReferrals = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
  const conversionRate = totalClicks > 0 ? ((completedReferrals / totalClicks) * 100).toFixed(1) : 0;

  const titleProtectionRefs = referrals.filter(r => 
    r.referral_source === 'title_protection' || r.completion_action === 'property_added'
  ).length;

  const legalSupportRefs = referrals.filter(r => 
    r.referral_source === 'legal_support' || r.completion_action === 'legal_consultation'
  ).length;

  const totalCreditsIssued = referrals
    .filter(r => r.bonus_granted)
    .reduce((sum, r) => sum + (r.bonus_value || 0), 0);

  // Top referrers
  const referrerStats = users
    .filter(u => u.referral_stats?.completed_referrals > 0)
    .map(u => ({
      name: u.full_name,
      email: u.email,
      total: u.referral_stats.completed_referrals,
      property: u.referral_stats.property_referrals || 0,
      legal: u.referral_stats.legal_referrals || 0,
      credits: u.referral_stats.total_credits_earned || 0,
      tier: u.referral_tier
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // Daily trend data (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const dailyTrend = last7Days.map(date => {
    const dayClicks = clicks.filter(c => c.click_timestamp?.startsWith(date)).length;
    const dayReferrals = referrals.filter(r => r.signup_date?.startsWith(date)).length;
    
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      clicks: dayClicks,
      signups: dayReferrals
    };
  });

  // Service breakdown
  const serviceData = [
    { name: 'Title Protection', value: titleProtectionRefs, color: '#06b6d4' },
    { name: 'Legal Support', value: legalSupportRefs, color: '#a855f7' },
    { name: 'Other', value: totalReferrals - titleProtectionRefs - legalSupportRefs, color: '#6b7280' }
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-purple-400" />
          Referral Analytics Dashboard
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            ADMIN
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Monitor referral performance, click-through rates, and reward distribution
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <MousePointer className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-3xl font-bold text-cyan-400">{totalClicks.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Clicks</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <Users className="w-8 h-8 text-purple-400 mb-2" />
            <p className="text-3xl font-bold text-purple-400">{totalReferrals.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Referrals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <TrendingUp className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-green-400">{conversionRate}%</p>
            <p className="text-sm text-gray-400">Conversion Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6">
            <DollarSign className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-3xl font-bold text-yellow-400">{totalCreditsIssued.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Credits Issued</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Referral Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={serviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a2332', 
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Home className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{titleProtectionRefs}</p>
                <p className="text-xs text-gray-400">Title Protection</p>
              </div>
              <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <Scale className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{legalSupportRefs}</p>
                <p className="text-xs text-gray-400">Legal Support</p>
              </div>
              <div className="text-center p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                <Users className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-sm font-bold text-white">{totalReferrals - titleProtectionRefs - legalSupportRefs}</p>
                <p className="text-xs text-gray-400">Other</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">7-Day Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a2332', 
                    border: '1px solid rgba(6, 182, 212, 0.2)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="clicks" stroke="#06b6d4" strokeWidth={2} name="Clicks" />
                <Line type="monotone" dataKey="signups" stroke="#a855f7" strokeWidth={2} name="Signups" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Top Referrers (Leaderboard)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {referrerStats.map((referrer, idx) => (
              <div
                key={referrer.email}
                className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      idx === 0 ? 'bg-gradient-to-br from-yellow-500 to-amber-500' :
                      idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                      'bg-gradient-to-br from-cyan-500 to-blue-500'
                    }`}>
                      {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                    </div>
                    <div>
                      <p className="text-white font-bold">{referrer.name}</p>
                      <p className="text-xs text-gray-400">{referrer.email}</p>
                    </div>
                    <Badge className={
                      referrer.tier === 'diamond' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
                      referrer.tier === 'platinum' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' :
                      referrer.tier === 'gold' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                      referrer.tier === 'silver' ? 'bg-gray-400/20 text-gray-400 border-gray-400/50' :
                      'bg-orange-500/20 text-orange-400 border-orange-500/50'
                    }>
                      {referrer.tier?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{referrer.total}</p>
                    <p className="text-xs text-gray-400">{referrer.credits} credits</p>
                    <div className="flex gap-2 mt-1">
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border text-xs">
                        🏠 {referrer.property}
                      </Badge>
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs">
                        ⚖️ {referrer.legal}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {referrerStats.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold">No referrers yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Clicks ({clicks.slice(0, 10).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {clicks.slice(0, 10).map(click => (
                <div
                  key={click.id}
                  className="p-3 bg-[#0f1419] rounded border border-cyan-500/10 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-mono">{click.referral_code}</span>
                    <Badge className={
                      click.referral_source === 'title_protection' 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border text-xs'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs'
                    }>
                      {click.referral_source === 'title_protection' ? '🏠' : '⚖️'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span>{new Date(click.click_timestamp).toLocaleString()}</span>
                    {click.converted && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        Converted
                      </Badge>
                    )}
                  </div>
                  {click.fraud_score > 50 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50 mt-1 text-xs">
                      ⚠️ Fraud Score: {click.fraud_score}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Recent Referrals ({referrals.slice(0, 10).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {referrals.slice(0, 10).map(ref => (
                <div
                  key={ref.id}
                  className="p-3 bg-[#0f1419] rounded border border-cyan-500/10 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white">{ref.referred_name}</span>
                    <Badge className={
                      ref.status === 'rewarded' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      ref.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                    }>
                      {ref.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 mb-1">{ref.referred_email}</p>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      ref.referral_source === 'title_protection' || ref.completion_action === 'property_added'
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border text-xs'
                        : 'bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs'
                    }>
                      {ref.referral_source === 'title_protection' || ref.completion_action === 'property_added' 
                        ? '🏠 Title' 
                        : '⚖️ Legal'}
                    </Badge>
                    {ref.bonus_granted && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                        +{ref.bonus_value} credits
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a2332', 
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="clicks" fill="#06b6d4" name="Link Clicks" />
              <Bar dataKey="signups" fill="#a855f7" name="Signups" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}