import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, Users, CheckCircle, Clock, XCircle, 
  MousePointerClick, Target, BarChart3, Calendar
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function ReferralAnalytics({ referrals, user }) {
  // Calculate analytics metrics
  const analytics = useMemo(() => {
    const total = referrals.length;
    const pending = referrals.filter(r => r.status === 'pending').length;
    const verified = referrals.filter(r => r.status === 'verified').length;
    const completed = referrals.filter(r => r.status === 'completed' || r.status === 'rewarded').length;
    const invalid = referrals.filter(r => r.status === 'invalid').length;
    
    // Click-through and conversion metrics
    const clickedLinks = referrals.filter(r => r.referral_link_clicked).length;
    const clickThroughRate = total > 0 ? ((clickedLinks / total) * 100).toFixed(1) : 0;
    
    const conversions = referrals.filter(r => r.status !== 'invalid' && r.status !== 'pending').length;
    const conversionRate = clickedLinks > 0 ? ((conversions / clickedLinks) * 100).toFixed(1) : 0;
    
    // Average time to conversion
    const completedWithTime = referrals.filter(r => 
      (r.status === 'completed' || r.status === 'rewarded') && 
      r.signup_date && 
      r.completed_date
    );
    
    const avgConversionTime = completedWithTime.length > 0
      ? completedWithTime.reduce((sum, r) => {
          const signupTime = new Date(r.signup_date).getTime();
          const completedTime = new Date(r.completed_date).getTime();
          const hours = (completedTime - signupTime) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / completedWithTime.length
      : 0;
    
    // Monthly trend data
    const monthlyData = {};
    referrals.forEach(r => {
      const month = new Date(r.signup_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!monthlyData[month]) {
        monthlyData[month] = { month, total: 0, completed: 0 };
      }
      monthlyData[month].total++;
      if (r.status === 'completed' || r.status === 'rewarded') {
        monthlyData[month].completed++;
      }
    });
    
    const trendData = Object.values(monthlyData).slice(-6);
    
    // Bonus earnings
    const totalBonusMonths = user?.referral_stats?.bonus_months_earned || 0;
    const bonusValue = totalBonusMonths * 9.99; // Assuming $9.99/month
    
    return {
      total,
      pending,
      verified,
      completed,
      invalid,
      clickedLinks,
      clickThroughRate,
      conversions,
      conversionRate,
      avgConversionTime,
      trendData,
      totalBonusMonths,
      bonusValue
    };
  }, [referrals, user]);

  // Status breakdown for pie chart
  const statusData = [
    { name: 'Completed', value: analytics.completed, color: '#10b981' },
    { name: 'Pending', value: analytics.pending, color: '#eab308' },
    { name: 'Verified', value: analytics.verified, color: '#3b82f6' },
    { name: 'Invalid', value: analytics.invalid, color: '#ef4444' }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <MousePointerClick className="w-8 h-8 text-cyan-400" />
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                CTR
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.clickThroughRate}%</p>
            <p className="text-xs text-gray-400">Click-Through Rate</p>
            <p className="text-xs text-cyan-400 mt-1">{analytics.clickedLinks}/{analytics.total} clicked</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                Conv
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{analytics.conversionRate}%</p>
            <p className="text-xs text-gray-400">Conversion Rate</p>
            <p className="text-xs text-purple-400 mt-1">{analytics.conversions}/{analytics.clickedLinks} converted</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-green-400" />
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                Time
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {analytics.avgConversionTime > 0 
                ? `${Math.round(analytics.avgConversionTime)}h` 
                : 'N/A'
              }
            </p>
            <p className="text-xs text-gray-400">Avg. Time to Activate</p>
            <p className="text-xs text-green-400 mt-1">From signup to first login</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-yellow-400" />
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                Earned
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white mb-1">${analytics.bonusValue.toFixed(2)}</p>
            <p className="text-xs text-gray-400">Total Bonus Value</p>
            <p className="text-xs text-yellow-400 mt-1">{analytics.totalBonusMonths} months earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Referral Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
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
                <p className="text-gray-400">No referral data yet</p>
              </div>
            )}
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-gray-300">Completed: {analytics.completed}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Pending: {analytics.pending}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">Verified: {analytics.verified}</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-gray-300">Invalid: {analytics.invalid}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend Line Chart */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Referral Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.trendData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#9ca3af" 
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#9ca3af" 
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#06b6d4" 
                      strokeWidth={2} 
                      name="Total Referrals"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      name="Completed"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center">
                <p className="text-gray-400">Not enough data to show trends</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {parseFloat(analytics.conversionRate) > 50 && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-sm">
                  🎉 <strong>Excellent conversion rate!</strong> Your referral strategy is working great.
                </p>
              </div>
            )}
            
            {parseFloat(analytics.clickThroughRate) < 30 && analytics.total > 5 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  💡 <strong>Tip:</strong> Try personalizing your message when sharing your code to improve click-through rates.
                </p>
              </div>
            )}
            
            {analytics.invalid > 2 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">
                  ⚠️ <strong>Alert:</strong> {analytics.invalid} invalid referrals detected. Ensure you're sharing with genuine users.
                </p>
              </div>
            )}
            
            {analytics.avgConversionTime > 0 && analytics.avgConversionTime < 24 && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-cyan-400 text-sm">
                  ⚡ <strong>Fast conversions!</strong> Your referrals are activating within {Math.round(analytics.avgConversionTime)} hours on average.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}