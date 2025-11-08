import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CheckCircle, Clock, Award, TrendingUp } from 'lucide-react';

export default function ReferralStats({ user, referrals }) {
  const stats = user?.referral_stats || {
    total_referrals: 0,
    completed_referrals: 0,
    pending_referrals: 0,
    bonus_months_earned: 0
  };

  const completedReferrals = referrals.filter(r => r.status === 'rewarded' || r.status === 'completed');
  const pendingReferrals = referrals.filter(r => r.status === 'pending' || r.status === 'verified');

  // Calculate premium time remaining
  const premiumUntil = user?.premium_until ? new Date(user.premium_until) : null;
  const daysRemaining = premiumUntil 
    ? Math.ceil((premiumUntil - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 text-cyan-400" />
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
              Total
            </Badge>
          </div>
          <p className="text-3xl font-bold text-white">{stats.total_referrals || 0}</p>
          <p className="text-sm text-gray-400">Total Referrals</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
              Completed
            </Badge>
          </div>
          <p className="text-3xl font-bold text-white">{completedReferrals.length}</p>
          <p className="text-sm text-gray-400">Successful Referrals</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-400" />
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
              Pending
            </Badge>
          </div>
          <p className="text-3xl font-bold text-white">{pendingReferrals.length}</p>
          <p className="text-sm text-gray-400">Awaiting Activation</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-purple-400" />
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
              Earned
            </Badge>
          </div>
          <p className="text-3xl font-bold text-white">{stats.bonus_months_earned || 0}</p>
          <p className="text-sm text-gray-400">Bonus Months Earned</p>
        </CardContent>
      </Card>

      {/* Premium Status */}
      {user?.premium_until && user?.premium_source === 'referral' && daysRemaining > 0 && (
        <Card className="md:col-span-2 lg:col-span-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">🎉 Premium Active via Referrals!</h3>
                  <p className="text-purple-300 text-sm">
                    Your premium access expires in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> • 
                    Expires: {premiumUntil.toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge className="bg-purple-500 text-white text-lg px-4 py-2">
                {daysRemaining} days left
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}