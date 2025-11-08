import React, { useEffect, useState } from 'react';
import { base44 } from "@/api/base44Client";
import { toast } from 'sonner';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, X, Check } from "lucide-react";

/**
 * Referral Code Handler Component
 * Allows users to enter referral codes manually
 */
export default function ReferralCodeHandler() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    const checkReferralStatus = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) return;

        const user = await base44.auth.me();
        
        // Check if user already has a referral
        if (user.referred_by) {
          console.log('✅ User already has referral:', user.referred_by);
          return;
        }

        // Check if this is a new user (created in last 5 minutes)
        const userAge = Date.now() - new Date(user.created_date).getTime();
        const isNewUser = userAge < 5 * 60 * 1000;

        if (isNewUser) {
          // Check for stored referral code
          const storedCode = localStorage.getItem('pending_referral_code');
          
          if (storedCode) {
            setReferralCode(storedCode);
            setInputCode(storedCode);
            setShowPrompt(true);
            console.log('👋 Showing referral prompt for new user');
          } else {
            // Show prompt to enter code manually
            setShowPrompt(true);
            console.log('👋 Showing referral input for new user');
          }
        }
      } catch (error) {
        console.error('❌ Error checking referral status:', error);
      }
    };

    const timer = setTimeout(checkReferralStatus, 2000);
    return () => clearTimeout(timer);
  }, []);

  const applyReferralCode = async () => {
    if (!inputCode || inputCode.length < 6) {
      toast.error('Please enter a valid referral code');
      return;
    }

    setProcessing(true);

    try {
      const user = await base44.auth.me();

      // Check if already applied
      if (user.referred_by) {
        toast.error('You already used a referral code');
        setShowPrompt(false);
        return;
      }

      // Apply the code
      await base44.auth.updateMe({ 
        referred_by: inputCode.toUpperCase(),
        subscription_plan: 'trial',
        payment_status: 'trial',
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        trial_days_remaining: 3
      });

      // Create referral record
      await base44.entities.Referral.create({
        referrer_code: inputCode.toUpperCase(),
        referred_email: user.email,
        referred_name: user.full_name,
        status: 'pending',
        signup_date: user.created_date,
        referral_link_clicked: false
      });

      setApplied(true);
      
      toast.success('🎉 Referral code applied! You got 3 days free premium!', {
        duration: 5000
      });

      localStorage.removeItem('pending_referral_code');
      localStorage.removeItem('referral_code_timestamp');

      setTimeout(() => setShowPrompt(false), 3000);

    } catch (error) {
      console.error('❌ Failed to apply referral code:', error);
      toast.error('Invalid referral code. Please check and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const skipReferral = () => {
    setShowPrompt(false);
    localStorage.removeItem('pending_referral_code');
    localStorage.removeItem('referral_code_timestamp');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4 animate-in slide-in-from-top duration-500">
      <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50 shadow-2xl backdrop-blur-sm">
        <CardContent className="p-6 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={skipReferral}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Gift className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">
              {referralCode ? "You've Been Invited!" : "Have a Referral Code?"}
            </h3>
            
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              Get 3 Days Free Premium
            </Badge>

            {!applied ? (
              <>
                <p className="text-purple-200 text-sm mb-4">
                  {referralCode 
                    ? `Your friend shared code ${referralCode} with you. Apply it to get 3 days free premium!`
                    : 'Enter a referral code from a friend to get 3 days of premium features free!'
                  }
                </p>

                <div className="flex gap-3 mb-4">
                  <Input
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    className="bg-white/10 border-purple-500/30 text-white text-center text-lg font-mono tracking-wider"
                    disabled={processing}
                  />
                  <Button
                    onClick={applyReferralCode}
                    disabled={processing || !inputCode}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 min-w-[100px]"
                  >
                    {processing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Apply
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipReferral}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Skip for now
                </Button>
              </>
            ) : (
              <div className="py-4">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <p className="text-green-400 font-bold text-lg">Success!</p>
                <p className="text-purple-200 text-sm mt-2">
                  Your 3-day premium trial is now active. Enjoy!
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}