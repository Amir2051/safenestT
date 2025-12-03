import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Check, Zap, Lock, Bot, 
  TrendingUp, CreditCard, Star, Sparkles, AlertTriangle, Crown
} from "lucide-react";

export default function Upgrade() {
  const [user, setUser] = useState(null);

  const PLANS = {
    premium_unlimited: {
      name: "Premium Unlimited",
      price: "$24.99",
      period: "month",
      checkoutUrl: "https://buy.stripe.com/9B6cMY2jw0Ia3I7feh4gg0b",
      color: "from-amber-500 to-orange-500",
      icon: Star,
      premium: true,
      popular: true,
      features: [
        "🌟 Full scam-check access & Identity report tools",
        "🌟 Advanced scam pattern detection",
        "🌟 Multi-device support (Unlimited)",
        "🌟 Unlimited case submissions",
        "🌟 Full protection & monitoring of stolen funds",
        "🌟 Free 1-on-1 consultation for recovery guidance",
        "🌟 Agency reporting tools & alerts",
        "🌟 Priority investigation support",
        "🌟 Direct access to fraud recovery team",
        "🌟 Blockchain tracing & analysis",
        "🌟 Law enforcement coordination",
        "🌟 dedicated account manager & White-glove service"
      ]
    }
  };

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleSubscribe = (planType, checkoutUrl) => {
    const event = {
      type: 'upgrade_clicked',
      plan: planType,
      timestamp: new Date().toISOString()
    };
    
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push(event);
    localStorage.setItem('analytics_events', JSON.stringify(events));

    window.location.href = checkoutUrl;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const currentPlan = user.subscription_plan || 'free';
  const isActive = user.payment_status === 'active';

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 px-4 py-2 rounded-full border border-cyan-500/30 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-semibold">SafeNest Secure Plans</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Choose Your Protection Level
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-6">
            Secure your digital identity with comprehensive monitoring and instant alerts
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-1">🎁 14-Day Free Trial</span>
            <span className="flex items-center gap-1">✅ 30-Day Money Back</span>
            <span className="flex items-center gap-1">🔒 Secure via Stripe</span>
            <span className="flex items-center gap-1">❌ Cancel Anytime</span>
          </div>
        </div>

        {currentPlan === 'free' && (
          <Card className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/30 animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <p className="text-white font-semibold">
                  ⚡ Limited Time: First 100 users get 20% off for life!
                </p>
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                  87 spots remaining
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold text-xl mb-6 text-center">Feature Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#0f1419] rounded-lg p-5 border border-gray-600">
                <h4 className="text-white font-semibold mb-4 text-lg">🆓 Free Tier</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-green-400">✅ Unlimited password checking</li>
                  <li className="text-green-400">✅ 1 email check/day</li>
                  <li className="text-green-400">✅ Security score</li>
                  <li className="text-green-400">✅ Basic vault (10 items)</li>
                  <li className="text-green-400">✅ Optimization guide</li>
                  <li className="text-red-400">❌ Real-time monitoring</li>
                  <li className="text-red-400">❌ VPN protection</li>
                  <li className="text-red-400">❌ Priority support</li>
                </ul>
              </div>
              
              <div className="col-span-3 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-lg p-8 border-2 border-amber-500/40 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-1.5 text-sm">
                    <Crown className="w-4 h-4 mr-1 inline" />
                    ULTIMATE PROTECTION
                  </Badge>
                </div>
                <div className="text-center mb-6">
                  <h4 className="text-white font-bold text-2xl flex items-center justify-center gap-2 mt-2">
                    🌟 Premium Unlimited
                  </h4>
                  <p className="text-amber-400 font-semibold mt-1">$24.99/mo</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <ul className="space-y-2 text-sm">
                      <li className="text-green-400">✅ Everything in Free</li>
                      <li className="text-amber-400">🌟 Full scam-check access</li>
                      <li className="text-amber-400">🌟 Multi-device support (Unlimited)</li>
                      <li className="text-amber-400">🌟 Advanced scam pattern detection</li>
                      <li className="text-amber-400">🌟 Unlimited case submissions</li>
                      <li className="text-amber-400">🌟 Full fund protection & monitoring</li>
                   </ul>
                   <ul className="space-y-2 text-sm">
                      <li className="text-amber-400">🌟 Free 1-on-1 recovery consultation</li>
                      <li className="text-amber-400">🌟 Agency reporting tools & alerts</li>
                      <li className="text-amber-400">🌟 Priority investigation support</li>
                      <li className="text-amber-400">🌟 Direct access to fraud recovery team</li>
                      <li className="text-amber-400">🌟 Dedicated account manager</li>
                   </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {currentPlan !== 'free' && isActive && PLANS[currentPlan] && (
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-lg">Active Subscription</p>
                  <p className="text-green-400 text-sm">
                    {PLANS[currentPlan].name} • Renews {user.renewal_date ? new Date(user.renewal_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3 flex justify-center">
            {Object.entries(PLANS).map(([key, plan]) => {
              const Icon = plan.icon;
              const isCurrentPlan = currentPlan === key && isActive;
              
              return (
                <Card
                  key={key}
                  className={`relative max-w-2xl w-full bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 transition-all ${
                    plan.popular ? 'border-amber-500/50' : 'border-cyan-500/20'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2 text-md">
                        <Star className="w-4 h-4 mr-2" />
                        ALL-IN-ONE SOLUTION
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pt-10">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-3xl font-bold text-white mb-2">
                      {plan.name}
                    </CardTitle>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-6xl font-bold text-white">{plan.price}</span>
                      <span className="text-gray-400 text-xl">/{plan.period}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-8 p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Check className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-gray-300 text-base">{feature}</span>
                        </div>
                        ))}
                    </div>

                    <Button
                      onClick={() => handleSubscribe(key, plan.checkoutUrl)}
                      disabled={isCurrentPlan}
                      className={`w-full py-8 text-xl font-bold rounded-xl ${
                        isCurrentPlan
                          ? 'bg-gray-600 cursor-not-allowed'
                          : `bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-lg shadow-amber-500/20`
                      }`}
                    >
                      {isCurrentPlan ? (
                        <>
                          <Check className="w-6 h-6 mr-3" />
                          Current Plan
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-6 h-6 mr-3" />
                          Get Full Protection Now
                        </>
                      )}
                    </Button>

                    <div className="text-center pt-4 border-t border-gray-700">
                      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                        <Lock className="w-4 h-4" />
                        <span>Payments secured by Stripe • 30-day money-back guarantee</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-center">Why Upgrade to Premium?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-[#0f1419] rounded-xl border border-cyan-500/10">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Instant Protection</h3>
                <p className="text-gray-400 text-sm">
                  Activate premium features immediately - no waiting
                </p>
              </div>

              <div className="text-center p-6 bg-[#0f1419] rounded-xl border border-cyan-500/10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">AI-Powered</h3>
                <p className="text-gray-400 text-sm">
                  Mia AI monitors and protects you 24/7 automatically
                </p>
              </div>

              <div className="text-center p-6 bg-[#0f1419] rounded-xl border border-cyan-500/10">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">Cancel Anytime</h3>
                <p className="text-gray-400 text-sm">
                  No commitment - cancel or change plans whenever you want
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2">What's included in the 14-day free trial?</h4>
              <p className="text-gray-400 text-sm">
                You get full access to all features of your chosen plan for 14 days. No credit card required to start. Cancel anytime during the trial without being charged.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">What's the difference between Basic and Elite?</h4>
              <p className="text-gray-400 text-sm">
                Basic Plan ($9.99/mo) includes full scam protection for single-device usage. Elite Plan ($19.99/mo) adds multi-device support (up to 5 devices), advanced scam pattern detection, priority alerts, and future AI-driven features.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Can I cancel my subscription?</h4>
              <p className="text-gray-400 text-sm">
                Yes! Cancel anytime with one click. Your access continues until the end of your billing period. No questions asked.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Is the password checker really free and unlimited?</h4>
              <p className="text-gray-400 text-sm">
                Absolutely! Password breach checking uses the free Have I Been Pwned API (k-anonymity method). It's 100% unlimited for all users. We never charge for this.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Do you offer refunds?</h4>
              <p className="text-gray-400 text-sm">
                Yes! 30-day money-back guarantee. If you're not satisfied with premium features, contact support for a full refund.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Is my payment secure?</h4>
              <p className="text-gray-400 text-sm">
                All payments are processed through Stripe with bank-level encryption. We never see or store your card details.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-8 text-center">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-3xl font-bold text-cyan-400 mb-1">100K+</p>
                <p className="text-gray-400 text-sm">Protected Users</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-400 mb-1">2.5M</p>
                <p className="text-gray-400 text-sm">Breaches Detected</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-400 mb-1">500K</p>
                <p className="text-gray-400 text-sm">Items Secured</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-yellow-400 mb-1">4.8★</p>
                <p className="text-gray-400 text-sm">Average Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}