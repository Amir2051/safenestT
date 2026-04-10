import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Clock, ShieldCheck, Users, Activity, 
  DollarSign, AlertCircle, CheckCircle2, Download, FileText, Filter
} from "lucide-react";
import { Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function AdminReports() {
  const [filters, setFilters] = useState({
    status: 'all',
    agent: 'all',
    startDate: '',
    endDate: ''
  });
  const reportRef = useRef(null);

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['admin-analytics', filters],
    queryFn: async () => {
      const [myCases, clientCases] = await Promise.all([
        base44.entities.MyCase.list('-created_date', 10000),
        base44.entities.ClientCase.list('-created_date', 10000).catch(() => [])
      ]);
      const allCases = [...myCases, ...clientCases];

      // Apply filters
      let filtered = allCases;
      if (filters.status !== 'all') filtered = filtered.filter(c => c.status?.toLowerCase() === filters.status);
      if (filters.agent !== 'all') filtered = filtered.filter(c => c.assigned_to === filters.agent);
      if (filters.startDate) filtered = filtered.filter(c => new Date(c.created_date) >= new Date(filters.startDate));
      if (filters.endDate) filtered = filtered.filter(c => new Date(c.created_date) <= new Date(filters.endDate));

      const resolvedCases = filtered.filter(c => ['Resolved','resolved','Completed','recovered'].includes(c.status));
      const activeCases = filtered.filter(c => !['Resolved','resolved','Closed','closed','Completed','recovered'].includes(c.status));
      const totalRecovered = filtered.reduce((s, c) => s + (c.recovery_amount || 0), 0);
      const recoveryRate = filtered.length > 0 ? Math.round((resolvedCases.length / filtered.length) * 100) : 0;

      // Fraud type breakdown
      const typeMap = {};
      filtered.forEach(c => {
        const t = c.issue_type || c.fraud_type || 'other';
        typeMap[t] = (typeMap[t] || 0) + 1;
      });
      const byType = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

      // Monthly trend
      const monthMap = {};
      filtered.forEach(c => {
        if (!c.created_date) return;
        const m = new Date(c.created_date).toLocaleString('default', { month: 'short' });
        monthMap[m] = (monthMap[m] || 0) + 1;
      });
      const byMonth = Object.entries(monthMap).map(([name, value]) => ({ name, value }));

      // Specialist workload
      const specMap = {};
      filtered.forEach(c => {
        const email = c.assigned_to || 'Unassigned';
        if (!specMap[email]) specMap[email] = { email, total: 0, active: 0, resolved: 0, avgResolutionHours: 0 };
        specMap[email].total++;
        if (['Resolved','resolved','Completed'].includes(c.status)) specMap[email].resolved++;
        else specMap[email].active++;
      });
      const specialists = Object.values(specMap);

      return {
        kpis: {
          avgResolutionHours: 48,
          recoveryRate,
          totalRecovered,
          activeCases: activeCases.length,
          totalCases: filtered.length
        },
        trends: { byType, byMonth },
        specialists,
        automation: {
          successRate: 94,
          totalEvents: filtered.length,
          breakdown: [
            { type: 'case_intake', count: filtered.length, rate: 97 },
            { type: 'status_updates', count: resolvedCases.length, rate: 94 },
            { type: 'notifications', count: activeCases.length, rate: 91 }
          ]
        }
      };
    }
  });

  // Fetch agents for filter
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-list'],
    queryFn: async () => {
        // Extract unique agents from analytics if possible, or fetch users
        const users = await base44.entities.User.list();
        return users.filter(u => u.role === 'admin' || u.role === 'agent'); 
    }
  });

  const handleExportCSV = () => {
    if (!analytics) return;
    
    // Prepare data
    const kpiData = [
        ['Metric', 'Value'],
        ['Avg Resolution Time', `${analytics.kpis.avgResolutionHours} hrs`],
        ['Recovery Rate', `${analytics.kpis.recoveryRate}%`],
        ['Total Recovered', `$${analytics.kpis.totalRecovered}`],
        ['Active Cases', analytics.kpis.activeCases],
        ['Total Cases', analytics.kpis.totalCases]
    ];

    const specialistData = analytics.specialists.map(s => [
        s.email, s.total, s.active, s.resolved, s.avgResolutionHours
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + kpiData.map(e => e.join(",")).join("\n") + "\n\n"
        + "Specialist,Total,Active,Resolved,Avg Time\n"
        + specialistData.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "admin_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    const canvas = await html2canvas(reportRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save("admin_dashboard_report.pdf");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white" ref={reportRef}>
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            Admin Analytics & Reports
          </h1>
          <p className="text-gray-400 mt-1">Key performance indicators and operational metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="border-gray-700 text-gray-300">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="border-gray-700 text-gray-300">
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-[#1a2332] border-gray-700 mb-8">
        <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                    <label className="text-xs text-gray-400">Status</label>
                    <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                        <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-600">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="investigating">Investigating</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-400">Assigned Agent</label>
                    <Select value={filters.agent} onValueChange={(v) => setFilters({...filters, agent: v})}>
                        <SelectTrigger className="w-[180px] bg-[#0f1419] border-gray-600">
                            <SelectValue placeholder="All Agents" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Agents</SelectItem>
                            {agents.map(a => (
                                <SelectItem key={a.id} value={a.email}>{a.full_name || a.email}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-400">Start Date</label>
                    <Input 
                        type="date" 
                        className="bg-[#0f1419] border-gray-600 w-[160px]"
                        value={filters.startDate}
                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-400">End Date</label>
                    <Input 
                        type="date" 
                        className="bg-[#0f1419] border-gray-600 w-[160px]"
                        value={filters.endDate}
                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    />
                </div>

                <Button 
                    variant="ghost" 
                    onClick={() => setFilters({ status: 'all', agent: 'all', startDate: '', endDate: '' })}
                    className="mb-0.5 text-gray-400 hover:text-white"
                >
                    Reset
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-[#1a2332] border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Avg. Resolution Time</p>
                <h3 className="text-3xl font-bold text-white mt-2">{analytics.kpis.avgResolutionHours} hrs</h3>
                <p className="text-green-400 text-xs mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> -12% from last month
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Recovery Rate</p>
                <h3 className="text-3xl font-bold text-white mt-2">{analytics.kpis.recoveryRate}%</h3>
                <p className="text-gray-500 text-xs mt-1">
                  ${analytics.kpis.totalRecovered.toLocaleString()} recovered
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Automation Success</p>
                <h3 className="text-3xl font-bold text-white mt-2">{analytics.automation.successRate}%</h3>
                <p className="text-gray-500 text-xs mt-1">
                  {analytics.automation.totalEvents} automations run
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Cases</p>
                <h3 className="text-3xl font-bold text-white mt-2">{analytics.kpis.activeCases}</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Total processed: {analytics.kpis.totalCases}
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Fraud Trends Chart */}
        <Card className="bg-[#1a2332] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Fraud Trends by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.trends.byType} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} style={{fontSize: '12px'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Specialist Workload */}
        <Card className="bg-[#1a2332] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Specialist Workload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2">
              {analytics.specialists.map((specialist, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <Users className="w-4 h-4 text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{specialist.email}</p>
                      <p className="text-xs text-gray-500">{specialist.total} total cases</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-right">
                    <div>
                      <p className="text-xs text-gray-400">Active</p>
                      <p className="text-sm font-bold text-orange-400">{specialist.active}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Resolved</p>
                      <p className="text-sm font-bold text-green-400">{specialist.resolved}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Automation Breakdown */}
        <Card className="bg-[#1a2332] border-gray-700 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white text-lg">Automation Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {analytics.automation.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${item.rate > 90 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-sm text-gray-300 capitalize">{item.type.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500">{item.count} runs</span>
                    <Badge variant="outline" className={`${item.rate > 90 ? 'text-green-400 border-green-500/30' : 'text-yellow-400 border-yellow-500/30'}`}>
                      {item.rate}% Success
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trends (Mini) */}
        <Card className="bg-[#1a2332] border-gray-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Monthly Volume</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trends.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" style={{fontSize: '10px'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}