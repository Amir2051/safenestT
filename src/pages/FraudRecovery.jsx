import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, AlertCircle, FileText, TrendingUp, Plus, Search,
  CheckCircle, Clock, Loader2, ExternalLink, Download
} from "lucide-react";
import { toast } from "sonner";

import ReportFraudDialog from "../components/fraud/ReportFraudDialog.jsx";
import FraudCaseCard from "../components/fraud/FraudCaseCard.jsx";
import BlockchainTracer from "../components/fraud/BlockchainTracer.jsx";
import RecoveryDashboard from "../components/fraud/RecoveryDashboard.jsx";
import AIRecoveryAssistant from "../components/fraud/AIRecoveryAssistant.jsx";
import MultiBlockchainTracer from "../components/fraud/MultiBlockchainTracer.jsx";
import LegalDocumentGenerator from "../components/fraud/LegalDocumentGenerator.jsx";

export default function FraudRecovery() {
  const [user, setUser] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['fraud-cases'],
    queryFn: () => base44.entities.FraudCase.list('-created_date'),
    enabled: !!user,
    initialData: []
  });

  const { data: traces = [] } = useQuery({
    queryKey: ['blockchain-traces', selectedCase?.id],
    queryFn: () => base44.entities.BlockchainTrace.filter({ fraud_case_id: selectedCase.id }),
    enabled: !!selectedCase,
    initialData: []
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const activeCases = cases.filter(c => ['reported', 'investigating', 'traced', 'recovering'].includes(c.status));
  const resolvedCases = cases.filter(c => ['recovered', 'closed'].includes(c.status));
  const totalStolen = cases.reduce((sum, c) => sum + (c.amount_stolen_usd || 0), 0);
  const totalRecovered = cases.reduce((sum, c) => {
    const recovered = (c.amount_stolen_usd || 0) * ((c.recovery_progress || 0) / 100);
    return sum + recovered;
  }, 0);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-400" />
            Fraud Recovery
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              BLOCKCHAIN TRACING
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">Report fraud, trace stolen funds, and recover assets</p>
        </div>
        <Button
          onClick={() => setShowReportDialog(true)}
          className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Report Fraud
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Active Cases</p>
                <p className="text-2xl font-bold text-white">{activeCases.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Stolen</p>
                <p className="text-2xl font-bold text-red-400">${totalStolen.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Recovered</p>
                <p className="text-2xl font-bold text-green-400">${totalRecovered.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Resolved</p>
                <p className="text-2xl font-bold text-purple-400">{resolvedCases.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20 flex-wrap h-auto">
          <TabsTrigger value="cases">
            <FileText className="w-4 h-4 mr-2" />
            My Cases
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Shield className="w-4 h-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="trace">
            <Search className="w-4 h-4 mr-2" />
            Multi-Chain Trace
          </TabsTrigger>
          <TabsTrigger value="legal">
            <FileText className="w-4 h-4 mr-2" />
            Legal Docs
          </TabsTrigger>
          <TabsTrigger value="recovery">
            <TrendingUp className="w-4 h-4 mr-2" />
            Recovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />
            </div>
          ) : cases.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg">No fraud cases reported</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Report a case to start recovery process</p>
                <Button
                  onClick={() => setShowReportDialog(true)}
                  className="bg-gradient-to-r from-red-500 to-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Report Fraud
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <h3 className="text-white font-semibold text-lg mb-3">Active Cases</h3>
              {activeCases.map(fraudCase => (
                <FraudCaseCard
                  key={fraudCase.id}
                  fraudCase={fraudCase}
                  onSelect={() => setSelectedCase(fraudCase)}
                />
              ))}

              {resolvedCases.length > 0 && (
                <>
                  <h3 className="text-white font-semibold text-lg mb-3 mt-8">Resolved Cases</h3>
                  {resolvedCases.map(fraudCase => (
                    <FraudCaseCard
                      key={fraudCase.id}
                      fraudCase={fraudCase}
                      onSelect={() => setSelectedCase(fraudCase)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AIRecoveryAssistant selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="trace" className="mt-6">
          <MultiBlockchainTracer selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="legal" className="mt-6">
          <LegalDocumentGenerator selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="recovery" className="mt-6">
          <RecoveryDashboard cases={cases} />
        </TabsContent>
      </Tabs>

      {/* Report Fraud Dialog */}
      {showReportDialog && (
        <ReportFraudDialog
          onClose={() => setShowReportDialog(false)}
          onSuccess={() => {
            setShowReportDialog(false);
            queryClient.invalidateQueries({ queryKey: ['fraud-cases'] });
          }}
        />
      )}
    </div>
  );
}