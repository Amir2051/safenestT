import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift } from "lucide-react";

export default function RealTimeReferralUpdates({ user }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Poll for referral updates every 15 seconds
    const interval = setInterval(async () => {
      try {
        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['referral-stats'] });
        queryClient.invalidateQueries({ queryKey: ['detailed-referrals'] });
        
        // Get fresh user data to check for new bonuses
        const freshUser = await queryClient.fetchQuery({
          queryKey: ['user'],
          staleTime: 0
        });

        // Check if bonus months increased (new referral completed)
        if (freshUser && user.total_bonus_months_earned < freshUser.total_bonus_months_earned) {
          const earnedMonths = freshUser.total_bonus_months_earned - user.total_bonus_months_earned;
          
          toast.success(
            `🎉 Referral Bonus Unlocked!`,
            {
              description: `You've earned ${earnedMonths} month${earnedMonths > 1 ? 's' : ''} of premium access!`,
              duration: 8000,
              icon: <Gift className="w-5 h-5" />
            }
          );
        }
      } catch (error) {
        console.error('Failed to check referral updates:', error);
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [user, queryClient]);

  return null;
}