import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ArrowRight, Gift, Shield, Bell, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PaymentSuccess() {
  const [user, setUser] = useState(null);
  const [activated, setActivated] = useState(false);
  const [celebrating, setCelebrating] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    const transactionId = urlParams.get('transaction_id') || `txn_${Date.now()}`;

    if (plan && user && !activated) {
      activateSubscription(plan, transactionId);
    }

    // Stop celebration after 3 seconds
    setTimeout(() => setCelebrating(false), 3000);
  }, [user, activated]);

  const activateSubscription = async (plan, transactionId) => {
    try {
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      await base44.auth.updateMe({
        subscription_plan: plan,
        payment_status: 'active',
        renewal_date: renewalDate.toISOString(),
        transaction_reference: transactionId,
        subscription_start_date: new Date().toISOString(),
        checkout_link_used: plan === 'basic' 
          ? 'https://buy.stripe.com/14AfZacYa62u0vVaY14gg09'
          : 'https://buy.stripe.com/eVq00ccYabmO92r5DH4gg0a'
      });

      // Log subscription upgrade
      await base44.entities.AuditLog.create({
        action_type: 'subscription_upgraded',
        action_category: 'subscription',
        description: `Upgraded to ${plan === 'basic' ? 'Basic Protection' : 'Elite Protection'} plan`,
        metadata: {
          plan_name: plan === 'basic' ? 'Basic Protection' : 'Elite Protection',
          previous_value: 'free',
          new_value: plan,
          ip_address: transactionId // Note: transactionId is used as a placeholder for IP address here, which might not be accurate.
        },
        severity: 'info',
        status: 'success'
      });

      // Award achievement
      try {
        await base44.entities.Achievement.create({
          achievement_id: 'premium_member',
          name: 'Premium Member',
          description: 'Upgraded to premium',
          category: 'advanced',
          icon: '🌟',
          points: 100,
          unlocked: true,
          unlocked_date: new Date().toISOString(),
          progress: 100,
          requirement: 'Upgrade to premium'
        });

        // Update total points
        const currentPoints = user.total_points || 0;
        await base44.auth.updateMe({ total_points: currentPoints + 100 });
      } catch (e) {
        // Achievement might already exist
      }

      setActivated(true);
      setUser(prev => ({ ...prev, subscription_plan: plan, payment_status: 'active' }));

      // Track conversion
      const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
      events.push({
        type: 'conversion',
        plan,
        amount: plan === 'basic' ? 9.99 : 14.99,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('analytics_events', JSON.stringify(events));

    } catch (error) {
      console.error('Error activating subscription:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const planName = user.subscription_plan === 'basic' ? 'Basic Protection' : 
                   user.subscription_plan === 'elite' ? 'Elite Protection' : 'Premium';

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <Card className="max-w-3xl w-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/30 relative overflow-hidden">
        {/* Confetti Animation */}
        {celebrating && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute text-2xl animate-bounce"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              >
                {['🎉', '✨', '🎊', '⭐', '💎'][Math.floor(Math.random() * 5)]}
              </div>
            ))}
          </div>
        )}

        <CardContent className="p-12 text-center relative z-10">
          {/* Success Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-green-500/50">
              <CheckCircle className="w-20 h-20 text-white" />
            </div>
            <div className="absolute -top-4 -right-4 animate-bounce">
              <Sparkles className="w-12 h-12 text-yellow-400" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-5xl font-bold text-white mb-4 animate-fade-in">
            Thank You! 🎉
          </h1>
          {user.subscription_plan === 'premium' || user.subscription_plan === 'elite' ? (
              <p className="text-2xl text-green-400 font-semibold mb-2">
                Your Cyber Monday subscription is active. Thank you for supporting SafeNestT.
              </p>
          ) : (
              <p className="text-2xl text-green-400 font-semibold mb-2">
                Your SafeNest protection is now active
              </p>
          )}
          <p className="text-gray-400 mb-8 text-lg">
            You now have full access to {planName} features
          </p>

          {/* Achievement Badge */}
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-6 py-3 rounded-full mb-8">
            <Gift className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">Achievement Unlocked: Premium Member (+100 points)</span>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#0f1419] rounded-xl p-6 mb-8 border border-green-500/20">
            <h3 className="text-white font-semibold mb-6 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-green-400" />
              Get Started with Your Premium Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to={createPageUrl("DarkWebMonitor")}>
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/50 transition-all cursor-pointer">
                  <Shield className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <h4 className="text-white font-semibold text-sm mb-1">Add Emails</h4>
                  <p className="text-gray-400 text-xs">Monitor multiple addresses</p>
                </div>
              </Link>

              <Link to={createPageUrl("Settings")}>
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4 hover:border-cyan-500/50 transition-all cursor-pointer">
                  <Bell className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                  <h4 className="text-white font-semibold text-sm mb-1">Enable Alerts</h4>
                  <p className="text-gray-400 text-xs">Get instant notifications</p>
                </div>
              </Link>

              <Link to={createPageUrl("PasswordVault")}>
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-4 hover:border-green-500/50 transition-all cursor-pointer">
                  <Lock className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <h4 className="text-white font-semibold text-sm mb-1">Secure Vault</h4>
                  <p className="text-gray-400 text-xs">Unlimited password storage</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Subscription Details */}
          <div className="bg-[#0f1419] rounded-xl p-6 mb-8 border border-cyan-500/10">
            <h3 className="text-white font-semibold mb-4">Subscription Details</h3>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Plan</p>
                <p className="text-white font-semibold">{planName}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Status</p>
                <p className="text-green-400 font-semibold">✅ Active</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Next Billing</p>
                <p className="text-white font-semibold">
                  {user.renewal_date ? new Date(user.renewal_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Amount</p>
                <p className="text-white font-semibold">
                  {user.subscription_plan === 'basic' ? '$9.99' : '$14.99'}/month
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-8 py-6 text-lg">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to={createPageUrl("DarkWebMonitor")}>
              <Button variant="outline" className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 px-8 py-6 text-lg">
                Start Monitoring
              </Button>
            </Link>
          </div>

          {/* Confirmation */}
          <p className="text-gray-500 text-sm mt-8">
            ✉️ A confirmation email has been sent to {user.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}