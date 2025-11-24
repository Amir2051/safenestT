import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, Shield, CheckCircle, Clock, Zap, Lock,
  TrendingUp, Users, AlertTriangle, ArrowRight, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function PaymentOnboarding() {
  const [user, setUser] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const navigate = useNavigate();

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

  const handleSubscribe = async (plan) => {
    try {
      const response = await base44.functions.invoke('subscriptionService', {
        endpoint: 'get-checkout-url',
        plan: plan
      });

      // Redirect to Stripe checkout
      window.location.href = response.data.url + `?prefilled_email=${user.email}&client_reference_id=${user.id}`;
    } catch (error) {
      toast.error('Failed to start checkout: ' + error.message);
    }
  };

  const handleSkip = () => {
    // Only allow skip if user already has payment method
    if (subscriptionInfo?.has_payment_method) {
      navigate('/Dashboard');
    } else {
      toast.error('Payment method is required to use SafeNestt');
    }
  };

  if (loading || !user || !subscriptionInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const daysLeft = subscriptionInfo.days_left;

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Shield className="w-12 h-12 text-cyan-400" />
            <h1 className="text-4xl font-bold text-white">Welcome to SafeNest!</h1>
          </div>
          <p className="text-xl text-gray-300">
            Your 7-day free trial is active 🎉
          </p>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-lg py-2 px-4">
            {daysLeft} days remaining in trial
          </Badge>
        </div>

        {/* Trial Benefits */}
        <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Add Your Payment Method to Continue After Trial
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">No Charge Today</h3>
                <p className="text-gray-300 text-sm">
                  Add payment now, get charged only after your trial ends
                </p>
              </div>
              <div className="text-center">
                <Clock className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">7 Days Free</h3>
                <p className="text-gray-300 text-sm">
                  Full access to all premium features during trial
                </p>
              </div>
              <div className="text-center">
                <Lock className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Cancel Anytime</h3>
                <p className="text-gray-300 text-sm">
                  No commitment, cancel before trial ends if you want
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Plan */}
          <Card 
            className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] transition-all cursor-pointer ${
              selectedPlan === 'basic' 
                ? 'border-cyan-500 shadow-lg shadow-cyan-500/30 scale-105' 
                : 'border-cyan-500/20 hover:border-cyan-500/40'
            }`}
            onClick={() => setSelectedPlan('basic')}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-white text-2xl">Basic Protection</CardTitle>
                <Badge className="bg-cyan-500/20 text-cyan-400">POPULAR</Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-cyan-400">$9.99</span>
                <span className="text-gray-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Complete identity protection</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">VPN & secure browsing</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Password vault (unlimited)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Dark web monitoring</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Real-time alerts</span>
              </div>
              <Button
                onClick={() => handleSubscribe('basic')}
                className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-12 text-lg"
              >
                Choose Basic <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Elite Plan */}
          <Card 
            className={`bg-gradient-to-br from-purple-900/40 to-pink-900/40 transition-all cursor-pointer relative ${
              selectedPlan === 'elite' 
                ? 'border-purple-500 shadow-lg shadow-purple-500/30 scale-105' 
                : 'border-purple-500/30 hover:border-purple-500/50'
            }`}
            onClick={() => setSelectedPlan('elite')}
          >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1">
                BEST VALUE
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-white text-2xl mt-2">Elite Protection</CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-purple-400">$19.99</span>
                <span className="text-gray-400">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-purple-300 font-semibold mb-4">Everything in Basic, plus:</p>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Family protection (up to 5 members)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Advanced spyware detection</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Priority support</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Credit monitoring</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300 text-sm">Legal support access</span>
              </div>
              <Button
                onClick={() => handleSubscribe('elite')}
                className="w-full mt-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 text-lg"
              >
                Choose Elite <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Security Badge */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3 text-center">
              <Lock className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-white font-semibold">Secure Payment Processing</p>
                <p className="text-gray-400 text-sm">Powered by Stripe • Your card info is never stored on our servers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Message */}
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-center">
          <p className="text-gray-300 text-sm">
            <Lock className="w-4 h-4 inline mr-2" />
            Payment method required to access SafeNestt features
          </p>
        </div>
      </div>
    </div>
  );
}