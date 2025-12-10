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
            const response = await base44.integrations.Core.UploadFile({ file });
            const fileUrl = response.file_url;
            
            // 2. Fetch Owner
            let caseOwnerEmail = null;
            try {
                const currentCase = await base44.entities.MyCase.get(caseId);
                caseOwnerEmail = currentCase.created_by || currentCase.client_email;
            } catch (e) {}

            // 3. Create Record
            const record = await base44.entities.CaseEvidenceFile.create({
                case_id: caseId,
                file_url: fileUrl,
                filename: file.name,
                file_size: file.size,
                mime_type: file.type,
                uploader_id: (await base44.auth.me()).id,
                case_owner_email: caseOwnerEmail,
                uploaded_at: new Date().toISOString(),
                parse_status: 'PENDING'
            });

            // 4. Trigger Auto-Analysis
            toast.info("Analyzing evidence...");
            await base44.functions.invoke('evidenceProcessing', {
                action: 'process_upload',
                data: {
                    caseId,
                    evidenceFileId: record.id,
                    fileUrl,
                    fileType: file.type,
                    fileName: file.name
                }
            });

            return record;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['evidence-files']);
            queryClient.invalidateQueries(['my-cases']); 
            toast.success("Evidence uploaded and analyzed successfully");
        },
        onError: () => toast.error("Upload/Analysis failed")
    });

    // Legacy functions removed as flow is now automated
    const handleParse = (record) => {
        // Fallback for manual re-trigger if needed
        toast.info("Re-analyzing...");
        base44.functions.invoke('evidenceProcessing', {
            action: 'process_upload',
            data: {
                caseId,
                evidenceFileId: record.id,
                fileUrl: record.file_url,
                fileType: record.mime_type || 'application/octet-stream',
                fileName: record.filename
            }
        }).then(() => {
            toast.success("Analysis complete");
            queryClient.invalidateQueries(['evidence-files']);
        });
    };

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

    const handleUploadFiles = async (files) => {
        if (files.length === 0) return;
        setUploading(true);
        for (const file of files) {
            await uploadMutation.mutateAsync(file);
        }
        setUploading(false);
    };

    const handleFileSelect = (e) => {
        handleUploadFiles(Array.from(e.target.files));
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUploadFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
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
                    <div 
                        className="border-2 border-dashed border-cyan-500/30 rounded-lg p-8 text-center hover:bg-cyan-500/5 transition-colors"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                            id="evidence-upload"
                            accept=".csv,.json,.txt,.xls,.xlsx,.html,.pdf,.jpg,.jpeg,.png,.doc,.docx"
                        />
                        <label htmlFor="evidence-upload" className="cursor-pointer block">
                            <Upload className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                            <p className="text-white font-medium mb-1">
                                {uploading ? "Uploading..." : "Click to Upload Evidence Files"}
                            </p>
                            <p className="text-gray-400 text-sm">
                                Supported: PDF, Images, CSV, JSON, Excel, Docs (Auto-Parsing Enabled)
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

            {/* Preview Dialog - Removed (Automated Flow) */}
        </div>
    );
}