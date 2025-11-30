import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Activity, Users, AlertOctagon, Shield } from "lucide-react";

export default function AIPatternDashboard() {
  const { data: adminStats = [] } = useQuery({
    queryKey: ['admin-behavior-stats'],
    queryFn: async () => {
      const res = await base44.functions.invoke('behaviorEngine', {
        endpoint: 'analyze-admin',
        data: {}
      });
      return res.data.results || [];
    }
  });

  const { data: recentRisks = [] } = useQuery({
    queryKey: ['recent-risks'],
    queryFn: () => base44.entities.RiskAssessment.filter({ risk_level: 'critical' }, '-last_analyzed', 5)
  });

  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1a2332] border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Active Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">24</div>
            <p className="text-xs text-gray-500">Detected in last 24h</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Critical Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{recentRisks.length}</div>
            <p className="text-xs text-gray-500">Requiring attention</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Admin Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">94%</div>
            <p className="text-xs text-gray-500">Workflow efficiency</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Auto-Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">12</div>
            <p className="text-xs text-gray-500">Triggered today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#0f1419] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Admin Behavior Monitoring
            </CardTitle>
            <CardDescription>Workflow efficiency and workload predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {adminStats.map((stat, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#1a2332] rounded-lg border border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                      {stat.name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{stat.name}</p>
                      <p className="text-xs text-gray-400">Efficiency: {stat.efficiency_score}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={stat.workload_prediction === 'Optimal' ? 'secondary' : 'destructive'}>
                      {stat.workload_prediction}
                    </Badge>
                    {stat.flagged_actions?.length > 0 && (
                       <p className="text-xs text-red-400 mt-1">{stat.flagged_actions[0]}</p>
                    )}
                  </div>
                </div>
              ))}
              {adminStats.length === 0 && <p className="text-gray-500 text-center">No admin data available.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#0f1419] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-red-400" />
              Critical Risk Cases
            </CardTitle>
            <CardDescription>High priority cases detected by AI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRisks.map((risk, i) => (
                <div key={i} className="p-3 bg-[#1a2332] rounded-lg border border-red-500/20">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-xs text-gray-500">ID: {risk.target_id.slice(0,8)}...</span>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Critical Risk</Badge>
                  </div>
                  <p className="text-sm text-gray-300 mb-2 line-clamp-2">{risk.ai_analysis}</p>
                  <div className="flex flex-wrap gap-2">
                    {risk.factors.slice(0,3).map((f, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {recentRisks.length === 0 && <p className="text-gray-500 text-center">No critical risks detected recently.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}