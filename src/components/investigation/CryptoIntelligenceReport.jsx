import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Loader2, Printer, RefreshCw, Shield, FileText, Lock, Unlock, 
  Eye, EyeOff, Edit2, Save, AlertTriangle, Download
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CryptoIntelligenceReport({ caseData }) {
  const [reportData, setReportData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Admin Controls State
  const [redactedFields, setRedactedFields] = useState(new Set());
  const [lockedFields, setLockedFields] = useState(new Set());
  const [edits, setEdits] = useState({}); // { id: { field: value } }
  const [editingId, setEditingId] = useState(null);

  const fetchReportData = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('generateCryptoReportData', {
        caseId: caseData.id,
        linkedCaseIds: []
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data.data;
    },
    onSuccess: (data) => {
      setReportData(data);
      toast.success("Intelligence data refreshed");
    },
    onError: (err) => toast.error("Failed to fetch intelligence: " + err.message)
  });

  // Initial fetch
  useEffect(() => {
    fetchReportData.mutate();
  }, []);

  const handleDownloadReport = async () => {
    const toastId = toast.loading("Generating Full Case Report...");
    try {
        const response = await base44.functions.invoke('generateCasePdf', { caseId: caseData.id });

        if (response.headers && response.headers['content-type'] === 'application/json') {
            if (response.data.error) throw new Error(response.data.error);
        }

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Full_Case_Report_${caseData.case_number || caseData.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Report Downloaded Successfully", { id: toastId });
    } catch (e) {
        let errorMsg = "Generation failed";
        if (e.response?.data instanceof ArrayBuffer) {
            try {
                const dec = new TextDecoder();
                const text = dec.decode(e.response.data);
                const json = JSON.parse(text);
                errorMsg = json.error || errorMsg;
            } catch(err){}
        } else if (e.message) {
            errorMsg = e.message;
        }
        toast.error(errorMsg, { id: toastId });
    }
  };

  const toggleRedact = (id) => {
    const next = new Set(redactedFields);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setRedactedFields(next);
  };

  const toggleLock = (id) => {
    const next = new Set(lockedFields);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLockedFields(next);
  };

  const handleEdit = (id, field, value) => {
    setEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const getDisplayValue = (id, field, originalValue) => {
    if (redactedFields.has(`${id}-${field}`)) return "[REDACTED]";
    if (edits[id]?.[field] !== undefined) return edits[id][field];
    return originalValue;
  };

  if (!reportData && fetchReportData.isPending) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-cyan-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20 print:hidden">
        <div>
          <h2 className="text-white font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Crypto Intelligence Report
          </h2>
          <p className="text-gray-400 text-sm">Aggregated Intelligence & Forensics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchReportData.mutate()} disabled={fetchReportData.isPending}>
            <RefreshCw className={`w-4 h-4 mr-2 ${fetchReportData.isPending ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button onClick={handleDownloadReport} className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700">
            <Download className="w-4 h-4 mr-2" />
            Download Full Report
          </Button>
          <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print View">
            <Printer className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>

      {/* REPORT CONTENT */}
      {reportData && (
        <div className="bg-white text-black p-8 max-w-[210mm] mx-auto min-h-[297mm] shadow-xl print:shadow-none print:p-0 print:w-full">
            
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-wider">Crypto Intelligence Report</h1>
                    <p className="text-slate-600 font-semibold mt-1">Blockchain Forensics & Attribution</p>
                    <p className="text-slate-500 text-sm">Generated by SafeNestT</p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-sm text-slate-500">Date: {new Date().toLocaleDateString()}</p>
                    <p className="font-mono text-lg font-bold text-slate-800">Case ID: {reportData.meta.primary_case.number || caseData.case_number}</p>
                </div>
            </div>

            {/* 1. Suspect Wallets */}
            <section className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 uppercase flex justify-between">
                    1. Suspect Wallets
                    <span className="text-xs font-normal text-slate-500 normal-case mt-1">Merged from all sources</span>
                </h3>
                <div className="space-y-2">
                    {reportData.intelligence.wallets.length === 0 && <p className="italic text-slate-500">No suspect wallets identified.</p>}
                    {reportData.intelligence.wallets.map((w, i) => (
                        <div key={i} className="group flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200">
                            <div className="font-mono text-sm text-slate-800 break-all">
                                {getDisplayValue(`wallet-${i}`, 'address', w)}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                <button onClick={() => toggleRedact(`wallet-${i}-address`)} title="Redact">
                                    {redactedFields.has(`wallet-${i}-address`) ? <EyeOff className="w-3 h-3 text-red-500" /> : <Eye className="w-3 h-3 text-gray-400" />}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 2. Transaction Analysis */}
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 uppercase">2. Transaction Ledger</h3>
                {reportData.intelligence.transactions.length === 0 ? (
                    <p className="italic text-slate-500">No transactions extracted.</p>
                ) : (
                    <Table className="text-xs border border-slate-200">
                        <TableHeader className="bg-slate-100">
                            <TableRow>
                                <TableHead className="w-24">Date</TableHead>
                                <TableHead>Hash</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Token</TableHead>
                                <TableHead>Source</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.intelligence.transactions.map((tx, i) => (
                                <TableRow key={tx.tx_hash} className={redactedFields.has(`tx-${i}-row`) ? "opacity-25" : ""}>
                                    <TableCell className="font-mono text-slate-600">
                                        {new Date(tx.timestamp).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-mono text-slate-800 break-all max-w-[150px]">
                                        {getDisplayValue(`tx-${i}`, 'hash', tx.tx_hash)}
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-slate-900">
                                        {tx.value_eth || tx.value_wei || '0'}
                                    </TableCell>
                                    <TableCell>{tx.token_symbol || 'ETH'}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                                            {tx.source_case}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </section>

            {/* 3. Chain & Token Summary */}
            <section className="mb-8 break-inside-avoid">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-md font-bold text-slate-800 border-b border-slate-300 pb-2 mb-2 uppercase">3. Networks Identified</h3>
                        <div className="flex flex-wrap gap-2">
                            {reportData.intelligence.chains.length === 0 && <span className="text-sm text-slate-500">None detected</span>}
                            {reportData.intelligence.chains.map(c => (
                                <Badge key={c} className="bg-slate-800 text-white hover:bg-slate-700">{c}</Badge>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-bold text-slate-800 border-b border-slate-300 pb-2 mb-2 uppercase">4. Tokens Involved</h3>
                        <div className="flex flex-wrap gap-2">
                            {reportData.intelligence.tokens.length === 0 && <span className="text-sm text-slate-500">None detected</span>}
                            {reportData.intelligence.tokens.map(t => (
                                <Badge key={t} variant="outline" className="border-slate-400 text-slate-700">{t}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Evidence Source Mapping */}
            <section className="mb-8 break-inside-avoid">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4 uppercase">5. Evidence Source Mapping</h3>
                <Table className="text-xs border border-slate-200">
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead>File Name</TableHead>
                            <TableHead>Origin Case</TableHead>
                            <TableHead>Analysis Summary</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {reportData.evidence_summary.map((ev, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-medium text-slate-900">{ev.filename}</TableCell>
                                <TableCell>
                                    <Badge variant={ev.case_origin === 'Primary' ? 'default' : 'secondary'} className="text-[10px]">
                                        {ev.case_origin}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-600 max-w-[300px] truncate">
                                    {ev.summary?.analysis_text || "Processed"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </section>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
                <p>CONFIDENTIAL INTELLIGENCE DOCUMENT</p>
                <p>Generated {new Date().toLocaleString()} by SafeNestT</p>
            </div>
        </div>
      )}
    </div>
  );
}