import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Users, Search, MoreHorizontal, UserPlus, Key, 
  Shield, ShieldAlert, Mail, Loader2, CheckCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  
  // New User Form
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user"
  });

  const queryClient = useQueryClient();

  // Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'list-users'
      });
      return response.data.users || [];
    }
  });

  // Add User Mutation
  const addUserMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'add-user',
        ...userData
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      setShowAddUserDialog(false);
      setNewUser({ email: "", password: "", full_name: "", role: "user" });
      toast.success("User created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create user: " + error.message);
    }
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }) => {
      const response = await base44.functions.invoke('adminUserService', {
        endpoint: 'reset-password',
        user_id: userId,
        new_password: newPassword
      });
      if (response.data.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      setShowResetDialog(false);
      setSelectedUser(null);
      setNewPassword("");
      toast.success("Password reset successfully");
    },
    onError: (error) => {
      toast.error("Failed to reset password: " + error.message);
    }
  });

  // Approve/Reject Mutations (Reused from existing service)
  const approveMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.functions.invoke('adminUserService', {
        endpoint: 'approve-user',
        user_id: userId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-list'] });
      toast.success("User approved");
    }
  });

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = (e) => {
    e.preventDefault();
    if (newUser.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    addUserMutation.mutate(newUser);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    resetPasswordMutation.mutate({ 
      userId: selectedUser.id, 
      newPassword 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#0f1419] border-gray-700 text-white"
          />
        </div>
        
        <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input 
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  className="bg-[#0f1419] border-gray-700"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="bg-[#0f1419] border-gray-700"
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input 
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="bg-[#0f1419] border-gray-700"
                  placeholder="Minimum 6 characters"
                  required
                />
              </div>
              <div>
                <Label>Role</Label>
                <select 
                  className="w-full bg-[#0f1419] border border-gray-700 rounded-md p-2 text-sm"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={addUserMutation.isPending}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  {addUserMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-[#1a2332] border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-[#0f1419]">
                <TableHead className="text-gray-400">User</TableHead>
                <TableHead className="text-gray-400">Role</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Joined</TableHead>
                <TableHead className="text-right text-gray-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-gray-800 hover:bg-[#0f1419]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                          {user.full_name?.charAt(0) || user.email?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.full_name || 'No Name'}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Admin</Badge>
                      ) : (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">User</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.account_status === 'active' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Active</Badge>
                      ) : user.account_status === 'pending' ? (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Pending</Badge>
                      ) : (
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/50">{user.account_status || 'Unknown'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {new Date(user.created_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a2332] border-gray-700 text-gray-200">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(user);
                              setShowResetDialog(true);
                            }}
                          >
                            <Key className="w-4 h-4 mr-2" /> Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          {user.account_status === 'pending' && (
                            <>
                              <DropdownMenuItem 
                                onClick={() => approveMutation.mutate(user.id)}
                                className="text-green-400 focus:text-green-400 focus:bg-green-500/10"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" /> Approve
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                            <ShieldAlert className="w-4 h-4 mr-2" /> Suspend Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-[#1a2332] border-red-500/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-red-400" />
              Reset Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Enter a new password for <span className="font-bold text-white">{selectedUser?.email}</span>.
              They will receive an email notification about this change.
            </p>
            <div>
              <Label>New Password</Label>
              <Input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#0f1419] border-gray-700"
                placeholder="Minimum 6 characters"
              />
            </div>
            <DialogFooter>
              <Button 
                onClick={handleResetPassword} 
                disabled={resetPasswordMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {resetPasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}