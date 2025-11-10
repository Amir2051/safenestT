import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Generate unique referral code
function generateReferralCode(name, email) {
  const namePart = name.substring(0, 3).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${namePart}${randomPart}`;
}

// Calculate referral tier
function calculateTier(referralsCount) {
  if (referralsCount >= 10) return 'platinum';
  if (referralsCount >= 5) return 'gold';
  if (referralsCount >= 2) return 'silver';
  return 'bronze';
}

// Calculate bonus months based on tier
function calculateBonusMonths(tier) {
  const bonusMap = {
    'bronze': 1,    // 1 month per referral
    'silver': 1.5,  // 1.5 months per referral
    'gold': 2,      // 2 months per referral
    'platinum': 3   // 3 months per referral
  };
  return bonusMap[tier] || 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Parse request
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { endpoint, ...params } = body;
    
    if (!endpoint) {
      return Response.json({ error: 'Missing endpoint parameter' }, { status: 400 });
    }
    
    console.log('Referral service request:', { endpoint });
    
    // POST /referral/generate-code - Generate referral code for user
    if (endpoint === 'generate-code') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Check if user already has a code
        if (user.referral_code) {
          return Response.json({
            referral_code: user.referral_code,
            message: 'Existing code returned'
          });
        }
        
        // Generate new code
        let code = generateReferralCode(user.full_name || 'USER', user.email);
        let attempts = 0;
        
        // Ensure uniqueness
        while (attempts < 10) {
          const existing = await base44.asServiceRole.entities.User.filter({
            referral_code: code
          });
          
          if (existing.length === 0) break;
          
          code = generateReferralCode(user.full_name || 'USER', user.email);
          attempts++;
        }
        
        if (attempts >= 10) {
          return Response.json({ error: 'Failed to generate unique code' }, { status: 500 });
        }
        
        // Update user with code
        await base44.auth.updateMe({
          referral_code: code
        });
        
        return Response.json({
          referral_code: code,
          message: 'Code generated successfully'
        });
      } catch (error) {
        console.error('Generate code error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /referral/validate-code - Validate referral code
    if (endpoint === 'validate-code') {
      try {
        const { code } = params;
        
        if (!code) {
          return Response.json({ error: 'Code required' }, { status: 400 });
        }
        
        // Find user with this code
        const users = await base44.asServiceRole.entities.User.filter({
          referral_code: code.toUpperCase()
        });
        
        if (users.length === 0) {
          return Response.json({
            valid: false,
            error: 'Invalid referral code'
          });
        }
        
        const referrer = users[0];
        
        return Response.json({
          valid: true,
          referrer_name: referrer.full_name,
          referrer_email: referrer.email,
          bonus_months: 1
        });
      } catch (error) {
        console.error('Validate code error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /referral/apply-signup - Apply referral on user sign-up
    if (endpoint === 'apply-signup') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const { referral_code } = params;
        
        if (!referral_code) {
          return Response.json({ error: 'Referral code required' }, { status: 400 });
        }
        
        // Check if user already has a referral applied
        if (user.referred_by) {
          return Response.json({ 
            error: 'Referral already applied to this account' 
          }, { status: 400 });
        }
        
        // Find referrer
        const referrers = await base44.asServiceRole.entities.User.filter({
          referral_code: referral_code.toUpperCase()
        });
        
        if (referrers.length === 0) {
          return Response.json({ 
            error: 'Invalid referral code' 
          }, { status: 400 });
        }
        
        const referrer = referrers[0];
        
        // Prevent self-referral
        if (referrer.email === user.email) {
          return Response.json({ 
            error: 'Cannot refer yourself' 
          }, { status: 400 });
        }
        
        // Calculate bonus period (1 month for new user)
        const trialEnds = new Date();
        trialEnds.setMonth(trialEnds.getMonth() + 1);
        
        // Update new user with bonus
        await base44.auth.updateMe({
          referred_by: referrer.email,
          referral_bonus_applied: true,
          bonus_months_granted: 1,
          subscription_plan: 'basic',
          payment_status: 'trial',
          trial_ends: trialEnds.toISOString()
        });
        
        // Calculate referrer's bonus based on tier
        const newReferralsCount = (referrer.referrals_count || 0) + 1;
        const newTier = calculateTier(newReferralsCount);
        const bonusMonths = calculateBonusMonths(newTier);
        
        // Extend referrer's trial/subscription
        let referrerTrialEnds = referrer.trial_ends 
          ? new Date(referrer.trial_ends) 
          : new Date();
        
        if (referrerTrialEnds < new Date()) {
          referrerTrialEnds = new Date();
        }
        
        referrerTrialEnds.setMonth(referrerTrialEnds.getMonth() + bonusMonths);
        
        // Update referrer
        await base44.asServiceRole.entities.User.update(referrer.id, {
          referrals_count: newReferralsCount,
          total_bonus_months_earned: (referrer.total_bonus_months_earned || 0) + bonusMonths,
          referral_tier: newTier,
          subscription_plan: 'basic',
          payment_status: 'trial',
          trial_ends: referrerTrialEnds.toISOString()
        });
        
        // Create referral record
        await base44.asServiceRole.entities.Referral.create({
          referrer_email: referrer.email,
          referrer_code: referral_code.toUpperCase(),
          referred_email: user.email,
          referred_name: user.full_name,
          referral_source: 'signup',
          status: 'completed',
          signup_date: new Date().toISOString(),
          verified_date: new Date().toISOString(),
          completed_date: new Date().toISOString(),
          rewarded_date: new Date().toISOString(),
          completion_action: 'signup_completed',
          bonus_granted: true,
          bonus_type: 'premium_days',
          bonus_value: bonusMonths * 30,
          bonus_months: bonusMonths
        });
        
        // Send notification email to referrer
        try {
          await base44.integrations.Core.SendEmail({
            to: referrer.email,
            subject: '🎉 Someone Used Your SafeNest Referral Code!',
            body: `
              <h2>Great News!</h2>
              <p><strong>${user.full_name}</strong> just signed up using your referral code!</p>
              <h3>Your Rewards:</h3>
              <ul>
                <li>✅ +${bonusMonths} month${bonusMonths > 1 ? 's' : ''} of free premium access</li>
                <li>🏆 Total Referrals: ${newReferralsCount}</li>
                <li>⭐ Tier: ${newTier.toUpperCase()}</li>
              </ul>
              <p>Keep sharing your code to unlock even more rewards!</p>
              <p><a href="https://app.safenest.com/referrals">View Your Referrals</a></p>
            `
          });
        } catch (emailError) {
          console.error('Failed to send referral notification:', emailError);
        }
        
        // Send welcome email to new user
        try {
          await base44.integrations.Core.SendEmail({
            to: user.email,
            subject: '🎁 Welcome to SafeNest - 1 Month Free!',
            body: `
              <h2>Welcome to SafeNest!</h2>
              <p>Thanks for signing up using ${referrer.full_name}'s referral code!</p>
              <h3>Your Bonus:</h3>
              <ul>
                <li>✅ 1 month of FREE premium access</li>
                <li>🛡️ Full access to all security features</li>
                <li>📊 No credit card required</li>
              </ul>
              <p>Your free month expires on: <strong>${trialEnds.toLocaleDateString()}</strong></p>
              <p><a href="https://app.safenest.com/dashboard">Get Started</a></p>
            `
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
        
        // Create audit log
        await base44.asServiceRole.entities.AuditLog.create({
          action_type: 'subscription_upgraded',
          action_category: 'subscription',
          description: 'Referral bonus applied on signup',
          metadata: {
            referrer: referrer.email,
            bonus_months: bonusMonths,
            new_tier: newTier
          },
          severity: 'info'
        });
        
        return Response.json({
          success: true,
          bonus_months: 1,
          trial_ends: trialEnds.toISOString(),
          referrer_name: referrer.full_name,
          message: `Welcome! You've received 1 month of free premium access thanks to ${referrer.full_name}!`
        });
      } catch (error) {
        console.error('Apply signup error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // GET /referral/stats - Get user's referral stats
    if (endpoint === 'stats') {
      try {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        // Get referral code (generate if doesn't exist)
        let referralCode = user.referral_code;
        if (!referralCode) {
          referralCode = generateReferralCode(user.full_name || 'USER', user.email);
          await base44.auth.updateMe({ referral_code: referralCode });
        }
        
        // Get referrals
        const referrals = await base44.entities.Referral.filter({
          referrer_email: user.email
        }, '-created_date', 50);
        
        const completedReferrals = referrals.filter(r => r.status === 'completed');
        const pendingReferrals = referrals.filter(r => r.status === 'pending' || r.status === 'verified');
        
        // Calculate next tier
        const currentCount = user.referrals_count || 0;
        const currentTier = user.referral_tier || 'bronze';
        
        let nextTier = null;
        let referralsNeeded = 0;
        
        if (currentCount < 2) {
          nextTier = 'silver';
          referralsNeeded = 2 - currentCount;
        } else if (currentCount < 5) {
          nextTier = 'gold';
          referralsNeeded = 5 - currentCount;
        } else if (currentCount < 10) {
          nextTier = 'platinum';
          referralsNeeded = 10 - currentCount;
        }
        
        return Response.json({
          referral_code: referralCode,
          total_referrals: user.referrals_count || 0,
          completed_referrals: completedReferrals.length,
          pending_referrals: pendingReferrals.length,
          total_bonus_months: user.total_bonus_months_earned || 0,
          current_tier: currentTier,
          next_tier: nextTier,
          referrals_needed: referralsNeeded,
          trial_ends: user.trial_ends,
          recent_referrals: completedReferrals.slice(0, 5).map(r => ({
            name: r.referred_name,
            date: r.completed_date,
            bonus_months: r.bonus_months
          }))
        });
      } catch (error) {
        console.error('Stats error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    // POST /referral/track-click - Track referral link click
    if (endpoint === 'track-click') {
      try {
        const { referral_code, utm_source, utm_medium, utm_campaign } = params;
        
        if (!referral_code) {
          return Response.json({ error: 'Referral code required' }, { status: 400 });
        }
        
        // Find referrer
        const users = await base44.asServiceRole.entities.User.filter({
          referral_code: referral_code.toUpperCase()
        });
        
        if (users.length === 0) {
          return Response.json({ error: 'Invalid referral code' }, { status: 404 });
        }
        
        const referrer = users[0];
        
        // Generate device fingerprint
        const userAgent = req.headers.get('user-agent') || 'unknown';
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const deviceId = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(userAgent + ip)
        );
        const deviceFingerprint = Array.from(new Uint8Array(deviceId))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        // Create click record
        await base44.asServiceRole.entities.ReferralClick.create({
          referral_code: referral_code.toUpperCase(),
          referrer_email: referrer.email,
          click_timestamp: new Date().toISOString(),
          visitor_ip: ip,
          visitor_device_id: deviceFingerprint,
          visitor_user_agent: userAgent,
          referral_source: 'general',
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null
        });
        
        return Response.json({
          success: true,
          referrer_name: referrer.full_name
        });
      } catch (error) {
        console.error('Track click error:', error);
        return Response.json({ error: error.message }, { status: 500 });
      }
    }
    
    return Response.json({ error: 'Unknown endpoint: ' + endpoint }, { status: 404 });
    
  } catch (error) {
    console.error('Referral service error:', error);
    return Response.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
  }
});