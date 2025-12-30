import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FraudAnalyticsDashboard from "../components/analytics/FraudAnalyticsDashboard";
import InvestigatorPerformance from "../components/analytics/InvestigatorPerformance";
import NetworkAnalysisChart from "../components/analytics/NetworkAnalysisChart";
import GeographicHeatMap from "../components/analytics/GeographicHeatMap";
import TrendAnalysisDashboard from "../components/analytics/TrendAnalysisDashboard";
import CustomReportBuilder from "../components/analytics/CustomReportBuilder";
import WorkflowAutomationPanel from "../components/admin/WorkflowAutomationPanel";
import AdminGate from "../components/admin/AdminGate";
import { BarChart3, Users, Network, Globe, TrendingUp, FileText, Zap } from "lucide-react";

export default function AnalyticsDashboard() {
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cases = [] } = useQuery({
    queryKey: ['all-cases'],
    queryFn: () => base44.entities.MyCase.list('-created_date', 1000),
    enabled: !!user
  });

  return (
    <AdminGate>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics & Intelligence</h1>
            <p className="text-gray-400">Strategic insights powered by AI</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-[#0f1419] border border-cyan-500/30 flex-wrap h-auto">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="performance">
              <Users className="w-4 h-4 mr-2" />
              Team Performance
            </TabsTrigger>
            <TabsTrigger value="network">
              <Network className="w-4 h-4 mr-2" />
              Network Analysis
            </TabsTrigger>
            <TabsTrigger value="geographic">
              <Globe className="w-4 h-4 mr-2" />
              Geographic Map
            </TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trend Analysis
            </TabsTrigger>
            <TabsTrigger value="reports">
              <FileText className="w-4 h-4 mr-2" />
              Custom Reports
            </TabsTrigger>
            <TabsTrigger value="automation">
              <Zap className="w-4 h-4 mr-2" />
              Workflow Automation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <FraudAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <InvestigatorPerformance />
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <NetworkAnalysisChart cases={cases} />
          </TabsContent>

          <TabsContent value="geographic" className="mt-6">
            <GeographicHeatMap cases={cases} />
          </TabsContent>

          <TabsContent value="trends" className="mt-6">
            <TrendAnalysisDashboard cases={cases} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <CustomReportBuilder cases={cases} />
          </TabsContent>

          <TabsContent value="automation" className="mt-6">
            <WorkflowAutomationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </AdminGate>
  );
}