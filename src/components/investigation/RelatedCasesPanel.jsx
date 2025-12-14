import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Network, Link as LinkIcon, AlertTriangle, Wallet, 
  Mail, Phone, BrainCircuit, ExternalLink, ShieldCheck,
  GitMerge, RefreshCcw, Landmark, ScanEye
} from "lucide-react";

import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function RelatedCasesPanel({ caseId, entityName }) {
  const queryClient = useQueryClient();

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ['case-links', caseId, entityName],
    queryFn: async () => {
      const res = await base44.functions.invoke('suggestCaseLinks', { caseId, entityName });
      return res.data; // { confirmed: [], suggested: [] }
    },
    enabled: !!caseId
  });

  const linkMutation = useMutation({
    mutationFn: async ({ targetId, action }) => {
      // Fetch current case to get current links
      const cases = await base44.entities[entityName].filter({ id: caseId });
      const currentCase = cases[0];
      const currentLinks = new Set(currentCase.linked_case_ids || []);
      
      if (action === 'link') currentLinks.add(targetId);
      else currentLinks.delete(targetId);

      await base44.entities[entityName].update(caseId, {
        linked_case_ids: Array.from(currentLinks)
      });
    },
    onSuccess: () => {
      toast.success("Case links updated");
      refetch();
    },
    onError: () => toast.error("Failed to update link")
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="relative">
          <Network className="w-12 h-12 animate-pulse text-cyan-500/50" />
          <BrainCircuit className="w-6 h-6 absolute bottom-0 right-0 text-purple-400 animate-bounce" />
        </div>
        <p className="mt-4 text-sm font-medium">AI is analyzing cross-case connections...</p>
        <p className="text-xs opacity-60">Checking wallets, emails, and behavioral patterns</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center border border-red-500/20 rounded-lg bg-red-500/5">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">Analysis failed: {error.message}</p>
      </div>
    );
  }

  const { confirmed = [], suggested = [] } = analysis || {};

  if (confirmed.length === 0 && suggested.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-gray-700 rounded-lg bg-[#0f1419]">
        <ShieldCheck className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white">No Linked Cases Found</h3>
        <p className="text-gray-400 text-sm mt-1">
          This case appears isolated. No matches found for scammer wallets, contact info, or MO patterns.
        </p>
      </div>
    );
  }

  const CaseCard = ({ conn, isLinked }) => (
    <Card className={`bg-[#0f1419] transition-all ${isLinked ? 'border-green-500/30' : 'border-cyan-500/20 border-dashed hover:border-solid hover:border-cyan-500/50'}`}>
        <CardHeader className="p-4 pb-2">
            <div className="flex items-start justify-between">
            <div>
                <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-white text-base">
                    {conn.case.title}
                </h4>
                {conn.case.case_number && (
                    <span className="text-xs font-mono text-gray-500">#{conn.case.case_number}</span>
                )}
                </div>
                <div className="flex gap-2 text-xs">
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                    {conn.case.status}
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                    {conn.case.fraud_type?.replace('_', ' ')}
                    </Badge>
                    {conn.case.amount_lost > 0 && (
                    <span className="text-red-400 font-medium my-auto">
                        -${conn.case.amount_lost.toLocaleString()}
                    </span>
                    )}
                </div>
            </div>
            <div className="text-right flex flex-col items-end gap-2">
                 <Button 
                    size="sm" 
                    variant={isLinked ? "destructive" : "default"}
                    className={isLinked ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30" : "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"}
                    onClick={() => linkMutation.mutate({ targetId: conn.case.id, action: isLinked ? 'unlink' : 'link' })}
                    disabled={linkMutation.isPending}
                >
                    {isLinked ? "Unlink" : "Confirm Link"}
                </Button>
            </div>
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
            <div className="space-y-2 mt-2">
            {conn.reasons.map((reason, rIdx) => (
                <div key={rIdx} className="flex items-start gap-3 p-2 rounded bg-[#1a2332] border border-gray-800">
                <div className={`mt-0.5 p-1 rounded-full ${reason.type === 'ai_pattern' ? 'bg-purple-500/20 text-purple-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {getIcon(reason.type)}
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-gray-200">
                        {reason.label || reason.type.replace('_', ' ')}
                    </span>
                    <Badge className={`text-[10px] h-4 px-1.5 ${getConfidenceColor(reason.confidence)}`}>
                        {reason.confidence} confidence
                    </Badge>
                    </div>
                    <p className="text-xs text-gray-400 font-mono break-all">
                    {reason.value}
                    </p>
                </div>
                </div>
            ))}
            </div>
        </CardContent>
    </Card>
  );

  const getIcon = (type) => {
    switch (type) {
      case 'wallet': return <Wallet className="w-3 h-3" />;
      case 'monitored_wallet': return <Wallet className="w-3 h-3" />;
      case 'email': return <Mail className="w-3 h-3" />;
      case 'phone': return <Phone className="w-3 h-3" />;
      case 'ai_pattern': return <BrainCircuit className="w-3 h-3" />;
      case 'common_path': return <GitMerge className="w-3 h-3" />;
      case 'mixer_pattern': return <RefreshCcw className="w-3 h-3" />;
      case 'illicit_exchange': return <Landmark className="w-3 h-3" />;
      case 'extracted_match': return <ScanEye className="w-3 h-3" />;
      case 'cross_wallet': return <GitMerge className="w-3 h-3" />;
      case 'website': return <ExternalLink className="w-3 h-3" />;
      case 'suspect': return <AlertTriangle className="w-3 h-3" />;
      default: return <LinkIcon className="w-3 h-3" />;
    }
  };

  const getConfidenceColor = (conf) => {
    switch (conf) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            Case Intelligence Network
          </h3>
          <p className="text-sm text-gray-400">
            {confirmed.length + suggested.length} related cases identified by SafeNest AI
          </p>
        </div>
        <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
          <BrainCircuit className="w-3 h-3 mr-1" />
          AI Active
        </Badge>
      </div>

      {confirmed.length > 0 && (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-green-400 uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Confirmed Links
            </h4>
            <div className="grid gap-4">
                {confirmed.map((conn, idx) => <CaseCard key={`conf-${idx}`} conn={conn} isLinked={true} />)}
            </div>
        </div>
      )}

      {suggested.length > 0 && (
        <div className="space-y-4 mt-8">
            <h4 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" /> AI Suggestions
            </h4>
            <div className="grid gap-4">
                {suggested.map((conn, idx) => <CaseCard key={`sugg-${idx}`} conn={conn} isLinked={false} />)}
            </div>
        </div>
      )}
    </div>
  );
}