import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, Clock, Target, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function InvestigatorPerformance() {
  const { data: cases = [] } = useQuery({
    queryKey: ['investigator-performance'],
    queryFn: () => base44.entities.MyCase.list('-created_date', 5000)
  });

  const performanceData = React.useMemo(() => {
    const investigators = {};

    cases.forEach(c => {
      const assigned = c.assigned_to || 'Unassigned';
      if (!investigators[assigned]) {
        investigators[assigned] = {
          total: 0,
          resolved: 0,
          total_recovered: 0,
          avg_progress: 0,
          critical_handled: 0
        };
      }

      investigators[assigned].total++;
      if (c.status === 'Resolved' || c.status === 'recovered') {
        investigators[assigned].resolved++;
      }
      investigators[assigned].total_recovered += (c.recovery_amount || 0);
      investigators[assigned].avg_progress += (c.investigation_progress || 0);
      if (c.priority_score >= 80) {
        investigators[assigned].critical_handled++;
      }
    });

    // Calculate averages
    Object.keys(investigators).forEach(inv => {
      const data = investigators[inv];
      data.avg_progress = data.total > 0 ? (data.avg_progress / data.total).toFixed(0) : 0;
      data.resolution_rate = data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0;
    });

    return Object.entries(investigators)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [cases]);

  return (
    <div className="space-y-6">
      <Card className="bg-[#1a2332] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Investigator Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a2332', border: '1px solid #06b6d4' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="total" fill="#06b6d4" name="Total Cases" />
              <Bar dataKey="resolved" fill="#10b981" name="Resolved" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {performanceData.slice(0, 3).map((inv, idx) => (
          <Card key={idx} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <Badge className={`${
                  idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                  idx === 1 ? 'bg-gray-400/20 text-gray-300 border-gray-400/50' :
                  'bg-orange-500/20 text-orange-400 border-orange-500/50'
                }`}>
                  #{idx + 1}
                </Badge>
                {idx === 0 && <Award className="w-6 h-6 text-yellow-400" />}
              </div>
              <p className="text-white font-semibold mb-2 truncate">{inv.name}</p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cases Handled:</span>
                  <span className="text-white font-semibold">{inv.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Resolution Rate:</span>
                  <span className="text-green-400 font-semibold">{inv.resolution_rate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Recovered:</span>
                  <span className="text-cyan-400 font-semibold">${(inv.total_recovered / 1000).toFixed(1)}K</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Progress:</span>
                  <span className="text-purple-400 font-semibold">{inv.avg_progress}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}