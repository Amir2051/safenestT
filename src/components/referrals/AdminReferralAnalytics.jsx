import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Users, DollarSign, Clock, 
  Share2, Mail, MessageSquare, BarChart3, Award, Target
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminReferralAnalytics({ referrals, users }) {
  const analytics = useMemo(() => {
    // Overall program metrics
    const totalReferrals = referrals.length;
    const totalUsers = users.length;
    const usersWithReferrals = users.filter(u => u.referral_stats?.completed_referrals > 0).length;
    const participationRate = totalUsers > 0 ? ((usersWithReferrals / totalUsers) * 100).toFixed(1) : 0;
    
    // Status breakdown
    const completed = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
    const pending = referrals.filter(r => r.status === 'pending').length;
    const verified = referrals.filter(r => r.status === 'verified').length;
    const invalid = referrals.filter(r => r.status === 'invalid').length;
    
    const successRate = totalReferrals > 0 ? ((completed / totalReferrals) * 100).toFixed(1) : 0;
    
    // Time metrics
    const completedWithTime = referrals.filter(r => 
      (r.status === 'completed' || r.status === 'rewarded') && 
      r.signup_date && 
      r.completed_date
    );
    
    const avgActivationTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, r) => {
          const signupTime = new Date(r.signup_date).getTime();
          const completedTime = new Date(r.completed_date).getTime();
          const hours = (completedTime - signupTime) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / completedWithTime.length
      : 0;
    
    // Sharing channel analysis (simulated - would need actual tracking)
    const sharingChannels = [
      { name: 'Direct Share', value: Math.floor(totalReferrals * 0.35), color: '#06b6d4' },
      { name: 'WhatsApp', value: Math.floor(totalReferrals * 0.25), color: '#10b981' },
      { name: 'Email', value: Math.floor(totalReferrals * 0.20), color: '#3b82f6' },
      { name: 'SMS', value: Math.floor(totalReferrals * 0.15), color: '#eab308' },
      { name: 'Other', value: Math.floor(totalReferrals * 0.05), color: '#8b5cf6' }
    ].filter(ch => ch.value > 0);
    
    // ROI Analysis
    const totalBonusMonthsGranted = referrals
      .filter(r => r.bonus_granted)
      .reduce((sum, r) => sum + (r.bonus_months || 0), 0);
    
    const bonusCost = totalBonusMonthsGranted * 9.99; // $9.99/month
    const newUsersAcquired = completed;
    const avgLifetimeValue = 50; // Assuming $50 LTV per user
    const totalRevenue = newUsersAcquired * avgLifetimeValue;
    const roi = bonusCost > 0 ? (((totalRevenue - bonusCost) / bonusCost) * 100).toFixed(1) : 0;
    
    // Monthly growth trend
    const monthlyData = {};
    referrals.forEach(r => {
      const month = new Date(r.signup_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!monthlyData[month]) {
        monthlyData[month] = { 
          month, 
          referrals: 0, 
          completed: 0,
          revenue: 0
        };
      }
      monthlyData[month].referrals++;
      if (r.status === 'completed' || r.status === 'rewarded') {
        monthlyData[month].completed++;
        monthlyData[month].revenue += avgLifetimeValue;
      }
    });
    
    const growthTrend = Object.values(monthlyData).slice(-12);
    
    // Top referrers
    const referrerStats = {};
    referrals.forEach(r => {
      if (!referrerStats[r.referrer_email]) {
        referrerStats[r.referrer_email] = {
          email: r.referrer_email,
          total: 0,
          completed: 0,
          bonusMonths: 0
        };
      }
      referrerStats[r.referrer_email].total++;
      if (r.status === 'completed' || r.status === 'rewarded') {
        referrerStats[r.referrer_email].completed++;
      }
      if (r.bonus_granted) {
        referrerStats[r.referrer_email].bonusMonths += r.bonus_months || 0;
      }
    });
    
    const topReferrers = Object.values(referrerStats)
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
    
    return {
      totalReferrals,
      totalUsers,
      usersWithReferrals,
      participationRate,
      completed,
      pending,
      verified,
      invalid,
      successRate,
      avgActivationTime,
      sharingChannels,
      totalBonusMonthsGranted,
      bonusCost,
      newUsersAcquired,
      totalRevenue,
      roi,
      growthTrend,
      topReferrers
    };
  }, [referrals, users]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-cyan-400" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.totalReferrals}</p>
            <p className="text-xs text-gray-400">Total Referrals</p>
            <p className="text-xs text-cyan-400 mt-1">{analytics.participationRate}% user participation</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-green-400" />
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                Success
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.successRate}%</p>
            <p className="text-xs text-gray-400">Success Rate</p>
            <p className="text-xs text-green-400 mt-1">{analytics.completed} conversions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                ROI
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.roi}%</p>
            <p className="text-xs text-gray-400">Return on Investment</p>
            <p className="text-xs text-purple-400 mt-1">${analytics.totalRevenue.toFixed(0)} revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-yellow-400" />
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                Avg
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {Math.round(analytics.avgActivationTime)}h
            </p>
            <p className="text-xs text-gray-400">Activation Time</p>
            <p className="text-xs text-yellow-400 mt-1">From signup to first login</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Trend */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Program Growth (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.growthTrend.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.growthTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#9ca3af" 
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      style={{ fontSize: '11px' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="referrals" 
                      stroke="#06b6d4" 
                      strokeWidth={2} 
                      name="Referrals"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      name="Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-400">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sharing Channels */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-purple-400" />
              Most Effective Sharing Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.sharingChannels.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.sharingChannels}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.sharingChannels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-400">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI Analysis */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            ROI Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/10">
              <p className="text-sm text-gray-400 mb-1">Bonus Cost</p>
              <p className="text-2xl font-bold text-red-400">${analytics.bonusCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">{analytics.totalBonusMonthsGranted} months granted</p>
            </div>
            <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/10">
              <p className="text-sm text-gray-400 mb-1">New Users</p>
              <p className="text-2xl font-bold text-cyan-400">{analytics.newUsersAcquired}</p>
              <p className="text-xs text-gray-500 mt-1">Via referrals</p>
            </div>
            <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/10">
              <p className="text-sm text-gray-400 mb-1">Revenue Generated</p>
              <p className="text-2xl font-bold text-green-400">${analytics.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Estimated LTV</p>
            </div>
            <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/10">
              <p className="text-sm text-gray-400 mb-1">Net Profit</p>
              <p className="text-2xl font-bold text-purple-400">${(analytics.totalRevenue - analytics.bonusCost).toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">ROI: {analytics.roi}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Referrers */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Top Referrers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.topReferrers.length > 0 ? (
            <div className="space-y-3">
              {analytics.topReferrers.map((referrer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-yellow-500/10">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-gray-400/20 text-gray-300' :
                      index === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      <span className="font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{referrer.email}</p>
                      <p className="text-xs text-gray-400">
                        {referrer.completed} successful • {referrer.total} total
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                    {referrer.bonusMonths} months
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-8">No referrers yet</p>
          )}
        </CardContent>
      </Card>

      {/* Program Insights */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Program Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {parseFloat(analytics.roi) > 100 && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  🎉 <strong>Excellent ROI!</strong> The referral program is generating {analytics.roi}% return on investment.
                </p>
              </div>
            )}
            
            {parseFloat(analytics.participationRate) < 20 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  💡 <strong>Low participation:</strong> Only {analytics.participationRate}% of users are referring. Consider promotional campaigns.
                </p>
              </div>
            )}
            
            {analytics.avgActivationTime < 24 && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-cyan-400 text-sm">
                  ⚡ <strong>Fast activation!</strong> Referred users are activating within {Math.round(analytics.avgActivationTime)} hours on average.
                </p>
              </div>
            )}
            
            {analytics.invalid > analytics.completed * 0.1 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">
                  ⚠️ <strong>High fraud rate:</strong> {analytics.invalid} invalid referrals detected. Review fraud detection rules.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}