import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";

export default function SubscriptionGuard({ children }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: subscriptionInfo } = useQuery({
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

  useEffect(() => {
    if (!user || !subscriptionInfo) return;

    // Allow access to subscription-related and public pages
    const publicPages = ['/Subscription', '/PaymentSuccess', '/PaymentOnboarding', '/PaymentRequired', '/AccessDenied', '/PendingApproval', '/WelcomeOnboarding'];
    const isPublicPage = publicPages.some(page => location.pathname.includes(page));
    
    if (isPublicPage) return;

    // Check if payment method is required but not added
    if (subscriptionInfo.requires_payment) {
      navigate(createPageUrl('PaymentRequired'));
      return;
    }

    // Check if user has active subscription or trial with payment method
    const hasAccess = (subscriptionInfo.subscription_status === 'active' || subscriptionInfo.is_trial_active) && subscriptionInfo.has_payment_method;

    if (!hasAccess) {
      navigate(createPageUrl('Subscription'));
    }
  }, [user, subscriptionInfo, location, navigate]);

  return <>{children}</>;
}