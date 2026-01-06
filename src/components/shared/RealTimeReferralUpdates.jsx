import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift } from "lucide-react";

export default function RealTimeReferralUpdates({ user }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Poll for referral updates every 30 seconds (reduced frequency)
    const interval = setInterval(async () => {
      try {
        // FIXED: Only invalidate queries, don't fetch in background
        // This prevents unnecessary re-renders
        queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
        queryClient.invalidateQueries({ queryKey: ['detailed-referrals'] });
      } catch (error) {
        console.error('Failed to check referral updates:', error);
      }
    }, 30000); // FIXED: Reduced to 30 seconds

    return () => clearInterval(interval);
  }, [user?.id, queryClient]); // FIXED: Only re-run if user ID changes

  return null;
}