import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, FileText, Search, Send, Settings, Plus, AlertCircle,
  TrendingUp, Clock, CheckCircle, Briefcase
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import CaseManagement from "../components/investigation/CaseManagement.jsx";
import WalletTracker from "../components/investigation/WalletTracker.jsx";
import FederalAgencyDirectory from "../components/investigation/FederalAgencyDirectory.jsx";
import DocumentGenerator from "../components/investigation/DocumentGenerator.jsx";
import SubmissionHub from "../components/investigation/SubmissionHub.jsx";
import InvestigationSettings from "../components/investigation/InvestigationSettings.jsx";

export default function InvestigationHub() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const { data: cases = [] } = useQuery({
    queryKey: ['investigation-cases'],
    queryFn: () => base44.entities.InvestigationCase.list('-last_activity'),
    enabled: !!user,
    initialData: [],
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['agency-submissions'],
    queryFn: () => base44.entities.AgencySubmission.list('-submission_date'),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(userData => {
      if (!userData.is_admin && userData.role !== 'admin') {
        navigate(createPageUrl("Dashboard"));
      }
      setUser(userData);
    }).catch(() => {
      navigate(createPageUrl("Dashboard"));
    });
  }, [navigate]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const activeCases = cases.filter(c => !['closed', 'recovered'].includes(c.status));
  const totalRecovered = cases.reduce((sum, c) => sum + (c.recovery_amount || 0), 0);
  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
  const criticalCases = cases.filter(c => c.priority === 'critical').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            SafeNestt Cyber Investigations
          </h1>
          <p className="text-gray-400 mt-1">
            Internal Investigation & Fraud Tracking Command Center
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Cases</p>
                <p className="text-3xl font-bold text-white mt-1">{activeCases.length}</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Critical Priority</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{criticalCases}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Recovered</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  ${totalRecovered.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Submissions</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{pendingSubmissions}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20 flex-wrap h-auto">
          <TabsTrigger value="cases" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Cases
          </TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2">
            <Search className="w-4 h-4" />
            Wallet Tracking
          </TabsTrigger>
          <TabsTrigger value="agencies" className="gap-2">
            <Shield className="w-4 h-4" />
            Agencies
          </TabsTrigger>
          <TabsTrigger value="paperwork" className="gap-2">
            <FileText className="w-4 h-4" />
            Paperwork
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            <Send className="w-4 h-4" />
            Submissions
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-6">
          <CaseManagement cases={cases} />
        </TabsContent>

        <TabsContent value="tracking" className="mt-6">
          <WalletTracker cases={cases} />
        </TabsContent>

        <TabsContent value="agencies" className="mt-6">
          <FederalAgencyDirectory />
        </TabsContent>

        <TabsContent value="paperwork" className="mt-6">
          <DocumentGenerator cases={cases} />
        </TabsContent>

        <TabsContent value="submissions" className="mt-6">
          <SubmissionHub submissions={submissions} cases={cases} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <InvestigationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}