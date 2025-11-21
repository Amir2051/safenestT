import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import Stripe from 'npm:stripe@14.14.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    const body = await req.text();
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_email || session.customer_details?.email;
        
        if (!customerEmail) break;

        const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
        if (users.length === 0) break;

        const user = users[0];
        const planName = session.metadata?.plan || 'basic';

        await base44.asServiceRole.entities.User.update(user.id, {
          has_payment_method: true,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_plan: planName,
          subscription_status: 'active',
          billing_cycle_anchor: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });

        // Send welcome notification
        const notification = {
          id: crypto.randomUUID(),
          title: '🎉 Payment Method Added!',
          message: `Your ${planName} plan will activate after your 14-day free trial ends.`,
          type: 'premium',
          priority: 'normal',
          timestamp: Date.now(),
          read: false
        };

        await base44.asServiceRole.entities.EmailNotification.create({
          recipient: customerEmail,
          subject: 'Payment Method Added Successfully',
          template_name: 'subscription_confirmed',
          status: 'pending',
          metadata: {
            user_id: user.id,
            plan: planName
          }
        });

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: customer.id 
        });
        
        if (users.length === 0) break;
        const user = users[0];

        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'active',
          last_payment_date: new Date().toISOString(),
          payment_failed: false,
          billing_cycle_anchor: new Date(subscription.current_period_end * 1000).toISOString()
        });

        const notification = {
          id: crypto.randomUUID(),
          title: '✅ Payment Successful',
          message: `Your subscription has been renewed. Next billing: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`,
          type: 'premium',
          priority: 'normal',
          timestamp: Date.now(),
          read: false
        };

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: customer.id 
        });
        
        if (users.length === 0) break;
        const user = users[0];

        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'past_due',
          payment_failed: true
        });

        await base44.asServiceRole.entities.Alert.create({
          alert_type: 'permission',
          severity: 'high',
          title: 'Payment Failed',
          message: 'Your subscription payment failed. Please update your payment method to continue service.',
          status: 'active',
          created_by: user.email,
          recommendation: 'Update your payment method in Settings → Billing'
        });

        const notification = {
          id: crypto.randomUUID(),
          title: '⚠️ Payment Failed',
          message: 'Your payment method was declined. Update it now to keep your protection active.',
          type: 'premium',
          priority: 'high',
          actionUrl: window.location.origin + '/Billing',
          timestamp: Date.now(),
          read: false
        };

        await base44.asServiceRole.entities.EmailNotification.create({
          recipient: user.email,
          subject: 'Action Required: Payment Failed',
          template_name: 'payment_failed',
          status: 'pending'
        });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        
        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: customer.id 
        });
        
        if (users.length === 0) break;
        const user = users[0];

        await base44.asServiceRole.entities.User.update(user.id, {
          subscription_status: 'canceled',
          subscription_plan: 'free'
        });

        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});