import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { toast } from 'sonner';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Referral Code Handler Component
 * Shows welcome banner and processes referral codes
 */
export default function ReferralCodeHandler() {
  const [showBanner, setShowBanner] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const detectAndProcessReferral = async () => {
      try {
        // Get referral code from URL
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');

        console.log('🔍 Checking for referral code:', refCode);

        if (refCode) {
          // Store referral code
          localStorage.setItem('pending_referral_code', refCode);
          localStorage.setItem('referral_code_timestamp', Date.now().toString());
          setReferralCode(refCode);
          console.log('✅ Stored referral code:', refCode);

          // Check if user is authenticated
          const isAuth = await base44.auth.isAuthenticated();
          console.log('🔐 User authenticated:', isAuth);

          if (isAuth) {
            // User is logged in - process referral
            await processReferralCode(refCode);
          } else {
            // User not logged in - show banner and wait for login
            setShowBanner(true);
            console.log('👋 Showing referral banner');
          }
        } else {
          // No ref in URL, check if there's a pending one and user just logged in
          const pendingCode = localStorage.getItem('pending_referral_code');
          const timestamp = localStorage.getItem('referral_code_timestamp');

          if (pendingCode) {
            console.log('📋 Found pending referral code:', pendingCode);

            // Check if code is still valid (24 hours)
            const codeAge = Date.now() - parseInt(timestamp || '0');
            const maxAge = 24 * 60 * 60 * 1000;

            if (codeAge > maxAge) {
              console.log('⏰ Referral code expired');
              localStorage.removeItem('pending_referral_code');
              localStorage.removeItem('referral_code_timestamp');
              return;
            }

            // Check if user is authenticated
            const isAuth = await base44.auth.isAuthenticated();

            if (isAuth) {
              setReferralCode(pendingCode);
              setShowBanner(true);
              // Delay processing to let user see banner
              setTimeout(() => processReferralCode(pendingCode), 2000);
            }
          }
        }
      } catch (error) {
        console.error('❌ Error detecting referral:', error);
      }
    };

    detectAndProcessReferral();
  }, []);

  const processReferralCode = async (code) => {
    if (processing) return;
    
    setProcessing(true);
    console.log('⚙️ Processing referral code:', code);

    try {
      const user = await base44.auth.me();

      // Check if already processed
      if (user.referred_by) {
        console.log('✅ Referral already processed');
        localStorage.removeItem('pending_referral_code');
        localStorage.removeItem('referral_code_timestamp');
        setShowBanner(false);
        return;
      }

      // Check if this is a new user (created in last 10 minutes)
      const userAge = Date.now() - new Date(user.created_date).getTime();
      const isNewUser = userAge < 10 * 60 * 1000;

      if (!isNewUser) {
        console.log('⚠️ User account too old for referral');
        localStorage.removeItem('pending_referral_code');
        localStorage.removeItem('referral_code_timestamp');
        setShowBanner(false);
        return;
      }

      console.log('✅ User is new, applying referral code');

      // Apply referral code
      await base44.auth.updateMe({ 
        referred_by: code,
        subscription_plan: 'trial',
        payment_status: 'trial',
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        trial_days_remaining: 3
      });

      // Create referral record
      await base44.entities.Referral.create({
        referrer_code: code,
        referred_email: user.email,
        referred_name: user.full_name,
        status: 'pending',
        signup_date: user.created_date,
        referral_link_clicked: true,
        link_click_date: localStorage.getItem('referral_code_timestamp') 
          ? new Date(parseInt(localStorage.getItem('referral_code_timestamp'))).toISOString()
          : new Date().toISOString()
      });

      console.log('🎉 Referral code processed successfully!');

      toast.success('🎉 Welcome! You got 3 days free trial from your referral!', {
        duration: 5000
      });

      localStorage.removeItem('pending_referral_code');
      localStorage.removeItem('referral_code_timestamp');

      // Keep banner visible for a moment to show success
      setTimeout(() => setShowBanner(false), 5000);

    } catch (error) {
      console.error('❌ Failed to process referral code:', error);
      toast.error('Failed to apply referral code');
    } finally {
      setProcessing(false);
    }
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-full px-4 animate-in slide-in-from-top duration-500">
      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-6 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowBanner(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
              <Gift className="w-7 h-7 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-white">You've Been Invited!</h3>
                <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 animate-pulse">
                  <Sparkles className="w-3 h-3 mr-1" />
                  3 Days Free
                </Badge>
              </div>
              
              <p className="text-purple-200 text-sm mb-3">
                Welcome to SafeNest! Your friend shared their referral code <strong className="text-white">{referralCode}</strong> with you.
              </p>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-2xl">🛡️</p>
                  <p className="text-xs text-purple-200">OWASP Protected</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-2xl">🔒</p>
                  <p className="text-xs text-purple-200">Password Vault</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="text-2xl">🌐</p>
                  <p className="text-xs text-purple-200">VPN Protection</p>
                </div>
              </div>

              {processing && (
                <div className="mt-3 flex items-center gap-2 text-sm text-purple-200">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-300" />
                  <span>Activating your free trial...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}