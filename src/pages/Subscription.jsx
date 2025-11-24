import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield, CheckCircle, Sparkles, CreditCard, Calendar,
  Lock, Zap, TrendingUp, Users, AlertTriangle, Clock,
  ExternalLink, Star
} from "lucide-react";
import { toast } from "sonner";

const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/9B6cMY2jw0Ia3I7feh4gg0b";

export default function Subscription() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: subscriptionInfo, isLoading } = useQuery({
    queryKey: ['subscription-info'],
    queryFn: async () => {
      const response = await base44.functions.invoke('subscriptionService', {
        endpoint: 'get-subscription-info'
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  const handleStartTrial = () => {
    setLoading(true);
    window.location.href = STRIPE_CHECKOUT_URL;
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const isSubscribed = subscriptionInfo?.subscription_status === 'active';
  const isOnTrial = subscriptionInfo?.is_trial_active;
  const daysLeft = subscriptionInfo?.days_left || 0;

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-12 h-12 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">
              SafeNestt Premium
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            Complete protection for your digital life
          </p>
        </div>

        {/* Current Status Banner */}
        {isSubscribed || isOnTrial ? (
          <Card className={`bg-gradient-to-r ${
            isOnTrial ? 'from-cyan-500/10 to-blue-500/10 border-cyan-500/30' :
            'from-green-500/10 to-emerald-500/10 border-green-500/30'
          }`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    isOnTrial ? 'bg-gradient-to-br from-cyan-500 to-blue-500' :
                    'bg-gradient-to-br from-green-500 to-emerald-500'
                  }`}>
                    {isOnTrial ? <Clock className="w-8 h-8 text-white" /> : <CheckCircle className="w-8 h-8 text-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-xl">
                        {isOnTrial ? '7-Day Free Trial Active' : 'Premium Subscription Active'}
                      </h3>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        ACTIVE
                      </Badge>
                    </div>
                    <p className="text-gray-300">
                      {isOnTrial ? (
                        <>🎁 {daysLeft} days remaining in your free trial</>
                      ) : (
                        <>✨ Next billing: {subscriptionInfo?.next_billing_date ? new Date(subscriptionInfo.next_billing_date).toLocaleDateString() : 'N/A'}</>
                      )}
                    </p>
                  </div>
                </div>
                {!subscriptionInfo?.has_payment_method && isOnTrial && (
                  <Button
                    onClick={handleStartTrial}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-12 h-12 text-red-400" />
                <div>
                  <h3 className="text-white font-bold text-xl mb-1">No Active Subscription</h3>
                  <p className="text-gray-300">
                    Subscribe now to access all premium features and protect your digital life.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Pricing Card */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/30 relative overflow-hidden">
          {/* Glow Effect */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
          
          <CardContent className="p-8 lg:p-12 relative">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left: Plan Details */}
              <div className="space-y-6">
                <div>
                  <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 mb-4">
                    PREMIUM PLAN
                  </Badge>
                  <h2 className="text-5xl font-bold text-white mb-2">
                    $24.99<span className="text-2xl text-gray-400">/month</span>
                  </h2>
                  <p className="text-green-400 font-semibold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    7-Day Free Trial Included
                  </p>
                </div>

                <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-gray-300 leading-relaxed">
                    SafeNestt Premium gives you full access to the investigation system, 
                    unlimited case tools, scam detection, wallet lookups, and priority security updates.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Full blockchain investigation tools</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Unlimited fraud case management</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Real-time scam detection & wallet monitoring</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">AI-powered security advisor (Mia)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Priority support & security updates</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Advanced VPN protection</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Law enforcement report generation</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-white">Cancel anytime - no contracts</span>
                  </div>
                </div>

                {!isSubscribed && !isOnTrial && (
                  <Button
                    onClick={handleStartTrial}
                    disabled={loading}
                    size="lg"
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg py-6"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Redirecting to Checkout...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Start Free Trial
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-gray-400 text-center">
                  Secure payment powered by Stripe • Cancel anytime
                </p>
              </div>

              {/* Right: Feature Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all">
                  <CardContent className="p-6 text-center">
                    <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                    <h3 className="text-white font-bold mb-1">24/7 Protection</h3>
                    <p className="text-gray-400 text-sm">Always-on security monitoring</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#0f1419] border-purple-500/20 hover:border-purple-500/40 transition-all">
                  <CardContent className="p-6 text-center">
                    <Zap className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                    <h3 className="text-white font-bold mb-1">Instant Alerts</h3>
                    <p className="text-gray-400 text-sm">Real-time threat notifications</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#0f1419] border-green-500/20 hover:border-green-500/40 transition-all">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <h3 className="text-white font-bold mb-1">Recovery Tools</h3>
                    <p className="text-gray-400 text-sm">Help recover stolen assets</p>
                  </CardContent>
                </Card>

                <Card className="bg-[#0f1419] border-orange-500/20 hover:border-orange-500/40 transition-all">
                  <CardContent className="p-6 text-center">
                    <Users className="w-12 h-12 text-orange-400 mx-auto mb-3" />
                    <h3 className="text-white font-bold mb-1">Expert Support</h3>
                    <p className="text-gray-400 text-sm">Priority customer service</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-white font-bold mb-2">How does the 7-day free trial work?</h3>
              <p className="text-gray-300">
                Start your trial today with full access to all premium features. You won't be charged 
                for 7 days. After the trial, your subscription automatically continues at $24.99/month 
                unless you cancel.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-300">
                Yes! Cancel your subscription at any time with no penalties or fees. You'll continue 
                to have access until the end of your billing period.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-300">
                We accept all major credit and debit cards through our secure payment processor, Stripe.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">Is my data secure?</h3>
              <p className="text-gray-300">
                Absolutely. We use bank-level encryption to protect your data. All payments are processed 
                securely through Stripe, and we never store your payment information.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">What happens if my payment fails?</h3>
              <p className="text-gray-300">
                If a payment fails, you'll receive an email notification with instructions to update your 
                payment method. Your access will be temporarily restricted until the payment is resolved.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-8 py-8">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-300">Secure Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-300">Bank-Level Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-300">Trusted by Thousands</span>
          </div>
        </div>
      </div>
    </div>
  );
}