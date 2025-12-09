import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Send, Download, RefreshCw, CheckCircle, Clock, AlertCircle,
  Building2, Shield, Loader2, Copy, ExternalLink, Printer
} from "lucide-react";
import { toast } from "sonner";

const AGENCY_TEMPLATES = {
  fbi_ic3: {
    name: "FBI IC3 Complaint",
    description: "Internet Crime Complaint Center report for cyber fraud",
    fields: ["victim_info", "suspect_info", "financial_info", "incident_details", "evidence", "technical_data"],
    portalUrl: "https://www.ic3.gov/Home/ComplaintChoice"
  },
  ftc: {
    name: "FTC Consumer Complaint",
    description: "Federal Trade Commission fraud report",
    fields: ["victim_info", "suspect_info", "financial_info", "incident_details"],
    portalUrl: "https://reportfraud.ftc.gov/"
  },
  sec: {
    name: "SEC Complaint",
    description: "Securities and Exchange Commission investment fraud report",
    fields: ["victim_info", "suspect_info", "financial_info", "investment_details"],
    portalUrl: "https://www.sec.gov/tcr"
  },
  cftc: {
    name: "CFTC Complaint",
    description: "Commodity Futures Trading Commission crypto fraud report",
    fields: ["victim_info", "suspect_info", "financial_info", "crypto_details"],
    portalUrl: "https://www.cftc.gov/complaint"
  },
  local_police: {
    name: "Local Police Report",
    description: "Local law enforcement incident report",
    fields: ["victim_info", "suspect_info", "financial_info", "incident_details", "evidence"]
  },
  state_ag: {
    name: "State Attorney General",
    description: "State AG consumer protection complaint",
    fields: ["victim_info", "suspect_info", "financial_info", "incident_details"]
  },
  crypto_exchange: {
    name: "Crypto Exchange Report",
    description: "Report to cryptocurrency exchange compliance team",
    fields: ["wallet_addresses", "transaction_hashes", "suspect_info", "financial_info"]
  },
  interpol: {
    name: "INTERPOL Report",
    description: "International criminal police organization report",
    fields: ["victim_info", "suspect_info", "financial_info", "incident_details", "international_elements"]
  }
};

export default function AgencyReportGenerator({ caseData, onReportGenerated }) {
  const [selectedAgency, setSelectedAgency] = useState("fbi_ic3");
  const [generatedReport, setGeneratedReport] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const queryClient = useQueryClient();

  const { data: existingReports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['agency-reports', caseData.id],
    queryFn: () => base44.entities.AgencyReport.filter({ case_id: caseData.id }),
    enabled: !!caseData.id
  });

  const generateReportMutation = useMutation({
    mutationFn: async ({ agencyType }) => {
      const template = AGENCY_TEMPLATES[agencyType];
      
      // Build comprehensive report data
      const reportData = buildReportData(caseData, agencyType);
      
      // Generate report content using AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a formal ${template.name} for the following cryptocurrency fraud case. 
        
Format it professionally with clear sections. Include all relevant details for law enforcement investigation.

CASE DATA:
${JSON.stringify(reportData, null, 2)}

Generate a complete, formal report that can be submitted to ${template.name}. Include:
1. Executive Summary
2. Victim Information
3. Suspect/Scammer Information  
4. Financial Loss Details
5. Incident Timeline
6. Evidence Summary
7. Technical Evidence (IP addresses, device info if available)
8. Wallet Addresses and Transaction Details
9. Recommended Actions

Make it professional, detailed, and ready for law enforcement review.`,
        response_json_schema: {
          type: "object",
          properties: {
            report_content: { type: "string" },
            executive_summary: { type: "string" },
            key_findings: { type: "array", items: { type: "string" } }
          }
        }
      });

      return {
        agency_type: agencyType,
        agency_name: template.name,
        report_content: response.report_content,
        executive_summary: response.executive_summary,
        key_findings: response.key_findings,
        report_data: reportData
      };
    },
    onSuccess: (data) => {
      setGeneratedReport(data);
      setEditedContent(data.report_content);
      toast.success("Report generated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to generate report: " + error.message);
    }
  });

  const saveReportMutation = useMutation({
    mutationFn: async (reportData) => {
      return await base44.entities.AgencyReport.create({
        case_id: caseData.id,
        agency_type: reportData.agency_type,
        agency_name: reportData.agency_name,
        report_title: `${reportData.agency_name} - ${caseData.case_title || caseData.case_number}`,
        report_content: editedContent,
        report_data: reportData.report_data,
        status: "ready",
        generated_by: "admin"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reports', caseData.id] });
      toast.success("Report saved!");
      if (onReportGenerated) onReportGenerated();
    }
  });

  const updateReportStatusMutation = useMutation({
    mutationFn: async ({ reportId, status, confirmationNumber }) => {
      const updateData = { status };
      if (confirmationNumber) {
        updateData.confirmation_number = confirmationNumber;
        updateData.submission_date = new Date().toISOString();
      }
      return await base44.entities.AgencyReport.update(reportId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-reports', caseData.id] });
      toast.success("Report status updated!");
    }
  });

  const buildReportData = (caseData, agencyType) => {
    const redacted = caseData.redacted_fields || [];
    const isRedacted = (f) => redacted.includes(f);
    const mask = (f, v) => isRedacted(f) ? "[REDACTED]" : (v || 'N/A');

    return {
      case_reference: mask('case_number', caseData.case_number),
      case_id_internal: caseData.id,
      case_title: caseData.case_title,
      report_date: new Date().toISOString(),
      
      victim: {
        name: mask('client_name', caseData.client_name || caseData.victim_name),
        email: mask('client_email', caseData.client_email || caseData.victim_email),
        phone: mask('phone_number', caseData.phone_number || caseData.victim_phone),
        address: mask('address', caseData.victim_contact_info?.address),
        city: caseData.victim_contact_info?.city,
        state: caseData.victim_contact_info?.state,
        country: caseData.victim_contact_info?.country || "United States"
      },
      
      suspect: {
        name: mask('suspect_name', caseData.scammer_info?.name || caseData.suspect_details?.primary_suspect?.name),
        email: mask('suspect_email', caseData.scammer_info?.email || caseData.suspect_details?.primary_suspect?.email),
        phone: mask('suspect_phone', caseData.scammer_info?.phone || caseData.suspect_details?.primary_suspect?.phone),
        website: caseData.scammer_info?.website,
        social_media: (caseData.scammer_info?.social_media || []).map((s, i) => isRedacted(`social_${i}`) ? '[REDACTED]' : s),
        wallet_addresses: (caseData.scammer_info?.wallet_addresses || caseData.suspect_details?.wallet_addresses || []).map((w, i) => isRedacted(`suspect_wallet_${i}`) || isRedacted('scammer_wallet') ? '[REDACTED]' : w),
        known_aliases: caseData.suspect_details?.primary_suspect?.aliases || [],
        ip_addresses: caseData.suspect_details?.ip_addresses || []
      },
      
      financial: {
        amount_stolen_usd: caseData.amount_stolen_usd,
        cryptocurrency: mask('cryptocurrency', caseData.cryptocurrency),
        blockchain: caseData.blockchain,
        transaction_hashes: caseData.transaction_hashes || [],
        recovery_amount: caseData.recovery_amount || 0
      },
      
      incident: {
        date: caseData.incident_date || caseData.incident_timestamp,
        description: caseData.description,
        fraud_type: caseData.fraud_type,
        timeline: caseData.timeline || []
      },
      
      evidence: {
        files: caseData.evidence_files || [],
        log: caseData.evidence_log || []
      },
      
      technical: {
        monitored_wallets: caseData.monitored_wallets || [],
        ic3_number: caseData.ic3_complaint_number,
        federal_case_number: caseData.federal_case_number
      }
    };
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    generateReportMutation.mutate({ agencyType: selectedAgency }, {
      onSettled: () => setIsGenerating(false)
    });
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${generatedReport?.agency_name} - Case Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #1a365d; border-bottom: 2px solid #1a365d; padding-bottom: 10px; }
            h2 { color: #2d3748; margin-top: 30px; }
            .header { text-align: center; margin-bottom: 40px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #4a5568; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${generatedReport?.agency_name}</h1>
            <p>SafeNest Case ID: <strong>${caseData.case_number}</strong></p>
            <p>Case Title: ${caseData.case_title}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
          <pre>${editedContent}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast.success("Copied to clipboard!");
  };

  const statusColors = {
    draft: "bg-gray-500/20 text-gray-400 border-gray-500/50",
    ready: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    confirmed: "bg-green-500/20 text-green-400 border-green-500/50",
    rejected: "bg-red-500/20 text-red-400 border-red-500/50",
    requires_action: "bg-orange-500/20 text-orange-400 border-orange-500/50"
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="bg-[#0f1419] border border-cyan-500/30">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history">Report History ({existingReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4 mt-4">
          {/* Agency Selection */}
          <Card className="bg-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                Select Agency & Generate Report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Target Agency</Label>
                  <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                    <SelectTrigger className="bg-[#1a2332] border-cyan-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AGENCY_TEMPLATES).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 w-full"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><FileText className="w-4 h-4 mr-2" />Generate Report</>
                    )}
                  </Button>
                </div>
              </div>

              {/* Agency Info */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-cyan-400 font-semibold text-sm">
                  {AGENCY_TEMPLATES[selectedAgency].name}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {AGENCY_TEMPLATES[selectedAgency].description}
                </p>
                {AGENCY_TEMPLATES[selectedAgency].portalUrl && (
                  <a
                    href={AGENCY_TEMPLATES[selectedAgency].portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 text-xs mt-2 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Official Submission Portal
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Generated Report */}
          {generatedReport && (
            <Card className="bg-[#0f1419] border-green-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Generated Report
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(editedContent)}
                      className="border-cyan-500/30 text-cyan-400"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintReport}
                      className="border-cyan-500/30 text-cyan-400"
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveReportMutation.mutate(generatedReport)}
                      disabled={saveReportMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Save Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Executive Summary */}
                {generatedReport.executive_summary && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg mb-4">
                    <p className="text-blue-400 font-semibold text-sm mb-1">Executive Summary</p>
                    <p className="text-gray-300 text-sm">{generatedReport.executive_summary}</p>
                  </div>
                )}

                {/* Key Findings */}
                {generatedReport.key_findings?.length > 0 && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg mb-4">
                    <p className="text-purple-400 font-semibold text-sm mb-2">Key Findings</p>
                    <ul className="space-y-1">
                      {generatedReport.key_findings.map((finding, idx) => (
                        <li key={idx} className="text-gray-300 text-sm flex items-start gap-2">
                          <span className="text-purple-400">•</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Editable Report Content */}
                <div>
                  <Label className="text-gray-300 mb-2 block">Report Content (Editable)</Label>
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="bg-[#1a2332] border-cyan-500/30 text-white min-h-[400px] font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          {loadingReports ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            </div>
          ) : existingReports.length === 0 ? (
            <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No reports generated yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {existingReports.map((report) => (
                <Card key={report.id} className="bg-[#0f1419] border-cyan-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-white font-semibold">{report.agency_name}</h4>
                          <Badge className={`${statusColors[report.status]} border text-xs`}>
                            {report.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-gray-400 text-sm">{report.report_title}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          Generated: {new Date(report.created_date).toLocaleString()}
                        </p>
                        {report.confirmation_number && (
                          <p className="text-green-400 text-sm mt-2">
                            Confirmation: {report.confirmation_number}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGeneratedReport({
                              agency_type: report.agency_type,
                              agency_name: report.agency_name,
                              report_content: report.report_content
                            });
                            setEditedContent(report.report_content);
                          }}
                          className="border-cyan-500/30 text-cyan-400"
                        >
                          View
                        </Button>
                        {report.status === 'ready' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const confNum = prompt("Enter confirmation number (if received):");
                              updateReportStatusMutation.mutate({
                                reportId: report.id,
                                status: 'submitted',
                                confirmationNumber: confNum
                              });
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Send className="w-3 h-3 mr-1" />
                            Mark Submitted
                          </Button>
                        )}
                        {report.status === 'submitted' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const confNum = prompt("Enter confirmation number:");
                              if (confNum) {
                                updateReportStatusMutation.mutate({
                                  reportId: report.id,
                                  status: 'confirmed',
                                  confirmationNumber: confNum
                                });
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Confirm
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}