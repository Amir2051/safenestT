import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Lock, Shield, Key, Fingerprint, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VaultSetup({ user, onComplete }) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(5);
  const [step, setStep] = useState(1);

  const queryClient = useQueryClient();

  const setupVaultMutation = useMutation({
    mutationFn: async () => {
      if (pin !== confirmPin) {
        throw new Error('PINs do not match');
      }

      if (pin.length < 6) {
        throw new Error('PIN must be at least 6 digits');
      }

      // Generate salt (client-side)
      const salt = btoa(crypto.getRandomValues(new Uint8Array(32)).join(','));
      
      // Hash PIN (client-side - in production use Argon2)
      const encoder = new TextEncoder();
      const data = encoder.encode(pin + salt);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const vault_pin_hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      console.log('Setting up vault...', { 
        vault_salt: salt.substring(0, 20) + '...', 
        biometric_enabled: biometricEnabled,
        session_timeout_minutes: sessionTimeout 
      });

      // Call vault service
      const response = await base44.functions.invoke('vaultService', {
        endpoint: 'setup',
        vault_salt: salt,
        vault_pin_hash: vault_pin_hash,
        biometric_enabled: biometricEnabled,
        session_timeout_minutes: sessionTimeout
      });

      console.log('Vault setup response:', response);

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Failed to create vault');
      }

      return response.data;
    },
    onSuccess: (data) => {
      console.log('Vault created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast.success('🔒 Privacy Vault created successfully!');
      setPin('');
      setConfirmPin('');
      setStep(1);
      if (onComplete) {
        setTimeout(() => onComplete(), 500);
      }
    },
    onError: (error) => {
      console.error('Vault setup error:', error);
      toast.error(error.message || 'Failed to create vault. Please try again.');
    }
  });

  const handleSubmit = () => {
    console.log('Submitting vault setup...');
    setupVaultMutation.mutate();
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl">Set Up Privacy Vault</h2>
            <p className="text-sm text-gray-400 mt-1">
              Step {step} of 3: Protect your sensitive identity data
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === 1 && (
          <>
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div>
                  <p className="text-cyan-300 font-semibold mb-1">What is Privacy Vault?</p>
                  <p className="text-sm text-gray-400">
                    Your Privacy Vault encrypts all personally identifiable information (PII) 
                    with a secure PIN. Only you can unlock and view raw data like email addresses, 
                    SSNs, or credit card numbers.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-[#0f1419] rounded-lg border border-purple-500/10">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">AES-256 Encryption</p>
                  <p className="text-xs text-gray-400">Military-grade encryption for your data</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#0f1419] rounded-lg border border-purple-500/10">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">Zero-Knowledge</p>
                  <p className="text-xs text-gray-400">We never store your PIN or decryption keys</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-[#0f1419] rounded-lg border border-purple-500/10">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-white font-semibold">Audit Trail</p>
                  <p className="text-xs text-gray-400">Every vault access is logged for security</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 h-12"
            >
              Continue to PIN Setup
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-yellow-300 font-semibold mb-1">⚠️ Important</p>
                  <p className="text-sm text-gray-400">
                    Choose a strong PIN you'll remember. If you lose it, your encrypted data 
                    cannot be recovered (zero-knowledge architecture).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Create Vault PIN (6+ digits)</Label>
                <Input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit PIN"
                  maxLength={8}
                  className="bg-[#0f1419] border-purple-500/20 text-white text-center text-2xl tracking-widest h-14 mt-2"
                />
              </div>

              <div>
                <Label className="text-gray-300">Confirm PIN</Label>
                <Input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter PIN"
                  maxLength={8}
                  className="bg-[#0f1419] border-purple-500/20 text-white text-center text-2xl tracking-widest h-14 mt-2"
                />
              </div>

              {pin && confirmPin && (
                <div className={`text-sm ${pin === confirmPin ? 'text-green-400' : 'text-red-400'}`}>
                  {pin === confirmPin ? '✓ PINs match' : '✗ PINs do not match'}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1 border-gray-500/20"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!pin || !confirmPin || pin !== confirmPin || pin.length < 6}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-purple-500/10">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-6 h-6 text-purple-400" />
                  <div>
                    <p className="text-white font-semibold">Biometric Unlock</p>
                    <p className="text-xs text-gray-400">Use fingerprint or Face ID</p>
                  </div>
                </div>
                <Switch
                  checked={biometricEnabled}
                  onCheckedChange={setBiometricEnabled}
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-2 block">Auto-Lock Timeout</Label>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(Number(e.target.value))}
                  className="w-full bg-[#0f1419] border border-purple-500/20 text-white rounded-lg px-4 py-3"
                >
                  <option value={1}>1 minute</option>
                  <option value={5}>5 minutes (recommended)</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Vault will automatically lock after this period of inactivity
                </p>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-300 text-sm">
                ✓ Ready to create your Privacy Vault with PIN protection
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="flex-1 border-gray-500/20"
                disabled={setupVaultMutation.isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={setupVaultMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 h-12"
              >
                {setupVaultMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Vault...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Create Vault
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}