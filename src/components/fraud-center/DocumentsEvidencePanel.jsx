import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FileText, Upload, Download, Eye, Send, Loader2,
  FolderOpen, CheckCircle, Clock, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import CaseDocuments from "@/components/investigation/CaseDocuments";

export default function DocumentsEvidencePanel({ user }) {
  const [selectedCase, setSelectedCase] = useState("");
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['investigation-cases'],
    queryFn: () => base44.entities.InvestigationCase.list('-created_date', 100)
  });

  const selectedCaseData = cases.find(c => c.id === selectedCase);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCase) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const evidenceFiles = selectedCaseData?.evidence_files || [];
      evidenceFiles.push({
        name: file.name,
        url: file_url,
        type: file.type,
        uploaded_date: new Date().toISOString()
      });

      await base44.entities.InvestigationCase.update(selectedCase, {
        evidence_files: evidenceFiles,
        last_activity: new Date().toISOString()
      });

      queryClient.invalidateQueries(['investigation-cases']);
      toast.success('Evidence uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
    setUploading(false);
    event.target.value = '';
  };

  const handleCaseUpdate = () => {
    queryClient.invalidateQueries(['investigation-cases']);
  };

  // Stats
  const totalDocs = cases.reduce((sum, c) => {
    const docs = c.case_documents || {};
    return sum + Object.keys(docs).filter(k => docs[k]?.content).length;
  }, 0);

  const totalEvidence = cases.reduce((sum, c) => 
    sum + (c.evidence_files?.length || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{cases.length}</p>
                <p className="text-xs text-gray-400">Total Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{totalDocs}</p>
                <p className="text-xs text-gray-400">Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Upload className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{totalEvidence}</p>
                <p className="text-xs text-gray-400">Evidence Files</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Send className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {cases.filter(c => c.agencies_contacted?.length > 0).length}
                </p>
                <p className="text-xs text-gray-400">Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case Selector */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Case Documents & Evidence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger className="flex-1 bg-[#0f1419] border-cyan-500/30 text-white">
                <SelectValue placeholder="Select a case to manage documents" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span>{c.case_title || c.case_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {Object.keys(c.case_documents || {}).filter(k => c.case_documents[k]?.content).length} docs
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={!selectedCase || uploading}
              />
              <Button
                disabled={!selectedCase || uploading}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
                asChild
              >
                <span>
                  {uploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Upload Evidence
                </span>
              </Button>
            </label>
          </div>

          {/* Case Info */}
          {selectedCaseData && (
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">{selectedCaseData.case_title}</h4>
                <Badge className={`${
                  selectedCaseData.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' :
                  selectedCaseData.status === 'submitted' ? 'bg-cyan-500/20 text-cyan-400' :
                  selectedCaseData.status === 'recovered' ? 'bg-green-500/20 text-green-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {selectedCaseData.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Case Number</p>
                  <p className="text-cyan-400 font-mono">{selectedCaseData.case_number}</p>
                </div>
                <div>
                  <p className="text-gray-400">Amount</p>
                  <p className="text-red-400">${(selectedCaseData.amount_stolen_usd || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400">Evidence Files</p>
                  <p className="text-white">{selectedCaseData.evidence_files?.length || 0}</p>
                </div>
                <div>
                  <p className="text-gray-400">Agencies</p>
                  <p className="text-white">{selectedCaseData.agencies_contacted?.length || 0}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Generator */}
      {selectedCaseData && (
        <CaseDocuments
          caseData={selectedCaseData}
          onUpdate={handleCaseUpdate}
        />
      )}

      {/* No Case Selected */}
      {!selectedCase && (
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Select a Case</h3>
            <p className="text-gray-400">
              Choose a case above to manage its documents and evidence
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}