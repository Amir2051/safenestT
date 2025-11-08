import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Gift, Users, CheckCircle, Clock, XCircle, AlertTriangle, 
  Copy, TrendingUp, Award, Sparkles, ExternalLink
} from "lucide-react";
import { toast } from "sonner";

import ReferralStats from "../components/referrals/ReferralStats.jsx";
import ShareButtons from "../components/referrals/ShareButtons.jsx";
import ReferralLeaderboard from "../components/referrals/ReferralLeaderboard.jsx";

export default function Referrals() {
  const [user, setUser] = useState(null);
  const [referralLink, setReferralLink] = useState('');

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
      
      // FIXED: Simple referral link that just opens the app with ref parameter
      const appUrl = window.location.origin + window.location.pathname;
      const link = `${appUrl}?ref=${userData.referral_code || ''}`;
      setReferralLink(link);
      
      console.log('✅ Generated referral link:', link);
      
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
      toast.success('✅ Referral code copied!');
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('✅ Referral link copied to clipboard!');
  };

  const testReferralLink = () => {
    window.open(referralLink, '_blank');
    toast.success('🚀 Opening referral link in new tab...');
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
          Invite friends and earn 1 month of premium access for each successful referral
        </p>
      </div>

      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-6">
          <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            How Referrals Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h4 className="text-white font-semibold mb-1">Share Your Link</h4>
              <p className="text-sm text-gray-400">
                Send your unique referral link to friends
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h4 className="text-white font-semibold mb-1">They Sign Up</h4>
              <p className="text-sm text-gray-400">
                Friend clicks link and creates account
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
            Your Referral Code & Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Referral Code */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block font-semibold">Referral Code</label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  value={user.referral_code || 'Generating...'}
                  readOnly
                  className="bg-[#0f1419] border-cyan-500/20 text-white text-xl font-mono text-center tracking-wider"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                    Unique
                  </Badge>
                </div>
              </div>
              <Button
                onClick={copyReferralCode}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
            </div>
          </div>

          {/* Referral Link */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block font-semibold">Shareable Link</label>
            <div className="space-y-3">
              <div className="p-4 bg-[#0f1419] border-2 border-cyan-500/30 rounded-lg">
                <p className="text-cyan-400 text-sm break-all font-mono mb-3">{referralLink}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={copyReferralLink}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    onClick={testReferralLink}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Test Link
                  </Button>
                </div>
              </div>
              
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-400 text-xs">
                  ✅ <strong>Link is ready!</strong> When friends click it, they'll see a welcome message and get 3 days free trial.
                </p>
              </div>
            </div>
          </div>

          {/* Share Buttons */}
          <div>
            <label className="text-gray-300 text-sm mb-2 block font-semibold">Quick Share</label>
            <ShareButtons 
              referralCode={user.referral_code} 
              referralLink={referralLink} 
            />
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
              <p className="text-gray-400 text-sm mt-1">Share your link to start earning premium access!</p>
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
            <li>• Each successful referral earns you 1 month of premium access</li>
            <li>• Referred user must complete registration and activate their account</li>
            <li>• Bonuses are stackable - refer multiple friends to extend your premium</li>
            <li>• Self-referrals and fraudulent signups are automatically detected and invalidated</li>
            <li>• Premium bonuses expire after the awarded duration unless extended</li>
            <li>• SafeNest reserves the right to revoke bonuses for abuse or fraud</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}