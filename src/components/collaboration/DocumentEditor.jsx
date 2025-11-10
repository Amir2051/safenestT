import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Save, Users, Lock, Unlock, History, 
  Download, Eye, EyeOff, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function DocumentEditor({ document, workspace, currentUser, onClose }) {
  const [content, setContent] = useState(document?.content || '');
  const [title, setTitle] = useState(document?.document_name || '');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);

  const queryClient = useQueryClient();

  const saveDocumentMutation = useMutation({
    mutationFn: async () => {
      const docData = {
        workspace_id: workspace.id,
        document_name: title,
        content: content,
        last_edited_by: currentUser.email,
        last_edited_at: new Date().toISOString(),
        version: (document?.version || 0) + 1,
        version_history: [
          ...(document?.version_history || []),
          {
            version: (document?.version || 0) + 1,
            edited_by: currentUser.email,
            edited_at: new Date().toISOString(),
            content_snapshot: content.substring(0, 200),
            changes_summary: 'Document updated'
          }
        ]
      };

      let savedDoc;
      if (document?.id) {
        savedDoc = await base44.entities.CollaborativeDocument.update(document.id, docData);
      } else {
        savedDoc = await base44.entities.CollaborativeDocument.create({
          ...docData,
          document_type: 'strategy_notes',
          created_by: currentUser.email,
          version: 1
        });
      }

      // Notify other users via chat
      await base44.entities.ChatMessage.create({
        workspace_id: workspace.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_role: workspace.owner_email === currentUser.email ? 'owner' : 'attorney',
        message_content: `Updated document: ${title}`,
        message_type: 'edit_notification',
        timestamp: new Date().toISOString()
      });

      return savedDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-documents'] });
      setLastSaved(new Date());
      toast.success('Document saved successfully');
    },
  });

  const handleSave = () => {
    setSaving(true);
    saveDocumentMutation.mutate();
    setTimeout(() => setSaving(false), 1000);
  };

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!content || content === document?.content) return;

    const timer = setTimeout(() => {
      handleSave();
    }, 30000);

    return () => clearTimeout(timer);
  }, [content]);

  // Announce presence
  useEffect(() => {
    const announcePresence = async () => {
      if (!document?.id) return;

      const currentlyEditing = document.currently_editing || [];
      const myPresence = {
        email: currentUser.email,
        name: currentUser.full_name,
        color: '#06b6d4',
        last_active: new Date().toISOString()
      };

      const updated = [
        ...currentlyEditing.filter(u => u.email !== currentUser.email),
        myPresence
      ];

      await base44.entities.CollaborativeDocument.update(document.id, {
        currently_editing: updated
      });
    };

    announcePresence();
    const interval = setInterval(announcePresence, 10000);

    return () => {
      clearInterval(interval);
      // Remove self from editing list
      if (document?.id) {
        base44.entities.CollaborativeDocument.update(document.id, {
          currently_editing: (document.currently_editing || []).filter(
            u => u.email !== currentUser.email
          )
        });
      }
    };
  }, [document?.id]);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ],
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 h-full flex flex-col">
      <CardHeader className="border-b border-cyan-500/10">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <FileText className="w-5 h-5 text-cyan-400" />
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document Title"
              className="bg-[#0f1419] border-cyan-500/20 text-white font-bold text-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            {document?.currently_editing?.length > 0 && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <Users className="w-3 h-3 mr-1" />
                {document.currently_editing.length} editing
              </Badge>
            )}
            {lastSaved && (
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                Saved {lastSaved.toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
        {/* Active users */}
        {document?.currently_editing?.length > 0 && (
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            {document.currently_editing.map(user => (
              <Badge 
                key={user.email}
                className="bg-green-500/20 text-green-400 border-green-500/50"
              >
                <div 
                  className="w-2 h-2 rounded-full mr-1 animate-pulse"
                  style={{ backgroundColor: user.color }}
                />
                {user.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <ReactQuill
            theme="snow"
            value={content}
            onChange={setContent}
            modules={modules}
            className="h-[calc(100%-60px)] bg-white rounded-lg"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>

          {document?.version > 1 && (
            <Button
              variant="outline"
              className="border-cyan-500/20 text-cyan-400"
            >
              <History className="w-4 h-4 mr-2" />
              v{document.version}
            </Button>
          )}

          <Button
            onClick={onClose}
            variant="outline"
            className="border-gray-500/20 text-gray-400 ml-auto"
          >
            Close
          </Button>
        </div>

        {/* Version info */}
        {document?.last_edited_by && (
          <p className="text-xs text-gray-400 mt-2">
            Last edited by {document.last_edited_by} • Version {document.version}
          </p>
        )}
      </CardContent>
    </Card>
  );
}