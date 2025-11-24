import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  X, Download, Edit, Save, Printer, FileText, Copy, CheckCircle 
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

export default function DocumentViewer({ caseData, documentType, document, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(document?.content || {});
  const [saving, setSaving] = useState(false);
  const printRef = useRef();

  const content = document?.content || {};
  const docName = DOCUMENT_NAMES[documentType] || 'Document';

  const saveChanges = async () => {
    setSaving(true);
    try {
      const docs = caseData.case_documents || {};
      docs[documentType] = {
        ...document,
        content: editedContent,
        last_edited: new Date().toISOString()
      };

      await base44.entities.InvestigationCase.update(caseData.id, {
        case_documents: docs,
        last_activity: new Date().toISOString()
      });

      onUpdate();
      setEditing(false);
      toast.success('Document saved');
    } catch (error) {
      toast.error('Failed to save');
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-cyan-400" />
              {docName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    onClick={saveChanges}
                    disabled={saving}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setEditedContent(document?.content || {});
                    }}
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
            {(editing ? editedContent.sections : content.sections || []).map((section, index) => (
              <div 
                key={index}
                className="bg-[#0f1419] rounded-lg border border-cyan-500/10 overflow-hidden"
              >
                <div className="bg-cyan-500/10 px-4 py-2 border-b border-cyan-500/20">
                  <h3 className="text-white font-semibold">{section.heading}</h3>
                </div>
                <div className="p-4">
                  {editing ? (
                    <Textarea
                      value={editedContent.sections[index].content}
                      onChange={(e) => {
                        const updated = { ...editedContent };
                        updated.sections[index].content = e.target.value;
                        setEditedContent(updated);
                      }}
                      className="bg-[#1a2332] border-cyan-500/30 text-white font-mono text-sm min-h-[150px]"
                    />
                  ) : (
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                      {section.content}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>

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