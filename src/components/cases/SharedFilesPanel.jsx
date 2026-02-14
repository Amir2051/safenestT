import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Eye, Trash2, User, Shield, Clock } from "lucide-react";
import { toast } from "sonner";
import MultiFileUploader from "@/components/shared/MultiFileUploader";
import { format } from "date-fns";

export default function SharedFilesPanel({ caseId, caseData, isAdmin, currentUser }) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch shared files for this case
  const { data: sharedFiles = [], isLoading } = useQuery({
    queryKey: ['shared-files', caseId],
    queryFn: async () => {
      const files = await base44.entities.CaseEvidenceFile.filter({ 
        case_id: caseId 
      }, '-uploaded_at');
      return files;
    },
    refetchInterval: 5000, // Poll every 5 seconds for new files
    enabled: !!caseId
  });

  // Create notification when file is uploaded
  const createNotificationMutation = useMutation({
    mutationFn: async ({ recipientEmail, fileName, uploadedBy }) => {
      await base44.entities.Notification.create({
        user_email: recipientEmail,
        type: 'case_file_upload',
        title: 'New File Uploaded to Your Case',
        message: `${uploadedBy} uploaded "${fileName}" to case ${caseData.case_number}`,
        link: `/my-cases?caseId=${caseId}`,
        read: false,
        metadata: {
          case_id: caseId,
          case_number: caseData.case_number,
          file_name: fileName,
          uploaded_by: uploadedBy
        }
      });
    }
  });

  // Create timeline event
  const createTimelineEventMutation = useMutation({
    mutationFn: async ({ fileName, uploadedBy, isAdminUpload }) => {
      await base44.entities.CaseTimelineEvent.create({
        case_id: caseId,
        event_type: 'evidence_uploaded',
        event_title: `File Uploaded: ${fileName}`,
        event_description: `${uploadedBy} uploaded a new file to the case`,
        severity: 'info',
        created_by_user: uploadedBy,
        created_by_name: uploadedBy,
        automated: false,
        visible_to_client: true,
        metadata: {
          file_name: fileName,
          uploaded_by_role: isAdminUpload ? 'admin' : 'user'
        }
      });
    }
  });

  // Handle file upload
  const handleFileUpload = async (uploadedFiles) => {
    setUploading(true);
    const toastId = toast.loading("Uploading files...");
    
    try {
      const uploaderName = currentUser?.full_name || currentUser?.email || 'User';
      const isAdminUpload = isAdmin || currentUser?.role === 'admin';
      
      for (const file of uploadedFiles) {
        // Create evidence file record
        await base44.entities.CaseEvidenceFile.create({
          case_id: caseId,
          file_url: file.url,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploader_id: currentUser?.id,
          uploader_email: currentUser?.email,
          uploader_name: uploaderName,
          uploaded_by_admin: isAdminUpload,
          uploaded_at: new Date().toISOString(),
          parse_status: 'PENDING'
        });

        // Create timeline event
        await createTimelineEventMutation.mutateAsync({
          fileName: file.name,
          uploadedBy: uploaderName,
          isAdminUpload
        });

        // Send notification to the other party
        const recipientEmail = isAdminUpload 
          ? (caseData.client_email || caseData.created_by) 
          : (caseData.assigned_to || caseData.created_by);
        
        if (recipientEmail && recipientEmail !== currentUser?.email) {
          await createNotificationMutation.mutateAsync({
            recipientEmail,
            fileName: file.name,
            uploadedBy: uploaderName
          });
        }
      }

      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`, { id: toastId });
      queryClient.invalidateQueries(['shared-files', caseId]);
      queryClient.invalidateQueries(['my-cases']);
      queryClient.invalidateQueries(['client-cases-admin']);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files: ' + error.message, { id: toastId });
    }
    setUploading(false);
  };

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId) => {
      await base44.entities.CaseEvidenceFile.delete(fileId);
    },
    onSuccess: () => {
      toast.success('File deleted');
      queryClient.invalidateQueries(['shared-files', caseId]);
    },
    onError: (error) => {
      toast.error('Failed to delete file: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg">
        <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5 text-cyan-400" />
          Upload Files to Share
        </h3>
        <p className="text-sm text-gray-300 mb-4">
          {isAdmin 
            ? "Upload files that the client needs to see. They will be notified immediately."
            : "Upload evidence or documents to share with your investigator. They will be notified."}
        </p>
        
        <MultiFileUploader
          maxFiles={10}
          onFilesUploaded={handleFileUpload}
          disabled={uploading}
        />
      </div>

      {/* Files List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Shared Files ({sharedFiles.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-pulse">Loading files...</div>
          </div>
        ) : sharedFiles.length === 0 ? (
          <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-gray-700">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No shared files yet</p>
            <p className="text-sm text-gray-500 mt-1">Upload files above to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sharedFiles.map((file) => {
              const isOwnFile = file.uploader_email === currentUser?.email;
              const isAdminFile = file.uploaded_by_admin;
              
              return (
                <div 
                  key={file.id} 
                  className="p-4 bg-[#0f1419] rounded-lg border border-gray-700 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <FileText className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-white font-medium truncate">{file.filename}</p>
                          {isAdminFile ? (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs flex-shrink-0">
                              <Shield className="w-3 h-3 mr-1" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs flex-shrink-0">
                              <User className="w-3 h-3 mr-1" />
                              User
                            </Badge>
                          )}
                          {isOwnFile && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">You</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(file.uploaded_at), 'MMM d, yyyy h:mm a')}
                          </span>
                          {file.uploader_name && (
                            <span>By {file.uploader_name}</span>
                          )}
                          {file.file_size && (
                            <span>
                              {(file.file_size / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>

                        {file.description && (
                          <p className="text-sm text-gray-300 mt-2">{file.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(file.file_url, '_blank')}
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = file.file_url;
                          a.download = file.filename;
                          a.click();
                        }}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-500/10"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {(isOwnFile || isAdmin) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this file?')) {
                              deleteFileMutation.mutate(file.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-sm text-blue-300">
          <strong>📁 Two-Way File Sharing:</strong> Both you and {isAdmin ? 'the client' : 'your investigator'} can upload and view files here. 
          {isAdmin ? ' The client' : ' Your investigator'} will receive a notification when you upload new files.
        </p>
      </div>
    </div>
  );
}