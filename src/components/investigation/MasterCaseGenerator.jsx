import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    FileText, Download, RefreshCw, Briefcase, 
    ShieldCheck, AlertTriangle, Printer, Save, Loader2
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function MasterCaseGenerator({ onClose }) {
    const [masterCase, setMasterCase] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Editor State
    const [summary, setSummary] = useState("");
    const [analysis, setAnalysis] = useState("");

    useEffect(() => {
        loadMasterCase();
    }, []);

    const loadMasterCase = async (force = false) => {
        setLoading(true);
        try {
            // Call createMasterCase with regenerate=false to fetch or create if missing
            const res = await base44.functions.invoke('createMasterCase', { regenerate: force });
            if (res.data.success) {
                setMasterCase(res.data.masterCase);
                setSummary(res.data.masterCase.merged_summary || "");
                setAnalysis(res.data.masterCase.pattern_analysis || "");
                if (force) toast.success("Master Case Regenerated");
            } else {
                toast.error(res.data.error || "Failed to load Master Case");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading Master Case");
        }
        setLoading(false);
    };

    const handleRegenerate = () => {
        if (confirm("This will overwrite your current edits with a new AI analysis. Continue?")) {
            loadMasterCase(true);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await base44.entities.MasterCase.update(masterCase.id, {
                merged_summary: summary,
                pattern_analysis: analysis,
                status: 'finalized'
            });
            toast.success("Master Case Saved");
        } catch (error) {
            toast.error("Failed to save");
        }
        setSaving(false);
    };

    const handleExportPDF = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Master Case Report - SafeNestT</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { padding: 40px; font-family: sans-serif; font-size: 12px; }
                        h1 { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
                        h2 { font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f3f4f6; }
                        .stats { display: flex; gap: 20px; margin-bottom: 20px; }
                        .stat-box { background: #f9fafb; padding: 10px; border-radius: 5px; border: 1px solid #e5e7eb; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <h1>Master Case Intelligence Report</h1>
                    
                    <div class="stats">
                        <div class="stat-box">
                            <strong>Total Loss:</strong> $${(masterCase.total_loss || 0).toLocaleString()}
                        </div>
                        <div class="stat-box">
                            <strong>Cases Linked:</strong> ${masterCase.linked_case_ids?.length || 0}
                        </div>
                        <div class="stat-box">
                            <strong>Generated:</strong> ${new Date(masterCase.generated_date).toLocaleDateString()}
                        </div>
                        <div class="stat-box">
                            <strong>Victim ID:</strong> ${masterCase.user_id}
                        </div>
                    </div>

                    <h2>Executive Summary</h2>
                    <div>${summary}</div>

                    <h2>Pattern Analysis</h2>
                    <div>${analysis}</div>

                    <h2>Chronological Scam Incidents</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Platform</th>
                                <th>Method</th>
                                <th>Loss Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(masterCase.scam_list || []).map(scam => `
                                <tr>
                                    <td>${new Date(scam.date).toLocaleDateString()}</td>
                                    <td>${scam.platform}</td>
                                    <td>${scam.method}</td>
                                    <td>$${scam.amount.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <h2>Identified Wallets</h2>
                    <ul>
                        ${(masterCase.wallet_addresses || []).map(w => `<li>${w}</li>`).join('')}
                    </ul>

                    <h2>Evidence Inventory</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Type</th>
                                <th>Source Case</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(masterCase.evidence_index || []).map(ev => `
                                <tr>
                                    <td>${ev.name}</td>
                                    <td>${ev.type}</td>
                                    <td>${ev.source_case}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div style="margin-top: 40px; font-size: 10px; color: #666; text-align: center;">
                        Generated by SafeNestT Intelligence System. This document is formatted for IC3/FBI submission.
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        // Give time for styles to load (though tailwind cdn might take a sec, raw styles above handle basics)
        setTimeout(() => printWindow.print(), 500);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 min-h-[400px]">
                <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
                <p>Aggregating case data...</p>
                <p className="text-xs mt-2">Connecting wallets, transactions, and evidence files.</p>
            </div>
        );
    }

    if (!masterCase) {
        return <div className="p-8 text-center text-red-400">Failed to load Master Case.</div>;
    }

    return (
        <Card className="w-full bg-[#0f1419] border-cyan-500/20 text-white shadow-2xl h-[85vh] flex flex-col">
            <CardHeader className="border-b border-gray-800 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Briefcase className="w-6 h-6 text-cyan-400" />
                            Master Case Intelligence Report
                        </CardTitle>
                        <div className="flex gap-4 mt-2 text-sm text-gray-400">
                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-400"/> {masterCase.linked_case_ids?.length} Cases Linked</span>
                            <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400"/> ${masterCase.total_loss?.toLocaleString()} Total Loss</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRegenerate} className="border-gray-700 text-gray-300">
                            <RefreshCw className="w-4 h-4 mr-2" /> Regenerate AI
                        </Button>
                        <Button variant="outline" onClick={handleSave} disabled={saving} className="border-gray-700 text-green-400 hover:text-green-300">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save
                        </Button>
                        <Button 
                            onClick={handleExportPDF} 
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                        >
                            <Printer className="w-4 h-4 mr-2" /> 
                            Export PDF
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Sidebar Stats */}
                <div className="w-full md:w-64 bg-[#1a2332] border-r border-gray-800 p-4 overflow-y-auto shrink-0">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Scam Timeline</h3>
                    <div className="space-y-3 mb-6">
                        {masterCase.scam_list?.map((s, i) => (
                            <div key={i} className="p-2 bg-black/20 rounded border border-gray-700/50 text-xs">
                                <div className="text-cyan-400 font-medium">{new Date(s.date).toLocaleDateString()}</div>
                                <div className="text-white truncate">{s.platform}</div>
                                <div className="text-red-400">${s.amount?.toLocaleString()}</div>
                            </div>
                        ))}
                    </div>

                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Evidence Files</h3>
                    <div className="space-y-2">
                        {masterCase.evidence_index?.map((e, i) => (
                            <a key={i} href={e.url} target="_blank" rel="noreferrer" className="block p-2 bg-black/20 rounded border border-gray-700/50 text-xs hover:bg-black/40">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <FileText className="w-3 h-3" />
                                    <span className="truncate">{e.name}</span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Main Editor */}
                <div className="flex-1 overflow-y-auto bg-white text-black p-6">
                    <div className="max-w-3xl mx-auto space-y-8">
                        <div>
                            <h2 className="text-xl font-bold mb-2 text-gray-800 border-b pb-2">Master Narrative</h2>
                            <ReactQuill 
                                theme="snow" 
                                value={summary} 
                                onChange={setSummary}
                                className="bg-white"
                            />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold mb-2 text-gray-800 border-b pb-2">Pattern Analysis</h2>
                            <ReactQuill 
                                theme="snow" 
                                value={analysis} 
                                onChange={setAnalysis}
                                className="bg-white"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}