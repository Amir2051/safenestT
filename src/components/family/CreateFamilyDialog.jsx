import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CreateFamilyDialog({ open, onClose, onSuccess }) {
  const [groupName, setGroupName] = useState('');

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('familyService', {
        endpoint: 'create-group',
        group_name: groupName,
        max_members: 5
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('🎉 ' + data.message);
      setGroupName('');
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create family group');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      toast.error('Please enter a family name');
      return;
    }
    createGroupMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Create Family Group
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-purple-300 text-sm">
              Create a family group to share security monitoring, vaults, and enable parental controls.
            </p>
          </div>

          <div>
            <Label className="text-gray-300">Family Name</Label>
            <Input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., The Smith Family"
              className="bg-[#0f1419] border-purple-500/20 text-white mt-2"
              autoFocus
              disabled={createGroupMutation.isPending}
            />
          </div>

          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-cyan-300 text-sm">
              ℹ️ Includes 30-day free trial • Up to 5 family members
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-500/20"
              disabled={createGroupMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!groupName.trim() || createGroupMutation.isPending}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {createGroupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Group'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}