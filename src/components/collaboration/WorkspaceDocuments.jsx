import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Plus, Upload, Download, Users, 
  Edit, Trash, Eye, Lock
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function WorkspaceDocuments({ workspace, currentUser, onOpenEditor }) {
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery({
    queryKey: ['workspace-documents', workspace.id],
    queryFn: () => base44.entities.CollaborativeDocument.filter({ workspace_id: workspace.id }, '-last_edited_at'),
    enabled: !!workspace.id,
    initialData: [],
  });

  const createDocumentMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.CollaborativeDocument.create({
        workspace_id: workspace.id,
        document_name: 'Untitled Document',
        document_type: 'strategy_notes',
        content: '',
        created_by: currentUser.email,
        version: 1,
        status: 'draft'
      });
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      onOpenEditor(doc);
      toast.success('New document created');
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (docId) => base44.entities.CollaborativeDocument.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      toast.success('Document deleted');
    },
  });

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target.result;
        
        await base44.entities.CollaborativeDocument.create({
          workspace_id: workspace.id,
          document_name: file.name,
          document_type: 'legal_document',
          content: content,
          created_by: currentUser.email,
          version: 1,
          status: 'draft'
        });

        queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
        toast.success('Document uploaded');
      };
      reader.readAsText(file);
    } catch (error) {
      toast.error('Failed to upload document');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'final': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'approved': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in_review': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader className="border-b border-cyan-500/10">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Shared Documents ({documents.length})
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              id="doc-upload"
              className="hidden"
              accept=".txt,.md,.doc,.docx"
              onChange={handleUpload}
            />
            <label htmlFor="doc-upload">
              <Button
                size="sm"
                variant="outline"
                className="border-cyan-500/20 text-cyan-400"
                asChild
              >
                <div>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </div>
              </Button>
            </label>
            <Button
              onClick={() => createDocumentMutation.mutate()}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        {documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No documents yet</p>
            <Button
              onClick={() => createDocumentMutation.mutate()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Document
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-white font-bold">{doc.document_name}</h4>
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                      {doc.is_locked && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                      {doc.currently_editing?.length > 0 && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          <Users className="w-3 h-3 mr-1" />
                          {doc.currently_editing.length} editing
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm text-gray-400 space-y-1">
                      <p>
                        Last edited by {doc.last_edited_by || doc.created_by} • 
                        Version {doc.version} •
                        {doc.last_edited_at && ` ${format(new Date(doc.last_edited_at), 'MMM dd, HH:mm')}`}
                      </p>
                      {doc.content && (
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {doc.content.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => onOpenEditor(doc)}
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-600"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    
                    {doc.created_by === currentUser.email && (
                      <Button
                        onClick={() => {
                          if (confirm('Delete this document?')) {
                            deleteDocumentMutation.mutate(doc.id);
                          }
                        }}
                        size="sm"
                        variant="outline"
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}