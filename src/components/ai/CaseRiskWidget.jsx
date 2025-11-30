import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, AlertTriangle, CheckCircle, RefreshCw, ShieldAlert, Zap, ArrowRight } from "lucide-react";

export default function CaseRiskWidget({ caseId }) {
  const queryClient = useQueryClient();

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['risk-assessment', caseId],
    queryFn: async () => {
      const res = await base44.entities.RiskAssessment.filter({ target_id: caseId });
      return res[0] || null;
    },
    enabled: !!caseId
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('behaviorEngine', {
        endpoint: 'analyze-case',
        data: { caseId }
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['risk-assessment', caseId]);
    }
  });

  if (!caseId) return null;

  const getRiskColor = (level) => {
    switch(level) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-red-500';
    if (score >= 50) return 'bg-orange-500';
    if (score >= 20) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card className="bg-[#1a2332] border-purple-500/20 h-full">
      <CardHeader className="pb-2 border-b border-gray-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Pattern Engine
          </CardTitle>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            className="h-8 w-8 p-0 text-purple-400 hover:text-purple-300"
          >
            <RefreshCw className={`w-4 h-4 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        {!assessment && !isLoading && (
          <div className="text-center py-6">
            <p className="text-gray-400 text-sm mb-4">No behavioral analysis yet.</p>
            <Button 
              onClick={() => analyzeMutation.mutate()} 
              disabled={analyzeMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 w-full"
            >
              <Zap className="w-4 h-4 mr-2" /> Run Analysis
            </Button>
          </div>
        )}

        {assessment && (
          <>
            {/* Score */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-sm text-gray-400">Risk Score</span>
                <span className={`text-2xl font-bold ${getRiskColor(assessment.risk_level)}`}>
                  {assessment.risk_score}/100
                </span>
              </div>
              <Progress value={assessment.risk_score} className="h-2 bg-gray-800" indicatorClassName={getScoreColor(assessment.risk_score)} />
              <div className="flex justify-between text-xs text-gray-500 uppercase font-mono">
                <span>Safe</span>
                <span>Critical</span>
              </div>
            </div>

            {/* Analysis */}
            <div className="bg-[#0f1419] p-3 rounded-lg border border-gray-800">
              <p className="text-sm text-gray-300 leading-relaxed">
                {assessment.ai_analysis}
              </p>
            </div>

            {/* Factors */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detected Patterns</h4>
              <div className="flex flex-wrap gap-2">
                {assessment.factors?.map((factor, i) => (
                  <Badge key={i} variant="outline" className="border-red-500/20 text-red-400 bg-red-500/5">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Suggestions</h4>
              <ul className="space-y-2">
                {assessment.recommended_actions?.map((action, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>

             {/* Predicted Type */}
             {assessment.predicted_scam_type && (
               <div className="pt-2 border-t border-gray-800">
                 <div className="flex justify-between items-center">
                   <span className="text-xs text-gray-400">Predicted Scam Type</span>
                   <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                     {assessment.predicted_scam_type}
                   </Badge>
                 </div>
               </div>
             )}
          </>
        )}
      </CardContent>
    </Card>
  );
}