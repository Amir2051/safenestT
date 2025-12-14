import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, AlertTriangle, CheckCircle, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function CaseWalletTracer({ caseId, caseData, monitoredWallets = [], onWalletAdded }) {
    const [address, setAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [traceData, setTraceData] = useState(null);
    const [adding, setAdding] = useState(false);

    const handleTrace = async () => {
        if (!address) return;
        setLoading(true);
        setTraceData(null);
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

            const doc = new jsPDF();
            
            // Branding & Header
            doc.setFillColor(26, 35, 50); // Dark Blue Header
            doc.rect(0, 0, 210, 40, 'F');
            
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text("Crypto Intelligence Report", 20, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(200, 200, 200);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
            doc.text(`Case ID: ${caseData?.case_number || caseId}`, 140, 30);

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
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Confidential - Digital Forensics Lab - Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
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