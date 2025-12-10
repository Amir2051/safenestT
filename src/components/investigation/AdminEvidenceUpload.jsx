import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, CheckCircle, AlertTriangle, Trash2, RefreshCw, Eye, Download, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminEvidenceUpload({ caseId }) {
    const [uploading, setUploading] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [currentFileId, setCurrentFileId] = useState(null);
    const [victimAddr, setVictimAddr] = useState('');
    const [scammerAddr, setScammerAddr] = useState('');
    const queryClient = useQueryClient();

    // Fetch existing evidence files
    const { data: evidenceFiles = [], isLoading } = useQuery({
        queryKey: ['evidence-files', caseId],
        queryFn: async () => {
            return await base44.entities.CaseEvidenceFile.filter({ case_id: caseId }, '-uploaded_at');
        }
    });

    const uploadMutation = useMutation({
        mutationFn: async (file) => {
            // 1. Upload to storage
            const { data } = await base44.integrations.Core.UploadFile({ file });
            
            // 2. Create entity record
            const record = await base44.entities.CaseEvidenceFile.create({
                case_id: caseId,
                file_url: data.file_url,
                filename: file.name,
                file_size: file.size,
                mime_type: file.type,
                uploader_id: (await base44.auth.me()).id,
                uploaded_at: new Date().toISOString(),
                parse_status: 'PENDING'
            });

            return record;
        },
        onSuccess: (record) => {
            queryClient.invalidateQueries(['evidence-files']);
            handleParse(record); // Auto-trigger parse
        },
        onError: () => toast.error("Upload failed")
    });

    const parseMutation = useMutation({
        mutationFn: async (record) => {
            const res = await base44.functions.invoke('evidenceProcessing', {
                action: 'parse',
                data: {
                    fileUrl: record.file_url,
                    fileType: record.mime_type || 'text/plain',
                    caseId: caseId
                }
            });
            if (res.data.error) throw new Error(res.data.error);
            return { ...res.data, record };
        },
        onSuccess: (data) => {
            setPreviewData(data);
            setCurrentFileId(data.record.id);
            setVictimAddr(data.detected_addresses?.victim?.[0] || '');
            setScammerAddr(data.detected_addresses?.scammer?.[0] || '');
        },
        onError: (err) => toast.error("Parsing failed: " + err.message)
    });

    const confirmMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('evidenceProcessing', {
                action: 'confirm',
                data: {
                    caseId,
                    evidenceFileId: currentFileId,
                    transactions: previewData.transactions, // Send all (in real app, might just send ID if cached backend side, but here sending back)
                    victimAddress: victimAddr,
                    scammerAddress: scammerAddr
                }
            });
            if (res.data.error) throw new Error(res.data.error);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Evidence confirmed and processed");
            setPreviewData(null);
            setCurrentFileId(null);
            queryClient.invalidateQueries(['evidence-files']);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await base44.functions.invoke('evidenceProcessing', {
                action: 'delete_evidence',
                data: { id }
            });
        },
        onSuccess: () => {
            toast.success("Evidence deleted");
            queryClient.invalidateQueries(['evidence-files']);
        }
    });

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setUploading(true);
        for (const file of files) {
            await uploadMutation.mutateAsync(file);
        }
        setUploading(false);
    };

    const handleParse = (record) => {
        toast.info("Parsing file...");
        parseMutation.mutate(record);
    };

    return (
        <div className="space-y-6">
            <Card className="bg-[#0f1419] border-cyan-500/20">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-cyan-400" />
                        Admin Evidence Upload
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center hover:bg-cyan-500/5 transition-colors">
                        <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            id="evidence-upload"
                            accept=".csv,.json,.txt,.xls,.xlsx,.html"
                        />
                        <label htmlFor="evidence-upload" className="cursor-pointer block">
                            <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                            <p className="text-white font-medium mb-1">
                                {uploading ? "Uploading..." : "Click to Upload Evidence Files"}
                            </p>
                            <p className="text-gray-400 text-sm">
                                Supported: CSV, JSON, TXT, Excel (Etherscan Exports supported)
                            </p>
                        </label>
                    </div>

                    {/* File List */}
                    <div className="mt-6 space-y-3">
                        {evidenceFiles.map(file => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-[#1a2332] rounded-lg border border-cyan-500/10">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-cyan-400" />
                                    <div>
                                        <p className="text-white text-sm font-medium">{file.filename}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                                                {(file.file_size / 1024).toFixed(1)} KB
                                            </Badge>
                                            <Badge className={`text-xs ${
                                                file.parse_status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                                                file.parse_status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                                                'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                                {file.parse_status}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {file.parse_status !== 'CONFIRMED' && (
                                        <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            onClick={() => handleParse(file)}
                                            title="Reprocess"
                                        >
                                            <RefreshCw className="w-4 h-4 text-cyan-400" />
                                        </Button>
                                    )}
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => window.open(file.file_url, '_blank')}
                                        title="Download"
                                    >
                                        <Download className="w-4 h-4 text-gray-400" />
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => {
                                            if(confirm("Delete this evidence and extracted data?")) {
                                                deleteMutation.mutate(file.id);
                                            }
                                        }}
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-400" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Preview Dialog */}
            <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
                <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Process Evidence File</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                                <p className="text-gray-400 text-xs uppercase mb-1">Transactions Found</p>
                                <p className="text-2xl font-bold text-green-400">{previewData?.total_found}</p>
                            </div>
                            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                <p className="text-gray-400 text-xs uppercase mb-1">Parse Status</p>
                                <p className="text-lg font-bold text-red-400">{previewData?.parse_errors ? 'Errors Found' : 'Clean Parse'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-gray-300">Detected Victim Address</Label>
                                <Input 
                                    value={victimAddr} 
                                    onChange={(e) => setVictimAddr(e.target.value)}
                                    className="bg-[#0f1419] border-cyan-500/30 text-white font-mono text-xs mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-gray-300">Detected Scammer Address</Label>
                                <Input 
                                    value={scammerAddr} 
                                    onChange={(e) => setScammerAddr(e.target.value)}
                                    className="bg-[#0f1419] border-cyan-500/30 text-white font-mono text-xs mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-gray-300 mb-2 block">Transaction Preview (First 5)</Label>
                            <ScrollArea className="h-[200px] bg-[#0f1419] rounded-lg border border-cyan-500/20 p-2">
                                <div className="space-y-2">
                                    {previewData?.transactions?.slice(0, 5).map((tx, idx) => (
                                        <div key={idx} className="text-xs p-2 bg-[#1a2332] rounded flex justify-between">
                                            <span className="font-mono text-cyan-400 truncate w-1/3">{tx.tx_hash}</span>
                                            <span className="text-gray-300">{tx.from_address?.substring(0,6)}... → {tx.to_address?.substring(0,6)}...</span>
                                            <span className="text-green-400">{tx.value_eth} ETH</span>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setPreviewData(null)}>Cancel</Button>
                        <Button 
                            onClick={() => confirmMutation.mutate()} 
                            disabled={confirmMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {confirmMutation.isPending ? "Saving..." : "Confirm & Extract"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}