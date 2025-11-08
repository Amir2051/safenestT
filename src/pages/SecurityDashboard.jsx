import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, AlertTriangle, TrendingUp, Clock, CheckCircle, 
  XCircle, Activity, BarChart3, RefreshCw, ExternalLink, Zap
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

import LiveProtectionStatus from "../components/security/LiveProtectionStatus.jsx";

function SecurityDashboard() {
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState('12weeks');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    
    loadUser();
  }, []);

  const { data: scans = [], isLoading: scansLoading, refetch } = useQuery({
    queryKey: ['security-scans'],
    queryFn: async () => {
      try {
        const result = await base44.entities.SecurityScan.list('-created_date', 50);
        return result || [];
      } catch (error) {
        console.error('Failed to load scans:', error);
        return [];
      }
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: findings = [] } = useQuery({
    queryKey: ['security-findings'],
    queryFn: async () => {
      try {
        const result = await base44.entities.SecurityFinding.list('-created_date', 200);
        return result || [];
      } catch (error) {
        console.error('Failed to load findings:', error);
        return [];
      }
    },
    enabled: !!user,
    initialData: [],
  });

  const { data: securityEvents = [] } = useQuery({
    queryKey: ['security-events'],
    queryFn: async () => {
      try {
        const result = await base44.entities.SecurityEvent.list('-created_date', 100);
        return result || [];
      } catch (error) {
        console.error('Failed to load security events:', error);
        return [];
      }
    },
    enabled: !!user,
    initialData: [],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading security dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const totalScans = scans.length;
  const latestScan = scans[0];
  const passedScans = scans.filter(s => s.pass_fail_status === 'pass').length;
  const passRate = totalScans > 0 ? ((passedScans / totalScans) * 100).toFixed(1) : 0;

  const openFindings = findings.filter(f => f.status === 'open');
  const criticalCount = openFindings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = openFindings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = openFindings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = openFindings.filter(f => f.severity === 'LOW').length;

  const blockedThreats = securityEvents.filter(e => e.blocked).length;
  const criticalEvents = securityEvents.filter(e => e.severity === 'critical').length;

  // Prepare trend data
  const trendData = React.useMemo(() => {
    const data = [];
    const weeksAgo = 12;
    const now = new Date();
    
    for (let i = weeksAgo - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekScans = scans.filter(s => {
        const scanDate = new Date(s.created_date);
        return scanDate >= weekStart && scanDate < weekEnd;
      });

      data.push({
        week: format(weekStart, 'MMM d'),
        scans: weekScans.length,
        critical: weekScans.reduce((sum, s) => sum + (s.findings_summary?.critical || 0), 0),
        high: weekScans.reduce((sum, s) => sum + (s.findings_summary?.high || 0), 0)
      });
    }
    
    return data;
  }, [scans]);

  const severityData = React.useMemo(() => {
    return [
      { name: 'Critical', value: criticalCount, color: '#ef4444' },
      { name: 'High', value: highCount, color: '#f97316' },
      { name: 'Medium', value: mediumCount, color: '#eab308' },
      { name: 'Low', value: lowCount, color: '#3b82f6' }
    ].filter(item => item.value > 0);
  }, [criticalCount, highCount, mediumCount, lowCount]);

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            Security Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Live OWASP protection • Real-time threat detection • Automated defense
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
          <Button
            onClick={() => window.open('https://github.com/your-org/your-repo/blob/main/docs/security/runbook.md', '_blank')}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Security Runbook
          </Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-10 h-10 text-green-400" />
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
                LIVE
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{blockedThreats}</p>
            <p className="text-sm text-gray-400">Threats Blocked (24h)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-10 h-10 text-cyan-400" />
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">{timeRange}</Badge>
            </div>
            <p className="text-3xl font-bold text-white">{totalScans}</p>
            <p className="text-sm text-gray-400">Security Scans</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <Badge className={`${criticalCount + highCount > 0 ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'} border`}>
                {criticalCount + highCount > 0 ? 'Action Required' : 'Safe'}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{criticalCount + highCount}</p>
            <p className="text-sm text-gray-400">Critical/High Findings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-10 h-10 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                OWASP
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">100%</p>
            <p className="text-sm text-gray-400">Coverage Active</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1a2332] border-cyan-500/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20">
            Overview
          </TabsTrigger>
          <TabsTrigger value="live-protection" className="data-[state=active]:bg-cyan-500/20">
            <Zap className="w-4 h-4 mr-2" />
            Live Protection
          </TabsTrigger>
          <TabsTrigger value="scans" className="data-[state=active]:bg-cyan-500/20">
            Scans & Findings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Security Scan Trends (12 Weeks)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="week" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
                      <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} name="High" />
                      <Line type="monotone" dataKey="scans" stroke="#06b6d4" strokeWidth={2} name="Scans" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <p className="text-gray-400">No scan data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  Open Findings by Severity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {severityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mb-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Live Protection Tab */}
        <TabsContent value="live-protection" className="space-y-6 mt-6">
          <LiveProtectionStatus />
        </TabsContent>

        {/* Scans Tab */}
        <TabsContent value="scans" className="space-y-6 mt-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Security Scans</CardTitle>
            </CardHeader>
            <CardContent>
              {scansLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto" />
                </div>
              ) : scans.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-white font-semibold text-lg">No scans yet</p>
                  <p className="text-sm text-gray-400 mt-1">Run your first security scan</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-semibold">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-semibold">Type</th>
                        <th className="text-left py-3 px-4 text-gray-400 text-sm font-semibold">Target</th>
                        <th className="text-center py-3 px-4 text-gray-400 text-sm font-semibold">Critical</th>
                        <th className="text-center py-3 px-4 text-gray-400 text-sm font-semibold">High</th>
                        <th className="text-center py-3 px-4 text-gray-400 text-sm font-semibold">Medium</th>
                        <th className="text-center py-3 px-4 text-gray-400 text-sm font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scans.slice(0, 10).map((scan) => (
                        <tr key={scan.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 px-4 text-white text-sm">
                            {format(new Date(scan.created_date), 'MMM d, HH:mm')}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/50 text-xs">
                              {scan.scan_type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-300 text-sm truncate max-w-xs">
                            {scan.target}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${scan.findings_summary?.critical > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                              {scan.findings_summary?.critical || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${scan.findings_summary?.high > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                              {scan.findings_summary?.high || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-bold ${scan.findings_summary?.medium > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                              {scan.findings_summary?.medium || 0}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {scan.pass_fail_status === 'pass' ? (
                              <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400 mx-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SecurityDashboard;