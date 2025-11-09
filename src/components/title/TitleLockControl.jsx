import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, Unlock, Shield, AlertTriangle, CheckCircle,
  Key, Clock, Mail
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TitleLockControl({ property, isPremium }) {
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');
  const [unlockReason, setUnlockReason] = useState('');

  const queryClient = useQueryClient();

  const { data: locks = [] } = useQuery({
    queryKey: ['title-locks', property.id],
    queryFn: () => base44.entities.TitleLock.filter({ 
      property_id: property.id,
      lock_status: 'active'
    }),
    initialData: [],
  });

  const activeLock = locks[0];
  const isLocked = property.is_locked && activeLock;

  const enableLockMutation = useMutation({
    mutationFn: async () => {
      // Update property
      await base44.entities.Property.update(property.id, {
        is_locked: true,
        lock_enabled_date: new Date().toISOString()
      });

      // Create lock record
      await base44.entities.TitleLock.create({
        property_id: property.id,
        property_owner: property.property_owner,
        property_address: property.address,
        lock_status: 'active',
        locked_at: new Date().toISOString(),
        verification_method: 'email',
        auto_relock_enabled: true
      });

      // Create alert
      await base44.entities.Alert.create({
        alert_type: 'permission',
        severity: 'info',
        title: '🔒 Title Lock Enabled',
        message: `Title Lock has been activated for ${property.address}. No ownership changes can be made without your verification.`,
        status: 'active',
        affected_item: property.address,
        recommendation: 'Your property is now protected. You will receive alerts for any unlock attempts.'
      });

      // Send email
      await base44.integrations.Core.SendEmail({
        to: property.property_owner,
        subject: '🔒 Title Lock Activated - SafeNest',
        body: `Title Lock has been successfully enabled for your property at ${property.address}.\n\nYour property is now protected against unauthorized ownership changes. Any attempt to unlock will require verification via email OTP.\n\nSafeNest Title Protection`
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'security',
        description: `Title Lock enabled for property: ${property.address}`,
        metadata: {
          property_id: property.id,
          address: property.address
        },
        severity: 'info',
        status: 'success'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['title-locks'] });
      toast.success('🔒 Title Lock enabled! Your property is now protected.');
    }
  });

  const requestUnlockMutation = useMutation({
    mutationFn: async () => {
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Update lock with OTP
      await base44.entities.TitleLock.update(activeLock.id, {
        lock_status: 'pending_unlock',
        unlock_requested_at: new Date().toISOString(),
        unlock_verification_code: otp,
        unlock_code_expires: expiresAt.toISOString(),
        unlock_reason: unlockReason
      });

      // Send OTP email
      await base44.integrations.Core.SendEmail({
        to: property.property_owner,
        subject: '🔓 Title Lock Unlock Request - Verification Required',
        body: `An unlock request was made for your property at ${property.address}.\n\nYour verification code is: ${otp}\n\nThis code expires in 15 minutes.\n\nIf you did not request this unlock, please ignore this email and contact support immediately.\n\nSafeNest Title Protection`
      });

      // Create alert
      await base44.entities.Alert.create({
        alert_type: 'permission',
        severity: 'high',
        title: '🔓 Title Lock Unlock Requested',
        message: `Unlock request received for ${property.address}. Check your email for verification code.`,
        status: 'active',
        affected_item: property.address,
        recommendation: 'Verify this request in your email. Code expires in 15 minutes.'
      });

      setShowUnlockDialog(true);
    },
    onSuccess: () => {
      toast.success('📧 Verification code sent to your email!');
    }
  });

  const verifyUnlockMutation = useMutation({
    mutationFn: async () => {
      if (unlockCode !== activeLock.unlock_verification_code) {
        // Increment attempts
        await base44.entities.TitleLock.update(activeLock.id, {
          unlock_attempts: (activeLock.unlock_attempts || 0) + 1
        });
        throw new Error('Invalid verification code');
      }

      // Check expiration
      if (new Date() > new Date(activeLock.unlock_code_expires)) {
        throw new Error('Verification code expired. Request a new one.');
      }

      // Unlock property
      await base44.entities.Property.update(property.id, {
        is_locked: false
      });

      // Update lock record
      await base44.entities.TitleLock.update(activeLock.id, {
        lock_status: 'unlocked',
        unlocked_at: new Date().toISOString()
      });

      // Create alert
      await base44.entities.Alert.create({
        alert_type: 'permission',
        severity: 'medium',
        title: '🔓 Title Lock Removed',
        message: `Title Lock has been removed from ${property.address}. Property changes are now possible.`,
        status: 'active',
        affected_item: property.address,
        recommendation: 'Re-enable Title Lock when you no longer need to make changes.'
      });

      // Send confirmation email
      await base44.integrations.Core.SendEmail({
        to: property.property_owner,
        subject: '🔓 Title Lock Unlocked - SafeNest',
        body: `Title Lock has been successfully removed from ${property.address}.\n\nReason: ${unlockReason}\n\nYour property is no longer protected by Title Lock. We recommend re-enabling it once you've completed your intended changes.\n\nSafeNest Title Protection`
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'security',
        description: `Title Lock removed for property: ${property.address}`,
        metadata: {
          property_id: property.id,
          reason: unlockReason
        },
        severity: 'medium',
        status: 'success'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['title-locks'] });
      setShowUnlockDialog(false);
      setUnlockCode('');
      setUnlockReason('');
      toast.success('🔓 Title Lock removed successfully!');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (!isPremium) {
    return (
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold mb-1">🔒 Title Lock (Premium Feature)</h3>
              <p className="text-sm text-purple-300">
                Digitally lock your property to prevent unauthorized changes. Requires email verification to unlock.
              </p>
            </div>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500">
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 ${
        isLocked ? 'border-green-500/50' : 'border-gray-700'
      }`}>
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isLocked ? <Lock className="w-5 h-5 text-green-400" /> : <Unlock className="w-5 h-5 text-gray-400" />}
              Title Lock
            </span>
            <Badge className={`${
              isLocked 
                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
            } border`}>
              {isLocked ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLocked ? (
            <>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-white font-semibold">Property Locked</p>
                    <p className="text-sm text-green-300">
                      Your property is protected against unauthorized changes
                    </p>
                  </div>
                </div>
                {activeLock && (
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>Locked since: {new Date(activeLock.locked_at).toLocaleString()}</p>
                    <p>Verification: {activeLock.verification_method === 'email' ? '📧 Email OTP' : '📱 Phone OTP'}</p>
                    <p>Auto-relock: {activeLock.auto_relock_enabled ? '✓ Enabled' : '✗ Disabled'}</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-sm text-cyan-300 mb-2">
                  <strong>🛡️ Active Protection:</strong>
                </p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>✓ Blocks unauthorized ownership changes</li>
                  <li>✓ Prevents new liens or mortgages</li>
                  <li>✓ Requires email verification to unlock</li>
                  <li>✓ Alerts you of bypass attempts</li>
                </ul>
              </div>

              <Button
                onClick={() => requestUnlockMutation.mutate()}
                disabled={requestUnlockMutation.isPending}
                variant="outline"
                className="w-full border-orange-500/20 text-orange-400 hover:bg-orange-500/10"
              >
                {requestUnlockMutation.isPending ? (
                  <>
                    <Mail className="w-4 h-4 mr-2 animate-pulse" />
                    Sending Verification Code...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Request Unlock
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                  <div>
                    <p className="text-white font-semibold">Property Not Locked</p>
                    <p className="text-sm text-orange-300">
                      Enable Title Lock to protect against unauthorized changes
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <p className="text-sm text-cyan-300 mb-2">
                  <strong>🔒 What Title Lock Does:</strong>
                </p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• Prevents new deeds or ownership transfers</li>
                  <li>• Blocks unauthorized liens or mortgages</li>
                  <li>• Requires your email verification to unlock</li>
                  <li>• Auto-relocks after 24 hours for security</li>
                  <li>• Alerts you of any bypass attempts</li>
                </ul>
              </div>

              <Button
                onClick={() => enableLockMutation.mutate()}
                disabled={enableLockMutation.isPending}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {enableLockMutation.isPending ? (
                  <>
                    <Lock className="w-4 h-4 mr-2 animate-spin" />
                    Enabling Title Lock...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Enable Title Lock
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Unlock Verification Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent className="bg-[#1a2332] border-orange-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-orange-400" />
              Verify Unlock Request
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-sm text-orange-300">
                We've sent a 6-digit verification code to your email. Enter it below to unlock your property.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Reason for Unlock:</label>
              <Input
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g., Refinancing my mortgage"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-gray-300 text-sm font-semibold">Verification Code:</label>
              <Input
                value={unlockCode}
                onChange={(e) => setUnlockCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="bg-[#0f1419] border-cyan-500/20 text-white text-center text-2xl tracking-widest font-mono"
                required
              />
              <p className="text-xs text-gray-400">
                <Clock className="w-3 h-3 inline mr-1" />
                Code expires in 15 minutes
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowUnlockDialog(false)}
                variant="outline"
                className="flex-1 border-gray-500/20 text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={() => verifyUnlockMutation.mutate()}
                disabled={verifyUnlockMutation.isPending || !unlockCode || !unlockReason}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {verifyUnlockMutation.isPending ? (
                  <>
                    <Key className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock Property
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}