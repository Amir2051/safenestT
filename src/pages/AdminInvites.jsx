import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail, Copy, Clock, Users, CheckCircle, XCircle,
  Plus, Trash2, AlertCircle, Loader2, Shield
} from "lucide-react";
import { toast } from "sonner";

import AdminGate from "@/components/admin/AdminGate";

export default function AdminInvites() {
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresHours, setExpiresHours] = useState(168);
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      if (userData.role !== 'admin' && !userData.is_admin) {
        window.location.href = '/';
        return;
      }
      setUser(userData);
    }).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['admin-invitations'],
    queryFn: async () => {
      const response = await base44.functions.invoke('inviteService', {
        endpoint: 'list-all'
      });
      return response.data.invitations;
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('inviteService', {
        endpoint: 'create-invite',
        ...data
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      setShowCreateDialog(false);
      setMaxUses(1);
      setExpiresHours(168);
      setNotes('');
      toast.success('Invitation created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create invitation: ' + error.message);
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (invitationId) => {
      const response = await base44.functions.invoke('inviteService', {
        endpoint: 'revoke-invite',
        invitation_id: invitationId
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success('Invitation revoked');
    },
    onError: (error) => {
      toast.error('Failed to revoke: ' + error.message);
    }
  });

  const handleCreate = () => {
    createMutation.mutate({
      max_uses: maxUses,
      expires_hours: expiresHours,
      notes: notes
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const statusColors = {
    active: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
    expired: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' },
    used: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
    revoked: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' }
  };

  const stats = {
    total: invitations.length,
    active: invitations.filter(i => i.status === 'active').length,
    used: invitations.filter(i => i.status === 'used' || i.status === 'expired').length,
    totalAccepted: invitations.reduce((sum, i) => sum + (i.accepted_by?.length || 0), 0)
  };

  return (
    <AdminGate>
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            Invitation Manager
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              ADMIN
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">Create and manage invitation links for SafeNestT</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Invitation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a2332] border-cyan-500/20">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Invitation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Maximum Uses</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value))}
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  How many times can this invite be used?
                </p>
              </div>

              <div>
                <Label className="text-gray-300">Expires In (Hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={expiresHours}
                  onChange={(e) => setExpiresHours(parseInt(e.target.value))}
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Default: 168 hours (7 days)
                </p>
              </div>

              <div>
                <Label className="text-gray-300">Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., For beta testers..."
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                />
              </div>

              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invitation
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <Mail className="w-8 h-8 text-cyan-400 mb-2" />
            <p className="text-3xl font-bold text-cyan-400">{stats.total}</p>
            <p className="text-sm text-gray-400">Total Invites</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-green-400">{stats.active}</p>
            <p className="text-sm text-gray-400">Active</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-6">
            <Users className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-3xl font-bold text-blue-400">{stats.totalAccepted}</p>
            <p className="text-sm text-gray-400">Users Joined</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-gray-500/20">
          <CardContent className="p-6">
            <XCircle className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-3xl font-bold text-gray-400">{stats.used}</p>
            <p className="text-sm text-gray-400">Used/Expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Invitations List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">All Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading invitations...</p>
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No invitations yet</p>
              <p className="text-gray-400 text-sm mt-1">Create your first invitation to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invite) => {
                const colors = statusColors[invite.status] || statusColors.active;
                const isExpired = new Date(invite.expires_at) < new Date();
                
                return (
                  <div
                    key={invite.id}
                    className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                            {invite.status.toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            Code: <span className="text-cyan-400 font-mono">{invite.invite_code}</span>
                          </span>
                        </div>
                        
                        {invite.notes && (
                          <p className="text-sm text-gray-300 mb-2">{invite.notes}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {invite.current_uses} / {invite.max_uses} uses
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {isExpired ? 'Expired' : `Expires ${new Date(invite.expires_at).toLocaleString()}`}
                          </span>
                        </div>

                        {invite.accepted_by && invite.accepted_by.length > 0 && (
                          <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                            <p className="text-xs text-green-400 font-semibold mb-1">
                              Accepted by:
                            </p>
                            {invite.accepted_by.map((user, idx) => (
                              <p key={idx} className="text-xs text-gray-300">
                                • {user.name} ({user.email}) - {new Date(user.accepted_at).toLocaleString()}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(invite.invite_link)}
                          className="border-cyan-500/20 text-cyan-400"
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Link
                        </Button>
                        
                        {invite.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => revokeMutation.mutate(invite.id)}
                            disabled={revokeMutation.isPending}
                            className="border-red-500/20 text-red-400"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-[#1a2332] rounded">
                      <code className="text-xs text-cyan-400 flex-1 truncate">
                        {invite.invite_link}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyToClipboard(invite.invite_link)}
                        className="h-6 w-6"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminGate>
  );
}