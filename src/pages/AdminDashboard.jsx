import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, FileText, Shield, Loader2, RefreshCw, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminGate from "../components/admin/AdminGate.jsx";
import CaseManager from "../components/investigation/CaseManager.jsx";
import InvestigationAICenter from "../components/investigation/InvestigationAICenter.jsx";
import InvestigatorCommandCenter from "../components/dashboard/InvestigatorCommandCenter.jsx";
import { createPageUrl } from "@/utils";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    base44.auth.me()
      .then((u) => {
        if (mounted) setUser(u);
      })
      .catch(() => {
        if (mounted) setUser(null);
      });
    return () => { mounted = false; };
  }, []);

  const isAdmin = user?.role === "admin" || user?.is_admin;

  const { data: adminCases = [], isLoading: loadingCases, refetch } = useQuery({
    queryKey: ["admin-dashboard-cases"],
    queryFn: () => base44.asServiceRole.entities.MyCase.list("-created_date", 1000),
    enabled: !!user && isAdmin,
    staleTime: 0,
    refetchInterval: 30000,
  });

  if (!user || loadingCases) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <AdminGate>
      <div className="min-h-screen p-6 lg:p-8 space-y-6 text-white">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <h1 className="text-3xl font-bold">SafeNestT Investigation Command</h1>
              <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30">ADMIN</Badge>
            </div>
            <p className="text-gray-400 mt-2">
              Cases, MIA AI investigators, and the full investigation suite in one secured workspace.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="border-white/10 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh cases
            </Button>
            <Button
              onClick={() => navigate(createPageUrl("InvestigationDashboard"))}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <Zap className="w-4 h-4 mr-2" /> Open Investigation Suite
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/[0.03] border-cyan-500/20">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">All cases</p>
              <p className="text-3xl font-bold text-white mt-1">{adminCases.length}</p>
              <p className="text-xs text-gray-500 mt-1">Secured MyCase records</p>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-purple-500/20">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">MIA AI Investigators</p>
              <p className="text-3xl font-bold text-purple-300 mt-1">ONLINE</p>
              <p className="text-xs text-gray-500 mt-1">Analysis, fraud patterns and wallet monitoring</p>
            </CardContent>
          </Card>
          <Card className="bg-white/[0.03] border-green-500/20">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-gray-500">Access model</p>
              <p className="text-xl font-bold text-green-300 mt-1">ADMIN ONLY</p>
              <p className="text-xs text-gray-500 mt-1">Legacy admin modules removed from this workspace</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 bg-white/[0.03] border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                My Cases / Case Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CaseManager
                cases={adminCases}
                onSelectCase={setSelectedCase}
                selectedCase={selectedCase}
                user={user}
                onUpdate={() => refetch()}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <InvestigatorCommandCenter />
            {selectedCase && (
              <InvestigationAICenter
                caseData={selectedCase}
                onUpdate={() => refetch()}
              />
            )}
          </div>
        </div>

        <Card className="bg-white/[0.03] border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Investigation Suite
            </CardTitle>
            <p className="text-sm text-gray-400">
              Use the full investigation workspace for blockchain tracing, intelligence, AI analysis, federal case tools, and evidence workflows.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => navigate(createPageUrl("InvestigationDashboard"))}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Open AI Investigation Suite
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("CasesManagement"))}
              className="border-white/10 text-white"
            >
              Open Investigation Cases
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminGate>
  );
}
