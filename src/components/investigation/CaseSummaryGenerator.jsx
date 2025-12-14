import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
    FileText, Link as LinkIcon, Download, Save, RefreshCw, 
    Plus, X, Upload, Search, CheckCircle2 
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function CaseSummaryGenerator({ caseData, onUpdate }) {
    const [htmlContent, setHtmlContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [linkedCases, setLinkedCases] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [uploadedEvidence, setUploadedEvidence] = useState([]);
    const [showLinkSearch, setShowLinkSearch] = useState(false);

    // Initial load of content if exists
    useEffect(() => {
        // If we saved it previously, maybe in a specific field or latest file?
        // For now, start empty or check if caseData has it.
        // Assuming we might store it in 'ai_analysis' or similar, but likely we want a dedicated field.
        // We'll just start empty for now.
    }, []);

    const searchCases = async (term) => {
        if (!term || term.length < 3) return;
        setLoading(true);
        try {
            // Search both collections
            const inv = await base44.entities.InvestigationCase.list(); // simplistic search
            // Better to use filter with regex if supported or just client side filter for this prototype
            // given SDK limitations on search.
            // Filter locally for now
            const matches = inv.filter(c => 
                c.id !== caseData.id && 
                (c.case_title?.toLowerCase().includes(term.toLowerCase()) || 
                 c.case_number?.toLowerCase().includes(term.toLowerCase()))
            ).slice(0, 5);
            setSearchResults(matches);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const addLinkedCase = (c) => {
        if (!linkedCases.find(lc => lc.id === c.id)) {
            setLinkedCases([...linkedCases, c]);
        }
        setShowLinkSearch(false);
        setSearchTerm("");
    };

    const removeLinkedCase = (id) => {
        setLinkedCases(linkedCases.filter(c => c.id !== id));
    };

    const handleEvidenceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Mock upload or real upload if we want to process it
        // We just need the name/summary for the prompt right now
        // But for consistency, let's just use the file object locally
        setUploadedEvidence([...uploadedEvidence, { name: file.name, summary: "Pending analysis..." }]);
    };

    const generateReport = async () => {
        setLoading(true);
        try {
            const res = await base44.functions.invoke('generateCaseSummaryDoc', {
                caseId: caseData.id,
                linkedCaseIds: linkedCases.map(c => c.id),
                additionalEvidence: uploadedEvidence
            });
            
            if (res.data.success) {
                setHtmlContent(res.data.content);
                toast.success("Report generated successfully");
            } else {
                toast.error("Failed to generate report");
            }
        } catch (e) {
            toast.error("Error generating report: " + e.message);
        }
        setLoading(false);
    };

    const exportPDF = () => {
        const doc = new jsPDF();
        // Simple HTML strip for PDF text or use html method
        // doc.html is async and requires container
        // Fallback to simple text for this demo or use a proper HTML to PDF lib component
        // Since we can't easily use html2canvas in this env without more setup, 
        // we'll strip tags for the PDF text content or use a basic html method if available.
        
        // A robust way in this restricted env:
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlContent;
        const text = tempDiv.innerText || tempDiv.textContent;
        
        const splitText = doc.splitTextToSize(text, 180);
        doc.text(splitText, 10, 10);
        doc.save(`Case_Summary_${caseData.case_number}.pdf`);
    };

    const saveToCase = async () => {
        setLoading(true);
        try {
            // Generate PDF Blob to upload
            const doc = new jsPDF();
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = htmlContent;
            const text = tempDiv.innerText;
            doc.text(doc.splitTextToSize(text, 180), 10, 10);
            const pdfBlob = doc.output('blob');
            
            // Upload
            const file = new File([pdfBlob], `Summary_${caseData.case_number}.pdf`, { type: 'application/pdf' });
            // Use existing upload integration
            // We need to convert File to base64 or upload via integration if it supports File object directly?
            // The integration `UploadFile` expects 'file' property but SDK usually handles it.
            // Let's assume we can upload.
            
            // If direct upload is tricky from here without form data logic, 
            // we can save the HTML text to a note or new entity 'CaseReport'.
            
            // Let's create a CaseReport or just attach to notes for now as a fallback
            // But ideally we upload. 
            // Let's try to just save the HTML to a "report_content" field in a new entity or `CaseDocument`.
            
            // For now, let's update `InvestigationCase` with `last_summary_report` field (HTML)
            // Note: Schema might need update if we want to store huge HTML.
            // Let's use `CaseNote` for now.
            
             await base44.entities.CaseNote.create({
                case_id: caseData.id,
                note: "Generated Summary Report",
                content: htmlContent, // If we added this field? Or just append to note text
                type: "report",
                author: "system",
                timestamp: new Date().toISOString()
            });

            toast.success("Report saved to case notes");
            if (onUpdate) onUpdate();

        } catch (e) {
            console.error(e);
            toast.error("Failed to save report");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Panel: Configuration */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="bg-[#0f1419] border-cyan-500/20">
                        <CardContent className="p-4 space-y-4">
                            <div>
                                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4 text-cyan-400" />
                                    Linked Cases
                                </h4>
                                <div className="space-y-2 mb-2">
                                    {linkedCases.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-2 bg-[#1a2332] rounded border border-gray-700 text-xs text-gray-300">
                                            <span className="truncate flex-1">{c.case_number || c.case_title}</span>
                                            <button onClick={() => removeLinkedCase(c.id)} className="text-gray-500 hover:text-red-400">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {showLinkSearch ? (
                                    <div className="space-y-2">
                                        <Input 
                                            placeholder="Search case # or title..." 
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                searchCases(e.target.value);
                                            }}
                                            className="h-8 text-xs bg-[#1a2332] border-gray-700"
                                            autoFocus
                                        />
                                        <div className="max-h-32 overflow-y-auto space-y-1">
                                            {searchResults.map(c => (
                                                <div 
                                                    key={c.id} 
                                                    onClick={() => addLinkedCase(c)}
                                                    className="p-2 hover:bg-cyan-500/10 cursor-pointer rounded text-xs text-gray-400"
                                                >
                                                    {c.case_number} - {c.case_title}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setShowLinkSearch(true)}
                                        className="w-full border-dashed border-gray-700 text-gray-400 text-xs"
                                    >
                                        <Plus className="w-3 h-3 mr-2" /> Link Case
                                    </Button>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-800">
                                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <Upload className="w-4 h-4 text-purple-400" />
                                    Extra Evidence
                                </h4>
                                <div className="space-y-2 mb-2">
                                    {uploadedEvidence.map((f, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-[#1a2332] rounded border border-gray-700 text-xs text-gray-300">
                                            <span className="truncate flex-1">{f.name}</span>
                                        </div>
                                    ))}
                                </div>
                                <label className="block">
                                    <input type="file" className="hidden" onChange={handleEvidenceUpload} />
                                    <div className="flex items-center justify-center p-2 border border-dashed border-gray-700 rounded cursor-pointer hover:bg-[#1a2332] transition-colors text-xs text-gray-400">
                                        <Plus className="w-3 h-3 mr-2" /> Add File
                                    </div>
                                </label>
                            </div>

                            <Button 
                                onClick={generateReport} 
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 mt-4"
                            >
                                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                                Generate Summary
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Editor */}
                <div className="md:col-span-2 flex flex-col h-[600px]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-white font-semibold">Report Preview</h3>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={exportPDF} disabled={!htmlContent} className="border-gray-700 text-gray-300">
                                <Download className="w-4 h-4 mr-2" /> PDF
                            </Button>
                            <Button size="sm" onClick={saveToCase} disabled={!htmlContent || loading} className="bg-green-600 hover:bg-green-700 text-white">
                                <Save className="w-4 h-4 mr-2" /> Save to Case
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-lg overflow-hidden text-black">
                        <ReactQuill 
                            theme="snow" 
                            value={htmlContent} 
                            onChange={setHtmlContent}
                            className="h-full pb-10"
                            placeholder="Generated report will appear here..."
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}