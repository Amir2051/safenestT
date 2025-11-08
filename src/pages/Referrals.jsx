import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Gift, Users, CheckCircle, Clock, XCircle, AlertTriangle, 
  Copy, TrendingUp, Award, Sparkles, Share2, Mail, MessageSquare
} from "lucide-react";
import { toast } from "sonner";

import ReferralStats from "../components/referrals/ReferralStats.jsx";
import ReferralLeaderboard from "../components/referrals/ReferralLeaderboard.jsx";

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
      const users = [];
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
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      
      if (!userData.referral_code) {
        const code = generateReferralCode(userData.email);
        await base44.auth.updateMe({ 
          referral_code: code,
          referral_stats: {
            total_referrals: 0,
            completed_referrals: 0,
            pending_referrals: 0,
            bonus_months_earned: 0
          }
        });
        
        setUser(prev => ({ ...prev, referral_code: code }));
      }
    }).catch(() => {});
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
    const subject = encodeURIComponent('🎁 Join SafeNest - Get 3 Days Free Premium!');
    const body = encodeURIComponent(
      `Hi!\n\n` +
      `I'm using SafeNest for complete security protection and I think you'd love it too!\n\n` +
      `Sign up and use my referral code to get 3 days of premium features FREE:\n\n` +
      `🎁 Referral Code: ${user.referral_code}\n\n` +
      `What you'll get:\n` +
      `✅ OWASP Top 10 Protection\n` +
      `✅ Dark Web Monitoring\n` +
      `✅ Password Vault\n` +
      `✅ VPN Protection\n` +
      `✅ Credit Card Monitoring\n\n` +
      `Join now and enter code ${user.referral_code} during signup!\n\n` +
      `Best regards`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const shareViaSMS = () => {
    const message = encodeURIComponent(
      `Join me on SafeNest - Complete Security Protection! 🛡️\n\n` +
      `Get 3 days FREE premium using my code: ${user.referral_code}\n\n` +
      `Sign up and enter the code!`
    );
    window.location.href = `sms:?body=${message}`;
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi! 👋\n\n` +
      `I'm using SafeNest for complete security protection and I think you'd love it!\n\n` +
      `🎁 Get 3 days FREE premium using my referral code:\n` +
      `*${user.referral_code}*\n\n` +
      `✅ OWASP Protection\n` +
      `✅ Password Vault\n` +
      `✅ Dark Web Monitor\n` +
      `✅ VPN & More!\n\n` +
      `Sign up and enter my code to get started! 🚀`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join SafeNest - Get 3 Days Free!',
          text: `Join me on SafeNest! Use my referral code ${user.referral_code} to get 3 days free premium. Sign up and enter the code!`
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Gift className="w-8 h-8 text-purple-400" />
          Refer & Earn Premium
        </h1>
        <p className="text-gray-400 mt-1">
          Share your code and earn 1 month premium for each successful referral
        </p>
      </div>

      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h4 className="text-white font-semibold mb-1">Share Your Code</h4>
              <p className="text-sm text-gray-400">
                Copy and share your unique referral code
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h4 className="text-white font-semibold mb-1">Friend Signs Up</h4>
              <p className="text-sm text-gray-400">
                They enter your code and create account
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-400">3</span>
              </div>
              <h4 className="text-white font-semibold mb-1">You Both Win!</h4>
              <p className="text-sm text-gray-400">
                You get 1 month premium, they get 3 days free
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReferralStats user={user} referrals={myReferrals} />

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-400" />
            Your Referral Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Referral Code - Big & Prominent */}
          <div>
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 rounded-xl p-8 text-center">
              <p className="text-sm text-purple-300 mb-3 font-semibold">YOUR UNIQUE CODE</p>
              <div className="text-5xl font-bold text-white tracking-widest mb-4 font-mono">
                {user.referral_code || 'LOADING...'}
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/50 mb-4">
                <Sparkles className="w-3 h-3 mr-1" />
                Each Referral = 1 Month Free Premium
              </Badge>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={copyReferralCode}
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold"
                >
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Code
                </Button>
              </div>
            </div>
          </div>

          {/* Share Instructions */}
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <h4 className="text-cyan-400 font-bold text-sm mb-2">📱 How to Share</h4>
            <p className="text-gray-300 text-sm mb-3">
              Tell your friends to sign up for SafeNest and enter code <strong className="text-white">{user.referral_code}</strong> during registration to get 3 days free premium!
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                onClick={shareViaEmail}
                variant="outline"
                size="sm"
                className="border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                onClick={shareViaSMS}
                variant="outline"
                size="sm"
                className="border-green-500/20 text-green-400 hover:bg-green-500/10"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                SMS
              </Button>
              <Button
                onClick={shareViaWhatsApp}
                variant="outline"
                size="sm"
                className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </Button>
              <Button
                onClick={shareNative}
                variant="outline"
                size="sm"
                className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
              >
                <Share2 className="w-4 h-4 mr-2" />
                More
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-gray-400 text-sm mt-1">Share your code to start earning premium!</p>
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
                      </div>
                      <p className="text-sm text-gray-400">{referral.referred_email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Signed up: {new Date(referral.signup_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {referral.bonus_granted && (
                      <div className="text-right">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          <Award className="w-3 h-3 mr-1" />
                          +{referral.bonus_months} month
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
            <li>• Share your unique referral code with friends</li>
            <li>• Each successful referral earns you 1 month of premium access</li>
            <li>• Friend must enter your code during signup and activate their account</li>
            <li>• Bonuses are stackable - refer multiple friends to extend your premium</li>
            <li>• Self-referrals and fraudulent signups are automatically invalidated</li>
            <li>• SafeNest reserves the right to revoke bonuses for abuse or fraud</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}