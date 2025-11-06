import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Download, Calendar, TrendingUp, Shield, 
  AlertTriangle, Lock, Plus, Loader2 
} from "lucide-react";
import { format } from "date-fns";

export default function Reports() {
  const [user, setUser] = useState(null);
  const [generating, setGenerating] = useState(false);

  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: () => base44.entities.Report.list('-created_date'),
    initialData: [],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.list('-created_date', 100),
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createReportMutation = useMutation({
    mutationFn: (data) => base44.entities.Report.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const generateReport = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const recentAlerts = alerts.filter(a => new Date(a.created_date) >= monthAgo);
      const resolvedAlerts = recentAlerts.filter(a => a.status === 'resolved').length;
      
      // Generate AI summary
      const summaryPrompt = `Generate a concise security report summary for a user with:
- Current Security Score: ${user?.risk_score || 85}/100
- Total Alerts (30 days): ${recentAlerts.length}
- Resolved Alerts: ${resolvedAlerts}
- Active Alerts: ${recentAlerts.filter(a => a.status === 'active').length}
- VPN Status: ${user?.vpn_enabled ? 'Enabled' : 'Disabled'}
- 2FA Status: ${user?.two_factor_enabled ? 'Enabled' : 'Disabled'}

Write a friendly 2-3 sentence summary of their security posture and progress.`;

      const summary = await base44.integrations.Core.InvokeLLM({
        prompt: summaryPrompt,
      });

      // Generate recommendations
      const recommendations = [];
      if (!user?.vpn_enabled) recommendations.push("Enable VPN for enhanced privacy");
      if (!user?.two_factor_enabled) recommendations.push("Activate two-factor authentication");
      if (recentAlerts.filter(a => a.severity === 'critical' && a.status === 'active').length > 0) {
        recommendations.push("Address critical security alerts immediately");
      }
      if (user?.risk_score < 80) recommendations.push("Work on improving your security score to 80+");

      await createReportMutation.mutateAsync({
        report_type: 'on_demand',
        score_snapshot: user?.risk_score || 85,
        summary: summary,
        total_alerts: recentAlerts.length,
        resolved_alerts: resolvedAlerts,
        recommendations: recommendations,
        period_start: monthAgo.toISOString().split('T')[0],
        period_end: now.toISOString().split('T')[0],
      });
    } catch (error) {
      console.error('Error generating report:', error);
    }
    setGenerating(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const reportTypeColors = {
    weekly: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    monthly: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
    on_demand: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-cyan-400" />
            Security Reports
          </h1>
          <p className="text-gray-400 mt-1">Track your security progress over time</p>
        </div>
        <Button
          onClick={generateReport}
          disabled={generating}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/20"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Generate New Report
            </>
          )}
        </Button>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Score</p>
                <p className="text-2xl font-bold text-white">{user.risk_score}</p>
              </div>
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Reports</p>
                <p className="text-2xl font-bold text-white">{reports.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Resolved Issues</p>
                <p className="text-2xl font-bold text-white">
                  {alerts.filter(a => a.status === 'resolved').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Active Alerts</p>
                <p className="text-2xl font-bold text-white">
                  {alerts.filter(a => a.status === 'active').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))
        ) : reports.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No reports yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Generate your first security report to get started</p>
              <Button
                onClick={generateReport}
                disabled={generating}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Generate Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => (
            <Card
              key={report.id}
              className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          Security Report
                        </h3>
                        <Badge className={`${reportTypeColors[report.report_type]} border`}>
                          {report.report_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(report.created_date), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="w-4 h-4" />
                          Score: {report.score_snapshot}/100
                        </span>
                      </div>
                      {report.summary && (
                        <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                          {report.summary}
                        </p>
                      )}
                      <div className="flex gap-6 text-xs">
                        <div>
                          <span className="text-gray-400">Total Alerts: </span>
                          <span className="text-white font-semibold">{report.total_alerts || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Resolved: </span>
                          <span className="text-green-400 font-semibold">{report.resolved_alerts || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Period: </span>
                          <span className="text-white font-semibold">
                            {report.period_start && report.period_end
                              ? `${format(new Date(report.period_start), 'MMM dd')} - ${format(new Date(report.period_end), 'MMM dd')}`
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 flex-shrink-0"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>

                {report.recommendations && report.recommendations.length > 0 && (
                  <div className="bg-[#0f1419] rounded-lg p-4 border border-yellow-500/20">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      💡 Recommendations
                    </h4>
                    <ul className="space-y-1">
                      {report.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-gray-300">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}