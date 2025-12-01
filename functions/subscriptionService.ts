import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { endpoint, ...params } = await req.json();

    switch (endpoint) {
      case 'init-trial': {
        // Initialize 7-day trial for new user
        const trialStart = new Date();
        const trialEnd = new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        await base44.auth.updateMe({
          subscription_plan: 'trial',
          subscription_status: 'trial',
          trial_started: trialStart.toISOString(),
          trial_ends: trialEnd.toISOString(),
          has_payment_method: false,
          payment_required: true,
          trial_notification_sent: {
            trial_start: false,
            trial_48h: false,
            trial_24h: false,
            trial_ended: false
          }
        });

        return Response.json({
          success: true,
          trial_ends: trialEnd.toISOString()
        });
      }

      case 'set-payment-method': {
        // Called after user adds payment via Stripe
        await base44.auth.updateMe({
          has_payment_method: true,
          stripe_customer_id: params.customer_id,
          payment_method_id: params.payment_method_id,
          last_payment_method_update: new Date().toISOString()
        });

        // Complete referral if user was referred
        try {
          await base44.functions.invoke('referralService', {
            endpoint: 'complete-referral'
          });
        } catch (refError) {
          console.error('Failed to complete referral:', refError);
        }

        return Response.json({ success: true });
      }

      case 'get-subscription-info': {
        // Ensure Stripe customer exists
        let stripeCustomerId = user.stripe_customer_id;
        if (!stripeCustomerId && user.email) {
           const customers = await stripe.customers.list({ email: user.email, limit: 1 });
           if (customers.data.length > 0) {
             stripeCustomerId = customers.data[0].id;
           } else {
             const newCustomer = await stripe.customers.create({
               email: user.email,
               name: user.full_name,
               metadata: { user_id: user.id }
             });
             stripeCustomerId = newCustomer.id;
           }
           await base44.auth.updateMe({ stripe_customer_id: stripeCustomerId });
        }

        let paymentMethods = [];
        if (stripeCustomerId) {
           const methods = await stripe.paymentMethods.list({
             customer: stripeCustomerId,
             type: 'card',
           });
           paymentMethods = methods.data;
        }

        const now = new Date();
        const trialEnd = user.trial_ends ? new Date(user.trial_ends) : null;
        const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))) : 0;
        const hoursLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60))) : 0;

        const isTrialCancelled = user.subscription_status === 'trial_cancelled';
        const trialStillActive = isTrialCancelled && trialEnd > now;

        return Response.json({
          subscription_plan: user.subscription_plan,
          subscription_status: user.subscription_status,
          has_payment_method: user.has_payment_method || false,
          payment_required: user.payment_required || false,
          trial_ends: user.trial_ends,
          next_billing_date: user.next_billing_date,
          cancelled_at: user.cancelled_at,
          days_left: daysLeft,
          hours_left: hoursLeft,
          billing_cycle_anchor: user.billing_cycle_anchor,
          payment_failed: user.payment_failed,
          is_trial_active: (user.subscription_status === 'trial' || isTrialCancelled) && trialEnd > now,
          is_trial_cancelled: isTrialCancelled,
          trial_still_active: trialStillActive,
          is_premium: user.subscription_plan === 'basic' || user.subscription_plan === 'elite',
          can_access_premium: ((user.subscription_status === 'trial' || user.subscription_status === 'active') && user.has_payment_method) || trialStillActive,
          requires_payment: !user.has_payment_method && user.payment_required,
          payment_methods: paymentMethods
        });
      }

      case 'check-trial-notifications': {
        // Check if we need to send any trial notifications
        if (!user.trial_ends || user.subscription_status !== 'trial') {
          return Response.json({ notifications_sent: [] });
        }

        const now = new Date();
        const trialEnd = new Date(user.trial_ends);
        const hoursLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60));
        const notificationsSent = user.trial_notification_sent || {};
        const toSend = [];

        // Trial start notification
        if (!notificationsSent.trial_start) {
          toSend.push({
            id: crypto.randomUUID(),
            title: '🎉 Welcome to SafeNestt!',
            message: 'Your 14-day free trial has started. Add your payment method to continue after the trial.',
            type: 'premium',
            priority: 'normal',
            actionUrl: '/PaymentOnboarding',
            timestamp: Date.now(),
            read: false
          });
          notificationsSent.trial_start = true;
        }

        // 48 hours before trial ends
        if (hoursLeft <= 48 && hoursLeft > 24 && !notificationsSent.trial_48h && !user.has_payment_method) {
          toSend.push({
            id: crypto.randomUUID(),
            title: '⏰ Trial Ending in 2 Days',
            message: 'Add your payment method now to continue your protection after the trial.',
            type: 'premium',
            priority: 'high',
            actionUrl: '/PaymentOnboarding',
            timestamp: Date.now(),
            read: false
          });
          notificationsSent.trial_48h = true;
        }

        // 24 hours before trial ends
        if (hoursLeft <= 24 && hoursLeft > 0 && !notificationsSent.trial_24h && !user.has_payment_method) {
          toSend.push({
            id: crypto.randomUUID(),
            title: '🚨 Trial Ending Tomorrow!',
            message: 'Your trial ends in 24 hours. Add payment method to avoid losing access.',
            type: 'premium',
            priority: 'high',
            actionUrl: '/PaymentOnboarding',
            timestamp: Date.now(),
            read: false
          });
          notificationsSent.trial_24h = true;
        }

        // Trial ended
        if (hoursLeft <= 0 && !notificationsSent.trial_ended) {
          if (user.has_payment_method) {
            // Convert to paid subscription
            await base44.auth.updateMe({
              subscription_status: 'active'
            });
            toSend.push({
              id: crypto.randomUUID(),
              title: '✨ Welcome to Premium!',
              message: 'Your trial has ended and your subscription is now active. Thanks for choosing SafeNest!',
              type: 'premium',
              priority: 'normal',
              timestamp: Date.now(),
              read: false
            });
          } else {
            // Block premium features
            await base44.auth.updateMe({
              subscription_status: 'inactive',
              subscription_plan: 'free'
            });
            toSend.push({
              id: crypto.randomUUID(),
              title: '❌ Trial Expired',
              message: 'Your trial has ended. Add payment method to restore premium features.',
              type: 'premium',
              priority: 'high',
              actionUrl: '/PaymentOnboarding',
              timestamp: Date.now(),
              read: false
            });
          }
          notificationsSent.trial_ended = true;
        }

        // Update notification status
        if (toSend.length > 0) {
          await base44.auth.updateMe({
            trial_notification_sent: notificationsSent
          });
        }

        return Response.json({ 
          notifications_sent: toSend,
          hours_left: hoursLeft
        });
      }

      case 'create-setup-session': {
        // Ensure customer
        let stripeCustomerId = user.stripe_customer_id;
        if (!stripeCustomerId) {
            const customers = await stripe.customers.list({ email: user.email, limit: 1 });
            if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id;
            } else {
                const newCustomer = await stripe.customers.create({
                    email: user.email,
                    name: user.full_name,
                    metadata: { user_id: user.id }
                });
                stripeCustomerId = newCustomer.id;
            }
            await base44.auth.updateMe({ stripe_customer_id: stripeCustomerId });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'setup',
            customer: stripeCustomerId,
            success_url: `${req.headers.get('origin')}/Billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
            cancel_url: `${req.headers.get('origin')}/Billing?status=cancel`,
            billing_address_collection: 'auto',
        });

        return Response.json({ url: session.url });
      }

      case 'get-checkout-url': {
        const { plan } = params;
        // Fallback URLs if products not synced, but better to use createCheckoutSession for subscriptions if possible.
        // For now, keeping the static links for plans as they were, but ideally we should use dynamic sessions too.
        // But the user asked specifically about "Add Payment Method" screen fixing.
        const checkoutUrls = {
          basic: 'https://buy.stripe.com/eVq00ccYabmO92r5DH4gg0a',
          elite: 'https://buy.stripe.com/14AfZacYa62u0vVaY14gg09'
        };

        return Response.json({
          url: checkoutUrls[plan] || checkoutUrls.basic,
          plan: plan
        });
      }

      case 'cancel-subscription': {
        // Cancel subscription - sync with Stripe in production
        const isTrial = user.subscription_status === 'trial';
        
        if (isTrial) {
          // Cancel during trial - maintain access until trial ends
          await base44.auth.updateMe({
            subscription_status: 'trial_cancelled',
            subscription_plan: 'trial',
            cancelled_at: new Date().toISOString()
          });
        } else {
          // Cancel active subscription
          await base44.auth.updateMe({
            subscription_status: 'canceled',
            subscription_plan: 'free',
            cancelled_at: new Date().toISOString()
          });
        }

        return Response.json({ 
          success: true,
          message: isTrial ? 'Trial cancelled. Access until trial ends.' : 'Subscription cancelled.'
        });
      }

      default:
        return Response.json({ error: 'Unknown endpoint' }, { status: 400 });
    }
  } catch (error) {
    console.error('Subscription service error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});