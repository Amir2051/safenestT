import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Gift, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ReferralCodeHandler() {
  const [user, setUser] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    // CRITICAL: Run once only to prevent infinite loops
    let isMounted = true;
    
    const checkReferral = async () => {
      try {
        const userData = await base44.auth.me();
        if (!isMounted) return;
        
        setUser(userData);

        // Don't show if user already has referral
        if (userData.referred_by) {
          return;
        }

        // Check sessionStorage first (from landing page)
        const pendingCode = sessionStorage.getItem('pending_referral_code');
        if (pendingCode) {
          setReferralCode(pendingCode);
          sessionStorage.removeItem('pending_referral_code');
          
          // FIXED: Only show prompt if onboarding is completed
          // Do NOT navigate - this causes redirect loops
          if (userData.onboarding_completed) {
            setShowPrompt(true);
          }
          return;
        }

        // Check URL for referral code
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        
        if (refCode) {
          setReferralCode(refCode.toUpperCase());
          
          // FIXED: Only show prompt if onboarding completed
          // Onboarding page handles its own referral logic
          if (userData.onboarding_completed) {
            setShowPrompt(true);
          }
        }
      } catch (error) {
        // User not authenticated - silently ignore
      }
    };

    checkReferral();
    
    return () => {
      isMounted = false;
    };
  }, []); // CRITICAL: Empty array - run once only

  const handleApply = async () => {
    if (!referralCode) {
      toast.error('Please enter a referral code');
      return;
    }

    setApplying(true);

    try {
      const response = await base44.functions.invoke('referralService', {
        endpoint: 'apply-signup',
        referral_code: referralCode.toUpperCase()
      });

      if (response.data.success) {
        setApplied(true);
        toast.success('🎉 ' + response.data.message, { duration: 8000 });
        
        // Update user state
        const updatedUser = await base44.auth.me();
        setUser(updatedUser);
        
        // Hide prompt after 5 seconds
        setTimeout(() => {
          setShowPrompt(false);
        }, 5000);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to apply referral code');
    } finally {
      setApplying(false);
    }
  };

  const handleSkip = () => {
    setShowPrompt(false);
    // Clear URL parameter
    const url = new URL(window.location);
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url);
  };

  if (!showPrompt || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-4">
      <Card className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 border-purple-500/50 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-6">
          {!applied ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      Referral Code Detected!
                    </h3>
                    <Badge className="mt-1 bg-green-500/20 text-green-300 border-green-500/50">
                      1 Month FREE
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <p className="text-purple-200 text-sm">
                    🎁 Apply this code to get <strong>1 month of FREE premium access</strong> to all SafeNest features!
                  </p>
                </div>

                <div>
                  <Input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="Referral Code"
                    className="bg-purple-950/50 border-purple-500/30 text-white uppercase h-11"
                    disabled={applying}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSkip}
                    variant="outline"
                    className="flex-1 border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
                    disabled={applying}
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={!referralCode || applying}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {applying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 mr-2" />
                        Apply Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400 animate-bounce" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">
                🎉 Bonus Applied!
              </h3>
              <p className="text-purple-200 text-sm">
                You now have 1 month of FREE premium access!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}