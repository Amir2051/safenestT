import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Download, Loader2, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function AIReportGenerator({ cases }) {
  const [selectedCase, setSelectedCase] = useState("");
  const [generating, setGenerating] = useState(false);
  const [includeData, setIncludeData] = useState({
    victimInfo: true,
    scammerInfo: true,
    evidence: true,
    wallets: true,
    transactions: true,
    notes: true,
    timeline: true,
    ic3Info: true
  });

  const generateReport = async () => {
    if (!selectedCase) {
      toast.error("Please select a case");
      return;
    }

    setGenerating(true);
    try {
      const caseData = (cases || []).find(c => c.id === selectedCase);
      
      // Fetch additional data
      const transactions = await base44.entities.Transaction.filter({ case_id: selectedCase });
      const walletMonitors = await base44.entities.WalletMonitor.filter({ fraud_case_id: selectedCase });

      // Build report prompt
      let reportData = `
# Cryptocurrency Fraud Investigation Report

## Case Information
- Case Number: ${caseData.case_number}
- Case Title: ${caseData.case_title}
- Fraud Type: ${caseData.fraud_type}
- Status: ${caseData.status}
- Priority: ${caseData.priority}
- Incident Date: ${caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : 'Unknown'}
`;

      if (includeData.victimInfo) {
        reportData += `\n## Victim Information
- Name: ${caseData.victim_name}
- Email: ${caseData.victim_email || 'Not provided'}
- Phone: ${caseData.victim_phone || 'Not provided'}
- Amount Stolen: $${caseData.amount_stolen_usd?.toLocaleString() || 0} USD
- Cryptocurrency: ${caseData.cryptocurrency || 'Various'}
- Blockchain: ${caseData.blockchain || 'Various'}
`;
      }

      if (includeData.scammerInfo && caseData.scammer_info) {
        reportData += `\n## Scammer Information
${caseData.scammer_info.name ? `- Name/Alias: ${caseData.scammer_info.name}\n` : ''}
${caseData.scammer_info.email ? `- Email: ${caseData.scammer_info.email}\n` : ''}
${caseData.scammer_info.phone ? `- Phone: ${caseData.scammer_info.phone}\n` : ''}
${caseData.scammer_info.website ? `- Website: ${caseData.scammer_info.website}\n` : ''}
${caseData.scammer_info.wallet_addresses?.length > 0 ? `- Wallet Addresses: ${caseData.scammer_info.wallet_addresses.join(', ')}\n` : ''}
`;
      }

      reportData += `\n## Incident Description
${caseData.description || 'No description provided.'}
`;

      if (includeData.wallets && caseData.monitored_wallets?.length > 0) {
        reportData += `\n## Monitored Wallets (${caseData.monitored_wallets.length})
${caseData.monitored_wallets.map((w, i) => `${i+1}. ${w}`).join('\n')}
`;
      }

      if (includeData.transactions && transactions.length > 0) {
        reportData += `\n## Tracked Transactions (${transactions.length})
${transactions.slice(0, 10).map((tx, i) => `
${i+1}. Hash: ${tx.tx_hash}
   From: ${tx.from_address}
   To: ${tx.to_address}
   Amount: ${tx.amount || 'N/A'}
   Date: ${new Date(tx.timestamp).toLocaleString()}
`).join('\n')}
${transactions.length > 10 ? `\n...and ${transactions.length - 10} more transactions` : ''}
`;
      }

      if (includeData.evidence && caseData.evidence_files?.length > 0) {
        reportData += `\n## Evidence Files (${caseData.evidence_files.length})
${caseData.evidence_files.map((f, i) => `${i+1}. ${f.name} - Uploaded: ${new Date(f.uploaded_date).toLocaleDateString()}`).join('\n')}
`;
      }

      if (includeData.notes && caseData.case_notes?.length > 0) {
        const publicNotes = caseData.case_notes.filter(n => !n.confidential);
        if (publicNotes.length > 0) {
          reportData += `\n## Investigation Notes (${publicNotes.length})
${publicNotes.map((n, i) => `${i+1}. [${new Date(n.timestamp).toLocaleDateString()}] ${n.note}`).join('\n')}
`;
        }
      }

      if (includeData.ic3Info) {
        reportData += `\n## Federal Reporting
${caseData.ic3_complaint_number ? `- IC3 Complaint Number: ${caseData.ic3_complaint_number}\n` : ''}
${caseData.federal_case_number ? `- Federal Case Number: ${caseData.federal_case_number}\n` : ''}
${caseData.agencies_contacted?.length > 0 ? `- Agencies Contacted: ${caseData.agencies_contacted.join(', ')}\n` : ''}
`;
      }

      // Generate AI narrative
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a cybercrime investigator writing a professional report for federal law enforcement agencies (FBI, IC3, FTC).

Based on the following case data, write a comprehensive, professional investigation report with:
1. Executive Summary
2. Detailed Analysis
3. Financial Impact Assessment
4. Recommended Actions for Law Enforcement
5. Conclusion

Use formal, factual language suitable for federal agencies. Be concise but thorough.

CASE DATA:
${reportData}

Write the report in professional format with clear sections.`,
        add_context_from_internet: false
      });

      // Create HTML report
      const fullReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Investigation Report - ${caseData.case_number}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 40px auto; padding: 20px; line-height: 1.8; color: #1a202c; }
    h1 { color: #1a365d; border-bottom: 4px solid #3182ce; padding-bottom: 15px; font-size: 28px; }
    h2 { color: #2d3748; margin-top: 40px; border-left: 5px solid #3182ce; padding-left: 15px; font-size: 22px; }
    h3 { color: #4a5568; margin-top: 25px; font-size: 18px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 40px; }
    .header h1 { color: white; border: none; margin: 0; }
    .field { margin: 20px 0; padding: 15px; background: #f7fafc; border-radius: 8px; }
    .label { font-weight: bold; color: #2d3748; display: inline-block; width: 180px; }
    .value { color: #1a202c; }
    .critical { background: #fff5f5; border-left: 5px solid #fc8181; padding: 20px; margin: 25px 0; border-radius: 8px; }
    .ai-section { background: #edf2f7; padding: 25px; border-radius: 10px; margin: 30px 0; border: 2px solid #cbd5e0; }
    .footer { margin-top: 60px; padding-top: 25px; border-top: 3px solid #e2e8f0; font-size: 13px; color: #718096; }
    pre { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 12px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin: 5px; }
    .badge-critical { background: #fed7d7; color: #c53030; }
    .badge-high { background: #feebc8; color: #c05621; }
    .badge-medium { background: #fefcbf; color: #975a16; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔍 Cryptocurrency Fraud Investigation Report</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Generated by SafeNestt Cyber Investigations | ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="field">
    <span class="label">Case Number:</span>
    <span class="value">${caseData.case_number}</span>
  </div>
  <div class="field">
    <span class="label">Priority Level:</span>
    <span class="badge badge-${caseData.priority === 'critical' ? 'critical' : caseData.priority === 'high' ? 'high' : 'medium'}">${caseData.priority?.toUpperCase()}</span>
  </div>
  <div class="field">
    <span class="label">Report Generated:</span>
    <span class="value">${new Date().toLocaleString()}</span>
  </div>

  <div class="critical">
    <h3 style="margin-top: 0; color: #c53030;">💰 Financial Loss Summary</h3>
    <p style="font-size: 24px; font-weight: bold; color: #c53030; margin: 10px 0;">$${caseData.amount_stolen_usd?.toLocaleString() || 0} USD</p>
    ${caseData.cryptocurrency ? `<p>Cryptocurrency Type: <strong>${caseData.cryptocurrency}</strong></p>` : ''}
  </div>

  <div class="ai-section">
    <h2 style="margin-top: 0;">📝 AI-Generated Investigation Analysis</h2>
    <div style="white-space: pre-wrap; line-height: 1.8;">${aiResponse}</div>
  </div>

  <h2>📊 Raw Case Data</h2>
  <pre>${reportData}</pre>

  <div class="footer">
    <p><strong>Report Classification:</strong> Law Enforcement Sensitive</p>
    <p><strong>Prepared By:</strong> SafeNestt Cyber Investigations Platform</p>
    <p><strong>Case Reference:</strong> ${caseData.case_number}</p>
    <p style="margin-top: 25px;"><em>This report is intended for law enforcement use only. Unauthorized distribution is prohibited.</em></p>
  </div>
</body>
</html>
      `;

      // Download report
      const blob = new Blob([fullReport], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Investigation_Report_${caseData.case_number}_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("AI-powered report generated!");
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error("Failed to generate report");
    }
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            AI-Powered Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-white text-sm mb-2 block">Select Case</label>
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                <SelectValue placeholder="Choose case..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                {(cases || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_number} - {c.case_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-white text-sm mb-3 font-medium">Include in Report:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(includeData).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-white text-sm">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setIncludeData({...includeData, [key]: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={generateReport}
            disabled={generating || !selectedCase}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating AI Report...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Professional Report
              </>
            )}
          </Button>

          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-purple-300 text-sm flex items-start gap-2">
              <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                This AI-powered tool generates professional investigation reports suitable for federal law enforcement agencies. 
                Reports include AI-synthesized narratives, financial analysis, and recommended actions.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}