import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Crown } from 'lucide-react';

export default function ReferralLeaderboard({ leaderboard, currentUser }) {
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-orange-400" />;
      default:
        return <Award className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50';
      case 2:
        return 'from-gray-400/20 to-gray-500/20 border-gray-400/50';
      case 3:
        return 'from-orange-400/20 to-red-500/20 border-orange-400/50';
      default:
        return 'from-[#1a2332] to-[#0f1419] border-cyan-500/20';
    }
  };

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-12 text-center">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No leaderboard data yet</p>
          <p className="text-sm text-gray-500 mt-2">Be the first to refer friends!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Top Referrers This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.email === currentUser?.email;
            
            return (
              <div
                key={entry.email}
                className={`bg-gradient-to-br ${getRankColor(rank)} rounded-lg p-4 border ${
                  isCurrentUser ? 'ring-2 ring-cyan-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10">
                      {getRankIcon(rank)}
                    </div>
                    <div>
                      <p className="text-white font-semibold flex items-center gap-2">
                        {entry.full_name || 'Anonymous'}
                        {isCurrentUser && (
                          <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                            You
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">Code: {entry.referral_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{entry.total_referrals}</p>
                    <p className="text-xs text-gray-400">referrals</p>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                  <span className="text-sm text-gray-400">Bonus Earned:</span>
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                    {entry.bonus_months_earned || 0} month{(entry.bonus_months_earned || 0) !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

        {currentUser && !leaderboard.find(e => e.email === currentUser.email) && (
          <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-center">
            <p className="text-cyan-400 text-sm">
              Refer more friends to join the leaderboard! 🚀
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}