import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Copy, Share2, Gift, CheckCircle, Mail,
  MessageCircle, Twitter, Facebook
} from "lucide-react";
import { toast } from "sonner";

export default function Referrals() {
  const [user, setUser] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      // Generate referral code if doesn't exist
      if (!userData.referral_code) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await base44.auth.updateMe({ referral_code: code });
        setUser({ ...userData, referral_code: code });
      }
    }).catch(() => {});
  }, []);

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => base44.entities.Referral.list('-created_date'),
    initialData: [],
  });

  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${user.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 3000);
  };

  const shareVia = (platform) => {
    const link = `${window.location.origin}?ref=${user.referral_code}`;
    const text = `Join me on SafeNest and protect your digital life! Use my referral code for a free premium trial. 🛡️`;
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
      email: `mailto:?subject=${encodeURIComponent('Join SafeNest')}&body=${encodeURIComponent(text + '\n\n' + link)}`
    };

    window.open(urls[platform], '_blank');
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const pendingReferrals = referrals.filter(r => r.status === 'pending').length;
  const rewardsClaimed = referrals.filter(r => r.reward_claimed).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Users className="w-8 h-8 text-purple-400" />
          Invite Friends
        </h1>
        <p className="text-gray-400 mt-1">Share SafeNest and earn premium rewards</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Friends Joined</p>
                <p className="text-2xl font-bold text-white">{completedReferrals}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Pending</p>
                <p className="text-2xl font-bold text-white">{pendingReferrals}</p>
              </div>
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Rewards Earned</p>
                <p className="text-2xl font-bold text-white">{rewardsClaimed}</p>
              </div>
              <Gift className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Give 1 Month Premium, Get 1 Month Premium
            </h2>
            <p className="text-gray-400 mb-6">
              Invite friends to SafeNest and you both get a free month of premium when they sign up!
            </p>

            {/* Referral Code */}
            <div className="bg-[#0f1419] rounded-xl p-6 mb-6 border border-purple-500/20">
              <p className="text-sm text-gray-400 mb-2">Your Referral Code</p>
              <div className="text-3xl font-bold text-white tracking-wider mb-4">
                {user.referral_code}
              </div>
              <div className="flex gap-3 max-w-md mx-auto">
                <Input
                  value={`${window.location.origin}?ref=${user.referral_code}`}
                  readOnly
                  className="bg-[#1a2332] border-purple-500/20 text-white"
                />
                <Button
                  onClick={copyReferralLink}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => shareVia('whatsapp')}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                onClick={() => shareVia('twitter')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={() => shareVia('facebook')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={() => shareVia('email')}
                variant="outline"
                className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Progress */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Referral Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 3, 5, 10].map((milestone) => {
              const achieved = completedReferrals >= milestone;
              const reward = milestone === 1 ? '1 month free' : 
                           milestone === 3 ? '2 months free' :
                           milestone === 5 ? '3 months free' :
                           '6 months free + Elite upgrade';
              
              return (
                <div
                  key={milestone}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    achieved
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-[#0f1419] border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      achieved ? 'bg-green-500' : 'bg-gray-600'
                    }`}>
                      {achieved ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <span className="text-white font-bold">{milestone}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        Refer {milestone} friend{milestone > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-400">Reward: {reward}</p>
                    </div>
                  </div>
                  {achieved ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      Unlocked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-gray-600 text-gray-400">
                      {completedReferrals}/{milestone}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Referral History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                >
                  <div>
                    <p className="text-white font-semibold">
                      {referral.referred_email || 'Anonymous User'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(referral.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={`${
                    referral.status === 'completed'
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : referral.status === 'rewarded'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                  } border`}>
                    {referral.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}