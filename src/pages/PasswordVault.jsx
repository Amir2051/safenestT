
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Plus, Search, Eye, EyeOff, Edit, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import PasswordItem from "../components/vault/PasswordItem.jsx";
import AddPasswordDialog from "../components/vault/AddPasswordDialog.jsx";

export default function PasswordVault() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: passwords = [], isLoading, refetch } = useQuery({
    queryKey: ['passwords'],
    queryFn: async () => {
      const result = await base44.entities.Password.list('-created_date');
      return result || [];
    },
  });

  const deletePasswordMutation = useMutation({
    mutationFn: async (id) => {
      const password = passwords.find(p => p.id === id);
      const result = await base44.entities.Password.delete(id);
      
      // Log password deletion
      await base44.entities.AuditLog.create({
        action_type: 'password_deleted',
        action_category: 'password',
        description: `Password deleted for ${password?.site_name || 'site'}`,
        metadata: {
          affected_item: password?.site_name
        },
        severity: 'info',
        status: 'success'
      });
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['passwords'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      refetch();
    },
  });

  const filteredPasswords = passwords.filter(pwd => {
    const matchesSearch = pwd.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pwd.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || pwd.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const strengthCounts = {
    weak: passwords.filter(p => p.password_strength === 'weak').length,
    medium: passwords.filter(p => p.password_strength === 'medium').length,
    strong: passwords.filter(p => p.password_strength === 'strong').length,
    excellent: passwords.filter(p => p.password_strength === 'excellent').length,
  };

  const categories = ['all', 'banking', 'email', 'social', 'shopping', 'work', 'other'];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Lock className="w-8 h-8 text-cyan-400" />
            Password Vault
          </h1>
          <p className="text-gray-400 mt-1">Securely manage all your passwords in one place</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Password
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Total Passwords</p>
            <p className="text-2xl font-bold text-white">{passwords.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Weak</p>
            <p className="text-2xl font-bold text-red-400">{strengthCounts.weak}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Medium</p>
            <p className="text-2xl font-bold text-yellow-400">{strengthCounts.medium}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Strong</p>
            <p className="text-2xl font-bold text-green-400">{strengthCounts.strong + strengthCounts.excellent}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search passwords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterCategory(cat)}
                  className={filterCategory === cat 
                    ? "bg-cyan-500 text-white" 
                    : "border-cyan-500/20 text-gray-300 hover:bg-cyan-500/10"
                  }
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weak Password Warning */}
      {strengthCounts.weak > 0 && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-white font-semibold">
                {strengthCounts.weak} weak password{strengthCounts.weak > 1 ? 's' : ''} detected
              </p>
              <p className="text-red-300 text-sm">Update them immediately to improve your security</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))
        ) : filteredPasswords.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No passwords found</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="outline"
              className="mt-4 border-cyan-500/20 text-cyan-400"
            >
              Add your first password
            </Button>
          </div>
        ) : (
          filteredPasswords.map((password) => (
            <PasswordItem
              key={password.id}
              password={password}
              onDelete={(id) => deletePasswordMutation.mutate(id)}
            />
          ))
        )}
      </div>

      {/* Add Password Dialog */}
      <AddPasswordDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
      />
    </div>
  );
}
