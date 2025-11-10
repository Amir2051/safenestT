import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Crown, Settings, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MemberCard({ member, isAdmin, isPrimaryHolder, groupId, onUpdate }) {
  const queryClient = useQueryClient();

  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('familyService', {
        endpoint: 'remove-member',
        group_id: groupId,
        member_email: member.member_email
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Member removed');
      queryClient.invalidateQueries({ queryKey: ['family-group'] });
      if (onUpdate) onUpdate();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove member');
    }
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'parent':
      case 'guardian':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'teen':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
      case 'child':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className="bg-[#0f1419] border-cyan-500/10 hover:border-cyan-500/30 transition-all">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {member.member_name[0]?.toUpperCase()}
              </span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white font-semibold truncate">{member.member_name}</p>
                {isPrimaryHolder && (
                  <Crown className="w-4 h-4 text-yellow-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{member.member_email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`${getRoleColor(member.member_role)} border text-xs`}>
                  {member.member_role}
                </Badge>
                {member.security_stats?.risk_score !== undefined && (
                  <Badge variant="outline" className="border-gray-500/20 text-xs">
                    <Shield className="w-3 h-3 mr-1" />
                    Score: <span className={getScoreColor(member.security_stats.risk_score)}>
                      {member.security_stats.risk_score}
                    </span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {isAdmin && !isPrimaryHolder && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm(`Remove ${member.member_name} from family group?`)) {
                    removeMemberMutation.mutate();
                  }
                }}
                disabled={removeMemberMutation.isPending}
              >
                {removeMemberMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Permissions Summary */}
        {member.permissions && (
          <div className="mt-3 pt-3 border-t border-cyan-500/10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${member.permissions.can_view_alerts ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-gray-400">View Alerts</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${member.permissions.can_access_shared_vault ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-gray-400">Shared Vault</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${member.permissions.can_invite_members ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-gray-400">Invite Members</span>
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${member.permissions.can_modify_settings ? 'bg-green-400' : 'bg-gray-600'}`} />
                <span className="text-gray-400">Modify Settings</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}