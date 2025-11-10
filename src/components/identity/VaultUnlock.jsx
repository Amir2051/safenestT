import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, AlertTriangle, Clock, Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VaultUnlock({ vault, open, onClose, onUnlocked }) {
  const [pin, setPin] = useState('');
  
  const queryClient = useQueryClient();

  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (!pin) {
        throw new Error('Please enter your PIN');
      }

      console.log('Unlocking vault...');

      // Hash PIN (same as setup)
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + vault.vault_salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const vault_pin_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      console.log('Calling vaultService.unlock...');

      const response = await base44.functions.invoke('vaultService', {
        endpoint: 'unlock',
        vault_pin_hash: vault_pin_hash
      });

      console.log('Unlock response:', response);

      if (response.status >= 400) {
        throw new Error(response.data?.error || 'Failed to unlock vault');
      }

      if (!response.data) {
        throw new Error('Empty response from server');
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      if (!response.data.success) {
        throw new Error('Unlock failed');
      }

      return response.data;
    },
    onSuccess: (data) => {
      console.log('✅ Vault unlocked successfully');
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast.success(`🔓 Vault unlocked! Auto-locks in ${Math.floor(data.expires_in / 60)} minutes`);
      setPin('');
      if (onUnlocked) onUnlocked(data);
      if (onClose) onClose();
    },
    onError: (error) => {
      console.error('❌ Unlock error:', error);
      toast.error(error.message || 'Failed to unlock vault');
      setPin('');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Unlock form submitted');
    unlockMutation.mutate();
  };

  if (!vault) return null;

  const isLockedOut = vault.is_locked_out && 
                      vault.lockout_until && 
                      new Date(vault.lockout_until) > new Date();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-purple-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Lock className="w-6 h-6 text-purple-400" />
            Unlock Privacy Vault
          </DialogTitle>
        </DialogHeader>

        {isLockedOut ? (
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-red-300 font-semibold mb-1">Vault Locked</p>
                  <p className="text-sm text-gray-400">
                    Too many failed attempts. Your vault is temporarily locked for security.
                  </p>
                  <p className="text-xs text-red-400 mt-2">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Locked until: {new Date(vault.lockout_until).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={onClose} className="w-full" variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <p className="text-purple-300 text-sm">
                🔒 Enter your 6-digit PIN to unlock encrypted identity data
              </p>
            </div>

            <div>
              <Input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter PIN"
                maxLength={8}
                autoFocus
                disabled={unlockMutation.isPending}
                className="bg-[#0f1419] border-purple-500/20 text-white text-center text-3xl tracking-widest h-16"
              />
              {vault.failed_attempts > 0 && (
                <p className="text-xs text-orange-400 mt-2">
                  ⚠️ {vault.failed_attempts} failed attempt(s). {5 - vault.failed_attempts} remaining.
                </p>
              )}
            </div>

            {vault.biometric_enabled && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-purple-500/20 text-purple-400"
                disabled
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Use Biometric (Coming Soon)
              </Button>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>
                <Clock className="w-3 h-3 inline mr-1" />
                Auto-locks in {vault.session_timeout_minutes} min
              </span>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                AES-256
              </Badge>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-500/20"
                disabled={unlockMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!pin || unlockMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                {unlockMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 mr-2" />
                    Unlock
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}