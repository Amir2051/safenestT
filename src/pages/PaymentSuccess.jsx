import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PaymentSuccess() {
  const [user, setUser] = useState(null);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    // Get plan from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const plan = urlParams.get('plan');
    const transactionId = urlParams.get('transaction_id');

    if (plan && user && !activated) {
      activateSubscription(plan, transactionId);
    }
  }, [user, activated]);

  const activateSubscription = async (plan, transactionId) => {
    try {
      const renewalDate = new Date();
      renewalDate.setMonth(renewalDate.getMonth() + 1);

      await base44.auth.updateMe({
        subscription_plan: plan,
        payment_status: 'active',
        renewal_date: renewalDate.toISOString(),
        transaction_reference: transactionId || `txn_${Date.now()}`,
        subscription_start_date: new Date().toISOString(),
        checkout_link_used: plan === 'basic' 
          ? 'https://checkout.page/s/qvUAiro8pnNf5'
          : 'https://checkout.page/s/JcW69MkItIpds'
      });

      setActivated(true);
      setUser(prev => ({ ...prev, subscription_plan: plan, payment_status: 'active' }));
    } catch (error) {
      console.error('Error activating subscription:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const planName = user.subscription_plan === 'basic' ? 'Basic Protection' : 
                   user.subscription_plan === 'elite' ? 'Elite Protection' : 'Premium';

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/30">
        <CardContent className="p-12 text-center">
          {/* Success Animation */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle className="w-20 h-20 text-white" />
            </div>
            <div className="absolute -top-4 -right-4 animate-bounce">
              <Sparkles className="w-12 h-12 text-yellow-400" />
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-white mb-4">
            Thank You! 🎉
          </h1>
          <p className="text-xl text-green-400 font-semibold mb-2">
            Your SafeNest protection is now active
          </p>
          <p className="text-gray-400 mb-8">
            You now have full access to {planName} features
          </p>

          {/* Activated Features */}
          <div className="bg-[#0f1419] rounded-xl p-6 mb-8 border border-green-500/20">
            <h3 className="text-white font-semibold mb-4 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-green-400" />
              Now Available for You
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              {[
                "Full device virus scanning",
                "Automatic cleanup & optimization",
                "Identity theft monitoring",
                "Unlimited password vault",
                "Dark web monitoring",
                "VPN protection",
                "24/7 threat detection",
                "Weekly security reports"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Details */}
          <div className="bg-[#0f1419] rounded-xl p-4 mb-8 border border-cyan-500/10">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Plan</p>
                <p className="text-white font-semibold">{planName}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Status</p>
                <p className="text-green-400 font-semibold">Active</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Next Billing</p>
                <p className="text-white font-semibold">
                  {user.renewal_date ? new Date(user.renewal_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Price</p>
                <p className="text-white font-semibold">
                  {user.subscription_plan === 'basic' ? '$9.99' : '$14.99'}/month
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={createPageUrl("Dashboard")}>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-8">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to={createPageUrl("DeviceCare")}>
              <Button variant="outline" className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 px-8">
                Start Protection Scan
              </Button>
            </Link>
          </div>

          {/* Email Confirmation */}
          <p className="text-gray-500 text-sm mt-8">
            A confirmation email has been sent to {user.email}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}