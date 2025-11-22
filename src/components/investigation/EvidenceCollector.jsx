import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Loader2, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function EvidenceCollector({ selectedCase }) {
  const [uploading, setUploading] = useState(false);
  const [evidenceType, setEvidenceType] = useState("screenshot");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  
  const queryClient = useQueryClient();

  const addEvidenceMutation = useMutation({
    mutationFn: async (evidence) => {
      if (!selectedCase) throw new Error("No case selected");
      
      const currentEvidence = selectedCase.evidence || [];
      return await base44.asServiceRole.entities.FraudCase.update(selectedCase.id, {
        evidence: [...currentEvidence, evidence]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation-cases'] });
      toast.success("Evidence added");
      setDescription("");
      setUrl("");
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      addEvidenceMutation.mutate({
        type: evidenceType,
        url: file_url,
        description: description || file.name,
        uploadedAt: new Date().toISOString()
      });
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    }
    setUploading(false);
  };

  const handleAddUrl = () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    addEvidenceMutation.mutate({
      type: evidenceType,
      url,
      description: description || url,
      uploadedAt: new Date().toISOString()
    });
  };

  const handleRemoveEvidence = (index) => {
    const updatedEvidence = selectedCase.evidence.filter((_, i) => i !== index);
    base44.asServiceRole.entities.FraudCase.update(selectedCase.id, {
      evidence: updatedEvidence
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['investigation-cases'] });
      toast.success("Evidence removed");
    });
  };

  if (!selectedCase) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Select a case to manage evidence</p>
        </CardContent>
      </Card>
    );
  }

  const evidenceTypes = [
    { value: 'screenshot', label: '📸 Screenshot' },
    { value: 'chat', label: '💬 Chat Log' },
    { value: 'email', label: '📧 Email' },
    { value: 'website', label: '🌐 Website URL' },
    { value: 'phone', label: '📱 Phone Number' },
    { value: 'social', label: '👤 Social Account' },
    { value: 'document', label: '📄 Document' },
    { value: 'other', label: '📎 Other' }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-orange-400" />
            Evidence Collector
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white mb-2 block">Evidence Type</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {evidenceTypes.map((type) => (
                <Button
                  key={type.value}
                  onClick={() => setEvidenceType(type.value)}
                  variant={evidenceType === type.value ? "default" : "outline"}
                  className={evidenceType === type.value ? "bg-orange-500" : ""}
                  size="sm"
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-white mb-2 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this evidence..."
              className="bg-[#0f1419] border-orange-500/20 text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-white mb-2 block">Upload File</Label>
              <div className="relative">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="bg-[#0f1419] border-orange-500/20 text-white"
                />
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                    <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Or Add URL/Link</Label>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-[#0f1419] border-orange-500/20 text-white"
                />
                <Button
                  onClick={handleAddUrl}
                  disabled={addEvidenceMutation.isPending}
                  className="bg-orange-500"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-white">
            Collected Evidence ({selectedCase.evidence?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedCase.evidence || selectedCase.evidence.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No evidence collected yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedCase.evidence.map((evidence, idx) => (
                <div key={idx} className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/10 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{evidence.type}</Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(evidence.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white mb-2">{evidence.description}</p>
                    {evidence.url && (
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 text-sm flex items-center gap-1 hover:underline"
                      >
                        View Evidence
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEvidence(idx)}
                    className="text-red-400 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}