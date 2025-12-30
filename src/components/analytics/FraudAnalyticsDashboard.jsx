import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, DollarSign, AlertTriangle, CheckCircle, Users,
  Target, Activity, Brain, Download, RefreshCw, Loader2
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

export default function FraudAnalyticsDashboard() {
  const [insights, setInsights] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['all-cases-analytics'],
    queryFn: () => base44.entities.MyCase.list('-created_date', 5000),
    refetchInterval: 30000
  });

  const { data: aiInsights, isLoading: loadingInsights } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: async () => {
      const response = await base44.functions.invoke('reportGeneration', {
        action: 'generate_analytics_report',
        data: { dateRange: 'month' }
      });
      return response.data;
    },
    refetchInterval: 60000
  });

  // Calculate statistics
  const stats = React.useMemo(() => {
    const result = {
      total: cases.length,
      total_losses: 0,
      total_recovered: 0,
      by_type: {},
      by_status: {},
      by_priority: {},
      monthly_trend: {},
      recovery_rate: 0,
      avg_amount: 0,
      critical_cases: 0
    };

    cases.forEach(c => {
      // Financial
      const lost = c.amount_lost || 0;
      const recovered = c.recovery_amount || 0;
      result.total_losses += lost;
      result.total_recovered += recovered;

      // By type
      const type = c.issue_type || 'other';
      result.by_type[type] = (result.by_type[type] || 0) + 1;

      // By status
      const status = c.status || 'Pending';
      result.by_status[status] = (result.by_status[status] || 0) + 1;

      // By priority
      const priority = c.priority_score >= 80 ? 'Critical' :
                       c.priority_score >= 60 ? 'High' :
                       c.priority_score >= 40 ? 'Medium' : 'Low';
      result.by_priority[priority] = (result.by_priority[priority] || 0) + 1;

      // Critical count
      if (c.priority_score >= 80 || c.urgency === 'Critical') {
        result.critical_cases++;
      }

      // Monthly trend
      const month = new Date(c.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      result.monthly_trend[month] = (result.monthly_trend[month] || 0) + 1;
    });

    result.recovery_rate = result.total_losses > 0 
      ? ((result.total_recovered / result.total_losses) * 100).toFixed(1)
      : 0;
    
    result.avg_amount = result.total > 0 
      ? (result.total_losses / result.total).toFixed(0)
      : 0;

    return result;
  }, [cases]);

  const fraudTypeData = Object.entries(stats.by_type).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
    percentage: ((value / stats.total) * 100).toFixed(1)
  }));

  const statusData = Object.entries(stats.by_status).map(([name, value]) => ({
    name,
    value
  }));

  const priorityData = Object.entries(stats.by_priority).map(([name, value]) => ({
    name,
    value
  }));

  const monthlyData = Object.entries(stats.monthly_trend)
    .slice(-6)
    .map(([month, count]) => ({ month, cases: count }));

  const downloadReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await base44.functions.invoke('reportGeneration', {
        action: 'generate_analytics_report',
        data: { dateRange: 'all' }
      });

      // Handle JSON response with PDF generation
      toast.success('Analytics report generated!');
    } catch (error) {
      toast.error('Failed to generate report');
    }
    setGeneratingReport(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Fraud Analytics Dashboard</h2>
          <p className="text-gray-400 text-sm">Strategic insights and performance metrics</p>
        </div>
        <Button
          onClick={downloadReport}
          disabled={generatingReport}
          className="bg-gradient-to-r from-purple-500 to-blue-600"
        >
          {generatingReport ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-cyan-400" />
              <Badge className="bg-cyan-500/20 text-cyan-400">Total</Badge>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-400">Cases Filed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 text-red-400" />
              <Badge className="bg-red-500/20 text-red-400">Losses</Badge>
            </div>
            <p className="text-3xl font-bold text-white">${(stats.total_losses / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-gray-400">Total Stolen</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-8 h-8 text-green-400" />
              <Badge className="bg-green-500/20 text-green-400">Recovery</Badge>
            </div>
            <p className="text-3xl font-bold text-white">{stats.recovery_rate}%</p>
            <p className="text-xs text-gray-400">${(stats.total_recovered / 1000).toFixed(0)}K Recovered</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-orange-400" />
              <Badge className="bg-orange-500/20 text-orange-400">Priority</Badge>
            </div>
            <p className="text-3xl font-bold text-white">{stats.critical_cases}</p>
            <p className="text-xs text-gray-400">High Priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Types Distribution */}
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Fraud Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fraudTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fraudTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Case Status */}
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Case Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #06b6d4' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">6-Month Case Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #06b6d4' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="cases" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-sm">Priority Levels (AI-Scored)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #06b6d4' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {aiInsights?.insights && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Strategic Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key Trends */}
            {aiInsights.insights.key_trends?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-400 mb-2">Key Trends</h4>
                <ul className="space-y-1">
                  {aiInsights.insights.key_trends.map((trend, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                      {trend}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Performance Summary */}
            {aiInsights.insights.performance_summary && (
              <div>
                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Performance Summary</h4>
                <p className="text-sm text-gray-300">{aiInsights.insights.performance_summary}</p>
              </div>
            )}

            {/* Risk Factors */}
            {aiInsights.insights.risk_factors?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-orange-400 mb-2">Risk Factors to Monitor</h4>
                <ul className="space-y-1">
                  {aiInsights.insights.risk_factors.map((risk, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {aiInsights.insights.recommendations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-2">Strategic Recommendations</h4>
                <ol className="space-y-1 list-decimal list-inside">
                  {aiInsights.insights.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-gray-300">{rec}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detailed Stats Table */}
      <Card className="bg-[#1a2332] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-sm">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs text-gray-400 mb-2 font-semibold">By Fraud Type</h4>
              <div className="space-y-1">
                {fraudTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 capitalize">{item.name}</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400">
                      {item.value} ({item.percentage}%)
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs text-gray-400 mb-2 font-semibold">By Status</h4>
              <div className="space-y-1">
                {statusData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{item.name}</span>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      {item.value}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}