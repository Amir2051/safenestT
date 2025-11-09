import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Activity, Shield, AlertTriangle, CheckCircle, XCircle, Clock,
  Eye, Server, Zap, TrendingUp, RefreshCw, Search, Filter, Database
} from "lucide-react";
import { 
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, formatDistanceToNow } from "date-fns";

export default function AdminMonitoringDashboard() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: scans = [], isLoading: scansLoading, refetch } = useQuery({
    queryKey: ['monitoring-scans'],
    queryFn: () => base44.entities.MonitoringScan.list('-started_at', 100),
    enabled: !!user && user?.role === 'admin',
    initialData: [],
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['all-properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 500),
    enabled: !!user && user?.role === 'admin',
    initialData: [],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['all-title-alerts'],
    queryFn: () => base44.entities.TitleAlert.list('-alert_date', 200),
    enabled: !!user && user?.role === 'admin',
    initialData: [],
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const latestScan = scans[0];
    const runningScans = scans.filter(s => s.status === 'running');
    const completedScans = scans.filter(s => s.status === 'completed');
    const failedScans = scans.filter(s => s.status === 'failed');
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentScans = scans.filter(s => new Date(s.started_at) > last24h);
    const alertsLast24h = alerts.filter(a => new Date(a.alert_date || a.created_date) > last24h);
    const criticalAlertsLast24h = alertsLast24h.filter(a => a.severity === 'critical' || a.severity === 'high');
    
    const avgDuration = completedScans.length > 0
      ? completedScans.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / completedScans.length
      : 0;
    
    const totalPropertiesMonitored = properties.filter(p => p.monitoring_enabled).length;
    const lockedProperties = properties.filter(p => p.is_locked).length;
    const avgSecurityScore = properties.length > 0
      ? properties.reduce((sum, p) => sum + (p.title_security_score || 100), 0) / properties.length
      : 100;
    
    // Success rate
    const totalScans = completedScans.length + failedScans.length;
    const successRate = totalScans > 0 ? (completedScans.length / totalScans * 100).toFixed(1) : 100;
    
    // Health status
    const recentFailures = scans.slice(0, 5).filter(s => s.status === 'failed').length;
    let healthStatus = 'healthy';
    if (recentFailures >= 3) healthStatus = 'down';
    else if (recentFailures >= 2) healthStatus = 'warning';
    
    // Trend data (last 7 days)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));
      
      const dayScans = scans.filter(s => {
        const scanDate = new Date(s.started_at);
        return scanDate >= dayStart && scanDate <= dayEnd;
      });
      
      const dayAlerts = alerts.filter(a => {
        const alertDate = new Date(a.alert_date || a.created_date);
        return alertDate >= dayStart && alertDate <= dayEnd;
      });
      
      trendData.push({
        date: format(dayStart, 'MMM dd'),
        scans: dayScans.length,
        alerts: dayAlerts.length,
        critical: dayAlerts.filter(a => a.severity === 'critical').length
      });
    }
    
    return {
      latestScan,
      runningScans: runningScans.length,
      totalPropertiesMonitored,
      lockedProperties,
      alertsLast24h: alertsLast24h.length,
      criticalAlertsLast24h: criticalAlertsLast24h.length,
      failedScans: failedScans.length,
      avgDuration,
      avgSecurityScore,
      successRate,
      healthStatus,
      trendData,
      recentScans: scans.slice(0, 20)
    };
  }, [scans, properties, alerts]);

  const filteredScans = metrics.recentScans.filter(scan => {
    const matchesStatus = statusFilter === 'all' || scan.status === statusFilter;
    const matchesSearch = !searchTerm || 
      scan.scan_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy':
        return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50', icon: '🟢' };
      case 'warning':
        return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', icon: '🟡' };
      case 'down':
        return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', icon: '🔴' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50', icon: '⚪' };
    }
  };

  const healthColors = getHealthColor(metrics.healthStatus);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-white font-bold text-xl">Access Denied</p>
          <p className="text-gray-400 mt-2">Admin privileges required</p>
        </div>
      </div>
    );
  }

  const nextScanTime = metrics.latestScan?.next_scheduled_scan 
    ? new Date(metrics.latestScan.next_scheduled_scan)
    : new Date(new Date().setHours(3, 0, 0, 0) + (Date.now() > new Date().setHours(3, 0, 0, 0) ? 24 * 60 * 60 * 1000 : 0));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Server className="w-8 h-8 text-cyan-400" />
            Title Monitoring Engine
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time status and performance metrics • Admin Dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Engine Health Status */}
      <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 ${healthColors.border}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 ${healthColors.bg} rounded-xl flex items-center justify-center relative`}>
                <Server className={`w-8 h-8 ${healthColors.text}`} />
                {metrics.runningScans > 0 && (
                  <div className="absolute inset-0 rounded-xl border-4 border-cyan-400 border-t-transparent animate-spin" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  {healthColors.icon} Engine Status: {metrics.healthStatus.toUpperCase()}
                </h2>
                <p className={`text-sm ${healthColors.text}`}>
                  {metrics.healthStatus === 'healthy' && '✓ All systems operational'}
                  {metrics.healthStatus === 'warning' && '⚠️ Performance degraded - monitoring'}
                  {metrics.healthStatus === 'down' && '🔴 Critical issues detected - immediate attention required'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Success Rate</p>
              <p className="text-3xl font-bold text-green-400">{metrics.successRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              <p className="text-xs text-gray-400">Properties</p>
            </div>
            <p className="text-3xl font-bold text-white">{metrics.totalPropertiesMonitored}</p>
            <p className="text-xs text-gray-500 mt-1">Monitored</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <p className="text-xs text-gray-400">Avg Score</p>
            </div>
            <p className="text-3xl font-bold text-purple-400">{Math.round(metrics.avgSecurityScore)}</p>
            <p className="text-xs text-gray-500 mt-1">Security</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-xs text-gray-400">Alerts (24h)</p>
            </div>
            <p className="text-3xl font-bold text-red-400">{metrics.alertsLast24h}</p>
            <p className="text-xs text-gray-500 mt-1">{metrics.criticalAlertsLast24h} Critical</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-orange-400" />
              <p className="text-xs text-gray-400">Failed</p>
            </div>
            <p className="text-3xl font-bold text-orange-400">{metrics.failedScans}</p>
            <p className="text-xs text-gray-500 mt-1">Total Errors</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-400" />
              <p className="text-xs text-gray-400">Avg Duration</p>
            </div>
            <p className="text-3xl font-bold text-green-400">{metrics.avgDuration.toFixed(1)}s</p>
            <p className="text-xs text-gray-500 mt-1">Per Scan</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              {metrics.runningScans > 0 && (
                <Badge className="bg-blue-500 text-white text-xs animate-pulse">LIVE</Badge>
              )}
            </div>
            <p className="text-3xl font-bold text-blue-400">{metrics.runningScans}</p>
            <p className="text-xs text-gray-500 mt-1">Running Now</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Scan & Next Scan Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Last Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.latestScan ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Scan ID:</span>
                  <span className="text-white font-mono text-sm">{metrics.latestScan.scan_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Started:</span>
                  <span className="text-white text-sm">
                    {formatDistanceToNow(new Date(metrics.latestScan.started_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Duration:</span>
                  <span className="text-white text-sm">{metrics.latestScan.duration_seconds}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Properties:</span>
                  <span className="text-white text-sm">{metrics.latestScan.properties_scanned}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Alerts Created:</span>
                  <span className="text-red-400 font-bold">{metrics.latestScan.alerts_created}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Status:</span>
                  <Badge className={
                    metrics.latestScan.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                    metrics.latestScan.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  }>
                    {metrics.latestScan.status}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No scans recorded yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" />
              Next Scheduled Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                <Clock className="w-10 h-10 text-purple-400" />
                <div className="absolute inset-0 rounded-full border-4 border-purple-400 border-t-transparent animate-spin" 
                     style={{ animationDuration: '3s' }} />
              </div>
              <p className="text-3xl font-bold text-white mb-2">
                {formatDistanceToNow(nextScanTime, { addSuffix: true })}
              </p>
              <p className="text-sm text-gray-400">
                {format(nextScanTime, 'MMM dd, yyyy HH:mm')} EST
              </p>
              <p className="text-xs text-purple-400 mt-3">
                Daily automated scan • 3:00 AM EST
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            7-Day Activity Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="scans" stroke="#06b6d4" strokeWidth={2} name="Scans" />
              <Line type="monotone" dataKey="alerts" stroke="#f97316" strokeWidth={2} name="Alerts" />
              <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters & Search */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by scan ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setStatusFilter('all')}
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'all' ? 'bg-cyan-500' : 'border-cyan-500/20 text-cyan-400'}
              >
                All
              </Button>
              <Button
                onClick={() => setStatusFilter('running')}
                variant={statusFilter === 'running' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'running' ? 'bg-blue-500' : 'border-blue-500/20 text-blue-400'}
              >
                Running
              </Button>
              <Button
                onClick={() => setStatusFilter('completed')}
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'completed' ? 'bg-green-500' : 'border-green-500/20 text-green-400'}
              >
                Completed
              </Button>
              <Button
                onClick={() => setStatusFilter('failed')}
                variant={statusFilter === 'failed' ? 'default' : 'outline'}
                size="sm"
                className={statusFilter === 'failed' ? 'bg-red-500' : 'border-red-500/20 text-red-400'}
              >
                Failed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Log Table */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Scan History ({filteredScans.length})
            </span>
            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs animate-pulse">
              Updates every 30s
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scansLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="animate-pulse bg-[#0f1419] rounded-lg h-20" />
              ))}
            </div>
          ) : filteredScans.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold">No Scans Found</p>
              <p className="text-gray-400 text-sm mt-1">Scans will appear here once monitoring starts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredScans.map((scan) => (
                <div
                  key={scan.id}
                  className={`bg-[#0f1419] rounded-lg p-4 border ${
                    scan.status === 'running' ? 'border-blue-500/30' :
                    scan.status === 'completed' ? 'border-green-500/20' :
                    scan.status === 'failed' ? 'border-red-500/30' :
                    'border-gray-700'
                  } hover:border-cyan-500/30 transition-all`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {scan.status === 'running' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
                        )}
                        {scan.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {scan.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                        
                        <span className="text-white font-semibold font-mono text-sm">{scan.scan_id}</span>
                        
                        <Badge className={`text-xs ${
                          scan.scan_type === 'daily_automated' ? 'bg-cyan-500/20 text-cyan-400' :
                          scan.scan_type === 'hourly_premium' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {scan.scan_type.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                        <div>
                          <p className="text-gray-500">Started</p>
                          <p className="text-gray-300">{format(new Date(scan.started_at), 'HH:mm:ss')}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Properties</p>
                          <p className="text-white font-semibold">{scan.properties_scanned || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Documents</p>
                          <p className="text-cyan-400 font-semibold">{scan.documents_analyzed || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">New Docs</p>
                          <p className="text-orange-400 font-semibold">{scan.new_documents_found || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Alerts</p>
                          <p className="text-red-400 font-semibold">
                            {scan.alerts_created || 0}
                            {scan.critical_alerts > 0 && ` (${scan.critical_alerts} critical)`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge className={`${
                        scan.status === 'running' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                        scan.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                        scan.status === 'failed' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/50'
                      } border`}>
                        {scan.status}
                      </Badge>
                      {scan.completed_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(scan.completed_at), 'MMM dd, HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Scan Details Expandable */}
                  {scan.scan_details && scan.scan_details.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-cyan-400 cursor-pointer hover:underline">
                        View {scan.scan_details.length} property scan details
                      </summary>
                      <div className="mt-3 space-y-2">
                        {scan.scan_details.map((detail, idx) => (
                          <div key={idx} className="bg-[#1a2332] rounded p-2 border border-cyan-500/10 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">{detail.property_address_masked}</span>
                              <Badge className={`text-xs ${
                                detail.status === 'success' ? 'bg-green-500/20 text-green-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {detail.status}
                              </Badge>
                            </div>
                            <div className="flex gap-4 mt-1 text-gray-500">
                              <span>Docs: {detail.documents_checked}</span>
                              <span>New: {detail.new_documents}</span>
                              <span>Alerts: {detail.alerts_triggered}</span>
                              <span className={
                                detail.security_score >= 90 ? 'text-green-400' :
                                detail.security_score >= 70 ? 'text-cyan-400' :
                                detail.security_score >= 50 ? 'text-yellow-400' :
                                'text-red-400'
                              }>
                                Score: {detail.security_score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* API Errors */}
                  {scan.api_errors && scan.api_errors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                      <p className="text-xs text-red-400 font-semibold mb-1">
                        ⚠️ {scan.api_errors.length} API Error{scan.api_errors.length > 1 ? 's' : ''}
                      </p>
                      {scan.api_errors.slice(0, 2).map((error, idx) => (
                        <p key={idx} className="text-xs text-gray-400">
                          • {error.error_message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white">Protection Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Total Properties</span>
              <span className="text-white font-bold text-lg">{properties.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Monitored</span>
              <span className="text-cyan-400 font-bold text-lg">{metrics.totalPropertiesMonitored}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Title Locked</span>
              <span className="text-purple-400 font-bold text-lg">{metrics.lockedProperties}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Avg Security Score</span>
              <span className={`font-bold text-lg ${
                metrics.avgSecurityScore >= 90 ? 'text-green-400' :
                metrics.avgSecurityScore >= 70 ? 'text-cyan-400' :
                metrics.avgSecurityScore >= 50 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {Math.round(metrics.avgSecurityScore)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardHeader>
            <CardTitle className="text-white">Alert Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Total Alerts</span>
              <span className="text-white font-bold text-lg">{alerts.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Last 24 Hours</span>
              <span className="text-orange-400 font-bold text-lg">{metrics.alertsLast24h}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Critical (24h)</span>
              <span className="text-red-400 font-bold text-lg animate-pulse">{metrics.criticalAlertsLast24h}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-gray-400 text-sm">Fraud Reports</span>
              <span className="text-red-400 font-bold text-lg">
                {alerts.filter(a => a.fraud_reported).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}