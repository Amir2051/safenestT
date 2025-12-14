import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, AlertTriangle, CheckCircle, ExternalLink, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function CaseWalletTracer({ caseId, monitoredWallets = [], onWalletAdded }) {
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
                    wallet_type: 'unknown'
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
            const summaryRes = await base44.functions.invoke('caseSummary', { caseId });
            const caseSummary = summaryRes.data?.summary || "No summary available.";

            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(20);
            doc.setTextColor(40, 40, 40);
            doc.text("Crypto Intelligence Report", 20, 20);
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
            doc.text(`Target Wallet: ${address}`, 20, 35);

            // Case Summary Section
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text("Case Context", 20, 50);
            
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            const splitSummary = doc.splitTextToSize(caseSummary, 170);
            doc.text(splitSummary, 20, 60);
            
            let y = 60 + (splitSummary.length * 5) + 10;

            // Wallet Analysis
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text("Wallet Analysis", 20, y);
            y += 10;

            doc.setFontSize(10);
            doc.text(`Balance: ${traceData.balance} ETH`, 20, y);
            doc.text(`Total Transactions: ${traceData.stats?.total}`, 100, y);
            y += 10;
            
            if (traceData.risks?.length > 0) {
                doc.setTextColor(200, 0, 0);
                doc.text("Risk Indicators:", 20, y);
                y += 5;
                traceData.risks.forEach(risk => {
                    doc.text(`- ${risk}`, 25, y);
                    y += 5;
                });
                doc.setTextColor(0, 0, 0);
            }
            
            y += 5;
            doc.text("Recent Activity:", 20, y);
            y += 5;
            
            (traceData.transactions || []).slice(0, 10).forEach(tx => {
                if (y > 280) { doc.addPage(); y = 20; }
                const date = new Date(tx.timestamp).toLocaleDateString();
                const type = tx.to?.toLowerCase() === address.toLowerCase() ? 'IN' : 'OUT';
                doc.text(`${date} | ${type} | ${tx.value} ETH | Hash: ${tx.hash.substring(0, 15)}...`, 20, y);
                y += 5;
            });

            doc.save(`Intel_Report_${address.substring(0, 6)}.pdf`);
            toast.success("Report generated and downloaded", { id: toastId });

        } catch (e) {
            console.error(e);
            toast.error("Failed to generate report", { id: toastId });
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