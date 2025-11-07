import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, Star, TrendingUp, Lock, CheckCircle, 
  Flame, Calendar, Target, Award
} from "lucide-react";

const ACHIEVEMENT_DEFINITIONS = [
  // Beginner
  { id: 'first_login', name: 'Welcome Aboard', desc: 'Complete onboarding', category: 'beginner', icon: '🎯', points: 10 },
  { id: 'first_scan', name: 'First Scan', desc: 'Complete your first security scan', category: 'beginner', icon: '🔍', points: 15 },
  { id: 'password_guardian', name: 'Password Guardian', desc: 'Add 5 passwords to vault', category: 'beginner', icon: '🔐', points: 20 },
  { id: 'breach_detector', name: 'Breach Detector', desc: 'Set up email monitoring', category: 'beginner', icon: '📧', points: 15 },
  { id: 'clean_start', name: 'Clean Start', desc: 'Complete device optimization', category: 'beginner', icon: '🧹', points: 15 },
  
  // Intermediate
  { id: 'security_pro', name: 'Security Pro', desc: 'Reach security score of 75', category: 'intermediate', icon: '💪', points: 30 },
  { id: 'vault_master', name: 'Vault Master', desc: 'Store 20+ items in vault', category: 'intermediate', icon: '🔒', points: 25 },
  { id: 'protected_identity', name: 'Protected Identity', desc: 'Monitor 3+ emails', category: 'intermediate', icon: '📱', points: 25 },
  { id: 'speed_demon', name: 'Speed Demon', desc: 'Complete scan in under 30 seconds', category: 'intermediate', icon: '⚡', points: 20 },
  
  // Advanced
  { id: 'security_champion', name: 'Security Champion', desc: 'Reach security score of 90', category: 'advanced', icon: '🏆', points: 50 },
  { id: 'streak_7', name: '7 Day Streak', desc: 'Check security 7 days in a row', category: 'advanced', icon: '🔥', points: 40 },
  { id: 'streak_30', name: '30 Day Guardian', desc: 'Maintain high score for 30 days', category: 'advanced', icon: '💎', points: 75 },
  { id: 'premium_member', name: 'Premium Member', desc: 'Upgrade to premium', category: 'advanced', icon: '🌟', points: 100 },
];

export default function Achievements() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => base44.entities.Achievement.list(),
    initialData: [],
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const totalPoints = user.total_points || 0;
  const level = user.level || 1;

  const getLevelInfo = (lvl) => {
    const levels = [
      { level: 1, title: 'Security Novice', min: 0, max: 100, color: 'from-gray-500 to-gray-600' },
      { level: 2, title: 'Security Guardian', min: 101, max: 300, color: 'from-blue-500 to-cyan-500' },
      { level: 3, title: 'Privacy Protector', min: 301, max: 600, color: 'from-purple-500 to-pink-500' },
      { level: 4, title: 'Security Expert', min: 601, max: 1000, color: 'from-yellow-500 to-orange-500' },
      { level: 5, title: 'Cybersecurity Master', min: 1001, max: 9999, color: 'from-green-500 to-emerald-500' }
    ];
    return levels.find(l => l.level === lvl) || levels[0];
  };

  const levelInfo = getLevelInfo(level);
  const nextLevel = getLevelInfo(level + 1);
  const progressToNext = nextLevel ? Math.min(100, ((totalPoints - levelInfo.min) / (nextLevel.min - levelInfo.min)) * 100) : 100;

  // Group achievements by category
  const grouped = {
    beginner: ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'beginner'),
    intermediate: ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'intermediate'),
    advanced: ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'advanced')
  };

  const isUnlocked = (id) => achievements.some(a => a.achievement_id === id && a.unlocked);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Achievements
        </h1>
        <p className="text-gray-400 mt-1">Unlock badges and level up your security game</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Points</p>
                <p className="text-2xl font-bold text-white">{totalPoints}</p>
              </div>
              <Star className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Unlocked</p>
                <p className="text-2xl font-bold text-white">{unlockedAchievements.length}/{ACHIEVEMENT_DEFINITIONS.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Current Streak</p>
                <p className="text-2xl font-bold text-white">{user.current_streak || 0} 🔥</p>
              </div>
              <Flame className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Level</p>
                <p className="text-2xl font-bold text-white">{level}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            Your Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${levelInfo.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <span className="text-2xl font-bold text-white">{level}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-semibold">{levelInfo.title}</p>
                {nextLevel && (
                  <p className="text-sm text-gray-400">
                    {totalPoints}/{nextLevel.min} points to next level
                  </p>
                )}
              </div>
              <div className="w-full h-3 bg-[#0f1419] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${levelInfo.color}`}
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Categories */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white capitalize flex items-center gap-2">
              {category === 'beginner' && <Target className="w-5 h-5 text-blue-400" />}
              {category === 'intermediate' && <Star className="w-5 h-5 text-purple-400" />}
              {category === 'advanced' && <Trophy className="w-5 h-5 text-yellow-400" />}
              {category} Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((achievement) => {
                const unlocked = isUnlocked(achievement.id);
                
                return (
                  <div
                    key={achievement.id}
                    className={`relative bg-[#0f1419] rounded-xl p-6 border transition-all ${
                      unlocked
                        ? 'border-green-500/50 hover:border-green-500/70'
                        : 'border-gray-700 opacity-60'
                    }`}
                  >
                    {/* Lock overlay for locked achievements */}
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                        <Lock className="w-8 h-8 text-gray-500" />
                      </div>
                    )}

                    <div className="text-center">
                      <div className={`text-5xl mb-3 ${unlocked ? 'animate-bounce' : 'grayscale'}`}>
                        {achievement.icon}
                      </div>
                      <h3 className="text-white font-semibold mb-2">{achievement.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{achievement.desc}</p>
                      <Badge className={`${
                        unlocked
                          ? 'bg-green-500/20 text-green-400 border-green-500/50'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                      } border`}>
                        {achievement.points} points
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}