import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function UserGroupsManager() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const queryClient = useQueryClient();

  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups'],
    queryFn: () => base44.entities.UserGroup.list('-created_date')
  });

  const saveMutation = useMutation({
    mutationFn: async (groupData) => {
      if (editingGroup) {
        return base44.entities.UserGroup.update(editingGroup.id, groupData);
      }
      return base44.entities.UserGroup.create(groupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      setShowDialog(false);
      setEditingGroup(null);
      toast.success('Group saved');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.UserGroup.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('Group deleted');
    }
  });

  const [formData, setFormData] = useState({
    group_name: '',
    description: '',
    members: [],
    permissions: [],
    status: 'active'
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">User Groups</h2>
        <Button
          onClick={() => {
            setEditingGroup(null);
            setFormData({ group_name: '', description: '', members: [], permissions: [], status: 'active' });
            setShowDialog(true);
          }}
          className="bg-gradient-to-r from-green-500 to-emerald-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      <div className="grid gap-4">
        {groups.map((group) => (
          <Card key={group.id} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5 text-green-400" />
                    <h3 className="text-lg font-bold text-white">{group.group_name}</h3>
                    <Badge className="bg-green-500/20 text-green-400">
                      {group.members?.length || 0} members
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400">{group.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingGroup(group);
                      setFormData(group);
                      setShowDialog(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-500/20"
                    onClick={() => deleteMutation.mutate(group.id)}
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
            <DialogTitle>{editingGroup ? 'Edit' : 'Create'} User Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Group Name</Label>
              <Input
                value={formData.group_name}
                onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                className="bg-[#0f1419] border-cyan-500/20"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-[#0f1419] border-cyan-500/20"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>
                Save Group
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}