import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  TrendingUp, Download, Calendar, Filter, BarChart3, 
  Grid3x3, Lock, AlertTriangle, Loader2
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function ExposureTrends({ user, vault }) {
  const [dateRange, setDateRange] = useState('30'); // days
  const [selectedTypes, setSelectedTypes] = useState(['all']);
  const [view, setView] = useState('timeline'); // timeline, heatmap, breakdown

  const vaultUnlocked = vault?.is_unlocked && 
                        vault?.token_expires_at && 
                        new Date(vault.token_expires_at) > new Date();

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(dateRange));

  // Fetch trends data
  const { data: trendsData, isLoading } = useQuery({
    queryKey: ['exposure-trends', user?.email, dateRange, selectedTypes],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyticsService', {
        endpoint: 'trends',
        user_id: user.email,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        types: selectedTypes.includes('all') ? null : selectedTypes
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch heatmap data
  const { data: heatmapData } = useQuery({
    queryKey: ['exposure-heatmap', user?.email, dateRange],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyticsService', {
        endpoint: 'heatmap',
        user_id: user.email,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      });
      return response.data;
    },
    enabled: !!user && view === 'heatmap'
  });

  const handleExport = async (format) => {
    try {
      if (!vaultUnlocked) {
        toast.error('🔒 Unlock vault to export data');
        return;
      }

      const response = await base44.functions.invoke('analyticsService', {
        endpoint: 'export',
        format: format,
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      });

      // Trigger download
      const blob = new Blob([response.data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exposure-trends-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Prepare stacked data for breakdown chart
  const stackedData = trendsData?.series?.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ...item.breakdown
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              <span>Exposure Trends</span>
              {!vaultUnlocked && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  <Lock className="w-3 h-3 mr-1" />
                  Redacted
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleExport('csv')}
                size="sm"
                variant="outline"
                className="border-cyan-500/20 text-cyan-400"
                disabled={!vaultUnlocked}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-[#0f1419] border border-cyan-500/20 text-white rounded px-3 py-1.5 text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last year</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedTypes[0]}
                onChange={(e) => setSelectedTypes([e.target.value])}
                className="bg-[#0f1419] border border-cyan-500/20 text-white rounded px-3 py-1.5 text-sm"
              >
                <option value="all">All Types</option>
                <option value="email">Email</option>
                <option value="password">Password</option>
                <option value="ssn">SSN</option>
                <option value="credit_card">Credit Card</option>
                <option value="phone">Phone</option>
              </select>
            </div>

            <div className="flex gap-1 ml-auto">
              <Button
                size="sm"
                variant={view === 'timeline' ? 'default' : 'outline'}
                onClick={() => setView('timeline')}
                className={view === 'timeline' ? 'bg-cyan-500' : 'border-cyan-500/20'}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={view === 'breakdown' ? 'default' : 'outline'}
                onClick={() => setView('breakdown')}
                className={view === 'breakdown' ? 'bg-cyan-500' : 'border-cyan-500/20'}
              >
                <TrendingUp className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={view === 'heatmap' ? 'default' : 'outline'}
                onClick={() => setView('heatmap')}
                className={view === 'heatmap' ? 'bg-cyan-500' : 'border-cyan-500/20'}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Redaction Notice */}
          {!vaultUnlocked && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-yellow-400" />
                <p className="text-yellow-300 text-sm">
                  Identifiers are redacted. Unlock vault to see raw data.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      {isLoading ? (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading exposure data...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {view === 'timeline' && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Time-Series View</CardTitle>
              </CardHeader>
              <CardContent>
                {trendsData?.series?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={trendsData.series.map(s => ({
                      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      exposures: s.total
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #06b6d4' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="exposures" 
                        stroke="#06b6d4" 
                        strokeWidth={3}
                        dot={{ fill: '#06b6d4', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No exposure data in selected range</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {view === 'breakdown' && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Stacked Breakdown by Type</CardTitle>
              </CardHeader>
              <CardContent>
                {stackedData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={stackedData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9CA3AF" />
                      <YAxis stroke="#9CA3AF" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #06b6d4' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="email" stackId="1" stroke="#06b6d4" fill="#06b6d4" />
                      <Area type="monotone" dataKey="password" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                      <Area type="monotone" dataKey="ssn" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                      <Area type="monotone" dataKey="credit_card" stackId="1" stroke="#ef4444" fill="#ef4444" />
                      <Area type="monotone" dataKey="phone" stackId="1" stroke="#10b981" fill="#10b981" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No data to display</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {view === 'heatmap' && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Heatmap: Sources × Dates</CardTitle>
              </CardHeader>
              <CardContent>
                {heatmapData?.rows?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="border border-cyan-500/20 p-2 text-left text-gray-300 text-sm">Source</th>
                          {heatmapData.cols.map((date, idx) => (
                            <th key={idx} className="border border-cyan-500/20 p-2 text-center text-gray-300 text-xs">
                              {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.rows.map((source, rowIdx) => (
                          <tr key={rowIdx}>
                            <td className="border border-cyan-500/20 p-2 text-gray-300 text-sm">{source}</td>
                            {heatmapData.matrix[rowIdx].map((value, colIdx) => {
                              const intensity = value === 0 ? 0 : Math.min(100, (value / 5) * 100);
                              const bgColor = value === 0 
                                ? 'transparent' 
                                : `rgba(6, 182, 212, ${intensity / 100})`;
                              return (
                                <td 
                                  key={colIdx} 
                                  className="border border-cyan-500/20 p-2 text-center text-white text-sm"
                                  style={{ backgroundColor: bgColor }}
                                >
                                  {value > 0 ? value : ''}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-400 mt-3">
                      Color intensity = number of exposures (darker = more exposures)
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Grid3x3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No heatmap data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs mb-1">Total Exposures</p>
            <p className="text-2xl font-bold text-cyan-400">
              {trendsData?.series?.reduce((sum, s) => sum + s.total, 0) || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs mb-1">Unique Sources</p>
            <p className="text-2xl font-bold text-purple-400">
              {heatmapData?.rows?.length || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs mb-1">Days Monitored</p>
            <p className="text-2xl font-bold text-orange-400">{dateRange}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <p className="text-gray-400 text-xs mb-1">Vault Status</p>
            <p className="text-sm font-bold text-green-400">
              {vaultUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}