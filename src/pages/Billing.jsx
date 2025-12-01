import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, Calendar, AlertTriangle, CheckCircle, Clock,
  RefreshCw, XCircle, TrendingUp, Loader2, Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "react-router-dom";

export default function Billing() {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    
    // Handle Success/Cancel from Stripe redirect
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    
    if (status === 'success') {
      toast.success('Payment method added successfully!');
      // Clear URL param without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancel') {
      toast.info('Payment method addition cancelled');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

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

  const handleAddCard = async () => {
    setProcessing(true);
    try {
      const response = await base44.functions.invoke('subscriptionService', {
        endpoint: 'create-setup-session'
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to initiate payment method setup');
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      cancelMutation.mutate();
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const info = subscriptionInfo || {};
  const paymentMethods = info.payment_methods || [];

  return (
    <div className="min-h-screen bg-[#0f1419] p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3 flex-wrap break-words">
            <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 flex-shrink-0" />
            <span>Billing & Payments</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm sm:text-base">Manage your subscription and saved cards</p>
        </div>

        {/* Current Plan */}
        <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] ${
          info.subscription_status === 'active' ? 'border-green-500/30' :
          info.subscription_status === 'trial' ? 'border-cyan-500/30' :
          info.subscription_status === 'past_due' ? 'border-red-500/30' :
          'border-gray-500/30'
        }`}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-white">Current Plan</CardTitle>
              <Badge className={`${
                info.subscription_status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                info.subscription_status === 'trial' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
                info.subscription_status === 'past_due' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                'bg-gray-500/20 text-gray-400 border-gray-500/50'
              } border`}>
                {info.subscription_status || 'Free'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#0f1419] rounded-lg gap-4">
              <div>
                <p className="text-gray-400 text-sm">Plan Type</p>
                <p className="text-white text-xl font-bold capitalize">{info.subscription_plan || 'Free'}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-cyan-400" />
            </div>

            {info.is_trial_active && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 gap-4">
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

        {/* Payment Methods */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardHeader>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <CardTitle className="text-white">Payment Methods</CardTitle>
               <Button 
                 onClick={handleAddCard} 
                 disabled={processing}
                 className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto h-auto py-3 sm:py-2 whitespace-normal"
               >
                 {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                 Add Payment Method
               </Button>
             </div>
          </CardHeader>
          <CardContent className="space-y-4">
             {paymentMethods.length === 0 ? (
               <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg px-4">
                 <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                 <p className="text-gray-400 text-lg font-medium">No payment methods saved</p>
                 <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">Add a card to secure your subscription and enable premium features.</p>
                 <Button 
                    onClick={handleAddCard} 
                    disabled={processing}
                    variant="outline"
                    className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-800"
                  >
                    Add Card Now
                  </Button>
               </div>
             ) : (
               <div className="space-y-3">
                 {paymentMethods.map((pm) => (
                   <div key={pm.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-gray-700 gap-4">
                     <div className="flex items-center gap-3 w-full sm:w-auto">
                       <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                         <CreditCard className="w-6 h-6 text-white" />
                       </div>
                       <div className="overflow-hidden">
                         <p className="text-white font-semibold capitalize truncate">
                           {pm.card.brand} •••• {pm.card.last4}
                         </p>
                         <p className="text-xs text-gray-400">
                           Expires {pm.card.exp_month}/{pm.card.exp_year}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <Badge className="bg-green-900/30 text-green-400 border-green-500/30">Active</Badge>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </CardContent>
        </Card>

        {/* Manage Subscription Actions */}
        {(info.subscription_status === 'active' || info.subscription_status === 'trial') && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
            <CardHeader>
                <CardTitle className="text-white text-lg">Subscription Management</CardTitle>
            </CardHeader>
            <CardContent>
                <Button
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    variant="outline"
                    className="w-full sm:w-auto border-red-500/20 text-red-400 hover:bg-red-500/10"
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
            </CardContent>
            </Card>
        )}

        {/* Info */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6">
            <h3 className="text-white font-semibold mb-3">Secure & Safe</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>All payments are processed securely through Stripe.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>We do not store your card details on our servers.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}