import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, CheckCircle, Loader2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function FamilyInvite() {
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      // Get token from URL
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      try {
        // Check if user is authenticated
        const userData = await base44.auth.me();
        setUser(userData);
        
        // Find invitation
        const invitations = await base44.entities.FamilyInvitation.filter({
          invitation_token: token,
          status: 'pending'
        });

        if (invitations.length === 0) {
          setError('Invitation not found or already used');
          setLoading(false);
          return;
        }

        const inv = invitations[0];

        // Check if expired
        if (new Date(inv.expires_at) < new Date()) {
          setError('Invitation has expired');
          setLoading(false);
          return;
        }

        // Check if invitation is for this user
        if (userData.email !== inv.invitee_email) {
          setError(`This invitation is for ${inv.invitee_email}. Please sign in with that account.`);
          setLoading(false);
          return;
        }

        setInvitation(inv);
        setLoading(false);
      } catch (authError) {
        // Not authenticated - store token and redirect to login
        sessionStorage.setItem('pending_family_invitation', token);
        base44.auth.redirectToLogin(`/family-invite?token=${token}`);
      }
    };

    init();
  }, []);

  const acceptInvitationMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('familyService', {
        endpoint: 'accept-invitation',
        invitation_token: invitation.invitation_token
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('🎉 ' + data.message, { duration: 5000 });
      setTimeout(() => {
        navigate(createPageUrl('FamilyProtection'));
      }, 2000);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to accept invitation');
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30 max-w-md">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Invalid Invitation</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button
              onClick={() => navigate(createPageUrl('Dashboard'))}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-purple-500/30">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Family Invitation
          </h1>
          <p className="text-gray-400">
            Join a SafeNest Family Protection group
          </p>
        </div>

        {/* Invitation Details */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white text-xl">
              {invitation.invited_by_name} invited you!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-start gap-4">
                <Users className="w-10 h-10 text-purple-400 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-bold text-lg mb-2">
                    Join as: {invitation.member_role.charAt(0).toUpperCase() + invitation.member_role.slice(1)}
                  </h3>
                  {invitation.message && (
                    <div className="p-3 bg-[#0f1419] rounded-lg mb-3">
                      <p className="text-gray-300 text-sm italic">"{invitation.message}"</p>
                    </div>
                  )}
                  <ul className="text-purple-300 text-sm space-y-2">
                    <li>✅ Shared family security monitoring</li>
                    <li>✅ Real-time breach alerts for all members</li>
                    {invitation.permissions?.can_access_shared_vault && (
                      <li>✅ Access to family password vault</li>
                    )}
                    <li>✅ Coordinated protection for your family</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Your Role</p>
                <Badge className="bg-purple-500/20 text-purple-400">
                  {invitation.member_role}
                </Badge>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Expires</p>
                <p className="text-white text-sm font-semibold">
                  {new Date(invitation.expires_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-white font-semibold">Your Permissions:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {invitation.permissions?.can_view_alerts ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gray-300">View Alerts</span>
                </div>
                <div className="flex items-center gap-2">
                  {invitation.permissions?.can_access_shared_vault ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gray-300">Shared Vault</span>
                </div>
                <div className="flex items-center gap-2">
                  {invitation.permissions?.can_invite_members ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gray-300">Invite Members</span>
                </div>
                <div className="flex items-center gap-2">
                  {invitation.permissions?.can_modify_settings ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-gray-300">Modify Settings</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => acceptInvitationMutation.mutate()}
              disabled={acceptInvitationMutation.isPending}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 h-12 text-lg"
            >
              {acceptInvitationMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>

            <p className="text-center text-xs text-gray-500">
              By accepting, you agree to share security monitoring data with your family admin
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}