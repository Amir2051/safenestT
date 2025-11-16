import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function InviteGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Admin always has access
      if (userData.role === 'admin' || userData.is_admin) {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Check if user has been invited
      if (userData.invited_by || userData.invite_accepted_at) {
        setHasAccess(true);
        setChecking(false);
        return;
      }

      // Check URL for invite code
      const urlParams = new URLSearchParams(window.location.search);
      const inviteCode = urlParams.get('invite');

      if (inviteCode) {
        await verifyAndAcceptInvite(inviteCode, userData);
      } else {
        setHasAccess(false);
        setChecking(false);
      }
    } catch (error) {
      setChecking(false);
      setHasAccess(false);
    }
  };

  const verifyAndAcceptInvite = async (inviteCode, userData) => {
    setVerifying(true);
    
    try {
      const verifyResponse = await base44.functions.invoke('inviteService', {
        endpoint: 'verify-invite',
        invite_code: inviteCode
      });

      if (!verifyResponse.data.valid) {
        toast.error(verifyResponse.data.error || 'Invalid invitation');
        setHasAccess(false);
        setVerifying(false);
        setChecking(false);
        return;
      }

      // Accept the invitation
      const acceptResponse = await base44.functions.invoke('inviteService', {
        endpoint: 'accept-invite',
        invite_code: inviteCode,
        user_email: userData.email,
        user_name: userData.full_name || userData.email
      });

      if (acceptResponse.data.success) {
        toast.success('🎉 Welcome to SafeNestt!', {
          description: 'Your invitation has been accepted'
        });
        
        // Remove invite param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setHasAccess(true);
      } else {
        toast.error(acceptResponse.data.error || 'Failed to accept invitation');
        setHasAccess(false);
      }
    } catch (error) {
      toast.error('Error processing invitation');
      setHasAccess(false);
    }
    
    setVerifying(false);
    setChecking(false);
  };

  if (checking || verifying) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {verifying ? 'Verifying Invitation...' : 'Checking Access...'}
            </h2>
            <p className="text-gray-400">Please wait a moment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30 max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
              Invitation Required
            </h2>
            
            <p className="text-gray-300 mb-6">
              SafeNestt is a private, invitation-only security platform. 
              You need a valid invitation link to access the app.
            </p>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-yellow-400 mb-1">
                    How to Get Access:
                  </p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Request an invitation from safenestt.com</li>
                    <li>• Contact the SafeNestt team</li>
                    <li>• Ask an existing member to invite you</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={() => base44.auth.logout()}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has access, render the app
  return <>{children}</>;
}