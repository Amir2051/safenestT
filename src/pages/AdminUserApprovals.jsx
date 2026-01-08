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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, CheckCircle, XCircle, Clock, Search, Filter,
  UserCheck, UserX, Shield, Mail, Calendar, Loader2, Eye, 
  AlertTriangle, Info, CheckSquare, Briefcase, BadgeCheck, Settings, Zap, ToggleLeft,
  MoreVertical, Ban, RefreshCw, Trash2, UserPlus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminGate from "@/components/admin/AdminGate";

export default function AdminUserApprovals() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pending_approval');
  const [verifyingUser, setVerifyingUser] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [reason, setReason] = useState('');
  const [verificationChecks, setVerificationChecks] = useState({
    email_valid: false,
    no_spam_indicators: false,
    legitimate_request: false,
    reviewed_profile: false
  });
  
  // Employment Details State
  const [employeeId, setEmployeeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  
  // Auto-approval settings
  const [autoApprovalEnabled, setAutoApprovalEnabled] = useState(false);
  const [autoApprovalLoading, setAutoApprovalLoading] = useState(false);

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
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: false
  });

  // Fetch cases for each user
  const { data: userCases = {} } = useQuery({
    queryKey: ['user-cases-map'],
    queryFn: async () => {
      const allCases = await base44.entities.MyCase.list(null, 5000);
      
      // Group cases by user email
      const casesByUser = {};
      allCases.forEach(c => {
        const userEmail = c.client_email || c.created_by || c.created_by_email;
        if (userEmail) {
          if (!casesByUser[userEmail]) casesByUser[userEmail] = [];
          casesByUser[userEmail].push(c);
        }
      });
      
      return casesByUser;
    },
    enabled: !!user && (user.role === 'admin' || user.is_admin)
  });

  // Fetch auto-approval setting
  useEffect(() => {
    if (user && (user.role === 'admin' || user.is_admin)) {
      base44.entities.SystemConfig.filter({ key_name: 'auto_approve_users' })
        .then(configs => {
          if (configs.length > 0) {
            setAutoApprovalEnabled(configs[0].value === 'true');
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const toggleAutoApproval = async (enabled) => {
    setAutoApprovalLoading(true);
    try {
      const configs = await base44.entities.SystemConfig.filter({ key_name: 'auto_approve_users' });
      
      if (configs.length > 0) {
        await base44.entities.SystemConfig.update(configs[0].id, { value: enabled.toString() });
      } else {
        await base44.entities.SystemConfig.create({
          key_name: 'auto_approve_users',
          value: enabled.toString(),
          description: 'Automatically approve new user registrations'
        });
      }
      
      setAutoApprovalEnabled(enabled);
      toast.success(enabled ? '✅ Auto-approval enabled' : '⚠️ Auto-approval disabled');
    } catch (error) {
      toast.error('Failed to update setting');
    }
    setAutoApprovalLoading(false);
  };

  const bulkApproveMutation = useMutation({
    mutationFn: async ({ userIds }) => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'bulk-approve-users',
        user_ids: userIds,
        reason: 'Bulk approval - All users granted access'
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`✅ Approved ${data.approved} user${data.approved > 1 ? 's' : ''}!`);
    },
    onError: (error) => {
      toast.error('Failed to bulk approve users: ' + error.message);
    }
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
      setVerificationChecks({
        email_valid: false,
        no_spam_indicators: false,
        legitimate_request: false,
        reviewed_profile: false
      });
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
      setVerificationChecks({
        email_valid: false,
        no_spam_indicators: false,
        legitimate_request: false,
        reviewed_profile: false
      });
      toast.success(`❌ User rejected: ${data.user_email}`);
    },
    onError: (error) => {
      toast.error('Failed to reject user: ' + error.message);
    }
  });

  // Update User Mutation (using new robust backend function)
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
        const res = await base44.functions.invoke('updateUserProfile', {
            target_user_id: userId,
            updates: data
        });
        if (!res.data.success) throw new Error(res.data.error);
        return res.data.user;
    },
    onSuccess: () => {
        queryClient.invalidateQueries(['all-users']);
        toast.success("User details updated successfully");
        setVerifyingUser(null);
    },
    onError: (e) => {
        toast.error("Failed to update user: " + e.message);
    }
  });

  const handleVerify = (u, action) => {
    setVerifyingUser(u);
    setActionType(action);
    setReason('');
    setVerificationChecks({
      email_valid: false,
      no_spam_indicators: false,
      legitimate_request: false,
      reviewed_profile: false
    });
    // Pre-fill employment details
    setEmployeeId(u.employee_id || '');
    setJobTitle(u.job_title || 'None');
  };

  const handleSubmitAction = () => {
    if (actionType === 'approve') {
      approveMutation.mutate({ userId: verifyingUser.id, reason });
    } else if (actionType === 'reject') {
      rejectMutation.mutate({ userId: verifyingUser.id, reason });
    } else if (actionType === 'update_employment') {
        updateUserMutation.mutate({
            userId: verifyingUser.id,
            data: {
                employee_id: employeeId,
                job_title: jobTitle
            }
        });
    }
  };

  const handleBulkApprove = (targetUsers = null) => {
    const usersToApprove = targetUsers || allUsers.filter(u => 
      u.account_status === 'pending_approval' || u.account_status === 'rejected'
    );
    
    if (usersToApprove.length === 0) {
      toast.info('No users to approve');
      return;
    }

    if (!confirm(`Approve ${usersToApprove.length} user${usersToApprove.length > 1 ? 's' : ''}? They will all gain access to SafeNestt.`)) {
      return;
    }

    const userIds = usersToApprove.map(u => u.id);
    bulkApproveMutation.mutate({ userIds });
  };

  // Suspend user mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ userId }) => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'suspend-user',
        user_id: userId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`⚠️ User suspended: ${data.user_email}`);
    },
    onError: (error) => {
      toast.error('Failed to suspend user: ' + error.message);
    }
  });

  // Reactivate user mutation
  const reactivateMutation = useMutation({
    mutationFn: async ({ userId }) => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'reactivate-user',
        user_id: userId
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`✅ User reactivated: ${data.user_email}`);
    },
    onError: (error) => {
      toast.error('Failed to reactivate user: ' + error.message);
    }
  });

  const handleQuickApprove = (u) => {
    if (confirm(`Approve ${u.full_name || u.email}?`)) {
      approveMutation.mutate({ userId: u.id, reason: 'Quick approval by admin' });
    }
  };

  const handleQuickReject = (u) => {
    const reason = prompt(`Rejection reason for ${u.full_name || u.email}:`);
    if (reason !== null) {
      rejectMutation.mutate({ userId: u.id, reason: reason || 'Rejected by admin' });
    }
  };

  const handleSuspend = (u) => {
    if (confirm(`Suspend ${u.full_name || u.email}? They will lose access until reactivated.`)) {
      suspendMutation.mutate({ userId: u.id });
    }
  };

  const handleReactivate = (u) => {
    if (confirm(`Reactivate ${u.full_name || u.email}?`)) {
      reactivateMutation.mutate({ userId: u.id });
    }
  };

  const allChecksComplete = Object.values(verificationChecks).every(check => check === true);

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
    rejected: allUsers.filter(u => u.account_status === 'rejected').length,
    suspended: allUsers.filter(u => u.account_status === 'suspended').length
  };

  const pendingAndRejectedCount = stats.pending + stats.rejected;

  return (
    <AdminGate>
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-cyan-400" />
            User Management
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              ADMIN
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">Verify users and assign employee roles</p>
        </div>

        <div className="flex gap-2">
            <Button
                onClick={async () => {
                    const res = await base44.functions.invoke('mediaAI', { endpoint: 'generate_employee_ids' });
                    toast.success(res.data.message);
                    queryClient.invalidateQueries(['all-users']);
                }}
                variant="outline"
                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
            >
                <Briefcase className="w-4 h-4 mr-2" />
                Generate Employee IDs
            </Button>

            {pendingAndRejectedCount > 0 && (
            <Button
                onClick={handleBulkApprove}
                disabled={bulkApproveMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
                {bulkApproveMutation.isPending ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Approving...
                </>
                ) : (
                <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve All ({pendingAndRejectedCount})
                </>
                )}
            </Button>
            )}
        </div>
      </div>

      {/* Auto-Approval Settings */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  Automatic Approval
                  <Badge className={autoApprovalEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                    {autoApprovalEnabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </h3>
                <p className="text-xs text-gray-400">
                  {autoApprovalEnabled 
                    ? 'New users are automatically approved upon registration' 
                    : 'New users require manual admin approval'}
                </p>
              </div>
            </div>
            <Switch
              checked={autoApprovalEnabled}
              onCheckedChange={toggleAutoApproval}
              disabled={autoApprovalLoading}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </CardContent>
      </Card>

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
            <div className="flex gap-2 flex-wrap">
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
            <span>User Directory ({filteredUsers.length})</span>
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
                          <p className="text-white font-semibold flex items-center gap-2">
                              {u.full_name || 'No Name'}
                              {u.job_title && u.job_title !== 'None' && (
                                  <Badge className="bg-pink-500/20 text-pink-400 text-[10px] border-pink-500/50">
                                      {u.job_title}
                                  </Badge>
                              )}
                          </p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <p className="text-sm text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span>ID: {u.employee_id || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Registered: {new Date(u.created_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
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
                       {userCases[u.email]?.length > 0 && (
                         <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                           {userCases[u.email].length} case{userCases[u.email].length > 1 ? 's' : ''}
                         </Badge>
                       )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 items-center">
                      {u.account_status === 'pending_approval' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleQuickApprove(u)}
                            disabled={approveMutation.isPending}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickReject(u)}
                            disabled={rejectMutation.isPending}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      ) : u.account_status === 'active' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : u.account_status === 'suspended' ? (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          <Ban className="w-3 h-3 mr-1" />
                          Suspended
                        </Badge>
                      ) : u.account_status === 'rejected' ? (
                        <Button
                          size="sm"
                          onClick={() => handleQuickApprove(u)}
                          disabled={approveMutation.isPending}
                          className="bg-green-500/80 hover:bg-green-600"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Re-approve
                        </Button>
                      ) : null}

                      {/* Dropdown Menu for More Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="border-gray-600 text-gray-400 hover:bg-gray-700 px-2">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a2332] border-cyan-500/20 text-white">
                          <DropdownMenuLabel className="text-gray-400">User Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          
                          <DropdownMenuItem 
                            onClick={() => handleVerify(u, 'view')}
                            className="hover:bg-cyan-500/10 cursor-pointer"
                          >
                            <Eye className="w-4 h-4 mr-2 text-cyan-400" />
                            View Details
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            onClick={() => handleVerify(u, 'view')}
                            className="hover:bg-purple-500/10 cursor-pointer"
                          >
                            <Settings className="w-4 h-4 mr-2 text-purple-400" />
                            Manage Profile
                          </DropdownMenuItem>
                          
                          {u.account_status === 'pending_approval' && (
                            <>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => handleVerify(u, 'approve')}
                                className="hover:bg-green-500/10 cursor-pointer"
                              >
                                <UserCheck className="w-4 h-4 mr-2 text-green-400" />
                                Approve with Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleVerify(u, 'reject')}
                                className="hover:bg-red-500/10 cursor-pointer"
                              >
                                <UserX className="w-4 h-4 mr-2 text-red-400" />
                                Reject with Reason
                              </DropdownMenuItem>
                            </>
                          )}

                          {u.account_status === 'active' && (
                            <>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => handleSuspend(u)}
                                className="hover:bg-orange-500/10 cursor-pointer text-orange-400"
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            </>
                          )}

                          {u.account_status === 'suspended' && (
                            <>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => handleReactivate(u)}
                                className="hover:bg-green-500/10 cursor-pointer text-green-400"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reactivate User
                              </DropdownMenuItem>
                            </>
                          )}

                          {u.account_status === 'rejected' && (
                            <>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => handleQuickApprove(u)}
                                className="hover:bg-green-500/10 cursor-pointer text-green-400"
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Approve User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification/Manage Modal */}
      <Dialog open={!!verifyingUser} onOpenChange={() => setVerifyingUser(null)}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' && <CheckSquare className="w-5 h-5 text-green-400" />}
              {actionType === 'reject' && <UserX className="w-5 h-5 text-red-400" />}
              {actionType === 'view' && <Settings className="w-5 h-5 text-cyan-400" />}
              {actionType === 'approve' ? 'Verify & Approve User' : actionType === 'reject' ? 'Reject User' : 'Manage User'}
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
                  <div>
                    <p className="text-gray-400">Registered:</p>
                    <p className="text-white">{new Date(verifyingUser.created_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* User's Cases */}
              {userCases[verifyingUser.email]?.length > 0 && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
                  <h3 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Submitted Cases ({userCases[verifyingUser.email].length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {userCases[verifyingUser.email].map(c => (
                      <div key={c.id} className="p-3 bg-black/30 rounded border border-gray-700 text-xs">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-white font-semibold">{c.case_number}</span>
                          <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px]">{c.status}</Badge>
                        </div>
                        <p className="text-gray-400">{c.issue_type?.replace(/_/g, ' ')}</p>
                        <p className="text-red-400 font-semibold">${c.amount_lost?.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-orange-300 mt-3 p-2 bg-orange-950/20 rounded">
                    ⚠️ This user has active cases. Review carefully before rejecting.
                  </p>
                </div>
              )}

              {/* Verification Checklist - Only for Approve */}
              {actionType === 'approve' && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/20">
                  <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Verification Checklist
                  </h3>
                  <div className="space-y-3">
                     <div className="flex items-start gap-3">
                        <Checkbox id="email_valid" checked={verificationChecks.email_valid} onCheckedChange={(c) => setVerificationChecks(p => ({...p, email_valid: c}))} className="mt-1" />
                        <div><Label htmlFor="email_valid" className="text-white">Valid Email Domain</Label></div>
                     </div>
                     <div className="flex items-start gap-3">
                        <Checkbox id="legitimate" checked={verificationChecks.legitimate_request} onCheckedChange={(c) => setVerificationChecks(p => ({...p, legitimate_request: c}))} className="mt-1" />
                        <div><Label htmlFor="legitimate" className="text-white">Legitimate Request</Label></div>
                     </div>
                  </div>
                </div>
              )}

              {/* Employment Role Management - For Active Users or during approval */}
              {(actionType === 'view' || actionType === 'approve') && (
                  <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20">
                    <h3 className="text-sm font-semibold text-purple-400 mb-3 flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4" />
                        Employment Assignment
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-400 mb-1.5 block">Employee ID</Label>
                            <Input 
                                value={employeeId} 
                                onChange={(e) => setEmployeeId(e.target.value)}
                                placeholder="e.g. SN-001"
                                className="bg-black/20 border-gray-700 text-white"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-400 mb-1.5 block">Job Title / Role</Label>
                            <Select value={jobTitle} onValueChange={setJobTitle}>
                                <SelectTrigger className="bg-black/20 border-gray-700 text-white">
                                    <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="None">None (Regular User)</SelectItem>
                                    <SelectItem value="Media Director">Media Director</SelectItem>
                                    <SelectItem value="Security Analyst">Security Analyst</SelectItem>
                                    <SelectItem value="Investigator">Investigator</SelectItem>
                                    <SelectItem value="Staff">Staff</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {/* Admin Name Override */}
                    <div className="mt-4 p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                        <h3 className="text-sm font-semibold text-cyan-400 mb-3">Admin Profile Override</h3>
                        <div>
                            <Label className="text-gray-400 mb-1.5 block">Full Name (Force Update)</Label>
                            <Input 
                                defaultValue={verifyingUser.full_name}
                                onChange={(e) => verifyingUser.temp_full_name = e.target.value} // Temp direct mutation for simplicity in this view dialog
                                placeholder="Enter correct full name"
                                className="bg-black/20 border-gray-700 text-white"
                            />
                            <p className="text-xs text-gray-500 mt-1">Use this to correct names like "Six Dollar" directly.</p>
                        </div>
                    </div>
                  </div>
              )}

              {/* Reason/Notes Field */}
              {(actionType === 'approve' || actionType === 'reject') && (
                <div>
                  <Label className="text-white mb-2 block">
                    {actionType === 'approve' ? 'Approval Notes' : 'Rejection Reason'}
                  </Label>
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
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
                
                {actionType === 'view' ? (
                    <Button
                        onClick={() => {
                            setActionType('update_employment');
                            // Small timeout to allow state update before submit logic if needed, but here we call handle directly
                            // Actually we need to call the mutation directly or set action type then trigger via effect? 
                            // Easier to just call update mutation here:
                            updateUserMutation.mutate({
                                userId: verifyingUser.id,
                                data: { 
                                    employee_id: employeeId, 
                                    job_title: jobTitle,
                                    full_name: verifyingUser.temp_full_name !== undefined ? verifyingUser.temp_full_name : verifyingUser.full_name
                                }
                            });
                        }}
                        disabled={updateUserMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {updateUserMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
                        Update Profile & Details
                    </Button>
                ) : (
                  <Button
                    onClick={handleSubmitAction}
                    disabled={
                      approveMutation.isPending || 
                      rejectMutation.isPending
                    }
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
    </AdminGate>
  );
}