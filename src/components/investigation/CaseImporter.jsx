import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Loader2, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function CaseImporter({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [step, setStep] = useState('upload'); // upload, reviewing, creating

  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (fileToUpload) => {
      // 1. Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileToUpload });
      
      // 2. Extract data
      const response = await base44.functions.invoke('federalCaseManager', {
        endpoint: 'extract-from-file',
        data: { file_url }
      });
      return { ...response.data.extracted_data, evidence_file: file_url };
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setStep('reviewing');
    },
    onError: (err) => toast.error("Extraction failed: " + err.message)
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data) => {
      const finalData = {
        ...data,
        status: 'new',
        created_by: (await base44.auth.me()).email,
        evidence_files: data.evidence_file ? [{
          name: 'Initial Import Document',
          url: data.evidence_file,
          type: 'document',
          uploaded_date: new Date().toISOString()
        }] : []
      };
      // Remove temporary fields
      delete finalData.evidence_file;
      
      return await base44.entities.InvestigationCase.create(finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['investigation-cases']);
      toast.success("Case created successfully");
      if (onImported) onImported();
      if (onClose) onClose();
    }
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleDataChange = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="w-6 h-6 text-cyan-400" />
            Import Federal Case
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-10 text-center space-y-4">
            <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-600">
              {uploadMutation.isPending ? (
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              ) : (
                <FileText className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-lg font-semibold">Upload Case File</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              Upload PDF, PNG, or JPG. AI will automatically extract victim details, suspect info, and transaction data.
            </p>
            <div className="relative inline-block">
              <Button className="bg-cyan-600 hover:bg-cyan-700">
                Select File
              </Button>
              <input 
                type="file" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                disabled={uploadMutation.isPending}
              />
            </div>
            {uploadMutation.isPending && (
              <p className="text-sm text-cyan-400 animate-pulse mt-2">
                Extracting case intelligence...
              </p>
            )}
          </div>
        )}

        {step === 'reviewing' && extractedData && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              Data extracted successfully. Please review before creating.
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Case Title</Label>
                <Input 
                  value={extractedData.case_title || ''} 
                  onChange={(e) => handleDataChange('case_title', e.target.value)}
                  className="bg-[#0f1419] border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>IC3 Complaint #</Label>
                <Input 
                  value={extractedData.ic3_complaint_number || ''} 
                  onChange={(e) => handleDataChange('ic3_complaint_number', e.target.value)}
                  className="bg-[#0f1419] border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Victim Name</Label>
                <Input 
                  value={extractedData.victim_name || ''} 
                  onChange={(e) => handleDataChange('victim_name', e.target.value)}
                  className="bg-[#0f1419] border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount Stolen (USD)</Label>
                <Input 
                  type="number"
                  value={extractedData.amount_stolen_usd || 0} 
                  onChange={(e) => handleDataChange('amount_stolen_usd', parseFloat(e.target.value))}
                  className="bg-[#0f1419] border-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={extractedData.description || ''} 
                onChange={(e) => handleDataChange('description', e.target.value)}
                className="bg-[#0f1419] border-gray-700 min-h-[100px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setStep('upload')}>Back</Button>
              <Button 
                onClick={() => createCaseMutation.mutate(extractedData)}
                disabled={createCaseMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {createCaseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Create Case'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}