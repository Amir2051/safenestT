import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Shield, AlertTriangle } from "lucide-react";

export default function SharedVaultManager({ groupId, canAccess, isAdmin }) {
  if (!canAccess && !isAdmin) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/30">
        <CardContent className="p-12 text-center">
          <Lock className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Access Restricted</h3>
          <p className="text-gray-400">
            You don't have permission to access the shared family vault.
            Contact your family admin for access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Lock className="w-6 h-6 text-purple-400" />
          Shared Family Vault
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Coming Soon</h3>
          <p className="text-gray-400 mb-6">
            Shared vault functionality will be available in the next update.
            You'll be able to securely share passwords and sensitive data with family members.
          </p>
          <div className="max-w-md mx-auto space-y-2 text-sm text-gray-400 text-left">
            <p>✓ End-to-end encryption</p>
            <p>✓ Per-member access control</p>
            <p>✓ Audit trail for all access</p>
            <p>✓ Shamir Secret Sharing for key management</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}