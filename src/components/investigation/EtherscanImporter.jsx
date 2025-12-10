import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Loader2, 
  ArrowRight, Shield
} from "lucide-react";
import { toast } from "sonner";

export default function EtherscanImporter({ caseData, onTransactionsImported }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [victimAddr, setVictimAddr] = useState('');
  const [scammerAddr, setScammerAddr] = useState('');
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      // 1. Upload
      const response = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = response.file_url;
      
      // 2. Create Record
      const record = await base44.entities.CaseEvidenceFile.create({
        case_id: caseData.id,
        file_url: fileUrl,
        filename: file.name,
        file_size: file.size,
        mime_type: file.type || 'text/csv',
        uploader_id: (await base44.auth.me()).id,
        uploaded_at: new Date().toISOString(),
        parse_status: 'PENDING'
      });
      return record;
    },
    onSuccess: (record) => {
      toast.info("File uploaded, analyzing...");
      parseMutation.mutate(record);
    },
    onError: () => toast.error("Upload failed")
  });

  const parseMutation = useMutation({
    mutationFn: async (record) => {
      const res = await base44.functions.invoke('evidenceProcessing', {
        action: 'parse',
        data: {
          fileUrl: record.file_url,
          fileType: record.mime_type || 'text/csv',
          caseId: caseData.id
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
      toast.success(`Found ${data.total_found} transactions`);
    },
    onError: (err) => {
      toast.error("Parsing failed: " + err.message);
      setUploading(false);
    }
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('evidenceProcessing', {
        action: 'confirm',
        data: {
          caseId: caseData.id,
          evidenceFileId: currentFileId,
          transactions: previewData.transactions,
          victimAddress: victimAddr,
          scammerAddress: scammerAddr
        }
      });
      if (res.data.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Transactions imported and linked successfully!");
      if (onTransactionsImported) onTransactionsImported(previewData.transactions);
      
      // Reset
      setPreviewData(null);
      setCurrentFileId(null);
      setUploading(false);
      queryClient.invalidateQueries(['my-cases']); 
      queryClient.invalidateQueries(['evidence-files']);
    },
    onError: (err) => toast.error("Import failed: " + err.message)
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    if (!file) return;
    // Reset state for re-parsing
    setPreviewData(null);
    setCurrentFileId(null);
    setUploading(true);
    
    console.log("Starting upload for:", file.name);
    uploadMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            Import from Etherscan CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive ? 'border-cyan-400 bg-cyan-500/10' : 'border-gray-600 hover:border-cyan-500/50'
            }`}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer?.files?.[0];
              if (file) processFile(file);
            }}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-cyan-400' : 'text-gray-500'}`} />
            <p className="text-white font-semibold mb-2">
              Drag & drop Etherscan CSV here
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Supported formats: CSV, Excel, JSON
            </p>
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv,.xlsx,.json" 
              className="hidden" 
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
              disabled={uploading}
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Upload & Analyze</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewData} onOpenChange={(open) => !open && setPreviewData(null)}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Transaction Import</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-gray-400 text-xs uppercase mb-1">Total Transactions</p>
                <p className="text-2xl font-bold text-green-400">{previewData?.total_found}</p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-gray-400 text-xs uppercase mb-1">Status</p>
                <p className="text-lg font-bold text-blue-400">Ready to Import</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Victim Wallet (Auto-detected)</Label>
                <Input 
                  value={victimAddr} 
                  onChange={(e) => setVictimAddr(e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/30 text-white font-mono text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300">Scammer Wallet (Auto-detected)</Label>
                <Input 
                  value={scammerAddr} 
                  onChange={(e) => setScammerAddr(e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/30 text-white font-mono text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Transaction Preview</Label>
              <ScrollArea className="h-[200px] bg-[#0f1419] rounded-lg border border-cyan-500/20 p-2">
                <div className="space-y-2">
                  {previewData?.transactions?.slice(0, 10).map((tx, idx) => (
                    <div key={idx} className="text-xs p-2 bg-[#1a2332] rounded flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="font-mono text-cyan-400 truncate w-32">{tx.tx_hash}</span>
                        <span className="text-gray-500">{new Date(tx.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end text-gray-300">
                          <span className="font-mono">{tx.from_address?.substring(0,6)}...</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="font-mono">{tx.to_address?.substring(0,6)}...</span>
                        </div>
                        <span className="text-green-400 font-bold">{tx.value_eth} {tx.token_symbol}</span>
                      </div>
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
              {confirmMutation.isPending ? "Importing..." : "Confirm & Import Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}