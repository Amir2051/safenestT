import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function LawEnforcementReports() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { data: cases = [] } = useQuery({
    queryKey: ['fraud-cases'],
    queryFn: () => base44.asServiceRole.entities.FraudCase.list('-created_date')
  });

  const generateReport = async () => {
    if (!selectedCase) {
      toast.error("Please select a case");
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('blockchainIntelligence', {
        action: 'generate-report',
        data: { fraud_case_id: selectedCase }
      });
      setReport(response.data.data);
      toast.success("✅ Law enforcement report generated");
    } catch (error) {
      toast.error("Failed to generate report: " + error.message);
    }
    setGenerating(false);
  };

  const downloadPDF = () => {
    const reportText = JSON.stringify(report, null, 2);
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LE-Report-${report.reportId}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success("📥 Report downloaded");
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-400" />
            Law Enforcement Report Generator
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger className="w-64 bg-[#0f1419] border-green-500/20 text-white">
                <SelectValue placeholder="Select case" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-green-500/20">
                {cases.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={generateReport} disabled={generating || !selectedCase} className="bg-green-500">
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!report ? (
          <div className="text-center py-20">
            <FileText className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Select a case and generate a professional law enforcement report</p>
            <p className="text-sm text-gray-500">Includes: Evidence trail • Wallet analysis • Exchange contacts • Recommendations</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <h3 className="text-white font-bold text-lg">Report Ready</h3>
                  <p className="text-gray-400 text-sm">ID: {report.reportId}</p>
                </div>
              </div>
              <Button onClick={downloadPDF} className="w-full bg-green-500">
                <Download className="w-4 h-4 mr-2" />
                Download PDF Report
              </Button>
            </div>

            <div className="space-y-4">
              {Object.entries(report).slice(3, 8).map(([key, value]) => (
                <div key={key} className="p-4 bg-[#0f1419] rounded-lg">
                  <h4 className="text-white font-semibold mb-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}