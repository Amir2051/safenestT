import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Clock, FileText, ArrowRight, Shield, Bell } from "lucide-react";
import CaseDetailDialog from "@/components/investigation/CaseDetailDialog";
import { format } from "date-fns";

export default function InvestigatorDashboard() {
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: myCases = [] } = useQuery({
    queryKey: ['my-cases', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      // Fetch cases assigned to me or created by me
      const assigned = await base44.entities.MyCase.filter({ assigned_to: user.email });
      const created = await base44.entities.MyCase.filter({ created_by: user.email });
      
      // Merge and dedup
      const map = new Map();
      assigned.forEach(c => map.set(c.id, c));
      created.forEach(c => map.set(c.id, c));
      
      return Array.from(map.values()).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.email
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.CaseTask.filter({ assigned_to: user.email, status: { $in: ['todo', 'in_progress'] } });
    },
    enabled: !!user?.email
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['my-alerts', user?.email],
    queryFn: async () => {
        // Fetch notifications for the user
        const notifs = await base44.entities.Notification.filter({ user_id: user?.email, read: false });
        return notifs;
    },
    enabled: !!user?.email
  });

  const highPriorityCases = myCases.filter(c => ['high', 'critical'].includes(c.priority));
  const activeCases = myCases.filter(c => !['Closed', 'Resolved'].includes(c.status));

  return (
    <div className="min-h-screen bg-[#000000] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Investigator Dashboard</h1>
            <p className="text-gray-400">Welcome back, {user?.full_name || 'Investigator'}</p>
          </div>
          <div className="flex gap-2">
             <div className="bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 font-bold">{highPriorityCases.length} Critical Cases</span>
             </div>
             <div className="bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-bold">{tasks.length} Pending Tasks</span>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Priority & Alerts */}
            <div className="space-y-6">
                <Card className="bg-[#0f1419] border-red-500/20">
                    <CardHeader>
                        <CardTitle className="text-red-400 flex items-center gap-2">
                            <Shield className="w-5 h-5" /> High Priority Cases
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {highPriorityCases.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No high priority cases.</p>
                        ) : (
                            highPriorityCases.slice(0, 5).map(c => (
                                <div key={c.id} className="p-3 bg-[#1a2332] rounded-lg border border-gray-800 cursor-pointer hover:border-red-500/50 transition-all" onClick={() => setSelectedCase(c)}>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-white text-sm">{c.case_title}</h4>
                                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">{c.priority}</Badge>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{c.case_number}</p>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                        <Clock className="w-3 h-3" />
                                        <span>Last active: {c.last_activity ? format(new Date(c.last_activity), 'MMM d') : 'N/A'}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-[#0f1419] border-orange-500/20">
                    <CardHeader>
                        <CardTitle className="text-orange-400 flex items-center gap-2">
                            <Bell className="w-5 h-5" /> Pending Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {alerts.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">No pending alerts.</p>
                        ) : (
                            alerts.slice(0, 5).map(a => (
                                <div key={a.id} className="p-3 bg-[#1a2332] rounded-lg border border-gray-800 flex gap-3">
                                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-1" />
                                    <div>
                                        <p className="text-sm text-white font-medium">{a.title}</p>
                                        <p className="text-xs text-gray-400">{a.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Column 2: Active Case List */}
            <div className="lg:col-span-2">
                <Card className="bg-[#0f1419] border-gray-800 h-full">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-cyan-400" /> Active Caseload
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {activeCases.map(c => (
                                <div 
                                    key={c.id} 
                                    className="p-4 bg-[#1a2332] rounded-lg border border-gray-800 hover:border-cyan-500/30 transition-all cursor-pointer flex items-center justify-between"
                                    onClick={() => setSelectedCase(c)}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-cyan-400 text-sm font-bold">{c.case_number}</span>
                                            <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">{c.status}</Badge>
                                            {c.priority === 'high' && <Badge className="bg-red-500/10 text-red-400 border-red-500/20">High</Badge>}
                                        </div>
                                        <h4 className="text-white font-medium">{c.case_title}</h4>
                                        <p className="text-xs text-gray-400 mt-1 truncate max-w-md">
                                            {c.description || "No description"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-white">${c.amount_lost?.toLocaleString() || 0}</p>
                                        <p className="text-xs text-gray-500">{c.cryptocurrency || 'USD'}</p>
                                        <Button size="sm" variant="ghost" className="mt-2 text-cyan-400 hover:text-cyan-300 h-6 p-0">
                                            View Details <ArrowRight className="w-3 h-3 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {activeCases.length === 0 && (
                                <p className="text-center text-gray-500 py-10">No active cases found.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>

      {selectedCase && (
        <CaseDetailDialog 
            caseData={selectedCase} 
            onClose={() => setSelectedCase(null)} 
            onUpdate={() => {
                // Refresh queries
                // In a real app we'd use queryClient.invalidateQueries but here we rely on React Query auto-refetch or manual
                setSelectedCase(null);
            }} 
        />
      )}
    </div>
  );
}