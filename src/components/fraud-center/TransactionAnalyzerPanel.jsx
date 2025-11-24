import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, Upload, FileText, AlertTriangle, CheckCircle,
  Loader2, ArrowRight, DollarSign, Clock, Wallet
} from "lucide-react";
import { toast } from "sonner";
import EtherscanImporter from "@/components/investigation/EtherscanImporter";

export default function TransactionAnalyzerPanel({ user }) {
  const [selectedCase, setSelectedCase] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const { data: cases = [] } = useQuery({
    queryKey: ['investigation-cases'],
    queryFn: () => base44.entities.InvestigationCase.list('-created_date', 50)
  });

  const selectedCaseData = cases.find(c => c.id === selectedCase);
  const transactions = selectedCaseData?.imported_transactions || [];

  const handleAnalyze = async () => {
    if (!selectedCase || transactions.length === 0) {
      toast.error('Select a case with imported transactions');
      return;
    }

    setAnalyzing(true);
    
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these cryptocurrency transactions for fraud investigation:

${JSON.stringify(transactions.slice(0, 20), null, 2)}

Case: ${selectedCaseData.case_title}
Amount Stolen: $${selectedCaseData.amount_stolen_usd}

Provide:
1. Flow analysis - where did the funds go?
2. Suspicious patterns detected
3. Mixer/tumbler usage indicators
4. Exchange deposit detection
5. Layering techniques identified
6. Recovery recommendations`,
        response_json_schema: {
          type: "object",
          properties: {
            flow_summary: { type: "string" },
            suspicious_patterns: { type: "array", items: { type: "string" } },
            mixer_detected: { type: "boolean" },
            exchanges_detected: { type: "array", items: { type: "string" } },
            layering_techniques: { type: "array", items: { type: "string" } },
            recovery_recommendations: { type: "array", items: { type: "string" } },
            risk_score: { type: "number" }
          }
        }
      });

      setAnalysisResults(response);
      toast.success('Analysis complete');

    } catch (error) {
      toast.error('Analysis failed');
      console.error(error);
    }

    setAnalyzing(false);
  };

  const handleTransactionsImported = async (txs) => {
    if (!selectedCase) {
      toast.error('Please select a case first');
      return;
    }

    try {
      await base44.entities.InvestigationCase.update(selectedCase, {
        imported_transactions: txs,
        last_activity: new Date().toISOString()
      });
      toast.success(`${txs.length} transactions imported`);
    } catch (error) {
      toast.error('Failed to save transactions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Case Selection */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Transaction Analyzer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger className="flex-1 bg-[#0f1419] border-cyan-500/30 text-white">
                <SelectValue placeholder="Select a case to analyze" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_title || c.case_number} ({c.imported_transactions?.length || 0} txs)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !selectedCase || transactions.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              {analyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><TrendingUp className="w-4 h-4 mr-2" />Analyze Transactions</>
              )}
            </Button>
          </div>

          {selectedCaseData && (
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Transactions</p>
                  <p className="text-white font-semibold">{transactions.length}</p>
                </div>
                <div>
                  <p className="text-gray-400">Amount Stolen</p>
                  <p className="text-red-400 font-semibold">
                    ${(selectedCaseData.amount_stolen_usd || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Status</p>
                  <Badge className="mt-1">{selectedCaseData.status}</Badge>
                </div>
                <div>
                  <p className="text-gray-400">Wallets Monitored</p>
                  <p className="text-white font-semibold">
                    {selectedCaseData.monitored_wallets?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Etherscan Import */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-purple-400" />
            Import Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EtherscanImporter
            caseData={selectedCaseData || {}}
            onTransactionsImported={handleTransactionsImported}
          />
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysisResults && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-400" />
                Analysis Results
              </CardTitle>
              <Badge className={`${
                analysisResults.risk_score >= 75 ? 'bg-red-500/20 text-red-400' :
                analysisResults.risk_score >= 50 ? 'bg-orange-500/20 text-orange-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                Risk Score: {analysisResults.risk_score || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Flow Summary */}
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                Fund Flow Summary
              </h4>
              <p className="text-gray-300 text-sm">{analysisResults.flow_summary}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Exchanges Detected */}
              {analysisResults.exchanges_detected?.length > 0 && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/20">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Exchanges Detected
                  </h4>
                  <div className="space-y-2">
                    {analysisResults.exchanges_detected.map((ex, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <DollarSign className="w-3 h-3 text-green-400" />
                        <span className="text-gray-300">{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspicious Patterns */}
              {analysisResults.suspicious_patterns?.length > 0 && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Suspicious Patterns
                  </h4>
                  <ul className="space-y-2">
                    {analysisResults.suspicious_patterns.map((pattern, i) => (
                      <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                        <span className="text-orange-400">•</span>
                        {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Mixer Detection */}
            {analysisResults.mixer_detected && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-semibold">Mixer/Tumbler Usage Detected</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Funds appear to have been routed through mixing services to obscure the trail.
                </p>
              </div>
            )}

            {/* Recovery Recommendations */}
            {analysisResults.recovery_recommendations?.length > 0 && (
              <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  Recovery Recommendations
                </h4>
                <ul className="space-y-2">
                  {analysisResults.recovery_recommendations.map((rec, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 text-purple-400 mt-1 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}