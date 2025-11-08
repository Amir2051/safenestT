import React, { useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { toast } from 'sonner';

/**
 * Referral Code Handler Component
 * Automatically processes referral codes after user authentication
 * Add this to your Layout or Dashboard
 */
export default function ReferralCodeHandler() {
  useEffect(() => {
    const processReferralCode = async () => {
      try {
        // Check if user is authenticated
        const isAuth = await base44.auth.isAuthenticated();
        
        if (!isAuth) return;

        // Check for pending referral code
        const pendingCode = localStorage.getItem('pending_referral_code');
        const timestamp = localStorage.getItem('referral_code_timestamp');

        if (!pendingCode) return;

        // Check if code is still valid (24 hours)
        const codeAge = Date.now() - parseInt(timestamp || '0');
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (codeAge > maxAge) {
          localStorage.removeItem('pending_referral_code');
          localStorage.removeItem('referral_code_timestamp');
          return;
        }

        // Get current user
        const user = await base44.auth.me();

        // Check if already processed
        if (user.referred_by) {
          localStorage.removeItem('pending_referral_code');
          localStorage.removeItem('referral_code_timestamp');
          return;
        }

        // Check if this is a new user (created in last 5 minutes)
        const userAge = Date.now() - new Date(user.created_date).getTime();
        const isNewUser = userAge < 5 * 60 * 1000;

        if (!isNewUser) {
          // User not new enough, clear code
          localStorage.removeItem('pending_referral_code');
          localStorage.removeItem('referral_code_timestamp');
          return;
        }

        // Apply referral code
        await base44.auth.updateMe({ 
          referred_by: pendingCode 
        });

        // Create referral record
        await base44.entities.Referral.create({
          referrer_code: pendingCode,
          referred_email: user.email,
          referred_name: user.full_name,
          status: 'pending',
          signup_date: user.created_date,
          signup_ip: 'unknown', // Would be captured server-side
          referral_link_clicked: true,
          link_click_date: new Date(parseInt(timestamp)).toISOString()
        });

        // Show success message
        toast.success(`🎉 Referral code applied! You'll get 3 days free trial!`, {
          duration: 5000
        });

        // Clear from localStorage
        localStorage.removeItem('pending_referral_code');
        localStorage.removeItem('referral_code_timestamp');

        console.log('✅ Referral code processed:', pendingCode);

      } catch (error) {
        console.error('Failed to process referral code:', error);
      }
    };

    // Process with delay to ensure user is fully loaded
    const timer = setTimeout(processReferralCode, 2000);

    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
}