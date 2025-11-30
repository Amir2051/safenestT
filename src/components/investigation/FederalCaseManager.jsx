import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ShieldCheck, AlertTriangle, CheckCircle, Loader2, 
  FileText, Send, Mail 
} from "lucide-react";
import { toast } from "sonner";

export default function FederalCaseManager({ selectedCase }) {
  const [requestingInfo, setRequestingInfo] = useState(false);
  const queryClient = useQueryClient();

  // --- AI Verification ---
  const { data: verification, isLoading: verifying, refetch: runVerification } = useQuery({
    queryKey: ['case-verification', selectedCase?.id],
    queryFn: async () => {
      if (!selectedCase) return null;
      const res = await base44.functions.invoke('federalCaseManager', {
        endpoint: 'verify-case',
        data: { caseData: selectedCase }
      });
      return res.data;
    },
    enabled: !!selectedCase
  });

  // --- Submit Follow Up ---
  const submitMutation = useMutation({
    mutationFn: async (type) => {
      return await base44.functions.invoke('federalCaseManager', {
        endpoint: 'submit-follow-up',
        data: { 
          caseId: selectedCase.id,
          updateType: type,
          content: `Manual ${type} submission triggered by admin.`
        }
      });
    },
    onSuccess: () => {
      toast.success("Follow-up logged successfully");
      queryClient.invalidateQueries(['investigation-cases']);
    }
  });

  // --- Request Info ---
  const requestInfoMutation = useMutation({
    mutationFn: async () => {
      const missing = verification?.issues?.join(', ') || "updated evidence";
      return await base44.functions.invoke('federalCaseManager', {
        endpoint: 'request-victim-info',
        data: { 
          caseId: selectedCase.id,
          victimEmail: selectedCase.victim_email,
          missingInfo: missing
        }
      });
    },
    onSuccess: () => {
      toast.success("Request sent to victim");
      setRequestingInfo(false);
    }
  });

  if (!selectedCase) return (
    <div className="h-full flex items-center justify-center text-gray-500">
      <p>Select a case to manage federal reporting</p>
    </div>
  );

  return (
    <div className="space-y-6 h-full overflow-y-auto p-1">
      {/* AI Verification Status */}
      <Card className="bg-[#1a2332] border-gray-800">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              IC3 Compliance Check
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => runVerification()}
              className="h-8 w-8 p-0"
            >
              {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {verification ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Completeness</span>
                  <span className={verification.completeness_score >= 80 ? "text-green-400" : "text-orange-400"}>
                    {verification.completeness_score}%
                  </span>
                </div>
                <Progress value={verification.completeness_score} className="h-2" />
              </div>

              {verification.issues?.length > 0 ? (
                <Alert variant="destructive" className="bg-red-900/10 border-red-900/30">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Missing Information</AlertTitle>
                  <AlertDescription className="mt-2 space-y-1">
                    {verification.issues.map((issue, i) => (
                      <div key={i} className="text-xs flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-red-400" />
                        {issue}
                      </div>
                    ))}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="bg-green-900/10 border-green-900/30">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <AlertTitle className="text-green-400">Ready for Submission</AlertTitle>
                  <AlertDescription className="text-green-500/80 text-xs">
                    Case data meets IC3 requirements.
                  </AlertDescription>
                </Alert>
              )}

              {verification.recommendations?.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">AI Recommendations</span>
                  <div className="space-y-1">
                    {verification.recommendations.map((rec, i) => (
                      <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 mt-1 text-cyan-500 shrink-0" />
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              Run verification to check compliance
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#1a2332] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Victim Outreach</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4">
              Automated request for missing evidence or information.
            </p>
            <Button 
              variant="outline" 
              className="w-full border-gray-700 hover:bg-gray-800"
              onClick={() => requestInfoMutation.mutate()}
              disabled={requestInfoMutation.isPending || !selectedCase.victim_email}
            >
              {requestInfoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Request Missing Info
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-400">Federal Submission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 mb-4">
              Submit updates or evidence to existing case file.
            </p>
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => submitMutation.mutate('Update')}
                disabled={submitMutation.isPending}
              >
                Update
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => submitMutation.mutate('Evidence')}
                disabled={submitMutation.isPending}
              >
                Evidence
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}