import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, CheckCircle, FileCheck } from "lucide-react";
import { toast } from "sonner";

const documentTemplates = [
  {
    id: "ic3_report",
    name: "IC3 Complaint Report",
    description: "Formatted report for FBI Internet Crime Complaint Center",
    agency: "FBI IC3",
    icon: FileText
  },
  {
    id: "ftc_complaint",
    name: "FTC Fraud Complaint",
    description: "Federal Trade Commission fraud report",
    agency: "FTC",
    icon: FileText
  },
  {
    id: "evidence_package",
    name: "Evidence Package",
    description: "Comprehensive evidence documentation with timeline",
    agency: "All Agencies",
    icon: FileCheck
  },
  {
    id: "supplemental_evidence",
    name: "Supplemental Evidence Report",
    description: "Additional evidence submission for existing cases",
    agency: "FBI/Law Enforcement",
    icon: FileText
  },
  {
    id: "victim_statement",
    name: "Victim Impact Statement",
    description: "Detailed victim statement and financial impact",
    agency: "All Agencies",
    icon: FileText
  },
  {
    id: "wallet_trace_report",
    name: "Blockchain Wallet Trace Report",
    description: "Technical wallet tracking and transaction analysis",
    agency: "Law Enforcement",
    icon: FileCheck
  },
  {
    id: "subpoena_request",
    name: "Subpoena Generator",
    description: "Draft subpoena for information from ISPs or exchanges",
    agency: "Court/Legal",
    icon: FileText
  },
  {
    id: "evidence_request",
    name: "Evidence Request",
    description: "Formal request for preservation of evidence",
    agency: "Service Providers",
    icon: FileCheck
  },
  {
    id: "case_file_request",
    name: "Request New Case File",
    description: "Generate a complete case file request package",
    agency: "Internal/Legal",
    icon: FileText
  }
];

export default function DocumentGenerator({ cases }) {
  const [selectedCase, setSelectedCase] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generating, setGenerating] = useState(false);

  const generateDocument = async () => {
    if (!selectedCase || !selectedTemplate) {
      toast.error("Please select a case and document type");
      return;
    }

    const caseData = (cases || []).find(c => c.id === selectedCase);
    const template = documentTemplates.find(t => t.id === selectedTemplate);

    // Validation
    if (template.id === 'subpoena_request' && !caseData.scammer_wallet && !caseData.scammer_info?.email) {
      toast.error("Cannot generate Subpoena: Missing target wallet or email");
      return;
    }

    setGenerating(true);
    try {
      // Log the action
      await base44.entities.InvestigationLog.create({
        admin_email: 'admin', // Should ideally use actual user email
        action_type: 'report_generated',
        description: `Generated ${template.name} for Case ${caseData.case_number}`,
        fraud_case_id: caseData.id,
        metadata: { template: template.id }
      });

      const content = generateDocumentContent(caseData, template);
      
      const blob = new Blob([content], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.id}_${caseData.case_number}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("Document generated successfully!");
    } catch (error) {
      console.error('Generate error:', error);
      toast.error("Failed to generate document");
    }
    setGenerating(false);
  };

  const generateDocumentContent = (caseData, template) => {
    const date = new Date().toLocaleDateString();
    
    // Specialized Templates
    if (template.id === 'subpoena_request') {
      return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>SUBPOENA - ${caseData.case_number}</title>
<style>
body { font-family: "Times New Roman", Times, serif; max-width: 800px; margin: 40px auto; padding: 40px; line-height: 1.5; }
.header { text-align: center; font-weight: bold; margin-bottom: 40px; }
.court-info { text-align: center; margin-bottom: 40px; }
.title { font-size: 24px; font-weight: bold; text-decoration: underline; margin-bottom: 20px; }
.field { margin: 15px 0; }
</style>
</head>
<body>
<div class="court-info">
  UNITED STATES DISTRICT COURT<br>
  DISTRICT OF [DISTRICT NAME]
</div>
<div class="header">
  <div class="field">CASE NUMBER: ${caseData.case_number}</div>
  <div class="title">SUBPOENA TO PRODUCE DOCUMENTS, INFORMATION, OR OBJECTS</div>
</div>
<p><strong>TO:</strong> [Name of ISP / Exchange / Entity]</p>
<p><strong>YOU ARE COMMANDED</strong> to produce the following documents, electronically stored information, or objects at the time, date, and place set forth below:</p>
<p><strong>PLACE:</strong> [Address of Requesting Party]<br>
<strong>DATE/TIME:</strong> [Date]</p>
<p><strong>DESCRIPTION OF ITEMS TO BE PRODUCED:</strong></p>
<ul>
  <li>All account records, including subscriber information, logs, and IP addresses related to:</li>
  <li>Wallet Address: ${caseData.scammer_wallet || '[Wallet Address]'}</li>
  <li>Transaction Hash: ${caseData.transaction_hashes?.[0] || '[Transaction ID]'}</li>
  <li>Associated Email/Phone: ${caseData.scammer_info?.email || '[Email]'} / ${caseData.scammer_info?.phone || '[Phone]'}</li>
</ul>
<br><br>
<p>_________________________<br>Clerk of Court / Attorney Signature</p>
</body>
</html>`;
    }

    if (template.id === 'evidence_request') {
      return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Preservation Request - ${caseData.case_number}</title>
<style>
body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; line-height: 1.6; }
.header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
</style>
</head>
<body>
<div class="header">
  <h2>PRESERVATION OF EVIDENCE REQUEST</h2>
  <p><strong>Date:</strong> ${date}</p>
  <p><strong>Re:</strong> Preservation of Records for Case #${caseData.case_number}</p>
</div>
<p><strong>Dear Compliance Officer,</strong></p>
<p>This letter serves as a formal request to preserve all records and other evidence in your possession regarding the following accounts/identifiers pending further legal process:</p>
<ul>
  <li><strong>Target User/Account:</strong> ${caseData.scammer_info?.name || 'Unknown User'}</li>
  <li><strong>Wallet Address:</strong> ${caseData.scammer_wallet}</li>
  <li><strong>Transaction ID(s):</strong> ${caseData.transaction_hashes?.join(', ') || 'N/A'}</li>
  <li><strong>Incident Date:</strong> ${caseData.incident_date}</li>
</ul>
<p>We request that you take immediate steps to preserve these records for a period of 90 days, as they are critical to an ongoing criminal investigation regarding <strong>${caseData.fraud_type}</strong>.</p>
<p>Sincerely,</p>
<p>SafeNestt Investigations Unit</p>
</body>
</html>`;
    }

    if (template.id === 'case_file_request') {
      return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Case File Request - ${caseData.case_number}</title>
<style>
body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 40px; line-height: 1.6; }
.header { background: #f0f0f0; padding: 20px; margin-bottom: 30px; border-left: 5px solid #333; }
</style>
</head>
<body>
<div class="header">
  <h2>INTERNAL CASE FILE REQUEST</h2>
  <p><strong>Request ID:</strong> REQ-${Date.now()}</p>
  <p><strong>Priority:</strong> ${caseData.priority?.toUpperCase()}</p>
</div>
<h3>Case Information</h3>
<ul>
  <li><strong>Case Number:</strong> ${caseData.case_number}</li>
  <li><strong>Title:</strong> ${caseData.case_title}</li>
  <li><strong>Assigned Investigator:</strong> ${caseData.assigned_to || 'Unassigned'}</li>
</ul>
<h3>Requested Items</h3>
<p>Please compile and transfer the full investigative file including:</p>
<ol>
  <li>Initial Incident Report</li>
  <li>Victim Statements & Evidence Log</li>
  <li>Blockchain Tracing Analysis Reports</li>
  <li>Correspondence with Law Enforcement (IC3/FBI)</li>
</ol>
<p><strong>Reason for Request:</strong> Preparation for legal escalation / subpoena issuance.</p>
<p><strong>Authorized By:</strong> Admin</p>
</body>
</html>`;
    }

    // Default Generic Template
    let content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${template.name} - ${caseData.case_number}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1a365d; border-bottom: 3px solid #3182ce; padding-bottom: 10px; }
    h2 { color: #2d3748; margin-top: 30px; border-left: 4px solid #3182ce; padding-left: 10px; }
    .header { background: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .field { margin: 15px 0; }
    .label { font-weight: bold; color: #4a5568; }
    .value { color: #1a202c; }
    .critical { background: #fff5f5; border-left: 4px solid #fc8181; padding: 15px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #edf2f7; font-weight: bold; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${template.name}</h1>
    <div class="field">
      <span class="label">Case Number:</span> <span class="value">${caseData.case_number}</span>
    </div>
    <div class="field">
      <span class="label">Report Generated:</span> <span class="value">${date}</span>
    </div>
    <div class="field">
      <span class="label">Prepared By:</span> <span class="value">SafeNestt Investigations</span>
    </div>
  </div>

  <h2>Case Summary</h2>
  <div class="field">
    <span class="label">Case Title:</span> <span class="value">${caseData.case_title}</span>
  </div>
  <div class="field">
    <span class="label">Fraud Type:</span> <span class="value">${caseData.fraud_type?.replace('_', ' ').toUpperCase()}</span>
  </div>
  <div class="field">
    <span class="label">Incident Date:</span> <span class="value">${caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : 'Unknown'}</span>
  </div>

  <div class="critical">
    <h3 style="margin-top: 0;">Financial Loss</h3>
    <div class="field">
      <span class="label">Total Amount Stolen:</span> <span class="value" style="font-size: 18px; color: #c53030;">$${caseData.amount_stolen_usd?.toLocaleString() || 0} USD</span>
    </div>
    ${caseData.cryptocurrency ? `<div class="field"><span class="label">Cryptocurrency:</span> <span class="value">${caseData.cryptocurrency}</span></div>` : ''}
    ${caseData.blockchain ? `<div class="field"><span class="label">Blockchain:</span> <span class="value">${caseData.blockchain}</span></div>` : ''}
  </div>

  <h2>Report Submitted By</h2>
  <div class="field">
    <span class="label">Name:</span> <span class="value">${caseData.created_by_name || 'N/A'}</span>
  </div>
  <div class="field">
    <span class="label">Email:</span> <span class="value">${caseData.created_by_email || caseData.created_by || 'N/A'}</span>
  </div>

  <h2>Victim Information</h2>
  <div class="field">
    <span class="label">Name:</span> <span class="value">${caseData.victim_name}</span>
  </div>
  ${caseData.victim_email ? `<div class="field"><span class="label">Email:</span> <span class="value">${caseData.victim_email}</span></div>` : ''}
  ${caseData.victim_phone ? `<div class="field"><span class="label">Phone:</span> <span class="value">${caseData.victim_phone}</span></div>` : ''}

  <h2>Incident Description</h2>
  <p>${caseData.description || 'No detailed description provided.'}</p>

  ${caseData.scammer_info ? `
  <h2>Suspect Information</h2>
  ${caseData.scammer_info.name ? `<div class="field"><span class="label">Name/Alias:</span> <span class="value">${caseData.scammer_info.name}</span></div>` : ''}
  ${caseData.scammer_info.email ? `<div class="field"><span class="label">Email:</span> <span class="value">${caseData.scammer_info.email}</span></div>` : ''}
  ${caseData.scammer_info.phone ? `<div class="field"><span class="label">Phone:</span> <span class="value">${caseData.scammer_info.phone}</span></div>` : ''}
  ${caseData.scammer_info.website ? `<div class="field"><span class="label">Website:</span> <span class="value">${caseData.scammer_info.website}</span></div>` : ''}
  ` : ''}

  ${caseData.monitored_wallets && caseData.monitored_wallets.length > 0 ? `
  <h2>Blockchain Evidence</h2>
  <table>
    <tr>
      <th>Wallet Address</th>
      <th>Blockchain</th>
    </tr>
    ${caseData.monitored_wallets.map(wallet => `
    <tr>
      <td><code>${wallet}</code></td>
      <td>${caseData.blockchain || 'Various'}</td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${caseData.transaction_hashes && caseData.transaction_hashes.length > 0 ? `
  <h2>Transaction Evidence</h2>
  <table>
    <tr>
      <th>#</th>
      <th>Transaction Hash</th>
    </tr>
    ${caseData.transaction_hashes.map((hash, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><code>${hash}</code></td>
    </tr>
    `).join('')}
  </table>
  ` : ''}

  ${caseData.evidence_files && caseData.evidence_files.length > 0 ? `
  <h2>Supporting Evidence</h2>
  <p><strong>Total Evidence Files:</strong> ${caseData.evidence_files.length}</p>
  <ul>
    ${caseData.evidence_files.map(file => `<li>${file.name} (Uploaded: ${new Date(file.uploaded_date).toLocaleDateString()})</li>`).join('')}
  </ul>
  ` : ''}

  ${caseData.ic3_complaint_number ? `
  <h2>Related Filings</h2>
  <div class="field">
    <span class="label">FBI IC3 Complaint Number:</span> <span class="value">${caseData.ic3_complaint_number}</span>
  </div>
  ` : ''}
  ${caseData.federal_case_number ? `
  <div class="field">
    <span class="label">Federal Case Number:</span> <span class="value">${caseData.federal_case_number}</span>
  </div>
  ` : ''}

  <h2>Investigator Notes</h2>
  ${caseData.case_notes && caseData.case_notes.length > 0 ? `
    ${caseData.case_notes.map(note => `
      <div style="margin: 15px 0; padding: 10px; background: #f7fafc; border-radius: 4px;">
        <small style="color: #718096;">${new Date(note.timestamp).toLocaleString()} - ${note.author}</small><br>
        <span>${note.note}</span>
      </div>
    `).join('')}
  ` : '<p>No investigator notes recorded.</p>'}

  <div class="footer">
    <p><strong>Document Generated By:</strong> SafeNestt Cyber Investigations Platform</p>
    <p><strong>Report Date:</strong> ${date}</p>
    <p><strong>Case Reference:</strong> ${caseData.case_number}</p>
    <p style="margin-top: 20px;"><em>This document contains confidential information for law enforcement purposes only.</em></p>
  </div>
</body>
</html>
    `;

    return content;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Generate Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm mb-2 block">Select Case</label>
              <Select value={selectedCase} onValueChange={setSelectedCase}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue placeholder="Choose a case..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.case_number} - {c.case_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-white text-sm mb-2 block">Document Type</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue placeholder="Choose template..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {documentTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={generateDocument}
              disabled={generating || !selectedCase || !selectedTemplate}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  {selectedTemplate === 'case_file_request' ? 'Request Case File' : 
                   selectedTemplate === 'subpoena_request' ? 'Generate Subpoena' : 
                   'Generate Document'}
                </>
              )}
            </Button>
            <Button
            onClick={() => {
              // Generate a blank templates package
              const templatesContent = documentTemplates.map(t => 
                `=== ${t.name.toUpperCase()} ===\n\n[Insert Agency Name]\n[Insert Date]\n\nRE: ${t.description}\n\nTo Whom It May Concern,\n\n[Body of the ${t.name} goes here...]\n\nSincerely,\n[Your Name]\n\n`
              ).join('\n----------------------------------------\n\n');

              const blob = new Blob([templatesContent], { type: 'text/plain' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'SafeNestt_Legal_Templates_Pack.txt';
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
              toast.success("Templates downloaded successfully");
            }}
            variant="outline"
            className="border-cyan-500/30 text-cyan-400"
            >
            <Download className="w-4 h-4 mr-2" />
            Download Templates
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documentTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.id}
              className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer ${
                selectedTemplate === template.id ? 'ring-2 ring-cyan-500' : ''
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-sm">{template.name}</h3>
                    <Badge className="mt-1 bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                      {template.agency}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-gray-400">{template.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}