import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, Shield, Clock, Lock, AlertTriangle, 
  ExternalLink, CheckCircle, Sparkles
} from "lucide-react";
import { toast } from "sonner";

const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/9B6cMY2jw0Ia3I7feh4gg0b";

export default function PaymentRequired() {
  const [user, setUser] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const response = await base44.functions.invoke('subscriptionService', {
        endpoint: 'get-subscription-info'
      });
      setSubscriptionInfo(response.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = () => {
    window.open(STRIPE_CHECKOUT_URL, '_blank', 'noopener,noreferrer');
    toast.success('Opening Stripe checkout...');
  };

  const daysLeft = subscriptionInfo?.days_left || 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a]">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <Card className="max-w-3xl w-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/30 relative overflow-hidden">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/20 rounded-full blur-[100px]" />
        
        <CardContent className="p-12 text-center relative">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-cyan-500 rounded-full animate-ping opacity-20" />
            <CreditCard className="w-12 h-12 text-white relative z-10" />
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white mb-4">
            Payment Method Required
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
            Add your payment method to continue using SafeNestt Premium features
          </p>

          {/* Trial Info */}
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-lg py-2 px-6 mb-8">
            <Clock className="w-5 h-5 mr-2 inline" />
            {daysLeft} days left in your free trial
          </Badge>

          {/* Benefits */}
          <div className="bg-[#0f1419] rounded-xl p-8 mb-8 text-left max-w-2xl mx-auto">
            <h3 className="text-white font-bold text-xl mb-6 text-center flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              Why Add Payment Now?
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">No Charge Today</p>
                  <p className="text-gray-400 text-sm">Free until trial ends</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Uninterrupted Access</p>
                  <p className="text-gray-400 text-sm">Seamless transition after trial</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">Cancel Anytime</p>
                  <p className="text-gray-400 text-sm">Before trial ends if needed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-white font-semibold">100% Secure</p>
                  <p className="text-gray-400 text-sm">Protected by Stripe</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-8">
            <div className="inline-block bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-8 py-4">
              <p className="text-sm text-gray-400 mb-1">After trial ends</p>
              <p className="text-5xl font-bold text-white">
                $24.99<span className="text-2xl text-gray-400">/month</span>
              </p>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleAddPayment}
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xl py-8 px-12 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all"
          >
            <CreditCard className="w-6 h-6 mr-3" />
            Add Payment Method
            <ExternalLink className="w-5 h-5 ml-3" />
          </Button>

          <p className="text-sm text-gray-400 mt-6">
            Opens secure Stripe checkout in new window
          </p>

          {/* Trust Indicators */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              <span>PCI Compliant</span>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="text-orange-400 font-semibold text-sm">Access Limited</p>
                <p className="text-gray-400 text-xs mt-1">
                  Without a payment method, you'll lose access to all premium features when your trial ends.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}