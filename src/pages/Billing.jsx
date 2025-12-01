import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, Calendar, AlertTriangle, CheckCircle, Clock,
  RefreshCw, XCircle, TrendingUp, Loader2, ExternalLink, Crown
} from "lucide-react";
import { toast } from "sonner";

export default function Billing() {
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

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
    refetchInterval: 10000
  });

  useEffect(() => {
    if (subscriptionInfo?.has_payment_method && user && !user.payment_method_added) {
      base44.auth.updateMe({ payment_method_added: true }).catch(() => {});
    }
  }, [subscriptionInfo, user]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('subscriptionService', {
        endpoint: 'cancel-subscription'
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-info'] });
      toast.success('Subscription canceled successfully');
    },
    onError: () => {
      toast.error('Failed to cancel subscription');
    }
  });

  const handleUpdatePayment = async (plan) => {
    try {
      const response = await base44.functions.invoke('subscriptionService', {
        endpoint: 'get-checkout-url',
        plan: plan
      });
      window.location.href = response.data.url + `?prefilled_email=${user.email}&client_reference_id=${user.id}`;
    } catch (error) {
      toast.error('Failed to update payment method');
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      cancelMutation.mutate();
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const info = subscriptionInfo || {};

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-cyan-400" />
          Billing & Subscription
        </h1>
        <p className="text-gray-400 mt-1">Manage your subscription and payment methods</p>
      </div>

      {/* Current Plan */}
      <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] ${
        info.subscription_status === 'active' ? 'border-green-500/30' :
        info.subscription_status === 'trial' ? 'border-cyan-500/30' :
        info.subscription_status === 'past_due' ? 'border-red-500/30' :
        'border-gray-500/30'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Current Plan</CardTitle>
            <Badge className={`${
              info.subscription_status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
              info.subscription_status === 'trial' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
              info.subscription_status === 'past_due' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
              'bg-gray-500/20 text-gray-400 border-gray-500/50'
            } border`}>
              {info.subscription_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg">
            <div>
              <p className="text-gray-400 text-sm">Plan Type</p>
              <p className="text-white text-xl font-bold capitalize">{info.subscription_plan || 'Free'}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-cyan-400" />
          </div>

          {info.is_trial_active && (
            <div className="flex items-center justify-between p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
              <div>
                <p className="text-cyan-300 text-sm font-semibold">Free Trial Active</p>
                <p className="text-white text-lg">{info.days_left} days remaining</p>
                <p className="text-gray-400 text-xs mt-1">
                  Ends: {new Date(info.trial_ends).toLocaleDateString()}
                </p>
              </div>
              <Clock className="w-8 h-8 text-cyan-400" />
            </div>
          )}

          {info.has_payment_method ? (
            <div className="flex items-center gap-2 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-semibold">Payment method on file</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300 font-semibold">No payment method added</span>
            </div>
          )}

          {info.billing_cycle_anchor && (
            <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg">
              <div>
                <p className="text-gray-400 text-sm">Next Billing Date</p>
                <p className="text-white font-semibold">
                  {new Date(info.billing_cycle_anchor).toLocaleDateString()}
                </p>
              </div>
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Failed Alert */}
      {info.payment_failed && (
        <Card className="bg-gradient-to-br from-red-900/40 to-orange-900/40 border-red-500/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-2">Payment Failed</h3>
                <p className="text-red-200 mb-4">
                  Your last payment was declined. Please update your payment method to restore access to premium features.
                </p>
                <Button
                  onClick={() => handleUpdatePayment(info.subscription_plan)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Payment Method
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Manage Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!info.has_payment_method && (
            <>
              <Button
                onClick={() => handleUpdatePayment('basic')}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-12"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Add Payment Method - Basic ($9.99/mo)
              </Button>
              <Button
                onClick={() => handleUpdatePayment('elite')}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Add Payment Method - Elite ($19.99/mo)
              </Button>
              <Button
                onClick={() => handleUpdatePayment('premium_unlimited')}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-12"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Add Payment Method - Premium Unlimited ($24.99/mo)
              </Button>
            </>
          )}

          {info.has_payment_method && (
            <>
              {info.subscription_plan === 'basic' && (
                <>
                  <Button
                    onClick={() => handleUpdatePayment('elite')}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12"
                  >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Upgrade to Elite - $19.99/mo
                  </Button>
                  <Button
                    onClick={() => handleUpdatePayment('premium_unlimited')}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-12"
                  >
                    <Crown className="w-5 h-5 mr-2" />
                    Upgrade to Premium Unlimited - $24.99/mo
                  </Button>
                </>
              )}
              
              {info.subscription_plan === 'elite' && (
                <Button
                  onClick={() => handleUpdatePayment('premium_unlimited')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 h-12"
                >
                  <Crown className="w-5 h-5 mr-2" />
                  Upgrade to Premium Unlimited - $24.99/mo
                </Button>
              )}
              
              <Button
                onClick={() => handleUpdatePayment(info.subscription_plan)}
                variant="outline"
                className="w-full border-cyan-500/20 text-gray-300 hover:bg-cyan-500/10"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Payment Method
              </Button>

              {(info.subscription_status === 'active' || info.subscription_status === 'trial') && (
                <Button
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  variant="outline"
                  className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  {cancelMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Subscription
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6">
          <h3 className="text-white font-semibold mb-3">Important Information</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>Your trial period is 14 days with full access to all features</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>Basic: $9.99/mo • Elite: $19.99/mo • Premium Unlimited: $24.99/mo</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>Billing starts automatically when your trial ends</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>You can cancel anytime before the trial ends with no charge</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <span>All payments are processed securely through Stripe</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}