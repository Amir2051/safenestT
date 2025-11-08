import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, AlertTriangle, TrendingUp, Clock, CheckCircle, 
  XCircle, Activity, BarChart3, Download, RefreshCw, ExternalLink
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

export default function SecurityDashboard() {
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState('12weeks');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch scans
  const { data: scans = [], isLoading: scansLoading, refetch } = useQuery({
    queryKey: ['security-scans'],
    queryFn: () => base44.entities.SecurityScan.list('-created_date', 50),
    initialData: [],
  });

  // Fetch findings
  const { data: findings = [], isLoading: findingsLoading } = useQuery({
    queryKey: ['security-findings'],
    queryFn: () => base44.entities.SecurityFinding.list('-created_date', 200),
    initialData: [],
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
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

  // Prepare trend data (last 12 weeks)
  const trendData = [];
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

    const weekFindings = weekScans.reduce((sum, scan) => {
      return sum + (scan.findings_summary?.critical || 0) + (scan.findings_summary?.high || 0);
    }, 0);

    trendData.push({
      week: format(weekStart, 'MMM d'),
      scans: weekScans.length,
      findings: weekFindings,
      critical: weekScans.reduce((sum, s) => sum + (s.findings_summary?.critical || 0), 0),
      high: weekScans.reduce((sum, s) => sum + (s.findings_summary?.high || 0), 0)
    });
  }

  // Pie chart data
  const severityData = [
    { name: 'Critical', value: criticalCount, color: '#ef4444' },
    { name: 'High', value: highCount, color: '#f97316' },
    { name: 'Medium', value: mediumCount, color: '#eab308' },
    { name: 'Low', value: lowCount, color: '#3b82f6' }
  ].filter(item => item.value > 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            Security Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            OWASP compliance and security scanning overview
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-cyan-500/20 text-cyan-400"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => window.open('/docs/security/runbook.md')}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Security Runbook
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-10 h-10 text-cyan-400" />
              <Badge className="bg-cyan-500/20 text-cyan-400">{timeRange}</Badge>
            </div>
            <p className="text-3xl font-bold text-white">{totalScans}</p>
            <p className="text-sm text-gray-400">Total Scans</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <Badge className={`${criticalCount + highCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {criticalCount + highCount > 0 ? 'Action Required' : 'Safe'}
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{criticalCount + highCount}</p>
            <p className="text-sm text-gray-400">Critical/High Findings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10 text-green-400" />
              <Badge className={`${passRate >= 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {passRate}%
              </Badge>
            </div>
            <p className="text-3xl font-bold text-white">{passedScans}/{totalScans}</p>
            <p className="text-sm text-gray-400">Passed Scans</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-10 h-10 text-purple-400" />
              <Badge className="bg-purple-500/20 text-purple-400">Latest</Badge>
            </div>
            <p className="text-3xl font-bold text-white">
              {latestScan ? format(new Date(latestScan.created_date), 'MMM d') : 'N/A'}
            </p>
            <p className="text-sm text-gray-400">Last Scan Date</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Security Scan Trends (12 Weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" />
                <Line type="monotone" dataKey="high" stroke="#f97316" strokeWidth={2} name="High" />
                <Line type="monotone" dataKey="scans" stroke="#06b6d4" strokeWidth={2} name="Scans" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Severity Distribution */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Open Findings by Severity
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scans Table */}
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
            <div className="text-center py-8">
              <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No scans yet</p>
              <p className="text-sm text-gray-500 mt-1">Run your first security scan to see results here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400 text-sm">Date</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm">Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 text-sm">Target</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-sm">Critical</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-sm">High</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-sm">Medium</th>
                    <th className="text-center py-3 px-4 text-gray-400 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.slice(0, 10).map((scan) => (
                    <tr key={scan.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-white text-sm">
                        {format(new Date(scan.created_date), 'MMM d, HH:mm')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-gray-500/20 text-gray-300 text-xs">
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

      {/* Quick Links */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Quick Links & Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a href="/docs/security/runbook.md" target="_blank" className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all">
              <h4 className="text-white font-semibold mb-2">📖 Security Runbook</h4>
              <p className="text-sm text-gray-400">Step-by-step guide to running scans and triaging findings</p>
            </a>
            <a href="/docs/security/owasp-top10-playbook.md" target="_blank" className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all">
              <h4 className="text-white font-semibold mb-2">🛠️ OWASP Playbook</h4>
              <p className="text-sm text-gray-400">Code snippets and fixes for common vulnerabilities</p>
            </a>
            <a href="/docs/security/mstg-mapping.md" target="_blank" className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all">
              <h4 className="text-white font-semibold mb-2">📱 Mobile Security (MSTG)</h4>
              <p className="text-sm text-gray-400">Android & iOS security testing guide</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}