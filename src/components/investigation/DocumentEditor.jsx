import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import ReactQuill from "react-quill";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  X, Download, Edit, Save, Printer, FileText, Copy, CheckCircle, 
  Eye, AlertTriangle, Send, Loader2, Image, Upload 
} from "lucide-react";
import { toast } from "sonner";

// Quill modules configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    ['blockquote', 'code-block'],
    ['link'],
    ['clean']
  ]
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent', 'blockquote', 'code-block', 'link'
];

export default function DocumentEditor({ 
  caseData, 
  documentType, 
  document, 
  documentName,
  onClose, 
  onSave,
  onSubmit 
}) {
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null);
  const [embeddedImages, setEmbeddedImages] = useState(document?.content?.images || []);
  const printRef = useRef();
  const fileInputRef = useRef();

  // Initialize content
  useEffect(() => {
    console.log('[DocumentEditor] Mounting with document:', document);
    if (document?.content) {
      setEditedContent(JSON.parse(JSON.stringify(document.content)));
    }
  }, [document]);

  const content = editedContent || document?.content || {};

  // Validate we have content
  if (!document?.content?.sections || document.content.sections.length === 0) {
    console.error('[DocumentEditor] No content sections found:', document);
    return (
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="bg-[#1a2332] border-red-500/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Document Error
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-gray-300 mb-4">
              This document is empty or failed to generate properly.
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Document ID: {document?.document_id || 'N/A'}
            </p>
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle section content change
  const handleSectionChange = (index, newContent) => {
    const updated = JSON.parse(JSON.stringify(editedContent));
    updated.sections[index].content = newContent;
    setEditedContent(updated);
    setHasChanges(true);
  };

  // Handle image upload
  const handleImageUpload = async (event, sectionIndex) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image or PDF file');
      return;
    }

    setUploadingImage(sectionIndex);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const newImage = {
        url: file_url,
        name: file.name,
        type: file.type,
        section: sectionIndex,
        uploaded_at: new Date().toISOString()
      };

      const updatedImages = [...embeddedImages, newImage];
      setEmbeddedImages(updatedImages);

      // Update content to include image reference
      const updated = JSON.parse(JSON.stringify(editedContent));
      updated.images = updatedImages;
      setEditedContent(updated);
      setHasChanges(true);

      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    }
    
    setUploadingImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove embedded image
  const removeImage = (imageIndex) => {
    const updatedImages = embeddedImages.filter((_, i) => i !== imageIndex);
    setEmbeddedImages(updatedImages);
    
    const updated = JSON.parse(JSON.stringify(editedContent));
    updated.images = updatedImages;
    setEditedContent(updated);
    setHasChanges(true);
  };

  // Save document
  const handleSave = async (closeAfterSave = false) => {
    console.log('[DocumentEditor] Saving document...');
    setSaving(true);
    
    try {
      await onSave(editedContent);
      setHasChanges(false);
      setEditing(false);
      
      if (closeAfterSave) {
        onClose();
      }
    } catch (error) {
      console.error('[DocumentEditor] Save error:', error);
      toast.error('Failed to save: ' + error.message);
    }
    
    setSaving(false);
  };

  // Download as text file
  const handleDownload = () => {
    let text = `${content.title || documentName}\n`;
    text += `Case #${caseData.case_number}\n`;
    text += `Generated: ${document.generated_at ? new Date(document.generated_at).toLocaleString() : 'N/A'}\n`;
    text += '═'.repeat(60) + '\n\n';

    (content.sections || []).forEach(section => {
      text += `## ${section.heading}\n\n`;
      text += `${section.content}\n\n`;
      text += '─'.repeat(40) + '\n\n';
    });

    text += '═'.repeat(60) + '\n';
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

  // Preview as PDF (opens in new window)
  const handlePreviewPDF = () => {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${content.title || documentName}</title>
        <style>
          @media print { @page { margin: 0.75in; } }
          * { box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; 
            padding: 40px; 
            line-height: 1.6; 
            color: #1f2937; 
            max-width: 800px; 
            margin: 0 auto;
            background: white;
          }
          h1 { 
            color: #0891b2; 
            border-bottom: 3px solid #0891b2; 
            padding-bottom: 15px; 
            font-size: 24px;
            margin-bottom: 10px;
          }
          h2 { 
            color: #374151; 
            margin-top: 30px; 
            font-size: 16px; 
            border-left: 4px solid #0891b2; 
            padding-left: 12px;
            background: #f0f9ff;
            padding: 8px 12px;
            margin-bottom: 8px;
          }
          .content-block { 
            background: #f8fafc; 
            padding: 16px; 
            border-radius: 8px; 
            white-space: pre-wrap; 
            font-family: 'Consolas', 'Monaco', monospace; 
            font-size: 12px; 
            border: 1px solid #e2e8f0;
            margin-bottom: 20px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 40px; 
            padding: 25px; 
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
            border-radius: 12px;
            border: 1px solid #bae6fd;
          }
          .header p { margin: 4px 0; color: #64748b; font-size: 13px; }
          .header .case-num { font-weight: bold; color: #0891b2; font-size: 14px; }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            font-size: 11px; 
            color: #94a3b8; 
            border-top: 1px solid #e2e8f0; 
            padding-top: 20px; 
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #0891b2;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
          }
          .print-btn:hover { background: #0e7490; }
          @media print { .print-btn { display: none; } }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
        <div class="header">
          <h1>${content.title || documentName}</h1>
          <p class="case-num">Case #${caseData.case_number}</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>SafeNestt Investigation System</p>
        </div>
        ${(content.sections || []).map(section => `
          <h2>${section.heading}</h2>
          <div class="content-block">${section.content}</div>
        `).join('')}
        <div class="footer">
          <p><strong>SafeNestt Investigation System</strong></p>
          <p>Confidential Legal Document - For Law Enforcement Use Only</p>
          <p>Document ID: ${document.document_id || 'N/A'}</p>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    toast.success('Preview opened - use Print to save as PDF');
  };

  // Copy to clipboard
  const handleCopy = async () => {
    let text = `${content.title}\nCase #${caseData.case_number}\n\n`;
    (content.sections || []).forEach(section => {
      text += `${section.heading}\n${section.content}\n\n`;
    });
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <Dialog open onOpenChange={(open) => {
      if (!open && hasChanges) {
        if (confirm('You have unsaved changes. Discard them?')) {
          onClose();
        }
      } else if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 border-b border-cyan-500/20 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              <FileText className="w-6 h-6 text-cyan-400" />
              {documentName}
              {editing && <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Editing</Badge>}
              {hasChanges && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Unsaved</Badge>}
            </DialogTitle>
            
            <div className="flex items-center gap-2 flex-wrap">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Save & Close
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(false);
                      setEditedContent(JSON.parse(JSON.stringify(document.content)));
                      setHasChanges(false);
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
                    onClick={() => setEditing(true)}
                    className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit Document
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePreviewPDF}
                    className="border-purple-500/30 text-purple-400"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopy}
                    className="border-gray-500/30"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownload}
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
                      <Send className="w-4 h-4 mr-1" />
                      Submit
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={printRef}>
          {/* Document Header */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4">
            <h2 className="text-xl font-bold text-white mb-2">{content.title || documentName}</h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                Case #{caseData.case_number}
              </Badge>
              <span className="text-gray-400">
                Generated: {document.generated_at ? new Date(document.generated_at).toLocaleString() : 'N/A'}
              </span>
              {document.last_edited && (
                <span className="text-gray-400">
                  Edited: {new Date(document.last_edited).toLocaleString()}
                </span>
              )}
              <span className="text-gray-500 text-xs">
                ID: {document.document_id}
              </span>
            </div>
          </div>

          {/* Document Sections */}
          {(editedContent?.sections || content.sections || []).map((section, index) => (
            <div 
              key={index}
              className="bg-[#0f1419] rounded-lg border border-cyan-500/10 overflow-hidden"
            >
              <div className="bg-cyan-500/10 px-4 py-3 border-b border-cyan-500/20 flex items-center justify-between">
                <h3 className="text-white font-semibold">{section.heading}</h3>
                <div className="flex items-center gap-2">
                  {editing && section.editable !== false && (
                    <>
                      <label className="cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e, index)}
                          disabled={uploadingImage !== null}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-cyan-500/30 text-cyan-400 text-xs"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage === index}
                        >
                          {uploadingImage === index ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Image className="w-3 h-3 mr-1" />
                          )}
                          Add Image
                        </Button>
                      </label>
                      <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">Rich Text</Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="p-4">
                {editing && section.editable !== false ? (
                  <div className="rich-text-editor">
                    <ReactQuill
                      theme="snow"
                      value={editedContent?.sections?.[index]?.content || section.content}
                      onChange={(value) => handleSectionChange(index, value)}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Enter content with formatting..."
                      className="bg-[#1a2332] text-white rounded-lg"
                    />
                  </div>
                ) : (
                  <div 
                    className="text-gray-300 text-sm prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: section.content || 'No content' }}
                  />
                )}

                {/* Section Embedded Images */}
                {embeddedImages.filter(img => img.section === index).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-cyan-500/10">
                    <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                      <Image className="w-3 h-3" /> Attached Files
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {embeddedImages.filter(img => img.section === index).map((img, imgIdx) => (
                        <div key={imgIdx} className="relative group">
                          {img.type === 'application/pdf' ? (
                            <a 
                              href={img.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block p-4 bg-[#1a2332] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40"
                            >
                              <FileText className="w-8 h-8 text-red-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-300 truncate text-center">{img.name}</p>
                            </a>
                          ) : (
                            <a href={img.url} target="_blank" rel="noopener noreferrer">
                              <img 
                                src={img.url} 
                                alt={img.name}
                                className="w-full h-24 object-cover rounded-lg border border-cyan-500/20 hover:border-cyan-500/40"
                              />
                            </a>
                          )}
                          {editing && (
                            <button
                              onClick={() => removeImage(embeddedImages.indexOf(img))}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Transaction Warning */}
          {documentType === 'transaction_log' && (!content.transactions || content.transactions.length === 0) && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-semibold">No Transactions Imported</p>
                <p className="text-gray-400 text-sm mt-1">
                  Import an Etherscan CSV in the "Etherscan Import" tab to auto-populate transaction data.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="pt-6 border-t border-cyan-500/20 text-center">
            <p className="text-gray-500 text-sm">SafeNestt Investigation System - Confidential Document</p>
            <p className="text-gray-600 text-xs mt-1">For law enforcement and legal purposes only</p>
          </div>
        </div>

        {/* Rich Text Editor Styles */}
        <style>{`
          .rich-text-editor .ql-toolbar {
            background: #1a2332;
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 8px 8px 0 0;
          }
          .rich-text-editor .ql-toolbar .ql-stroke {
            stroke: #9ca3af;
          }
          .rich-text-editor .ql-toolbar .ql-fill {
            fill: #9ca3af;
          }
          .rich-text-editor .ql-toolbar .ql-picker {
            color: #9ca3af;
          }
          .rich-text-editor .ql-toolbar button:hover .ql-stroke,
          .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
            stroke: #06b6d4;
          }
          .rich-text-editor .ql-toolbar button:hover .ql-fill,
          .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
            fill: #06b6d4;
          }
          .rich-text-editor .ql-container {
            background: #1a2332;
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-top: none;
            border-radius: 0 0 8px 8px;
            min-height: 200px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 14px;
          }
          .rich-text-editor .ql-editor {
            color: #e5e7eb;
            min-height: 180px;
          }
          .rich-text-editor .ql-editor.ql-blank::before {
            color: #6b7280;
            font-style: normal;
          }
          .rich-text-editor .ql-editor h1,
          .rich-text-editor .ql-editor h2,
          .rich-text-editor .ql-editor h3 {
            color: #06b6d4;
          }
          .rich-text-editor .ql-editor blockquote {
            border-left: 4px solid #06b6d4;
            padding-left: 16px;
            color: #9ca3af;
          }
          .rich-text-editor .ql-editor code,
          .rich-text-editor .ql-editor pre {
            background: #0f1419;
            color: #10b981;
            border-radius: 4px;
          }
          .rich-text-editor .ql-editor a {
            color: #06b6d4;
          }
          .rich-text-editor .ql-snow .ql-picker-options {
            background: #1a2332;
            border-color: rgba(6, 182, 212, 0.3);
          }
          .rich-text-editor .ql-snow .ql-picker-item {
            color: #9ca3af;
          }
          .rich-text-editor .ql-snow .ql-picker-item:hover {
            color: #06b6d4;
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}