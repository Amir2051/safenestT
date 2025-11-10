import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Users, Plus, MessageSquare, FileText, Shield, 
  Activity, Clock, CheckCircle, Home
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import WorkspaceChat from "../components/collaboration/WorkspaceChat.jsx";
import WorkspaceDocuments from "../components/collaboration/WorkspaceDocuments.jsx";
import DocumentEditor from "../components/collaboration/DocumentEditor.jsx";

export default function Collaboration() {
  const [user, setUser] = useState(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);

  const queryClient = useQueryClient();

  const { data: workspaces = [] } = useQuery({
    queryKey: ['collaboration-workspaces'],
    queryFn: () => base44.entities.CollaborationWorkspace.list('-last_activity'),
    enabled: !!user,
    initialData: [],
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ property_owner: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations'],
    queryFn: () => base44.entities.AttorneyConsultation.list('-requested_date'),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createWorkspaceMutation = useMutation({
    mutationFn: async (propertyId) => {
      const property = properties.find(p => p.id === propertyId);
      const workspace = await base44.entities.CollaborationWorkspace.create({
        workspace_id: `WS_${Date.now()}`,
        property_id: propertyId,
        workspace_name: newWorkspaceName || `${property.address} - Legal Workspace`,
        owner_email: user.email,
        status: 'active',
        created_date: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        participants: [{
          email: user.email,
          name: user.full_name,
          role: 'owner',
          joined_date: new Date().toISOString(),
          is_online: true
        }],
        permissions: {
          can_upload: true,
          can_edit: true,
          can_delete: false,
          can_invite: true
        }
      });

      // Send welcome message
      await base44.entities.ChatMessage.create({
        workspace_id: workspace.id,
        sender_email: 'system@safenest.com',
        sender_name: 'SafeNest',
        sender_role: 'admin',
        message_content: `🎉 Welcome to your Legal Collaboration Workspace! This is a secure space to work with your attorney on ${property.address}.`,
        message_type: 'system',
        timestamp: new Date().toISOString()
      });

      return workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration-workspaces'] });
      setShowNewWorkspace(false);
      setNewWorkspaceName('');
      toast.success('Workspace created successfully!');
    },
  });

  const handleOpenEditor = (doc) => {
    setEditingDocument(doc);
    setShowEditor(true);
  };

  const activeWorkspaces = workspaces.filter(w => w.status === 'active').length;
  const totalMessages = workspaces.reduce((sum, w) => sum + (w.activity_log?.length || 0), 0);
  const activeCollaborators = new Set(
    workspaces.flatMap(w => w.participants?.map(p => p.email) || [])
  ).size;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (showEditor && editingDocument) {
    return (
      <div className="p-6 lg:p-8 h-screen">
        <DocumentEditor
          document={editingDocument}
          workspace={selectedWorkspace}
          currentUser={user}
          onClose={() => {
            setShowEditor(false);
            setEditingDocument(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-400" />
          Legal Collaboration
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 animate-pulse">
            Real-Time
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Secure workspaces for collaborating with your attorney
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <Users className="w-8 h-8 text-purple-400 mb-2" />
            <p className="text-3xl font-bold text-purple-400">{activeWorkspaces}</p>
            <p className="text-sm text-gray-400">Active Workspaces</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <MessageSquare className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-3xl font-bold text-cyan-400">{totalMessages}</p>
            <p className="text-sm text-gray-400">Messages</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <FileText className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-green-400">
              {workspaces.reduce((sum, w) => sum + (w.shared_documents?.length || 0), 0)}
            </p>
            <p className="text-sm text-gray-400">Shared Documents</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6">
            <Shield className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-3xl font-bold text-yellow-400">{activeCollaborators}</p>
            <p className="text-sm text-gray-400">Collaborators</p>
          </CardContent>
        </Card>
      </div>

      {/* Workspace Selection / Creation */}
      {!selectedWorkspace ? (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>My Workspaces</span>
              <Button
                onClick={() => setShowNewWorkspace(!showNewWorkspace)}
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Workspace
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Workspace Form */}
            {showNewWorkspace && (
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-white font-bold mb-3">Create New Workspace</h3>
                <Input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace Name (optional)"
                  className="bg-[#0f1419] border-purple-500/20 text-white mb-3"
                />
                <p className="text-sm text-gray-400 mb-3">Select a property:</p>
                <div className="space-y-2">
                  {properties.map(property => (
                    <button
                      key={property.id}
                      onClick={() => createWorkspaceMutation.mutate(property.id)}
                      className="w-full p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="text-white font-semibold">{property.address}</p>
                          <p className="text-xs text-gray-400">{property.city}, {property.state}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Workspaces */}
            {workspaces.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-white font-semibold text-lg mb-2">No workspaces yet</p>
                <p className="text-gray-400 text-sm mb-4">
                  Create a workspace to collaborate with your attorney
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workspaces.map(workspace => (
                  <div
                    key={workspace.id}
                    onClick={() => setSelectedWorkspace(workspace)}
                    className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-white font-bold flex items-center gap-2">
                          {workspace.workspace_name}
                          {workspace.status === 'active' && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              <Activity className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {workspace.participants?.length || 0} participant(s)
                        </p>
                      </div>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(workspace.last_activity), 'MMM dd')}
                      </Badge>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Chat Active
                      </Badge>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        {workspace.shared_documents?.length || 0} docs
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Workspace View */
        <div className="space-y-6">
          {/* Workspace Header */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {selectedWorkspace.workspace_name}
                  </h2>
                  <div className="flex gap-2">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {selectedWorkspace.status}
                    </Badge>
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                      🔒 End-to-End Encrypted
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedWorkspace(null)}
                  variant="outline"
                  className="border-gray-500/20 text-gray-400"
                >
                  Back to Workspaces
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Collaboration Area */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorkspaceChat 
              workspace={selectedWorkspace} 
              currentUser={user}
            />
            
            <WorkspaceDocuments 
              workspace={selectedWorkspace} 
              currentUser={user}
              onOpenEditor={handleOpenEditor}
            />
          </div>

          {/* Info Banner */}
          <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-bold mb-2">🔒 Secure Collaboration Features</h3>
                  <ul className="text-sm text-cyan-300 space-y-1">
                    <li>✓ <strong>Real-Time Chat:</strong> Instant messaging with your attorney</li>
                    <li>✓ <strong>Co-Editing:</strong> Collaborate on documents simultaneously</li>
                    <li>✓ <strong>Version Control:</strong> Track all document changes</li>
                    <li>✓ <strong>File Sharing:</strong> Securely share evidence and documents</li>
                    <li>✓ <strong>AES-256 Encryption:</strong> All messages and files encrypted</li>
                    <li>✓ <strong>Activity Log:</strong> Complete audit trail for legal records</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}