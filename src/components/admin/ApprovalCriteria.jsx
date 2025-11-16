import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Zap, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ApprovalCriteria() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [] } = useQuery({
    queryKey: ['approval-rules'],
    queryFn: () => base44.entities.ApprovalRule.list('-priority')
  });

  const saveMutation = useMutation({
    mutationFn: async (ruleData) => {
      if (editingRule) {
        return base44.entities.ApprovalRule.update(editingRule.id, ruleData);
      }
      return base44.entities.ApprovalRule.create(ruleData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      setShowDialog(false);
      setEditingRule(null);
      toast.success('Rule saved successfully');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ApprovalRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-rules'] });
      toast.success('Rule deleted');
    }
  });

  const [formData, setFormData] = useState({
    rule_name: '',
    rule_type: 'manual_review',
    conditions: {},
    action: 'flag_review',
    status: 'active',
    priority: 0
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Approval Criteria</h2>
        <Button
          onClick={() => {
            setEditingRule(null);
            setFormData({
              rule_name: '',
              rule_type: 'manual_review',
              conditions: {},
              action: 'flag_review',
              status: 'active',
              priority: 0
            });
            setShowDialog(true);
          }}
          className="bg-gradient-to-r from-purple-500 to-pink-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Rule
        </Button>
      </div>

      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-bold text-white">{rule.rule_name}</h3>
                    <Badge className={
                      rule.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }>
                      {rule.status}
                    </Badge>
                    <Badge className="bg-cyan-500/20 text-cyan-400">
                      {rule.action}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    Type: <span className="text-white">{rule.rule_type}</span> • 
                    Priority: <span className="text-white">{rule.priority}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingRule(rule);
                      setFormData(rule);
                      setShowDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-500/20"
                    onClick={() => deleteMutation.mutate(rule.id)}
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
        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit' : 'Create'} Approval Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input
                value={formData.rule_name}
                onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                className="bg-[#0f1419] border-cyan-500/20"
              />
            </div>
            <div>
              <Label>Action</Label>
              <Select value={formData.action} onValueChange={(value) => setFormData({ ...formData, action: value })}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="approve">Auto Approve</SelectItem>
                  <SelectItem value="reject">Auto Reject</SelectItem>
                  <SelectItem value="flag_review">Flag for Review</SelectItem>
                  <SelectItem value="request_info">Request Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}