import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileText, Loader2, CheckCircle, AlertCircle, 
  Send, Copy, RefreshCw, X, FileCheck, Sparkles
} from "lucide-react";
import { toast } from "sonner";

export default function AdminCaseIntake({ onCaseCreated }) {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setProcessing(true);

    const uploadPromises = selectedFiles.map(async (file) => {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return {
          name: file.name,
          url: file_url,
          type: file.type.includes('pdf') ? 'pdf' : 'txt',
          uploadedAt: new Date().toISOString()
        };
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    const uploaded = (await Promise.all(uploadPromises)).filter(Boolean);
    setUploadedFiles(prev => [...prev, ...uploaded]);
    setProcessing(false);
    toast.success(`${uploaded.length} file(s) uploaded`);
  };

  const extractMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('caseFileIntake', {
        action: 'extract',
        files: uploadedFiles
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setExtractedData(data.extractedData);
        setEditedData({ ...data.extractedData });
        toast.success('Case information extracted successfully');
      } else {
        toast.error(data.error || 'Extraction failed');
      }
    },
    onError: (error) => {
      toast.error('Extraction failed: ' + error.message);
    }
  });

  const createCaseMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('caseFileIntake', {
        action: 'create-case',
        files: uploadedFiles,
        extractedData: editedData,
        targetUserEmail: targetUserEmail || null
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        if (onCaseCreated) onCaseCreated(data.case);
        // Reset
        setUploadedFiles([]);
        setExtractedData(null);
        setEditedData(null);
        setTargetUserEmail('');
      } else {
        toast.error(data.error || 'Case creation failed');
      }
    },
    onError: (error) => {
      toast.error('Case creation failed: ' + error.message);
    }
  });

  const copyToClipboard = () => {
    const text = JSON.stringify(editedData, null, 2);
    navigator.clipboard.writeText(text);
    toast.success('Case data copied to clipboard');
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            Case File Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-xl p-8 text-center transition-colors">
            <input
              type="file"
              id="case-file-upload"
              multiple
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileSelect}
              disabled={processing}
            />
            <label htmlFor="case-file-upload" className="cursor-pointer block">
              {processing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-3" />
                  <p className="text-gray-400">Uploading files...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-white font-medium">Click to upload case files</p>
                  <p className="text-gray-500 text-sm mt-1">PDF or TXT files • Multiple files supported</p>
                </div>
              )}
            </label>
          </div>

          {/* Uploaded Files Chat Bubbles */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <FileText className="w-5 h-5 text-cyan-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(file.uploadedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                    <FileCheck className="w-3 h-3 mr-1" />
                    Uploaded
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(idx)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {uploadedFiles.length > 0 && !extractedData && (
            <Button
              onClick={() => extractMutation.mutate()}
              disabled={extractMutation.isPending}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {extractMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Extracting Information...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Case Information (AI)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Editor */}
      {extractedData && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Extracted Case Information
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => extractMutation.mutate()}
                  disabled={extractMutation.isPending}
                  className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Re-analyze
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Case Title</Label>
                <Input
                  value={editedData.case_title || ''}
                  onChange={(e) => setEditedData({...editedData, case_title: e.target.value})}
                  className="bg-[#0f1419] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white">Issue Type</Label>
                <Select 
                  value={editedData.issue_type || 'other'} 
                  onValueChange={(v) => setEditedData({...editedData, issue_type: v})}
                >
                  <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto_theft">Crypto Theft</SelectItem>
                    <SelectItem value="phishing">Phishing</SelectItem>
                    <SelectItem value="investment_scam">Investment Scam</SelectItem>
                    <SelectItem value="romance_scam">Romance Scam</SelectItem>
                    <SelectItem value="rug_pull">Rug Pull</SelectItem>
                    <SelectItem value="fake_exchange">Fake Exchange</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={editedData.description || ''}
                onChange={(e) => setEditedData({...editedData, description: e.target.value})}
                className="bg-[#0f1419] border-gray-700 text-white min-h-[100px] mt-1"
              />
            </div>

            {/* Victim Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white">Victim Name</Label>
                <Input
                  value={editedData.contact_info?.victim_name || ''}
                  onChange={(e) => setEditedData({
                    ...editedData, 
                    contact_info: {...editedData.contact_info, victim_name: e.target.value}
                  })}
                  className="bg-[#0f1419] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white">Victim Email</Label>
                <Input
                  value={editedData.contact_info?.victim_email || ''}
                  onChange={(e) => setEditedData({
                    ...editedData, 
                    contact_info: {...editedData.contact_info, victim_email: e.target.value}
                  })}
                  className="bg-[#0f1419] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white">Victim Phone</Label>
                <Input
                  value={editedData.contact_info?.victim_phone || ''}
                  onChange={(e) => setEditedData({
                    ...editedData, 
                    contact_info: {...editedData.contact_info, victim_phone: e.target.value}
                  })}
                  className="bg-[#0f1419] border-gray-700 text-white mt-1"
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Amount Lost</Label>
                <Input
                  type="number"
                  value={editedData.financial_details?.amount_lost || 0}
                  onChange={(e) => setEditedData({
                    ...editedData, 
                    financial_details: {...editedData.financial_details, amount_lost: parseFloat(e.target.value)}
                  })}
                  className="bg-[#0f1419] border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-white">Urgency</Label>
                <Select 
                  value={editedData.urgency || 'medium'} 
                  onValueChange={(v) => setEditedData({...editedData, urgency: v})}
                >
                  <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scammer Wallet */}
            {editedData.financial_details?.scammer_wallet && (
              <div>
                <Label className="text-white">Scammer Wallet</Label>
                <Input
                  value={editedData.financial_details.scammer_wallet}
                  onChange={(e) => setEditedData({
                    ...editedData,
                    financial_details: {...editedData.financial_details, scammer_wallet: e.target.value}
                  })}
                  className="bg-[#0f1419] border-gray-700 text-white font-mono mt-1"
                />
              </div>
            )}

            {/* Target User (Optional) */}
            <div>
              <Label className="text-white">Create for User (Optional)</Label>
              <Input
                type="email"
                placeholder="user@example.com - Leave blank to create as admin"
                value={targetUserEmail}
                onChange={(e) => setTargetUserEmail(e.target.value)}
                className="bg-[#0f1419] border-gray-700 text-white mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                If provided, case will be assigned to this user instead of admin
              </p>
            </div>

            {/* Summary Notes */}
            {editedData.summary_notes && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p className="text-sm text-yellow-300">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  <strong>Notes:</strong> {editedData.summary_notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-700">
              <Button
                onClick={() => createCaseMutation.mutate()}
                disabled={createCaseMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                {createCaseMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Case...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create Case
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}