import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Loader2, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function InviteMemberDialog({ open, onClose, groupId, groupName, currentCount, maxMembers, onSuccess }) {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [memberRole, setMemberRole] = useState('parent');
  const [ageCategory, setAgeCategory] = useState('adult');
  const [message, setMessage] = useState('');
  const [invitationLink, setInvitationLink] = useState('');

  const inviteMemberMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('familyService', {
        endpoint: 'invite-member',
        group_id: groupId,
        invitee_email: inviteeEmail,
        invitee_name: inviteeName,
        member_role: memberRole,
        age_category: ageCategory,
        message: message
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('✅ ' + data.message);
      setInvitationLink(data.invitation_link);
      
      // Reset form after showing link for a moment
      setTimeout(() => {
        setInviteeEmail('');
        setInviteeName('');
        setMemberRole('parent');
        setAgeCategory('adult');
        setMessage('');
        setInvitationLink('');
        if (onSuccess) onSuccess();
      }, 5000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send invitation');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inviteeEmail || !inviteeName) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (currentCount >= maxMembers) {
      toast.error(`Family group limit reached (${maxMembers} members max)`);
      return;
    }
    
    inviteMemberMutation.mutate();
  };

  const copyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      toast.success('Invitation link copied!');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-purple-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-purple-400" />
            Invite Family Member
          </DialogTitle>
        </DialogHeader>

        {!invitationLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-cyan-300 text-sm">
                Inviting to: <strong>{groupName}</strong>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {currentCount} / {maxMembers} members
              </p>
            </div>

            <div>
              <Label className="text-gray-300">Member Name</Label>
              <Input
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                placeholder="John Doe"
                className="bg-[#0f1419] border-purple-500/20 text-white mt-2"
                disabled={inviteMemberMutation.isPending}
              />
            </div>

            <div>
              <Label className="text-gray-300">Email Address</Label>
              <Input
                type="email"
                value={inviteeEmail}
                onChange={(e) => setInviteeEmail(e.target.value)}
                placeholder="john@example.com"
                className="bg-[#0f1419] border-purple-500/20 text-white mt-2"
                disabled={inviteMemberMutation.isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300">Role</Label>
                <Select value={memberRole} onValueChange={setMemberRole}>
                  <SelectTrigger className="bg-[#0f1419] border-purple-500/20 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="guardian">Guardian</SelectItem>
                    <SelectItem value="teen">Teen</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Age Category</Label>
                <Select value={ageCategory} onValueChange={setAgeCategory}>
                  <SelectTrigger className="bg-[#0f1419] border-purple-500/20 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adult">Adult (18+)</SelectItem>
                    <SelectItem value="teen_13_17">Teen (13-17)</SelectItem>
                    <SelectItem value="child_under_13">Child (Under 13)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-300">Personal Message (Optional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                className="bg-[#0f1419] border-purple-500/20 text-white mt-2 h-20"
                disabled={inviteMemberMutation.isPending}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-500/20"
                disabled={inviteMemberMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMemberMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {inviteMemberMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-green-300 font-semibold mb-2">Invitation Sent!</p>
              <p className="text-sm text-gray-400">
                An email has been sent to {inviteeEmail}
              </p>
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Invitation Link</Label>
              <div className="flex gap-2">
                <Input
                  value={invitationLink}
                  readOnly
                  className="bg-[#0f1419] border-purple-500/20 text-white"
                />
                <Button
                  onClick={copyLink}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Or share this link directly with {inviteeName}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}