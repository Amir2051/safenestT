import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Gift, Users, CheckCircle, Clock, Copy, TrendingUp, Award, Sparkles, 
  Share2, Mail, MessageSquare, Loader2, Trophy, Star, Home
} from "lucide-react";
import { toast } from "sonner";

export default function Referrals() {
  const [user, setUser] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // Generate referral code if doesn't exist
        if (!userData.referral_code) {
          const response = await base44.functions.invoke('referralService', {
            endpoint: 'generate-code'
          });
          
          if (response.data.referral_code) {
            setReferralCode(response.data.referral_code);
            // Refresh user data
            const updatedUser = await base44.auth.me();
            setUser(updatedUser);
          }
        } else {
          setReferralCode(userData.referral_code);
        }
      } catch (error) {
        console.error('Init user error:', error);
      } finally {
        setLoadingCode(false);
      }
    };

    initUser();
  }, []);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const response = await base44.functions.invoke('referralService', {
        endpoint: 'stats'
      });
      return response.data;
    },
    enabled: !!user,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const copyReferralCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success('✅ Referral code copied!', { duration: 3000 });
    }
  };

  const copyReferralLink = () => {
    const appUrl = window.location.origin;
    const link = `${appUrl}/onboarding?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('✅ Referral link copied!', { duration: 3000 });
  };

  const shareViaEmail = () => {
    const appUrl = window.location.origin;
    const subject = encodeURIComponent('🛡️ Join SafeNest - Get 1 Month FREE!');
    const body = encodeURIComponent(
      `Hi!\n\n` +
      `I'm using SafeNest to protect my property and identity. I think you should try it too!\n\n` +
      `🎁 Sign up FREE and use my referral code:\n\n` +
      `Code: ${referralCode}\n\n` +
      `What You Get:\n` +
      `🏠 Title Protection - Monitor property records\n` +
      `⚖️ Legal Support - Access to licensed attorneys\n` +
      `🔒 Identity Monitor - Dark web scanning\n` +
      `📱 VPN Protection - Secure browsing\n` +
      `🤖 AI Assistants - 24/7 support\n\n` +
      `Plus: 1 MONTH FREE PREMIUM when you sign up!\n\n` +
      `Join now: ${appUrl}/onboarding?ref=${referralCode}\n\n` +
      `Best regards`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaSMS = () => {
    const appUrl = window.location.origin;
    const message = encodeURIComponent(
      `Protect your property & identity with SafeNest! 🛡️\n\n` +
      `FREE + 1 Month Premium\n\n` +
      `Use code: ${referralCode}\n` +
      `Sign up: ${appUrl}/onboarding?ref=${referralCode}`
    );
    window.location.href = `sms:?body=${message}`;
  };

  const shareViaWhatsApp = () => {
    const appUrl = window.location.origin;
    const message = encodeURIComponent(
      `Hi! 👋\n\n` +
      `I'm using SafeNest to protect my property & identity. It's amazing!\n\n` +
      `🏠 *Title Protection*\n` +
      `⚖️ *Legal Support*\n` +
      `🔒 *Identity Monitor*\n` +
      `🤖 *AI Assistants*\n\n` +
      `🎁 Get 1 MONTH FREE with code: *${referralCode}*\n\n` +
      `Sign up: ${appUrl}/onboarding?ref=${referralCode}\n\n` +
      `You'll love it! 🚀`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareNative = async () => {
    const appUrl = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SafeNest - Get 1 Month FREE!',
          text: `Protect your property & identity with SafeNest! Use my code ${referralCode} for 1 MONTH FREE. Sign up: ${appUrl}/onboarding?ref=${referralCode}`
        });
        toast.success('✅ Shared successfully!');
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyReferralLink();
        }
      }
    } else {
      copyReferralLink();
    }
  };

  const getTierInfo = (tier) => {
    switch (tier) {
      case 'platinum':
        return { icon: '💎', color: 'from-purple-500 to-pink-500', name: 'Platinum', min: 10, bonus: 3 };
      case 'gold':
        return { icon: '🥇', color: 'from-yellow-500 to-amber-500', name: 'Gold', min: 5, bonus: 2 };
      case 'silver':
        return { icon: '🥈', color: 'from-gray-400 to-gray-500', name: 'Silver', min: 2, bonus: 1.5 };
      default:
        return { icon: '🥉', color: 'from-orange-500 to-red-500', name: 'Bronze', min: 0, bonus: 1 };
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const currentTier = stats?.current_tier || 'bronze';
  const tierInfo = getTierInfo(currentTier);
  const nextTier = stats?.next_tier ? getTierInfo(stats.next_tier) : null;
  const completedReferrals = stats?.total_referrals || 0;
  const progressToNext = nextTier ? ((completedReferrals / nextTier.min) * 100) : 100;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Gift className="w-8 h-8 text-purple-400" />
          Referral Program
          <Badge className={`bg-gradient-to-r ${tierInfo.color} text-white border-none`}>
            {tierInfo.icon} {tierInfo.name}
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Invite friends and earn up to 3 months FREE per referral!
        </p>
      </div>

      {/* Tier Progress */}
      {nextTier && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-5xl">{tierInfo.icon}</div>
                <div>
                  <p className="text-white font-bold text-xl">{tierInfo.name} Tier</p>
                  <p className="text-sm text-gray-400">
                    {completedReferrals} / {nextTier.min} referrals to {nextTier.name}
                  </p>
                  <p className="text-xs text-purple-400 mt-1">
                    Current: {tierInfo.bonus} month{tierInfo.bonus > 1 ? 's' : ''} per referral
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-purple-400">
                  {stats?.total_bonus_months || 0}
                </p>
                <p className="text-xs text-gray-400">Months Earned</p>
              </div>
            </div>
            <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${nextTier.color} transition-all duration-500`}
                style={{ width: `${Math.min(progressToNext, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              {nextTier.min - completedReferrals} more referrals to unlock {nextTier.name} tier ({nextTier.bonus}x bonus)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tier System Info */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Tier Rewards System
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-[#0f1419] rounded-lg border border-orange-500/20 text-center">
              <div className="text-3xl mb-1">🥉</div>
              <p className="text-white font-bold text-sm">Bronze</p>
              <p className="text-xs text-gray-400">0-1 refs</p>
              <p className="text-orange-400 font-bold mt-1">+1 month</p>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-gray-400/20 text-center">
              <div className="text-3xl mb-1">🥈</div>
              <p className="text-white font-bold text-sm">Silver</p>
              <p className="text-xs text-gray-400">2-4 refs</p>
              <p className="text-gray-400 font-bold mt-1">+1.5 months</p>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-yellow-500/20 text-center">
              <div className="text-3xl mb-1">🥇</div>
              <p className="text-white font-bold text-sm">Gold</p>
              <p className="text-xs text-gray-400">5-9 refs</p>
              <p className="text-yellow-400 font-bold mt-1">+2 months</p>
            </div>
            <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20 text-center">
              <div className="text-3xl mb-1">💎</div>
              <p className="text-white font-bold text-sm">Platinum</p>
              <p className="text-xs text-gray-400">10+ refs</p>
              <p className="text-purple-400 font-bold mt-1">+3 months</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6 text-center">
            <Users className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-cyan-400">
              {statsLoading ? '...' : stats?.total_referrals || 0}
            </p>
            <p className="text-sm text-gray-400">Total Referrals</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-400">
              {statsLoading ? '...' : stats?.completed_referrals || 0}
            </p>
            <p className="text-sm text-gray-400">Completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6 text-center">
            <Clock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-yellow-400">
              {statsLoading ? '...' : stats?.pending_referrals || 0}
            </p>
            <p className="text-sm text-gray-400">Pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6 text-center">
            <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-400">
              {statsLoading ? '...' : stats?.total_bonus_months || 0}
            </p>
            <p className="text-sm text-gray-400">Months Earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Your Referral Code */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            Your Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={loadingCode ? 'Loading...' : referralCode}
              readOnly
              className="bg-[#0f1419] border-cyan-500/20 text-white text-center text-2xl font-bold tracking-widest h-14"
            />
            <Button
              onClick={copyReferralCode}
              disabled={loadingCode}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-14 px-6"
            >
              <Copy className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={copyReferralLink}
              variant="outline"
              className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button
              onClick={shareViaEmail}
              variant="outline"
              className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
            >
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
            <Button
              onClick={shareViaSMS}
              variant="outline"
              className="border-green-500/20 text-green-400 hover:bg-green-500/10"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </Button>
            <Button
              onClick={shareViaWhatsApp}
              variant="outline"
              className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          <Button
            onClick={shareNative}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12"
          >
            <Share2 className="w-5 h-5 mr-2" />
            Share with Friends
          </Button>
        </CardContent>
      </Card>

      {/* Recent Referrals */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Recent Referrals
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            </div>
          ) : stats?.recent_referrals && stats.recent_referrals.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_referrals.map((referral, idx) => (
                <div
                  key={idx}
                  className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white font-semibold">{referral.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(referral.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      +{referral.bonus_months} month{referral.bonus_months > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No referrals yet</p>
              <p className="text-gray-400 text-sm mt-1">Share your code to start earning rewards!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trial Status */}
      {user.trial_ends && new Date(user.trial_ends) > new Date() && (
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-green-400 mt-0.5" />
              <div>
                <p className="text-white font-semibold mb-1">Premium Access Active!</p>
                <p className="text-green-300 text-sm">
                  Your free premium access expires on{' '}
                  <strong>{new Date(user.trial_ends).toLocaleDateString()}</strong>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Keep referring to extend your premium access indefinitely!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6">
          <h3 className="text-white font-bold text-sm mb-3">How It Works</h3>
          <ul className="space-y-2 text-xs text-gray-400">
            <li>• Share your unique referral code with friends</li>
            <li>• When they sign up and complete onboarding, you both get rewards</li>
            <li>• New users get 1 month FREE premium access</li>
            <li>• You get 1-3 months FREE based on your tier</li>
            <li>• Progress through tiers (Bronze → Silver → Gold → Platinum) for bigger bonuses</li>
            <li>• Premium months are stackable - refer multiple friends to stay premium forever!</li>
            <li>• Self-referrals and fraudulent signups are automatically detected and invalidated</li>
            <li>• SafeNest reserves the right to revoke bonuses for abuse or fraud</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}