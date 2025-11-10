import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Shield, Lock, UserPlus, Loader2, AlertTriangle,
  Settings, Eye, TrendingUp, CheckCircle, Clock, Crown
} from "lucide-react";
import { toast } from "sonner";

import CreateFamilyDialog from "../components/family/CreateFamilyDialog.jsx";
import InviteMemberDialog from "../components/family/InviteMemberDialog.jsx";
import MemberCard from "../components/family/MemberCard.jsx";
import FamilyAlerts from "../components/family/FamilyAlerts.jsx";
import SharedVaultManager from "../components/family/SharedVaultManager.jsx";
import ParentalControlsPanel from "../components/family/ParentalControlsPanel.jsx";

export default function FamilyProtection() {
  const [user, setUser] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: familyData, isLoading: familyLoading, refetch } = useQuery({
    queryKey: ['family-group'],
    queryFn: async () => {
      const response = await base44.functions.invoke('familyService', {
        endpoint: 'my-group'
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const hasGroup = familyData?.has_group;
  const group = familyData?.group;
  const members = familyData?.members || [];
  const isAdmin = familyData?.is_admin;
  const myMembership = familyData?.my_membership;
  const pendingInvitations = familyData?.pending_invitations || [];
  const recentAlerts = familyData?.recent_alerts || [];

  const children = members.filter(m => m.member_role === 'child' || m.age_category === 'child_under_13');
  const teens = members.filter(m => m.member_role === 'teen' || m.age_category === 'teen_13_17');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-400" />
            Family Protection
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
              BETA
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            Protect your entire family with shared security and parental controls
          </p>
        </div>
        {hasGroup && isAdmin && (
          <Button
            onClick={() => setShowInviteDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        )}
      </div>

      {familyLoading ? (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading family data...</p>
          </CardContent>
        </Card>
      ) : !hasGroup ? (
        /* No Family Group - Create One */
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Protect Your Entire Family
              </h2>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Create a Family Protection group to monitor security across all family members, 
                share passwords securely, and enable parental controls for children.
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-lg px-8 h-12"
              >
                <Users className="w-5 h-5 mr-2" />
                Create Family Group
              </Button>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6">
                <Lock className="w-10 h-10 text-cyan-400 mb-4" />
                <h3 className="text-white font-bold mb-2">Shared Vaults</h3>
                <p className="text-gray-400 text-sm">
                  Securely share passwords and sensitive information with family members
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
              <CardContent className="p-6">
                <Eye className="w-10 h-10 text-purple-400 mb-4" />
                <h3 className="text-white font-bold mb-2">Activity Monitoring</h3>
                <p className="text-gray-400 text-sm">
                  Monitor children's online activity and block inappropriate content
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
              <CardContent className="p-6">
                <Shield className="w-10 h-10 text-green-400 mb-4" />
                <h3 className="text-white font-bold mb-2">Unified Protection</h3>
                <p className="text-gray-400 text-sm">
                  Single dashboard to manage security for all family members
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Has Family Group - Dashboard */
        <div className="space-y-6">
          {/* Group Info Card */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {group.group_name}
                      {isAdmin && (
                        <Crown className="w-5 h-5 text-yellow-400" />
                      )}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {group.current_members_count} / {group.max_members} members • 
                      {isAdmin ? ' You are the admin' : ` Admin: ${group.primary_account_holder}`}
                    </p>
                  </div>
                </div>
                <Badge className={`${
                  group.payment_status === 'active' 
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                } border`}>
                  {group.payment_status === 'trial' && group.trial_ends && (
                    <>Trial ends {new Date(group.trial_ends).toLocaleDateString()}</>
                  )}
                  {group.payment_status === 'active' && <>Active</>}
                  {group.payment_status === 'inactive' && <>Inactive</>}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6">
                <Users className="w-8 h-8 text-cyan-400 mb-2" />
                <p className="text-3xl font-bold text-cyan-400">{members.length}</p>
                <p className="text-sm text-gray-400">Family Members</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
              <CardContent className="p-6">
                <Clock className="w-8 h-8 text-yellow-400 mb-2" />
                <p className="text-3xl font-bold text-yellow-400">{pendingInvitations.length}</p>
                <p className="text-sm text-gray-400">Pending Invites</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
              <CardContent className="p-6">
                <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                <p className="text-3xl font-bold text-red-400">{recentAlerts.length}</p>
                <p className="text-sm text-gray-400">Active Alerts</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
              <CardContent className="p-6">
                <Shield className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-3xl font-bold text-green-400">
                  {Math.round(members.reduce((sum, m) => sum + (m.security_stats?.risk_score || 100), 0) / members.length)}
                </p>
                <p className="text-sm text-gray-400">Avg. Security</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="bg-[#1a2332] border border-cyan-500/20">
              <TabsTrigger value="members">
                <Users className="w-4 h-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger value="vault">
                <Lock className="w-4 h-4 mr-2" />
                Shared Vault
              </TabsTrigger>
              <TabsTrigger value="controls">
                <Eye className="w-4 h-4 mr-2" />
                Parental Controls
              </TabsTrigger>
              <TabsTrigger value="alerts">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4 mt-6">
              {/* Pending Invitations */}
              {pendingInvitations.length > 0 && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      Pending Invitations ({pendingInvitations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pendingInvitations.map(inv => (
                      <div key={inv.id} className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">{inv.invitee_name}</p>
                            <p className="text-xs text-gray-400">{inv.invitee_email}</p>
                            <p className="text-xs text-yellow-400 mt-1">
                              Expires: {new Date(inv.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-400">
                            Pending
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Active Members */}
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white">
                    Family Members ({members.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {members.map(member => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        isAdmin={isAdmin}
                        isPrimaryHolder={group.primary_account_holder === member.member_email}
                        groupId={group.group_id}
                        onUpdate={() => refetch()}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shared Vault Tab */}
            <TabsContent value="vault" className="mt-6">
              <SharedVaultManager
                groupId={group?.group_id}
                canAccess={myMembership?.permissions?.can_access_shared_vault}
                isAdmin={isAdmin}
              />
            </TabsContent>

            {/* Parental Controls Tab */}
            <TabsContent value="controls" className="mt-6">
              <ParentalControlsPanel
                groupId={group?.group_id}
                children={children}
                teens={teens}
                isAdmin={isAdmin}
              />
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="mt-6">
              <FamilyAlerts
                groupId={group?.group_id}
                alerts={recentAlerts}
                members={members}
              />
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="mt-6">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Family Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  {!isAdmin ? (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-300 text-sm">
                        ⚠️ Only the family admin can modify settings
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-[#0f1419] rounded-lg">
                        <p className="text-gray-400 text-sm">Family Group ID:</p>
                        <p className="text-white font-mono text-sm">{group.group_id}</p>
                      </div>
                      
                      <div className="p-4 bg-[#0f1419] rounded-lg">
                        <p className="text-gray-400 text-sm">Subscription Plan:</p>
                        <p className="text-white font-semibold">{group.subscription_plan}</p>
                      </div>

                      <div className="p-4 bg-[#0f1419] rounded-lg">
                        <p className="text-gray-400 text-sm">Member Limit:</p>
                        <p className="text-white font-semibold">
                          {group.current_members_count} / {group.max_members} members
                        </p>
                      </div>

                      <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <p className="text-cyan-300 text-sm">
                          ℹ️ Advanced settings management coming soon
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Dialogs */}
      <CreateFamilyDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          refetch();
          setShowCreateDialog(false);
        }}
      />

      {hasGroup && (
        <InviteMemberDialog
          open={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
          groupId={group?.group_id}
          groupName={group?.group_name}
          currentCount={group?.current_members_count}
          maxMembers={group?.max_members}
          onSuccess={() => {
            refetch();
            setShowInviteDialog(false);
          }}
        />
      )}
    </div>
  );
}