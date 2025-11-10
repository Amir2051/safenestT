
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gift, Users, CheckCircle, Clock, XCircle, AlertTriangle,
  Copy, TrendingUp, Award, Sparkles, Share2, Mail, MessageSquare, BarChart3,
  Home, Star
} from "lucide-react";
import { toast } from "sonner";

import ReferralStats from "../components/referrals/ReferralStats.jsx";
import ReferralLeaderboard from "../components/referrals/ReferralLeaderboard.jsx";
import ReferralAnalytics from "../components/referrals/ReferralAnalytics.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReferralShareWidget from "../components/referrals/ReferralShareWidget.jsx";

export default function Referrals() {
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date'),
    enabled: !!user,
    initialData: [],
  });

  const { data: leaderboard = [] } = useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: async () => {
      const users = []; // This should fetch users with referral stats
      // For now, returning an empty array or mocking some data until `base44.entities.User.list` supports filtering/aggregating referral stats
      return users
        .filter(u => u.referral_stats?.completed_referrals > 0)
        .map(u => ({
          email: u.email,
          full_name: u.full_name,
          referral_code: u.referral_code,
          total_referrals: u.referral_stats.completed_referrals,
          bonus_months_earned: u.referral_stats.bonus_months_earned
        }))
        .sort((a, b) => b.total_referrals - a.total_referrals)
        .slice(0, 10);
    },
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(async (initialUserData) => {
      // Create a local mutable copy to build up the consistent user data
      let updatedUserDataForState = { ...initialUserData };

      if (!updatedUserDataForState.referral_code) {
        const code = generateReferralCode(updatedUserDataForState.email);
        const newReferralStats = {
          total_referrals: 0,
          completed_referrals: 0,
          pending_referrals: 0,
          bonus_months_earned: 0,
          property_referrals: 0,
          legal_referrals: 0,
          total_credits_earned: 0
        };
        const updatePayload = {
          referral_code: code,
          referral_stats: newReferralStats,
          referral_tier: 'bronze',
          referral_badges: []
        };
        await base44.auth.updateMe(updatePayload);
        // Apply all changes from the backend update to the local copy
        updatedUserDataForState = { ...updatedUserDataForState, ...updatePayload };
      }

      // Calculate tier based on the current most up-to-date user data
      const stats = updatedUserDataForState.referral_stats || {};
      const totalCompleted = stats.completed_referrals || 0;

      let tier = 'bronze';
      if (totalCompleted >= 50) tier = 'diamond';
      else if (totalCompleted >= 25) tier = 'platinum';
      else if (totalCompleted >= 10) tier = 'gold';
      else if (totalCompleted >= 5) tier = 'silver';

      // Only update if the tier has changed
      if (tier !== updatedUserDataForState.referral_tier) {
        await base44.auth.updateMe({ referral_tier: tier });
        // Apply this change to the local copy as well
        updatedUserDataForState = { ...updatedUserDataForState, referral_tier: tier };
      }
      
      // Finally, set the component's state with the fully consistent user data
      setUser(updatedUserDataForState);
    }).catch(() => {
      // Error handling intentionally left minimal as per outline's suggestion.
      // In a production app, more robust error handling (e.g., toast, redirect) would be present.
    });
  }, []);

  const generateReferralCode = (email) => {
    const emailPart = email.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${emailPart}${randomPart}`;
  };

  const copyReferralCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      toast.success('✅ Referral code copied! Share it with your friends.', { duration: 3000 });
    }
  };

  const shareViaEmail = () => {
    const appUrl = "https://safenest.com"; // Replace with your actual app URL
    const subject = encodeURIComponent('🏠 Protect Your Property Title - Join SafeNest FREE!');
    const body = encodeURIComponent(
      `Hi!\n\n` +
      `I'm using SafeNest to protect my property from title fraud and legal issues. I think you should try it too!\n\n` +
      `🎁 Sign up FREE and use my referral code:\n\n` +
      `Code: ${user.referral_code}\n\n` +
      `What You Get:\n` +
      `🏠 Title Protection - Monitor NYC property records\n` +
      `⚖️ Legal Support - Access to licensed attorneys\n` +
      `📄 Document Templates - Auto-generated legal docs\n` +
      `🔒 Title Lock - Digital property protection\n` +
      `🤖 AI Monitoring - 24/7 threat detection\n\n` +
      `100% FREE - No credit card required!\n\n` +
      `Join now: ${appUrl}/?ref=${user.referral_code}\n\n` +
      `Best regards`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaSMS = () => {
    const appUrl = "https://safenest.com"; // Replace with your actual app URL
    const message = encodeURIComponent(
      `Protect your property with SafeNest! 🏠\n\n` +
      `FREE Title Protection + Legal Support\n\n` +
      `Use code: ${user.referral_code}\n` +
      `Sign up: ${appUrl}/?ref=${user.referral_code}`
    );
    window.location.href = `sms:?body=${message}`;
  };

  const shareViaWhatsApp = () => {
    const appUrl = "https://safenest.com"; // Replace with your actual app URL
    const message = encodeURIComponent(
      `Hi! 👋\n\n` +
      `I'm using SafeNest to protect my property from fraud. It's 100% FREE and amazing!\n\n` +
      `🏠 *Title Protection*\n` +
      `⚖️ *Legal Support*\n` +
      `🔒 *Title Lock*\n` +
      `🤖 *AI Monitoring*\n\n` +
      `Use my referral code: *${user.referral_code}*\n\n` +
      `Sign up here: ${appUrl}/?ref=${user.referral_code}\n\n` +
      `You'll love it! 🚀`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareNative = async () => {
    const appUrl = "https://safenest.com"; // Replace with your actual app URL
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SafeNest - Protect Your Property FREE!',
          text: `Protect your property with SafeNest! Use my referral code ${user.referral_code} for FREE Title Protection & Legal Support. Sign up here: ${appUrl}/?ref=${user.referral_code}`
        });
        toast.success('✅ Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyReferralCode();
        }
      }
    } else {
      copyReferralCode();
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'rewarded':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'verified':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'invalid':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'rewarded':
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'verified':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'invalid':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const myReferrals = referrals.filter(r => r.referrer_email === user.email);
  const propertyReferrals = myReferrals.filter(r => r.referral_source === 'title_protection' || r.completion_action === 'property_added');
  const legalReferrals = myReferrals.filter(r => r.referral_source === 'legal_support' || r.completion_action === 'legal_consultation');

  const getTierInfo = (tier) => {
    switch (tier) {
      case 'diamond':
        return { icon: '💎', color: 'from-cyan-500 to-blue-500', name: 'Diamond', min: 50 };
      case 'platinum':
        return { icon: '🏆', color: 'from-purple-500 to-pink-500', name: 'Platinum', min: 25 };
      case 'gold':
        return { icon: '🥇', color: 'from-yellow-500 to-amber-500', name: 'Gold', min: 10 };
      case 'silver':
        return { icon: '🥈', color: 'from-gray-400 to-gray-500', name: 'Silver', min: 5 };
      default:
        return { icon: '🥉', color: 'from-orange-500 to-red-500', name: 'Bronze', min: 0 };
    }
  };

  const tierInfo = getTierInfo(user?.referral_tier || 'bronze');
  const nextTier = user?.referral_tier === 'bronze' ? getTierInfo('silver') :
                   user?.referral_tier === 'silver' ? getTierInfo('gold') :
                   user?.referral_tier === 'gold' ? getTierInfo('platinum') :
                   user?.referral_tier === 'platinum' ? getTierInfo('diamond') : null;

  const completedReferrals = user?.referral_stats?.completed_referrals || 0;
  const progressToNext = nextTier ? ((completedReferrals / nextTier.min) * 100) : 100;
  const appUrl = "https://safenest.com"; // Replace with your actual app URL

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Gift className="w-8 h-8 text-purple-400" />
          Referral Program
          <Badge className={`bg-gradient-to-r ${tierInfo.color} text-white border-none`}>
            {tierInfo.icon} {tierInfo.name}
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Earn rewards by referring friends to Title Protection & Legal Support
        </p>
      </div>

      {/* Tabs for Overview and Analytics */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-white">
            <Gift className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Tier Progress */}
          {nextTier && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{tierInfo.icon}</div>
                    <div>
                      <p className="text-white font-bold">{tierInfo.name} Tier</p>
                      <p className="text-sm text-gray-400">
                        {completedReferrals} / {nextTier.min} to {nextTier.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-400">
                      {user?.referral_stats?.total_credits_earned || 0}
                    </p>
                    <p className="text-xs text-gray-400">Total Credits</p>
                  </div>
                </div>
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${nextTier.color} transition-all duration-500`}
                    style={{ width: `${Math.min(progressToNext, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rewards Info */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Referral Rewards System
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="w-5 h-5 text-cyan-400" />
                    <h4 className="text-white font-bold">Title Protection Referral</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    When your friend adds their first property
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="text-green-400">✓ +30 Premium Credits</p>
                    <p className="text-green-400">✓ +1 Month Premium</p>
                    <p className="text-green-400">✓ Property Ambassador Badge</p>
                  </div>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <h4 className="text-white font-bold">Legal Support Referral</h4>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">
                    When your friend requests an attorney consultation
                  </p>
                  <div className="space-y-1 text-sm">
                    <p className="text-purple-400">✓ +50 Premium Credits (Higher!)</p>
                    <p className="text-purple-400">✓ +1 Month Premium</p>
                    <p className="text-purple-400">✓ Legal Advocate Badge</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300 text-sm">
                  <strong>💡 Pro Tip:</strong> Legal Support referrals earn 50 credits vs 30 for property referrals.
                  Share with friends who need legal help for maximum rewards!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6 text-center">
                <Home className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-cyan-400">
                  {user?.referral_stats?.property_referrals || 0}
                </p>
                <p className="text-sm text-gray-400">Property Referrals</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-purple-400">
                  {user?.referral_stats?.legal_referrals || 0}
                </p>
                <p className="text-sm text-gray-400">Legal Referrals</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-400">
                  {user?.referral_stats?.completed_referrals || 0}
                </p>
                <p className="text-sm text-gray-400">Total Completed</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
              <CardContent className="p-6 text-center">
                <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-yellow-400">
                  {user?.referral_stats?.total_credits_earned || 0}
                </p>
                <p className="text-sm text-gray-400">Credits Earned</p>
              </CardContent>
            </Card>
          </div>

          <ReferralStats user={user} referrals={myReferrals} />

          {/* Replace Share Section with Widget */}
          <ReferralShareWidget user={user} />

          {/* Referrals List with Service Type */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Your Referrals ({myReferrals.length})
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myReferrals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-white font-semibold text-lg">No referrals yet</p>
                  <p className="text-gray-400 text-sm mt-1">Share your code to start earning rewards!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myReferrals.map((referral) => (
                    <div
                      key={referral.id}
                      className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(referral.status)}
                            <p className="text-white font-semibold">
                              {referral.referred_name || 'Anonymous User'}
                            </p>
                            <Badge className={`${getStatusColor(referral.status)} border text-xs`}>
                              {referral.status}
                            </Badge>
                            {(referral.referral_source && referral.referral_source !== 'general') || referral.completion_action && (
                              <Badge className={
                                referral.referral_source === 'title_protection' || referral.completion_action === 'property_added'
                                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 border text-xs'
                                  : 'bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs'
                              }>
                                {referral.referral_source === 'title_protection' || referral.completion_action === 'property_added'
                                  ? '🏠 Title Protection'
                                  : '⚖️ Legal Support'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{referral.referred_email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Signed up: {new Date(referral.signup_date).toLocaleDateString()}
                          </p>
                          {referral.completion_action && (
                            <p className="text-xs text-green-400 mt-1">
                              ✓ Completed: {referral.completion_action.replace('_', ' ')}
                            </p>
                          )}
                        </div>

                        {referral.bonus_granted && (
                          <div className="text-right">
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                              <Award className="w-3 h-3 mr-1" />
                              +{referral.bonus_value} credits
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(referral.rewarded_date).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {referral.fraud_flags && referral.fraud_flags.length > 0 && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
                          <p className="text-xs text-red-400">
                            ⚠️ Fraud flags: {referral.fraud_flags.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ReferralLeaderboard leaderboard={leaderboard} currentUser={user} />

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-sm mb-3">Terms & Conditions</h3>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>• Share your unique referral code or specific links with friends</li>
                <li>• You earn credits and premium months for each successful referral. Rewards vary by referral type.</li>
                <li>• A successful referral means your friend signs up, uses your code, and completes a qualifying action (e.g., adds a property, requests legal consultation).</li>
                <li>• Credits can be redeemed for various benefits within the SafeNest app.</li>
                <li>• Premium months are stackable - refer multiple friends to extend your premium access.</li>
                <li>• Self-referrals and fraudulent signups are automatically invalidated.</li>
                <li>• SafeNest reserves the right to revoke bonuses for abuse or fraud.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <ReferralAnalytics referrals={myReferrals} user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
