import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, AlertTriangle, CheckCircle, ExternalLink, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function CaseWalletTracer({ caseId, caseData, monitoredWallets = [], onWalletAdded }) {
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [traceData, setTraceData] = useState(null);
    const [adding, setAdding] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    const handleTrace = async () => {
        if (!address) return;
        setLoading(true);
        setTraceData(null);
        setAiAnalysis(null);
        try {
            const res = await base44.functions.invoke('blockchainIntelligence', { 
                action: 'track-wallet',
                data: {
                    wallet_address: address,
                    blockchain: 'ethereum',
                    wallet_type: 'unknown',
                    fraud_case_id: caseId
                }
            });
            if (res.data.error) throw new Error(res.data.error);
            
            // Normalize data from blockchainIntelligence to match UI expectations
            const data = res.data.data;
            const normalizedData = {
                address: address,
                balance: data.balance?.amount || 0,
                balanceUSD: data.balance?.usd || 0,
                transactions: data.transactions || [],
                stats: {
                    total: data.transactions?.length || 0
                },
                risks: data.riskScore?.indicators || [],
                riskScore: data.riskScore?.score || 0
            };
            
            setTraceData(normalizedData);
            toast.success("Wallet traced successfully");
        } catch (error) {
            toast.error(error.message || "Failed to trace wallet");
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeAI = async () => {
        if (!traceData?.transactions) return;
        setAnalyzing(true);
        const toastId = toast.loading("AI analyzing transaction patterns...");
        try {
            const res = await base44.functions.invoke('analyzeTransactionsAI', {
                transactions: traceData.transactions,
                address: traceData.address
            });
            if (res.data.success) {
                setAiAnalysis(res.data.analysis);
                toast.success("Pattern analysis complete", { id: toastId });
            } else {
                throw new Error(res.data.error);
            }
        } catch (e) {
            toast.error("Analysis failed: " + e.message, { id: toastId });
        }
        setAnalyzing(false);
    };

    const handleAddToReport = async () => {
        if (!traceData || !address) return;
        
        const toastId = toast.loading("Generating report...");
        try {
            // Fetch case summary
            let caseSummary = "Summary not available.";
            try {
                const summaryRes = await base44.functions.invoke('caseSummary', { 
                    caseId,
                    entityName: caseData?._entityName || 'MyCase'
                });
                if (summaryRes.data?.success) {
                    caseSummary = summaryRes.data.summary;
                } else if (caseData?.description) {
                    caseSummary = caseData.description;
                }
            } catch (e) {
                console.warn("Summary fetch failed, falling back to description");
                caseSummary = caseData?.description || "No description available.";
            }

            // Fetch Logo
            const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690cdf897b59e44d278ad008/f1f9f692a_AQPdYUAcWfSxcbl5WH1P7SHWzE69TPlSNmOOjFqmImtFnSve6HFjkZH2apvzXZjK2y6qEy-eyKZh-UhbfbQkKebhM9nYOpiVBMjjOkG5bcl67Qn9pdXC5KgkKkF0yVNx.jpeg";
            let logoBase64 = null;
            try {
                const logoRes = await fetch(logoUrl);
                const logoBuf = await logoRes.arrayBuffer();
                logoBase64 = btoa(new Uint8Array(logoBuf).reduce((data, byte) => data + String.fromCharCode(byte), ''));
            } catch (e) {
                console.warn("Logo fetch failed", e);
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;

            // Branding & Header
            if (logoBase64) {
                doc.addImage(logoBase64, 'JPEG', margin, 10, 15, 15);
            }
            
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text("SafeNestT®", margin + 20, 20);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 100);
            doc.text("CRYPTO INTELLIGENCE REPORT", margin + 20, 25);
            
            doc.setFontSize(10);
            doc.setTextColor(200, 0, 0);
            doc.text("CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE", pageWidth - margin, 20, { align: 'right' });

            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin, 26, { align: 'right' });
            doc.text(`Case ID: ${caseData?.case_number || caseId}`, pageWidth - margin, 32, { align: 'right' });

            // Line separator
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, 38, pageWidth - margin, 38);

            // 1. Case Context Section
            let y = 55;
            doc.setFontSize(16);
            doc.setTextColor(26, 35, 50);
            doc.text("1. Case Overview", 20, y);
            y += 10;
            
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            doc.text(`Case Title: ${caseData?.case_title || 'Untitled Case'}`, 20, y);
            y += 7;
            if (caseData?.client_name) {
                doc.text(`Client: ${caseData.client_name}`, 20, y);
                y += 7;
            }
            
            y += 5;
            doc.setFontSize(10);
            const splitSummary = doc.splitTextToSize(caseSummary, 170);
            doc.text(splitSummary, 20, y);
            
            y += (splitSummary.length * 5) + 15;

            // 2. Wallet Intelligence Section
            doc.setFontSize(16);
            doc.setTextColor(26, 35, 50);
            doc.text("2. Wallet Forensic Analysis", 20, y);
            y += 10;

            // Wallet Header Box
            doc.setFillColor(245, 245, 245);
            doc.setDrawColor(200, 200, 200);
            doc.rect(20, y, 170, 25, 'FD');
            
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(address, 25, y + 10);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text("Target Wallet Address", 25, y + 20);
            
            y += 35;

            // Stats Grid
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`Current Balance: ${traceData.balance} ETH ($${traceData.balanceUSD?.toLocaleString()})`, 20, y);
            doc.text(`Total Transactions: ${traceData.stats?.total}`, 110, y);
            y += 10;
            
            if (traceData.risks?.length > 0) {
                doc.setTextColor(220, 50, 50); // Red for risks
                doc.setFont("helvetica", "bold");
                doc.text(`Risk Score: ${traceData.riskScore}/100`, 20, y);
                y += 7;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                traceData.risks.forEach(risk => {
                    doc.text(`• ${risk}`, 25, y);
                    y += 6;
                });
                doc.setTextColor(0, 0, 0);
            } else {
                doc.setTextColor(0, 150, 0);
                doc.text("Risk Score: Low", 20, y);
                doc.setTextColor(0, 0, 0);
            }
            
            y += 10;
            
            // 3. Transaction Log
            doc.setFontSize(14);
            doc.setTextColor(26, 35, 50);
            doc.text("Recent Activity Log", 20, y);
            y += 10;
            
            // Table Header
            doc.setFillColor(230, 230, 230);
            doc.rect(20, y - 5, 170, 8, 'F');
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("Date", 22, y);
            doc.text("Type", 60, y);
            doc.text("Amount", 90, y);
            doc.text("Tx Hash", 130, y);
            y += 8;
            doc.setFont("helvetica", "normal");
            
            (traceData.transactions || []).slice(0, 15).forEach((tx, i) => {
                if (y > 270) { 
                    doc.addPage(); 
                    y = 20; 
                    // Re-draw header if new page
                    doc.setFontSize(9);
                    doc.setFont("helvetica", "bold");
                    doc.text("Date", 22, y);
                    doc.text("Type", 60, y);
                    doc.text("Amount", 90, y);
                    doc.text("Tx Hash", 130, y);
                    y += 8;
                    doc.setFont("helvetica", "normal");
                }
                
                const date = new Date(tx.timestamp).toLocaleDateString();
                const type = tx.to?.toLowerCase() === address.toLowerCase() ? 'INCOMING' : 'OUTGOING';
                const amount = `${parseFloat(tx.value).toFixed(4)} ETH`;
                const hash = tx.hash.substring(0, 16) + "...";
                
                if (i % 2 === 0) {
                    doc.setFillColor(250, 250, 250);
                    doc.rect(20, y - 5, 170, 8, 'F');
                }
                
                doc.setTextColor(0, 0, 0);
                doc.text(date, 22, y);
                
                if (type === 'INCOMING') doc.setTextColor(0, 128, 0);
                else doc.setTextColor(180, 0, 0);
                doc.text(type, 60, y);
                
                doc.setTextColor(0, 0, 0);
                doc.text(amount, 90, y);
                
                doc.setTextColor(100, 100, 100);
                doc.text(hash, 130, y);
                
                y += 8;
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
                
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                
                const discl1 = "This document is generated by SafeNestT® for intelligence and documentation purposes only.";
                const discl2 = "SafeNestT® is not a law enforcement agency and does not guarantee recovery.";
                
                doc.text(discl1, pageWidth / 2, pageHeight - 25, { align: 'center' });
                doc.text(discl2, pageWidth / 2, pageHeight - 21, { align: 'center' });
                
                doc.setTextColor(200, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text("CONFIDENTIAL – LAW ENFORCEMENT SENSITIVE", pageWidth / 2, pageHeight - 15, { align: 'center' });
                
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
                doc.text(`SafeNestT®`, margin, pageHeight - 15);
                doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
            }

            doc.save(`Forensic_Report_${caseData?.case_number || 'Case'}_${address.substring(0, 6)}.pdf`);
            toast.success("Report generated and downloaded", { id: toastId });

        } catch (e) {
            console.error("PDF Gen Error:", e);
            toast.error("Failed to generate report: " + e.message, { id: toastId });
        }
    };

    return (
        <Card className="bg-[#0f1419] border-cyan-500/20 mb-6">
            <CardContent className="p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="text-xs text-gray-400 mb-1 block">Trace Wallet Address</label>
                        <div className="flex gap-2">
                            <Input 
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Enter ETH address (0x...)"
                                className="bg-[#1a2332] border-cyan-500/20 text-white font-mono"
                            />
                            <Button 
                                onClick={handleTrace} 
                                disabled={loading || !address}
                                className="bg-cyan-600 hover:bg-cyan-700 shrink-0"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                                Trace
                            </Button>
                        </div>
                    </div>
                </div>

                {traceData && (
                    <div className="bg-[#1a2332] rounded-lg p-4 border border-cyan-500/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-cyan-400 font-semibold flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" /> Wallet Analysis
                                </h4>
                                <p className="text-xs text-gray-400 mt-1 font-mono">{traceData.address}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleAddToReport}
                                    className="border-blue-500/30 text-blue-400 hover:bg-blue-900/20"
                                >
                                    <FileText className="w-3 h-3 mr-2" />
                                    Add to Report (PDF)
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleAnalyzeAI}
                                    disabled={analyzing}
                                    className="border-purple-500/30 text-purple-400 hover:bg-purple-900/20"
                                >
                                    {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-2" />}
                                    AI Pattern Scan
                                </Button>
                                {!monitoredWallets.includes(traceData.address) && (
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => onWalletAdded && onWalletAdded(traceData.address)}
                                        disabled={adding}
                                        className="border-green-500/30 text-green-400 hover:bg-green-900/20"
                                    >
                                        {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 mr-2" />}
                                        Add to Monitor
                                    </Button>
                                )}
                            </div>
                        </div>

                        {aiAnalysis && (
                            <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg animate-in fade-in zoom-in duration-300">
                                <h5 className="text-purple-400 font-bold flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4" /> AI Forensic Insight
                                </h5>
                                <p className="text-sm text-gray-200 mb-3">{aiAnalysis.summary}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="font-semibold text-gray-400 mb-1">Detected Patterns</p>
                                        <ul className="list-disc list-inside text-gray-300">
                                            {aiAnalysis.patterns?.map((p, i) => <li key={i}>{p}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-400 mb-1">Anomalies</p>
                                        <ul className="list-disc list-inside text-red-300">
                                            {aiAnalysis.anomalies?.map((a, i) => <li key={i}>{a}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="p-3 bg-black/20 rounded">
                                <p className="text-xs text-gray-500">Balance</p>
                                <p className="text-white font-bold">{traceData.balance} ETH</p>
                            </div>
                            <div className="p-3 bg-black/20 rounded">
                                <p className="text-xs text-gray-500">Transactions</p>
                                <p className="text-white font-bold">{traceData.stats?.total || 0}</p>
                            </div>
                            <div className="p-3 bg-black/20 rounded">
                                <p className="text-xs text-gray-500">Tokens</p>
                                <p className="text-white font-bold">{traceData.tokens?.length || 0}</p>
                            </div>
                            <div className="p-3 bg-black/20 rounded">
                                <p className="text-xs text-gray-500">Risk Indicators</p>
                                <p className={`font-bold ${traceData.risks?.length > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {traceData.risks?.length || 0} Flags
                                </p>
                            </div>
                        </div>

                        {traceData.risks?.length > 0 && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-sm">
                                <p className="text-red-400 font-semibold flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4" /> Risk Factors
                                </p>
                                <ul className="list-disc list-inside text-gray-300 space-y-1">
                                    {traceData.risks.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="space-y-2">
                            <p className="text-xs text-gray-400 font-semibold uppercase">Recent Activity</p>
                            <div className="space-y-1">
                                {traceData.transactions?.slice(0, 3).map((tx, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs p-2 bg-black/20 rounded hover:bg-black/30 transition-colors">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Badge variant="outline" className={`
                                                ${tx.to?.toLowerCase() === traceData.address.toLowerCase() ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}
                                                text-[10px] w-12 justify-center
                                            `}>
                                                {tx.to?.toLowerCase() === traceData.address.toLowerCase() ? 'IN' : 'OUT'}
                                            </Badge>
                                            <span className="font-mono text-gray-300 truncate w-24">{tx.hash.substring(0, 10)}...</span>
                                            <span className="text-gray-500">{new Date(tx.timeStamp * 1000).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-mono">{tx.value} ETH</span>
                                            <a 
                                                href={`https://etherscan.io/tx/${tx.hash}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="text-cyan-400 hover:text-cyan-300"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}