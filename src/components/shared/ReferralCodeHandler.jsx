import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Gift, X, CheckCircle, Home, Users } from "lucide-react";
import { toast } from "sonner";

// Generate device fingerprint
const getDeviceFingerprint = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('fingerprint', 2, 2);
  const fingerprint = canvas.toDataURL();
  return btoa(fingerprint + navigator.userAgent + navigator.language).slice(0, 32);
};

export default function ReferralCodeHandler() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [referralSource, setReferralSource] = useState('general');
  const [referrerName, setReferrerName] = useState('');

  useEffect(() => {
    const checkReferral = async () => {
      try {
        const user = await base44.auth.me();
        const alreadyApplied = localStorage.getItem('referral_applied');
        
        if (alreadyApplied) return;

        // Check URL for referral code
        const urlParams = new URLSearchParams(window.location.search);
        const urlReferralCode = urlParams.get('ref');
        
        if (urlReferralCode) {
          // Track click
          const deviceId = getDeviceFingerprint();
          const path = window.location.pathname;
          let source = 'general';
          
          if (path.includes('title-protection')) source = 'title_protection';
          else if (path.includes('legal-support')) source = 'legal_support';
          else if (path.includes('vpn')) source = 'vpn';
          else if (path.includes('password')) source = 'password_vault';

          // Find referrer
          try {
            const referrers = await base44.entities.User.filter({ referral_code: urlReferralCode.toUpperCase() });
            
            if (referrers.length > 0) {
              const referrer = referrers[0];
              setReferrerName(referrer.full_name);

              // Check for fraud - same device/IP recently
              const recentClicks = await base44.entities.ReferralClick.filter({
                visitor_device_id: deviceId,
                referral_code: urlReferralCode.toUpperCase()
              });

              const fraudFlags = [];
              let fraudScore = 0;

              // Detect repeated clicks from same device
              if (recentClicks.length > 3) {
                fraudFlags.push('multiple_clicks_same_device');
                fraudScore += 40;
              }

              // Self-referral detection
              if (referrer.email === user.email) {
                fraudFlags.push('self_referral');
                fraudScore = 100;
              }

              // Track click
              await base44.entities.ReferralClick.create({
                referral_code: urlReferralCode.toUpperCase(),
                referrer_email: referrer.email,
                click_timestamp: new Date().toISOString(),
                visitor_ip: 'hidden',
                visitor_device_id: deviceId,
                visitor_user_agent: navigator.userAgent,
                referral_source: source,
                utm_source: urlParams.get('utm_source'),
                utm_medium: urlParams.get('utm_medium'),
                utm_campaign: urlParams.get('utm_campaign'),
                fraud_score: fraudScore,
                fraud_flags: fraudFlags
              });

              localStorage.setItem('pending_referral_code', urlReferralCode.toUpperCase());
              localStorage.setItem('referral_source', source);
              localStorage.setItem('referral_device_id', deviceId);
              
              setReferralCode(urlReferralCode.toUpperCase());
              setReferralSource(source);
            }
          } catch (error) {
            console.error('Failed to track referral click:', error);
          }
        }

        // Check if user is new and has pending code
        const isNewUser = new Date() - new Date(user.created_date) < 24 * 60 * 60 * 1000;
        const pendingCode = localStorage.getItem('pending_referral_code');
        const pendingSource = localStorage.getItem('referral_source') || 'general';
        
        if (isNewUser && (urlReferralCode || pendingCode)) {
          setReferralCode(urlReferralCode?.toUpperCase() || pendingCode);
          setReferralSource(pendingSource);
          setShowPrompt(true);
        }
      } catch (error) {
        // User not logged in - still track click
        const urlParams = new URLSearchParams(window.location.search);
        const urlReferralCode = urlParams.get('ref');
        
        if (urlReferralCode) {
          const deviceId = getDeviceFingerprint();
          const path = window.location.pathname;
          let source = 'general';
          
          if (path.includes('title-protection')) source = 'title_protection';
          else if (path.includes('legal-support')) source = 'legal_support';

          localStorage.setItem('pending_referral_code', urlReferralCode.toUpperCase());
          localStorage.setItem('referral_source', source);
          localStorage.setItem('referral_device_id', deviceId);
        }
      }
    };

    checkReferral();
  }, []);

  const applyReferralCode = async () => {
    if (!referralCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }

    setApplying(true);

    try {
      const user = await base44.auth.me();
      const deviceId = localStorage.getItem('referral_device_id') || getDeviceFingerprint();

      // Find referrer by code
      const referrers = await base44.entities.User.filter({ referral_code: referralCode.toUpperCase() });
      
      if (referrers.length === 0) {
        toast.error('Invalid referral code');
        setApplying(false);
        return;
      }

      const referrer = referrers[0];

      if (referrer.email === user.email) {
        toast.error('You cannot use your own referral code');
        setApplying(false);
        return;
      }

      // Fraud detection
      const existingReferrals = await base44.entities.Referral.filter({
        referred_email: user.email
      });

      if (existingReferrals.length > 0) {
        toast.error('You already have a referral applied');
        setApplying(false);
        return;
      }

      // Check device fingerprint abuse
      const sameDeviceReferrals = await base44.entities.Referral.filter({
        signup_device_id: deviceId
      });

      const fraudFlags = [];
      if (sameDeviceReferrals.length > 2) {
        fraudFlags.push('device_reuse');
      }

      // Create referral record
      const referral = await base44.entities.Referral.create({
        referrer_email: referrer.email,
        referrer_code: referralCode.toUpperCase(),
        referred_email: user.email,
        referred_name: user.full_name,
        referral_source: referralSource,
        status: 'verified',
        signup_date: new Date().toISOString(),
        verified_date: new Date().toISOString(),
        referral_link_clicked: true,
        link_click_date: new Date().toISOString(),
        signup_device_id: deviceId,
        fraud_flags: fraudFlags
      });

      // Update click record with conversion
      const clicks = await base44.entities.ReferralClick.filter({
        referral_code: referralCode.toUpperCase(),
        visitor_device_id: deviceId,
        converted: false
      });

      if (clicks.length > 0) {
        const click = clicks[clicks.length - 1];
        const conversionTime = (new Date() - new Date(click.click_timestamp)) / (1000 * 60 * 60);
        
        await base44.entities.ReferralClick.update(click.id, {
          converted: true,
          converted_email: user.email,
          conversion_date: new Date().toISOString(),
          conversion_time_hours: conversionTime
        });
      }

      // Update referrer stats
      const currentStats = referrer.referral_stats || {};
      await base44.entities.User.update(referrer.id, {
        referral_stats: {
          ...currentStats,
          total_referrals: (currentStats.total_referrals || 0) + 1,
          pending_referrals: (currentStats.pending_referrals || 0) + 1
        }
      });

      // Send notification to referrer
      await base44.integrations.Core.SendEmail({
        to: referrer.email,
        subject: '🎉 New Referral Signup!',
        body: `Great news! ${user.full_name} just signed up using your referral code ${referralCode}.\n\nService: ${
          referralSource === 'title_protection' ? '🏠 Title Protection (30 credits on completion)' :
          referralSource === 'legal_support' ? '⚖️ Legal Support (50 credits on completion)' :
          '🎯 General (credits on first action)'
        }\n\nThey're verified! You'll earn your reward once they complete their first action.\n\nSafeNest Referral Program`
      });

      // Log audit
      await base44.entities.AuditLog.create({
        action_type: 'settings_updated',
        action_category: 'settings',
        description: `Referral code applied: ${referralCode}`,
        metadata: {
          referrer_email: referrer.email,
          referral_source: referralSource,
          fraud_flags: fraudFlags
        },
        severity: 'info',
        status: 'success'
      });

      localStorage.setItem('referral_applied', 'true');
      setApplied(true);
      
      toast.success(`✅ Referral from ${referrer.full_name} applied! Complete an action to earn them rewards.`, { duration: 5000 });
      
      setTimeout(() => setShowPrompt(false), 3000);
    } catch (error) {
      console.error('Referral error:', error);
      toast.error('Failed to apply referral code');
    }

    setApplying(false);
  };

  const skipReferral = () => {
    localStorage.setItem('referral_applied', 'true');
    localStorage.removeItem('pending_referral_code');
    localStorage.removeItem('referral_source');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  const getServiceIcon = () => {
    if (referralSource === 'title_protection') return <Home className="w-6 h-6 text-cyan-400" />;
    if (referralSource === 'legal_support') return <Users className="w-6 h-6 text-purple-400" />;
    return <Gift className="w-6 h-6 text-purple-400" />;
  };

  const getServiceBadge = () => {
    if (referralSource === 'title_protection') {
      return (
        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border">
          🏠 Title Protection Referral
        </Badge>
      );
    }
    if (referralSource === 'legal_support') {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border">
          ⚖️ Legal Support Referral
        </Badge>
      );
    }
    return (
      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border">
        🎯 General Referral
      </Badge>
    );
  };

  return (
    <div className="fixed top-20 right-4 z-50 max-w-md animate-slide-in-right">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {getServiceIcon()}
              <div>
                <h3 className="text-white font-bold text-lg">
                  {referrerName ? `Referred by ${referrerName}!` : 'Referral Code Detected!'}
                </h3>
                {getServiceBadge()}
              </div>
            </div>
            {!applied && (
              <button
                onClick={skipReferral}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {applied ? (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3 animate-bounce" />
              <p className="text-green-400 font-bold mb-2">✅ Referral Applied!</p>
              <p className="text-gray-300 text-sm">
                {referralSource === 'title_protection' 
                  ? 'Add your first property to earn rewards for your referrer!'
                  : referralSource === 'legal_support'
                  ? 'Request a legal consultation to earn rewards for your referrer!'
                  : 'Complete your first action to earn rewards for your referrer!'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <p className="text-purple-300 text-sm">
                  <strong>🎁 {referrerName ? `${referrerName} invited you!` : 'Referral Benefits:'}</strong>
                </p>
                <ul className="text-xs text-gray-300 mt-2 space-y-1">
                  {referralSource === 'title_protection' && (
                    <>
                      <li>✓ Help {referrerName || 'your friend'} earn 30 credits when you add a property</li>
                      <li>✓ Get free Title Protection forever</li>
                      <li>✓ AI monitoring + Legal Support included</li>
                    </>
                  )}
                  {referralSource === 'legal_support' && (
                    <>
                      <li>✓ Help {referrerName || 'your friend'} earn 50 credits when you get legal help</li>
                      <li>✓ Free attorney consultation (30 min)</li>
                      <li>✓ Document templates + secure storage</li>
                    </>
                  )}
                  {referralSource === 'general' && (
                    <>
                      <li>✓ Help {referrerName || 'your friend'} earn rewards on your first action</li>
                      <li>✓ Full SafeNest access - 100% FREE</li>
                      <li>✓ All security features included</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <Input
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="Enter referral code"
                  className="bg-[#0f1419] border-purple-500/20 text-white text-center text-lg font-mono tracking-widest"
                  maxLength={10}
                />

                <div className="flex gap-2">
                  <Button
                    onClick={skipReferral}
                    variant="outline"
                    className="flex-1 border-gray-500/20 text-gray-400"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={applyReferralCode}
                    disabled={applying || !referralCode}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {applying ? 'Applying...' : 'Apply Code'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}