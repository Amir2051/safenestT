import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, AlertTriangle, CheckCircle, Clock, TrendingUp, Target,
  Zap, Shield, Eye, RefreshCw, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function AIFraudInsights({ caseData, onUpdate }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // Load existing AI analysis
    if (caseData.ai_analysis) {
      try {
        const parsed = typeof caseData.ai_analysis === 'string' 
          ? JSON.parse(caseData.ai_analysis) 
          : caseData.ai_analysis;
        setAnalysis(parsed);
      } catch (e) {
        console.error('Failed to parse AI analysis:', e);
      }
    }
  }, [caseData]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('fraudDetectionAI', {
        action: 'analyze_case',
        data: {
          caseId: caseData.id,
          caseData
        }
      });

      if (response.data.success) {
        setAnalysis(response.data.analysis);
        toast.success('AI analysis completed');
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    }
    setAnalyzing(false);
  };

  if (!analysis && !analyzing) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <CardContent className="p-6 text-center">
          <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-2">AI Fraud Analysis</h3>
          <p className="text-gray-400 text-sm mb-4">
            Run AI-powered analysis to detect fraud patterns and get investigative insights
          </p>
          <Button
            onClick={runAnalysis}
            className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            Run AI Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (analyzing) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-3 animate-spin" />
          <h3 className="text-white font-semibold mb-2">Analyzing Case...</h3>
          <p className="text-gray-400 text-sm">
            AI is processing case details, evidence, and transaction patterns
          </p>
        </CardContent>
      </Card>
    );
  }

  const riskColors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  const recoveryColors = {
    low: 'text-red-400',
    medium: 'text-yellow-400',
    high: 'text-green-400'
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI Fraud Analysis
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={runAnalysis}
              disabled={analyzing}
              className="border-purple-500/30 text-purple-400"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
              Re-analyze
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Risk Assessment */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Risk Level</p>
              <Badge className={`${riskColors[analysis.risk_level]} text-sm`}>
                {analysis.risk_level.toUpperCase()}
              </Badge>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Confidence Score</p>
              <p className="text-2xl font-bold text-white">{analysis.confidence_score}%</p>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Pattern Match</p>
              <p className="text-sm font-semibold text-cyan-400 capitalize">
                {analysis.pattern_match?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Recovery & Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Recovery Likelihood
              </p>
              <p className={`text-lg font-bold ${recoveryColors[analysis.recovery_likelihood]}`}>
                {analysis.recovery_likelihood.toUpperCase()}
              </p>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Estimated Timeline
              </p>
              <p className="text-lg font-bold text-white">
                {analysis.timeline_estimate} days
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Red Flags */}
      {analysis.red_flags?.length > 0 && (
        <Card className="bg-[#1a2332] border-red-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Red Flags Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.red_flags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Fraud Indicators */}
      {analysis.fraud_indicators?.length > 0 && (
        <Card className="bg-[#1a2332] border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-orange-400" />
              Fraud Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.fraud_indicators.map((indicator, idx) => (
                <Badge key={idx} className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                  {indicator}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Actions */}
      {analysis.recommended_actions?.length > 0 && (
        <Card className="bg-[#1a2332] border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {analysis.recommended_actions.map((action, idx) => (
                <li key={idx} className="text-sm text-gray-300">{action}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Investigation Tips */}
      {analysis.investigation_tips?.length > 0 && (
        <Card className="bg-[#1a2332] border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Investigation Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.investigation_tips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                  <Shield className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Similar Patterns */}
      {analysis.similar_patterns && (
        <Card className="bg-[#1a2332] border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <Brain className="w-4 h-4 text-blue-400" />
              Similar Pattern Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-300">{analysis.similar_patterns}</p>
          </CardContent>
        </Card>
      )}

      {/* Wallet Flags */}
      {analysis.wallet_flags?.length > 0 && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
              ⚠️ Known Scam Wallet Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.wallet_flags.map((flag, idx) => (
                <li key={idx} className="text-sm text-red-300 font-semibold">{flag}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}