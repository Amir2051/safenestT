import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, AlertTriangle, ExternalLink, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/9B6cMY2jw0Ia3I7feh4gg0b";

export default function SubscriptionRequired() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleSubscribe = () => {
    // Open Stripe checkout in new browser window
    window.open(STRIPE_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
  };

  const handleViewPlans = () => {
    navigate(createPageUrl('Subscription'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <Card className="max-w-2xl w-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30 relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-500/20 rounded-full blur-[100px]" />
        
        <CardContent className="p-12 text-center relative">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20" />
            <Lock className="w-12 h-12 text-white relative z-10" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-3">
            Subscription Required
          </h1>
          <p className="text-gray-300 text-lg mb-8 max-w-lg mx-auto">
            Access to this feature requires an active SafeNestt Premium subscription.
          </p>

          {/* Features List */}
          <div className="bg-[#0f1419] rounded-xl p-6 mb-8 text-left max-w-md mx-auto">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              Premium Features Include:
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Full blockchain investigation tools</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Unlimited fraud case management</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Real-time scam detection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>AI-powered security advisor</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Priority support & updates</span>
              </li>
            </ul>
          </div>

          {/* Pricing */}
          <div className="mb-8">
            <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-6 py-3">
              <p className="text-sm text-gray-400 mb-1">Only</p>
              <p className="text-4xl font-bold text-white">
                $24.99<span className="text-xl text-gray-400">/month</span>
              </p>
              <p className="text-cyan-400 font-semibold mt-1">7-Day Free Trial</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleSubscribe}
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Free Trial
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              onClick={handleViewPlans}
              size="lg"
              variant="outline"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              View Plan Details
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="w-4 h-4 text-cyan-400" />
              <span>Cancel Anytime</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}