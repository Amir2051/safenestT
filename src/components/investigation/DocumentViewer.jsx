import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  X, Download, Edit, Save, Printer, FileText, Copy, CheckCircle, Eye, AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";

const DOCUMENT_NAMES = {
  case_summary: 'Case Summary',
  victim_statement: 'Victim Statement',
  transaction_log: 'Wallet Transaction Log',
  transaction_analysis: 'Transaction Analysis Sheet',
  scammer_profile: 'Scammer Wallet Profile',
  evidence_package: 'Evidence Package'
};

export default function DocumentViewer({ caseData, documentType, document, onClose, onUpdate, onSubmit }) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const printRef = useRef();

  // Initialize edited content from document
  useEffect(() => {
    if (document?.content) {
      setEditedContent(JSON.parse(JSON.stringify(document.content)));
    }
  }, [document]);

  const content = editedContent || document?.content || {};
  const docName = DOCUMENT_NAMES[documentType] || 'Document';

  // Show error if no content
  if (!document?.content?.sections) {
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="bg-[#1a2332] border-red-500/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Document Not Available</DialogTitle>
          </DialogHeader>
          <p className="text-gray-300">This document has not been generated yet or is empty.</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  const saveChanges = async (closeAfter = false) => {
    setSaving(true);
    try {
      const docs = { ...(caseData.case_documents || {}) };
      docs[documentType] = {
        ...document,
        content: editedContent,
        last_edited: new Date().toISOString(),
        status: 'generated'
      };

      await base44.entities.InvestigationCase.update(caseData.id, {
        case_documents: docs,
        last_activity: new Date().toISOString()
      });

      onUpdate();
      setEditing(false);
      toast.success('Document saved successfully');
      
      if (closeAfter) {
        onClose();
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save: ' + error.message);
    }
    setSaving(false);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${content.title || docName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
          h1 { color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          pre { background: #f3f4f6; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: monospace; }
          .header { text-align: center; margin-bottom: 40px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #6b7280; }
          .case-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${content.title || docName}</h1>
          <p>Case #${caseData.case_number}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        ${(content.sections || []).map(section => `
          <h2>${section.heading}</h2>
          <pre>${section.content}</pre>
        `).join('')}
        <div class="footer">
          <p>SafeNestt Investigation System - Confidential Document</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const downloadAsTxt = () => {
    let text = `${content.title || docName}\n`;
    text += `Case #${caseData.case_number}\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += '='.repeat(50) + '\n\n';

    (content.sections || []).forEach(section => {
      text += `## ${section.heading}\n`;
      text += `${section.content}\n\n`;
    });

    text += '\n' + '='.repeat(50) + '\n';
    text += 'SafeNestt Investigation System - Confidential Document\n';

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${caseData.case_number}_${documentType}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Document downloaded');
  };

  const copyToClipboard = async () => {
    let text = `${content.title || docName}\n`;
    text += `Case #${caseData.case_number}\n\n`;

    (content.sections || []).forEach(section => {
      text += `${section.heading}\n`;
      text += `${section.content}\n\n`;
    });

    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const previewPDF = () => {
    setPreviewLoading(true);
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${content.title || docName} - Preview</title>
        <style>
          @media print { @page { margin: 1in; } }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; line-height: 1.8; color: #1f2937; max-width: 800px; margin: 0 auto; }
          h1 { color: #0891b2; border-bottom: 3px solid #0891b2; padding-bottom: 15px; font-size: 28px; }
          h2 { color: #374151; margin-top: 35px; font-size: 18px; border-left: 4px solid #0891b2; padding-left: 15px; }
          pre { background: #f8fafc; padding: 20px; border-radius: 8px; white-space: pre-wrap; font-family: 'Consolas', monospace; font-size: 13px; border: 1px solid #e2e8f0; }
          .header { text-align: center; margin-bottom: 50px; padding: 30px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; }
          .header p { margin: 5px 0; color: #64748b; }
          .footer { margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          .watermark { position: fixed; bottom: 20px; right: 20px; opacity: 0.1; font-size: 60px; transform: rotate(-15deg); }
        </style>
      </head>
      <body>
        <div class="watermark">PREVIEW</div>
        <div class="header">
          <h1>${content.title || docName}</h1>
          <p><strong>Case #${caseData.case_number}</strong></p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>SafeNestt Investigation System</p>
        </div>
        ${(content.sections || []).map(section => `
          <h2>${section.heading}</h2>
          <pre>${section.content}</pre>
        `).join('')}
        <div class="footer">
          <p>SafeNestt Investigation System - Confidential Legal Document</p>
          <p>This document is intended for law enforcement and legal purposes only.</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    setPreviewLoading(false);
    toast.success('Preview opened in new tab');
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-cyan-400" />
              {docName}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => saveChanges(false)}
                    disabled={saving}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => saveChanges(true)}
                    disabled={saving}
                    className="bg-green-500 text-white hover:bg-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Save & Close
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setEditedContent(JSON.parse(JSON.stringify(document?.content || {})));
                    }}
                    className="border-gray-500/30"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="border-cyan-500/30 text-cyan-400"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={previewPDF}
                    disabled={previewLoading}
                    className="border-purple-500/30 text-purple-400"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyToClipboard}
                    className="border-gray-500/30"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrint}
                    className="border-gray-500/30"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={downloadAsTxt}
                    className="bg-cyan-500/20 text-cyan-400"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  {onSubmit && (
                    <Button
                      size="sm"
                      onClick={onSubmit}
                      className="bg-gradient-to-r from-red-500 to-orange-500 text-white"
                    >
                      Submit to Authorities
                    </Button>
                  )}
                </>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4" ref={printRef}>
          {/* Document Header */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4 mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{content.title || docName}</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                Case #{caseData.case_number}
              </Badge>
              <span className="text-gray-400">
                Generated: {document?.generated_at ? new Date(document.generated_at).toLocaleString() : 'N/A'}
              </span>
              {document?.last_edited && (
                <span className="text-gray-400">
                  Last Edited: {new Date(document.last_edited).toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Document Sections */}
          <div className="space-y-6">
            {(content.sections || []).map((section, index) => (
              <div 
                key={index}
                className="bg-[#0f1419] rounded-lg border border-cyan-500/10 overflow-hidden"
              >
                <div className="bg-cyan-500/10 px-4 py-2 border-b border-cyan-500/20 flex items-center justify-between">
                  <h3 className="text-white font-semibold">{section.heading}</h3>
                  {editing && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                      Editing
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  {editing && editedContent?.sections?.[index] ? (
                    <Textarea
                      value={editedContent.sections[index].content}
                      onChange={(e) => {
                        const updated = JSON.parse(JSON.stringify(editedContent));
                        updated.sections[index].content = e.target.value;
                        setEditedContent(updated);
                      }}
                      className="bg-[#1a2332] border-cyan-500/30 text-white font-mono text-sm min-h-[150px] w-full"
                      placeholder="Enter content..."
                    />
                  ) : (
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed break-words">
                      {section.content || 'No content available'}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Imported Transactions Warning */}
          {documentType === 'transaction_log' && (!content.transactions || content.transactions.length === 0) && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-semibold">No Transactions Imported</p>
                <p className="text-gray-400 text-sm mt-1">
                  Import an Etherscan CSV to populate this document with transaction data.
                </p>
              </div>
            </div>
          )}

          {/* Document Footer */}
          <div className="mt-8 pt-6 border-t border-cyan-500/20 text-center">
            <p className="text-gray-500 text-sm">
              SafeNestt Investigation System - Confidential Document
            </p>
            <p className="text-gray-600 text-xs mt-1">
              This document is intended for law enforcement and legal purposes only.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}