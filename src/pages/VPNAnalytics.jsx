import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, TrendingUp, Activity, Clock, Database,
  Wifi, Server, Globe, Zap, Signal, Download, Upload,
  ArrowUpDown, Users, Award, Calendar, Eye
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export default function VPNAnalytics() {
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState(7); // days

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['vpn-sessions-all', timeRange],
    queryFn: async () => {
      const cutoffDate = subDays(new Date(), timeRange).toISOString();
      const allSessions = await base44.entities.VPNSession.list('-created_date', 500);
      return allSessions.filter(s => new Date(s.created_date) >= new Date(cutoffDate));
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs-vpn', timeRange],
    queryFn: async () => {
      const logs = await base44.entities.AuditLog.filter(
        { action_category: 'vpn' },
        '-created_date',
        1000
      );
      const cutoffDate = subDays(new Date(), timeRange).toISOString();
      return logs.filter(l => new Date(l.created_date) >= new Date(cutoffDate));
    },
    enabled: !!user,
    initialData: [],
  });

  // Calculate key metrics
  const analytics = useMemo(() => {
    const mySessions = sessions.filter(s => s.user_email === user?.email);
    const activeSessions = sessions.filter(s => s.status === 'active');
    
    // Total stats
    const totalSessions = mySessions.length;
    const totalDuration = mySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    const totalRotations = mySessions.reduce((sum, s) => sum + (s.total_rotations || 0), 0);
    const totalDownload = mySessions.reduce((sum, s) => sum + (s.data_transferred?.download_kb || 0), 0);
    const totalUpload = mySessions.reduce((sum, s) => sum + (s.data_transferred?.upload_kb || 0), 0);
    
    // Averages
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const avgRotationsPerSession = totalSessions > 0 ? totalRotations / totalSessions : 0;
    const avgDownloadSpeed = totalDuration > 0 ? (totalDownload / totalDuration) * 1024 : 0; // KB/s
    const avgUploadSpeed = totalDuration > 0 ? (totalUpload / totalDuration) * 1024 : 0; // KB/s
    
    // Server usage
    const serverUsage = {};
    mySessions.forEach(session => {
      const serverId = session.current_server?.id || 'unknown';
      const serverName = session.current_server?.name || 'Unknown';
      
      if (!serverUsage[serverId]) {
        serverUsage[serverId] = {
          name: serverName,
          count: 0,
          duration: 0,
          rotations: 0
        };
      }
      
      serverUsage[serverId].count += 1;
      serverUsage[serverId].duration += session.duration_seconds || 0;
      serverUsage[serverId].rotations += session.total_rotations || 0;
    });
    
    const mostUsedServers = Object.entries(serverUsage)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
    
    // Daily trends
    const dailyStats = {};
    for (let i = timeRange - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayKey = format(day, 'MMM dd');
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const daySessions = mySessions.filter(s => {
        const sessionDate = new Date(s.created_date);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });
      
      dailyStats[dayKey] = {
        date: dayKey,
        sessions: daySessions.length,
        duration: daySessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60, // minutes
        download: daySessions.reduce((sum, s) => sum + (s.data_transferred?.download_kb || 0), 0) / 1024, // MB
        upload: daySessions.reduce((sum, s) => sum + (s.data_transferred?.upload_kb || 0), 0) / 1024, // MB
        rotations: daySessions.reduce((sum, s) => sum + (s.total_rotations || 0), 0)
      };
    }
    
    const trendData = Object.values(dailyStats);
    
    // Rotation history analysis
    const allRotations = [];
    mySessions.forEach(session => {
      if (session.rotation_history) {
        session.rotation_history.forEach(rot => {
          allRotations.push({
            ...rot,
            session_id: session.session_id
          });
        });
      }
    });
    
    return {
      totalSessions,
      totalDuration,
      totalRotations,
      totalDownload,
      totalUpload,
      avgDuration,
      avgRotationsPerSession,
      avgDownloadSpeed,
      avgUploadSpeed,
      mostUsedServers,
      trendData,
      activeSessions: activeSessions.length,
      allRotations
    };
  }, [sessions, user, timeRange]);

  // Session speed data for detailed chart
  const sessionSpeedData = useMemo(() => {
    return sessions
      .filter(s => s.user_email === user?.email && s.duration_seconds > 0)
      .slice(0, 20)
      .reverse()
      .map((session, idx) => {
        const downloadSpeed = session.duration_seconds > 0 
          ? ((session.data_transferred?.download_kb || 0) / session.duration_seconds) * 1024
          : 0;
        const uploadSpeed = session.duration_seconds > 0
          ? ((session.data_transferred?.upload_kb || 0) / session.duration_seconds) * 1024
          : 0;
        
        return {
          session: `#${idx + 1}`,
          download: downloadSpeed.toFixed(2),
          upload: uploadSpeed.toFixed(2),
          server: session.current_server?.name || 'Unknown',
          rotations: session.total_rotations || 0
        };
      });
  }, [sessions, user]);

  const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
            VPN Analytics Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Detailed insights into your VPN usage, performance, and patterns
          </p>
        </div>
        
        <div className="flex gap-2">
          {[7, 14, 30, 90].map(days => (
            <Button
              key={days}
              onClick={() => setTimeRange(days)}
              variant={timeRange === days ? "default" : "outline"}
              size="sm"
              className={timeRange === days 
                ? "bg-gradient-to-r from-cyan-500 to-blue-600" 
                : "border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-8 h-8 text-cyan-400" />
              <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                {timeRange}d
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{analytics.totalSessions}</p>
            <p className="text-sm text-gray-400">Total Sessions</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                Avg
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">
              {Math.floor(analytics.avgDuration / 60)}m
            </p>
            <p className="text-sm text-gray-400">Avg Session Duration</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <ArrowUpDown className="w-8 h-8 text-orange-400" />
              <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                Total
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{analytics.totalRotations}</p>
            <p className="text-sm text-gray-400">Server Rotations</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Database className="w-8 h-8 text-green-400" />
              <Badge className="bg-green-500/20 text-green-400 text-xs">
                Total
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">
              {((analytics.totalDownload + analytics.totalUpload) / 1024).toFixed(1)} MB
            </p>
            <p className="text-sm text-gray-400">Data Transferred</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#1a2332] border-cyan-500/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20">
            <Eye className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-cyan-500/20">
            <Zap className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="servers" className="data-[state=active]:bg-cyan-500/20">
            <Server className="w-4 h-4 mr-2" />
            Servers
          </TabsTrigger>
          <TabsTrigger value="rotations" className="data-[state=active]:bg-cyan-500/20">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            Rotations
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Usage Trends */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Daily Usage Trends ({timeRange} days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.trendData}>
                  <defs>
                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="#06b6d4" 
                    fillOpacity={1} 
                    fill="url(#colorSessions)" 
                    name="Sessions"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="duration" 
                    stroke="#8b5cf6" 
                    fillOpacity={1} 
                    fill="url(#colorDuration)" 
                    name="Duration (min)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Data Transfer Trends */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-green-400" />
                Data Transfer Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} label={{ value: 'MB', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="download" fill="#10b981" name="Download (MB)" />
                  <Bar dataKey="upload" fill="#06b6d4" name="Upload (MB)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Rotations Trend */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-orange-400" />
                Server Rotations Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="rotations" 
                    stroke="#f97316" 
                    strokeWidth={3}
                    name="Daily Rotations"
                    dot={{ fill: '#f97316', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          {/* Speed Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-400" />
                  Average Download Speed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-5xl font-bold text-green-400 mb-2">
                    {analytics.avgDownloadSpeed.toFixed(1)}
                  </p>
                  <p className="text-gray-400">KB/s</p>
                  <p className="text-sm text-gray-500 mt-4">
                    Based on {analytics.totalSessions} sessions
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-cyan-400" />
                  Average Upload Speed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-5xl font-bold text-cyan-400 mb-2">
                    {analytics.avgUploadSpeed.toFixed(1)}
                  </p>
                  <p className="text-gray-400">KB/s</p>
                  <p className="text-sm text-gray-500 mt-4">
                    Based on {analytics.totalSessions} sessions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-Session Speed Chart */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Speed Per Session (Last 20 Sessions)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessionSpeedData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={sessionSpeedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="session" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} label={{ value: 'KB/s', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Legend />
                    <Bar dataKey="download" fill="#10b981" name="Download (KB/s)" />
                    <Bar dataKey="upload" fill="#06b6d4" name="Upload (KB/s)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No session data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6 text-center">
                <Download className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="text-2xl font-bold text-white">
                  {(analytics.totalDownload / 1024).toFixed(2)} MB
                </p>
                <p className="text-sm text-gray-400">Total Downloaded</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6 text-center">
                <Upload className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                <p className="text-2xl font-bold text-white">
                  {(analytics.totalUpload / 1024).toFixed(2)} MB
                </p>
                <p className="text-sm text-gray-400">Total Uploaded</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
              <CardContent className="p-6 text-center">
                <Zap className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <p className="text-2xl font-bold text-white">
                  {Math.floor(analytics.totalDuration / 3600)}h {Math.floor((analytics.totalDuration % 3600) / 60)}m
                </p>
                <p className="text-sm text-gray-400">Total Connection Time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Servers Tab */}
        <TabsContent value="servers" className="space-y-6 mt-6">
          {/* Most Used Servers */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-400" />
                Most Used Servers (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.mostUsedServers.length > 0 ? (
                <div className="space-y-3">
                  {analytics.mostUsedServers.map((server, idx) => (
                    <div
                      key={server.id}
                      className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                          idx === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
                          idx === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          idx === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                          'bg-gray-700'
                        }`}>
                          {idx + 1}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-white font-bold">{server.name}</h4>
                          <div className="flex items-center gap-4 mt-1 text-sm">
                            <span className="text-gray-400">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {Math.floor(server.duration / 60)}m {server.duration % 60}s
                            </span>
                            <span className="text-gray-400">
                              <Activity className="w-3 h-3 inline mr-1" />
                              {server.count} sessions
                            </span>
                            <span className="text-gray-400">
                              <ArrowUpDown className="w-3 h-3 inline mr-1" />
                              {server.rotations} rotations
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge className="bg-cyan-500/20 text-cyan-400">
                            {((server.duration / analytics.totalDuration) * 100).toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No server usage data yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Server Usage Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Server Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.mostUsedServers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.mostUsedServers.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="duration"
                      >
                        {analytics.mostUsedServers.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-gray-400">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
              <CardHeader>
                <CardTitle className="text-white">Session Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Avg Rotations per Session</p>
                  <p className="text-3xl font-bold text-orange-400">
                    {analytics.avgRotationsPerSession.toFixed(1)}
                  </p>
                </div>
                
                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Avg Session Duration</p>
                  <p className="text-3xl font-bold text-purple-400">
                    {Math.floor(analytics.avgDuration / 60)} min
                  </p>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg">
                  <p className="text-sm text-gray-400 mb-2">Active Sessions Now</p>
                  <p className="text-3xl font-bold text-green-400 flex items-center justify-center gap-2">
                    {analytics.activeSessions}
                    <span className="text-xs animate-pulse">● Live</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rotations Tab */}
        <TabsContent value="rotations" className="space-y-6 mt-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-orange-400" />
                Recent Rotations ({analytics.allRotations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.allRotations.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {analytics.allRotations.slice(0, 50).map((rotation, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0f1419] rounded-lg p-3 border border-orange-500/10 hover:border-orange-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                              #{idx + 1}
                            </Badge>
                            <span className="text-white text-sm font-semibold">
                              {rotation.from_server} → {rotation.to_server}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>
                              <Signal className="w-3 h-3 inline mr-1" />
                              Load: {rotation.from_load}% → {rotation.to_load}%
                            </span>
                            <span>
                              Reason: {rotation.reason?.replace(/-/g, ' ')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {new Date(rotation.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ArrowUpDown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No rotation history yet</p>
                  <p className="text-sm text-gray-500 mt-1">Enable auto-rotation to start tracking</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-[#0f1419] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Sessions</p>
              <p className="text-2xl font-bold text-cyan-400">{analytics.totalSessions}</p>
            </div>
            <div className="text-center p-4 bg-[#0f1419] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Rotations</p>
              <p className="text-2xl font-bold text-orange-400">{analytics.totalRotations}</p>
            </div>
            <div className="text-center p-4 bg-[#0f1419] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Total Time</p>
              <p className="text-2xl font-bold text-purple-400">
                {Math.floor(analytics.totalDuration / 3600)}h
              </p>
            </div>
            <div className="text-center p-4 bg-[#0f1419] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Downloaded</p>
              <p className="text-2xl font-bold text-green-400">
                {(analytics.totalDownload / 1024).toFixed(0)} MB
              </p>
            </div>
            <div className="text-center p-4 bg-[#0f1419] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Uploaded</p>
              <p className="text-2xl font-bold text-cyan-400">
                {(analytics.totalUpload / 1024).toFixed(0)} MB
              </p>
            </div>
            <div className="text-center p-4 bg-[#0f1419] rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Active Now</p>
              <p className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-1">
                {analytics.activeSessions}
                <span className="text-xs animate-pulse">●</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}