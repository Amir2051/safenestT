import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    TrendingUp, Clock, CheckCircle, AlertCircle, 
    RefreshCw, Activity, Zap
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function CasePerformanceWidget() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [automating, setAutomating] = useState(false);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await base44.functions.invoke('getCaseKPIs', {});
            if (res.data.success) {
                setStats(res.data);
            }
        } catch (e) {
            console.error("Failed to fetch KPIs", e);
        }
        setLoading(false);
    };

    const triggerAutomation = async () => {
        setAutomating(true);
        try {
            // Trigger all automations
            await Promise.all([
                base44.functions.invoke('workflowAutomation', { trigger_type: 'auto_assign_cases', trigger_data: {} }),
                base44.functions.invoke('workflowAutomation', { trigger_type: 'check_high_urgency', trigger_data: {} }),
                base44.functions.invoke('workflowAutomation', { trigger_type: 'check_case_inactivity', trigger_data: {} })
            ]);
            toast.success("Workflow automation cycle completed");
            fetchStats(); // Refresh stats
        } catch (e) {
            toast.error("Automation failed");
        }
        setAutomating(false);
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading && !stats) return <div className="p-4 bg-[#0f1419] rounded-lg animate-pulse h-48"></div>;

    const kpis = stats?.kpis || {};
    const trendData = stats?.resolutionTrend || [];

    // Transform trend data for chart (group by date maybe? or just show raw sequence)
    // Let's just map it simply
    const chartData = trendData.map((d, i) => ({ name: d.date, days: d.durationDays }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI Cards */}
            <Card className="bg-[#0f1419] border-cyan-500/20 md:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" /> Performance Metrics
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <Clock className="w-4 h-4" /> Avg Resolution
                        </div>
                        <span className="text-xl font-bold text-white">{kpis.avgResolutionDays || 0} Days</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                            <CheckCircle className="w-4 h-4" /> Success Rate
                        </div>
                        <span className="text-xl font-bold text-green-400">{kpis.successRate || 0}%</span>
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                        <Button 
                            onClick={triggerAutomation} 
                            disabled={automating}
                            className="w-full bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30"
                        >
                            <Zap className={`w-4 h-4 mr-2 ${automating ? 'animate-spin' : ''}`} />
                            {automating ? 'Running Automations...' : 'Run Workflow Automation'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Resolution Trend Chart */}
            <Card className="bg-[#0f1419] border-gray-800 md:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" /> Resolution Time Trend
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#666" fontSize={10} tick={false} />
                            <YAxis stroke="#666" fontSize={10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1a2332', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="days" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}