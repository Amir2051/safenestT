
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, Check, Zap, Lock, Eye, Smartphone, Bot, 
  TrendingUp, CreditCard, Star, Sparkles
} from "lucide-react";

const PLANS = {
  basic: {
    name: "Basic Protection",
    price: "$9.99",
    period: "month",
    checkoutUrl: "https://checkout.page/s/qvUAiro8pnNf5",
    color: "from-blue-500 to-cyan-500",
    icon: Shield,
    features: [
      "✅ Unlimited password breach checking",
      "✅ Unlimited email monitoring (3 addresses)",
      "✅ Real-time breach alerts",
      "✅ Identity theft monitoring",
      "✅ Password vault (unlimited)",
      "✅ Dark web monitoring",
      "✅ VPN protection",
      "✅ 24/7 threat detection",
      "✅ Weekly security reports"
    ]
  },
  elite: {
    name: "Elite Protection",
    price: "$14.99",
    period: "month",
    checkoutUrl: "https://checkout.page/s/JcW69MkItIpds",
    color: "from-purple-500 to-pink-500",
    icon: Sparkles,
    popular: true,
    features: [
      "✨ Everything in Basic Plan",
      "✅ Unlimited email monitoring (10+ addresses)",
      "✅ Advanced malware detection",
      "✅ AI-powered threat analysis",
      "✅ Priority 24/7 support",
      "✅ Automated security fixes",
      "✅ Real-time threat blocking",
      "✅ Family protection (up to 5 devices)",
      "✅ Custom security policies",
      "✅ Monthly expert consultations",
      "✅ Zero-knowledge encryption"
    ]
  }
};

export default function Upgrade() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleSubscribe = (planType, checkoutUrl) => {
    // Open checkout in new window
    const width = 600;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      checkoutUrl,
      'SafeNest Checkout',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no`
    );
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
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 px-4 py-2 rounded-full border border-cyan-500/30 mb-4">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-semibold">SafeNest Secure Plans</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Upgrade Your Protection
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Choose the perfect plan to keep your digital life safe and secure
          </p>
        </div>

        {/* Free vs Premium Comparison */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold text-lg mb-4 text-center">What's Included in Each Tier?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0f1419] rounded-lg p-4 border border-gray-600">
                <h4 className="text-white font-semibold mb-3">🆓 Free Tier</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-green-400">✅ Unlimited password breach checking</li>
                  <li className="text-green-400">✅ 1 email check per day</li>
                  <li className="text-green-400">✅ Security score & tips</li>
                  <li className="text-green-400">✅ Basic vault (10 items)</li>
                  <li className="text-green-400">✅ Device optimization guide</li>
                  <li className="text-gray-500">❌ Real-time monitoring</li>
                  <li className="text-gray-500">❌ VPN protection</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-lg p-4 border border-blue-500/30">
                <h4 className="text-white font-semibold mb-3">💎 Basic - $9.99/mo</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-green-400">✅ Everything in Free</li>
                  <li className="text-cyan-400">✨ Unlimited email monitoring (3)</li>
                  <li className="text-cyan-400">✨ Real-time breach alerts</li>
                  <li className="text-cyan-400">✨ Unlimited vault storage</li>
                  <li className="text-cyan-400">✨ VPN protection</li>
                  <li className="text-cyan-400">✨ Priority support</li>
                  <li className="text-cyan-400">✨ Export PDF reports</li>
                </ul>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/30">
                <h4 className="text-white font-semibold mb-3">✨ Elite - $14.99/mo</h4>
                <ul className="space-y-2 text-sm">
                  <li className="text-green-400">✅ Everything in Basic</li>
                  <li className="text-purple-400">⭐ 10+ email addresses</li>
                  <li className="text-purple-400">⭐ AI threat analysis</li>
                  <li className="text-purple-400">⭐ Auto security fixes</li>
                  <li className="text-purple-400">⭐ Family protection (5 devices)</li>
                  <li className="text-purple-400">⭐ Expert consultations</li>
                  <li className="text-purple-400">⭐ Custom policies</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan Status */}
        {currentPlan !== 'free' && isActive && (
          <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-lg">Active Subscription</p>
                  <p className="text-green-400 text-sm">
                    {PLANS[currentPlan]?.name} • Renews {user.renewal_date ? new Date(user.renewal_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {Object.entries(PLANS).map(([key, plan]) => {
            const Icon = plan.icon;
            const isCurrentPlan = currentPlan === key && isActive;
            
            return (
              <Card
                key={key}
                className={`relative bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 transition-all hover:scale-105 ${
                  plan.popular ? 'border-purple-500/50' : 'border-cyan-500/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pt-8">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400">/{plan.period}</span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features List */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSubscribe(key, plan.checkoutUrl)}
                    disabled={isCurrentPlan}
                    className={`w-full py-6 text-lg font-semibold ${
                      isCurrentPlan
                        ? 'bg-gray-600 cursor-not-allowed'
                        : `bg-gradient-to-r ${plan.color} hover:opacity-90 shadow-lg`
                    }`}
                  >
                    {isCurrentPlan ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Current Plan
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 mr-2" />
                        Subscribe Now
                      </>
                    )}
                  </Button>

                  {/* Trust Badge */}
                  <div className="text-center pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                      <Lock className="w-3 h-3" />
                      <span>Payments secured by Stripe</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Comparison */}
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
                  Activate premium features immediately after payment
                </p>
              </div>

              <div className="text-center p-6 bg-[#0f1419] rounded-xl border border-cyan-500/10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">AI-Powered Security</h3>
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
                  No long-term commitment. Cancel or upgrade whenever you want
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-white font-semibold mb-2">What's the difference between free and premium?</h4>
              <p className="text-gray-400 text-sm">
                Free tier includes unlimited password checking but limited email monitoring (1/day). Premium unlocks unlimited email monitoring, real-time alerts, VPN, and advanced features.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">How do I cancel my subscription?</h4>
              <p className="text-gray-400 text-sm">
                You can cancel anytime from your Settings page. Your access continues until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Is the password checker really unlimited and free?</h4>
              <p className="text-gray-400 text-sm">
                Yes! Password breach checking uses the free Have I Been Pwned API and is 100% unlimited for all users. We never charge for this feature.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">Is my payment information secure?</h4>
              <p className="text-gray-400 text-sm">
                Absolutely. All payments are processed through Stripe with bank-level encryption. We never store your card details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
