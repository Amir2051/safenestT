import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users, CheckCircle, XCircle, Clock, Search, Filter,
  UserCheck, UserX, Shield, Mail, Calendar, Loader2, Eye, FileText
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AdminUserApprovals() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending_approval');
  const [verifyingUser, setVerifyingUser] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [reason, setReason] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      if (userData.role !== 'admin' && !userData.is_admin) {
        navigate(createPageUrl('Dashboard'));
        toast.error('Admin access required');
      }
    }).catch(() => {
      navigate(createPageUrl('Dashboard'));
    });
  }, [navigate]);

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'list-users'
      });
      return response.data.users || [];
    },
    enabled: !!user && (user.role === 'admin' || user.is_admin),
    refetchInterval: 5000
  });

  const approveMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'approve-user',
        user_id: userId,
        reason: reason
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setVerifyingUser(null);
      setReason('');
      toast.success(`✅ User approved: ${data.user_email}`);
    },
    onError: (error) => {
      toast.error('Failed to approve user: ' + error.message);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ userId, reason }) => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'reject-user',
        user_id: userId,
        reason: reason
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setVerifyingUser(null);
      setReason('');
      toast.success(`❌ User rejected: ${data.user_email}`);
    },
    onError: (error) => {
      toast.error('Failed to reject user: ' + error.message);
    }
  });

  const handleVerify = (u, action) => {
    setVerifyingUser(u);
    setActionType(action);
    setReason('');
  };

  const handleSubmitAction = () => {
    if (actionType === 'approve') {
      approveMutation.mutate({ userId: verifyingUser.id, reason });
    } else if (actionType === 'reject') {
      rejectMutation.mutate({ userId: verifyingUser.id, reason });
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || u.account_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: allUsers.length,
    pending: allUsers.filter(u => u.account_status === 'pending_approval').length,
    approved: allUsers.filter(u => u.account_status === 'active').length,
    rejected: allUsers.filter(u => u.account_status === 'rejected').length
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-cyan-400" />
          User Approvals
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            ADMIN
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">Manually verify and approve user account requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Users</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20 relative">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
            {stats.pending > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Approved</p>
                <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Rejected</p>
                <p className="text-2xl font-bold text-red-400">{stats.rejected}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'pending_approval' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending_approval')}
                className={filterStatus === 'pending_approval' 
                  ? 'bg-yellow-500 hover:bg-yellow-600' 
                  : 'border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10'}
              >
                <Clock className="w-4 h-4 mr-2" />
                Pending
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('active')}
                className={filterStatus === 'active' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'border-green-500/20 text-green-400 hover:bg-green-500/10'}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approved
              </Button>
              <Button
                variant={filterStatus === 'rejected' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('rejected')}
                className={filterStatus === 'rejected' 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'border-red-500/20 text-red-400 hover:bg-red-500/10'}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rejected
              </Button>
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' 
                  ? 'bg-cyan-500 hover:bg-cyan-600' 
                  : 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10'}
              >
                All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>User Requests ({filteredUsers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No users found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {u.full_name?.[0]?.toUpperCase() || u.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">{u.full_name || 'No Name'}</p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <p className="text-sm text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Registered: {new Date(u.created_date).toLocaleDateString()}</span>
                        </div>
                        {u.approved_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {u.account_status === 'active' ? 'Approved' : 'Rejected'}: {new Date(u.approved_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className={
                          u.account_status === 'pending_approval' 
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                            : u.account_status === 'active'
                            ? 'bg-green-500/20 text-green-400 border-green-500/50'
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }>
                          {u.account_status === 'pending_approval' ? 'Pending' : 
                           u.account_status === 'active' ? 'Active' : 'Rejected'}
                        </Badge>
                        {u.is_admin && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>

                      {u.approved_by && (
                        <p className="text-xs text-gray-500 mt-2">
                          By: {u.approved_by}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {u.account_status === 'pending_approval' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleVerify(u, 'approve')}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerify(u, 'reject')}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVerifyingUser(u);
                            setActionType('view');
                          }}
                          className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
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

      {/* Verification Modal */}
      <Dialog open={!!verifyingUser} onOpenChange={() => setVerifyingUser(null)}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' && <UserCheck className="w-5 h-5 text-green-400" />}
              {actionType === 'reject' && <UserX className="w-5 h-5 text-red-400" />}
              {actionType === 'view' && <Eye className="w-5 h-5 text-cyan-400" />}
              {actionType === 'approve' ? 'Approve User' : actionType === 'reject' ? 'Reject User' : 'User Details'}
            </DialogTitle>
          </DialogHeader>

          {verifyingUser && (
            <div className="space-y-4">
              {/* User Info */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <h3 className="text-sm font-semibold text-cyan-400 mb-3">User Information</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400">Full Name:</p>
                    <p className="text-white font-semibold">{verifyingUser.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Email:</p>
                    <p className="text-white font-semibold">{verifyingUser.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Registered:</p>
                    <p className="text-white">{new Date(verifyingUser.created_date).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status:</p>
                    <Badge className={
                      verifyingUser.account_status === 'pending_approval' 
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : verifyingUser.account_status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }>
                      {verifyingUser.account_status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Reason/Notes Field - Optional */}
              {actionType !== 'view' && (
                <div>
                  <Label className="text-white mb-2 block">
                    {actionType === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Optional)'}
                  </Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      actionType === 'approve' 
                        ? 'Add any notes about this approval...'
                        : 'Explain why this user is being rejected...'
                    }
                    className="bg-[#0f1419] border-cyan-500/20 text-white min-h-24"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-cyan-500/10">
                <Button
                  variant="outline"
                  onClick={() => setVerifyingUser(null)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                {actionType !== 'view' && (
                  <Button
                    onClick={handleSubmitAction}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className={
                      actionType === 'approve'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    }
                  >
                    {approveMutation.isPending || rejectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : actionType === 'approve' ? (
                      <UserCheck className="w-4 h-4 mr-2" />
                    ) : (
                      <UserX className="w-4 h-4 mr-2" />
                    )}
                    Confirm {actionType === 'approve' ? 'Approval' : 'Rejection'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}