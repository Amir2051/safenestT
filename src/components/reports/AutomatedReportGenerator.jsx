import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, Sparkles, Loader2, CheckCircle, Users, Shield
} from "lucide-react";
import { toast } from "sonner";

export default function AutomatedReportGenerator({ caseData, onReportGenerated }) {
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState(null);

  const generateReport = async (type) => {
    setReportType(type);
    setGenerating(true);
    
    try {
      const toastId = toast.loading(`Generating ${type} report with AI...`);
      
      const response = await base44.functions.invoke('reportGeneration', {
        action: type === 'investigation' ? 'generate_investigation_report' : 'generate_client_summary',
        data: { caseId: caseData.id }
      });

      // Handle PDF response
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'investigation' ? 'Investigation_Report' : 'Client_Summary'}_${caseData.case_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Report generated and downloaded!', { id: toastId });
      
      if (onReportGenerated) onReportGenerated();
    } catch (error) {
      toast.error('Failed to generate report: ' + error.message);
    }
    
    setGenerating(false);
    setReportType(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Investigation Report */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-purple-400" />
            Investigation Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-300">
            Comprehensive report for law enforcement with full case details, evidence analysis, and AI insights.
          </p>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              AI-synthesized findings
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Complete evidence catalog
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Timeline reconstruction
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Professional formatting
            </div>
          </div>
          <Button
            onClick={() => generateReport('investigation')}
            disabled={generating}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
          >
            {generating && reportType === 'investigation' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Client Summary */}
      <Card className="bg-gradient-to-br from-cyan-500/10 to-green-500/10 border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-sm">
            <Users className="w-4 h-4 text-cyan-400" />
            Client Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-300">
            Easy-to-understand summary for the client with current status and next steps.
          </p>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Simple language
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Progress updates
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Reassurance messaging
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-400" />
              Client-safe content
            </div>
          </div>
          <Button
            onClick={() => generateReport('client')}
            disabled={generating}
            className="w-full bg-gradient-to-r from-cyan-500 to-green-600 hover:from-cyan-600 hover:to-green-700"
          >
            {generating && reportType === 'client' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Summary
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}