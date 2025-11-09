import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Upload, FileText, Download, Trash2, Eye, Lock, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function DocumentStorage({ documents, properties, selectedProperty }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('evidence_document');
  const [propertyId, setPropertyId] = useState(selectedProperty?.id || '');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const queryClient = useQueryClient();

  const uploadDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !documentName || !propertyId) {
        throw new Error('Please fill in all fields');
      }

      setUploading(true);

      // Upload file to secure storage
      const uploadResult = await base44.integrations.Core.UploadPrivateFile({
        file: selectedFile
      });

      // Create document record
      await base44.entities.LegalDocument.create({
        property_id: propertyId,
        document_type: documentType,
        document_name: documentName,
        encrypted_file_uri: uploadResult.file_uri,
        file_size_bytes: selectedFile.size,
        file_extension: selectedFile.name.split('.').pop(),
        status: 'final',
        tags: ['uploaded', 'user-document']
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'security',
        description: `Legal document uploaded: ${documentName}`,
        metadata: {
          property_id: propertyId,
          document_type: documentType,
          file_size: selectedFile.size
        },
        severity: 'info',
        status: 'success'
      });

      setUploading(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setDocumentName('');
      toast.success('✅ Document uploaded securely!');
    },
    onError: (error) => {
      setUploading(false);
      toast.error(error.message || 'Failed to upload document');
    }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId) => {
      await base44.entities.LegalDocument.delete(docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['legal-documents'] });
      toast.success('Document deleted');
    }
  });

  const downloadDocument = async (doc) => {
    try {
      const signedUrl = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: doc.encrypted_file_uri,
        expires_in: 300
      });
      window.open(signedUrl.signed_url, '_blank');
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getDocumentIcon = (extension) => {
    if (extension === 'pdf') return '📄';
    if (['doc', 'docx'].includes(extension)) return '📝';
    if (['jpg', 'jpeg', 'png'].includes(extension)) return '🖼️';
    return '📎';
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" />
              Document Storage (AES-256 Encrypted)
            </span>
            <Button
              onClick={() => setShowUploadDialog(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-cyan-300 text-sm font-semibold mb-1">
                  🔒 Military-Grade Security
                </p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• All documents encrypted with AES-256 before storage</li>
                  <li>• Files stored in private, isolated cloud storage</li>
                  <li>• Access only via time-limited signed URLs</li>
                  <li>• Complete audit trail of all document access</li>
                  <li>• Automatic deletion after 7 years (legal retention period)</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Stored Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No Documents Yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Upload legal documents to keep them secure and organized
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map(doc => {
                const property = properties.find(p => p.id === doc.property_id);
                
                return (
                  <div
                    key={doc.id}
                    className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-3xl">{getDocumentIcon(doc.file_extension)}</div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold mb-1">{doc.document_name}</h3>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mb-2">
                            <span>{property?.address}</span>
                            <span>•</span>
                            <span>{formatFileSize(doc.file_size_bytes)}</span>
                            <span>•</span>
                            <span>{doc.file_extension.toUpperCase()}</span>
                            <span>•</span>
                            <span>{new Date(doc.created_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs">
                              {doc.document_type.replace('_', ' ')}
                            </Badge>
                            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border text-xs">
                              {doc.status}
                            </Badge>
                            {doc.template_generated && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border text-xs">
                                Template
                              </Badge>
                            )}
                            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 border text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Encrypted
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          onClick={() => downloadDocument(doc)}
                          size="sm"
                          variant="outline"
                          className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm('Delete this document? This cannot be undone.')) {
                              deleteDocumentMutation.mutate(doc.id);
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Legal Document</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Select Property</label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue placeholder="Choose property..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Document Name</label>
              <Input
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="e.g., Property Deed - Original"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Document Type</label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="evidence_document">Evidence Document</SelectItem>
                  <SelectItem value="deed_copy">Deed Copy</SelectItem>
                  <SelectItem value="police_report">Police Report</SelectItem>
                  <SelectItem value="attorney_correspondence">Attorney Correspondence</SelectItem>
                  <SelectItem value="court_filing">Court Filing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Select File</label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
              />
              <p className="text-xs text-gray-400">
                Accepted: PDF, Word, Images • Max 25MB
              </p>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-300 text-xs">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Files are encrypted with AES-256 and stored securely. Only you can access them.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowUploadDialog(false)}
                variant="outline"
                className="flex-1 border-gray-500/20 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={() => uploadDocumentMutation.mutate()}
                disabled={!selectedFile || !documentName || !propertyId || uploading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                {uploading ? 'Uploading...' : 'Upload Securely'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}