import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Shield, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function SecurityPolicies() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const queryClient = useQueryClient();

  const { data: policies = [] } = useQuery({
    queryKey: ['security-policies'],
    queryFn: () => base44.entities.SecurityPolicy.list('-created_date')
  });

  const saveMutation = useMutation({
    mutationFn: async (policyData) => {
      if (editingPolicy) {
        return base44.entities.SecurityPolicy.update(editingPolicy.id, policyData);
      }
      return base44.entities.SecurityPolicy.create(policyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
      setShowDialog(false);
      setEditingPolicy(null);
      toast.success('Policy saved successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SecurityPolicy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-policies'] });
      toast.success('Policy deleted');
    }
  });

  const [formData, setFormData] = useState({
    policy_name: '',
    policy_type: 'password',
    rules: {},
    status: 'draft',
    priority: 0,
    enforcement_level: 'moderate'
  });

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData(policy);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Security Policies</h2>
        <Button
          onClick={() => {
            setEditingPolicy(null);
            setFormData({
              policy_name: '',
              policy_type: 'password',
              rules: {},
              status: 'draft',
              priority: 0,
              enforcement_level: 'moderate'
            });
            setShowDialog(true);
          }}
          className="bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Policy
        </Button>
      </div>

      <div className="grid gap-4">
        {policies.map((policy) => (
          <Card key={policy.id} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-white">{policy.policy_name}</h3>
                    <Badge className={
                      policy.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }>
                      {policy.status}
                    </Badge>
                    <Badge className="bg-purple-500/20 text-purple-400">
                      {policy.policy_type}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-400 mt-3">
                    <div>Enforcement: <span className="text-white">{policy.enforcement_level}</span></div>
                    <div>Priority: <span className="text-white">{policy.priority}</span></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(policy)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-500/20"
                    onClick={() => deleteMutation.mutate(policy.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit' : 'Create'} Security Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Policy Name</Label>
              <Input
                value={formData.policy_name}
                onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                className="bg-[#0f1419] border-cyan-500/20"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={formData.policy_type} onValueChange={(value) => setFormData({ ...formData, policy_type: value })}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="password">Password</SelectItem>
                  <SelectItem value="authentication">Authentication</SelectItem>
                  <SelectItem value="access">Access</SelectItem>
                  <SelectItem value="data_retention">Data Retention</SelectItem>
                  <SelectItem value="session">Session</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Enforcement</Label>
                <Select value={formData.enforcement_level} onValueChange={(value) => setFormData({ ...formData, enforcement_level: value })}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="advisory">Advisory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Policy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}