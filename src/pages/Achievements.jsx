import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, Star, TrendingUp, Lock, CheckCircle, 
  Flame, Target, Award, Sparkles, Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ACHIEVEMENT_DEFINITIONS = [
  { id: 'first_login', name: 'Welcome Aboard', desc: 'Complete onboarding', category: 'beginner', icon: '🎯', points: 10, hint: 'Complete the onboarding tutorial' },
  { id: 'first_scan', name: 'First Scan', desc: 'Complete your first security scan', category: 'beginner', icon: '🔍', points: 15, hint: 'Run a security scan from the dashboard' },
  { id: 'password_guardian', name: 'Password Guardian', desc: 'Add 5 passwords to vault', category: 'beginner', icon: '🔐', points: 20, hint: 'Add 5 passwords to your vault' },
  { id: 'breach_detector', name: 'Breach Detector', desc: 'Set up email monitoring', category: 'beginner', icon: '📧', points: 15, hint: 'Check an email for breaches' },
  { id: 'security_pro', name: 'Security Pro', desc: 'Reach security score of 75', category: 'intermediate', icon: '💪', points: 30, hint: 'Improve security score to 75+' },
  { id: 'vault_master', name: 'Vault Master', desc: 'Store 20+ items in vault', category: 'intermediate', icon: '🔒', points: 25, hint: 'Add 20 items to your vault' },
  { id: 'protected_identity', name: 'Protected Identity', desc: 'Monitor 3+ emails', category: 'intermediate', icon: '📱', points: 25, hint: 'Monitor 3 email addresses (Premium)' },
  { id: 'security_champion', name: 'Security Champion', desc: 'Reach security score of 90', category: 'advanced', icon: '🏆', points: 50, hint: 'Improve security score to 90+' },
  { id: 'streak_7', name: '7 Day Streak', desc: 'Check security 7 days in a row', category: 'advanced', icon: '🔥', points: 40, hint: 'Visit the app 7 days consecutively' },
  { id: 'streak_30', name: '30 Day Guardian', desc: 'Maintain high score for 30 days', category: 'advanced', icon: '💎', points: 75, hint: 'Keep score above 75 for 30 days' },
  { id: 'premium_member', name: 'Premium Member', desc: 'Upgrade to premium', category: 'advanced', icon: '🌟', points: 100, hint: 'Upgrade to Basic or Elite plan' },
];

export default function Achievements() {
  const [user, setUser] = useState(null);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: achievements = [] } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => base44.entities.Achievement.list(),
    initialData: [],
  });

  const { data: passwords = [] } = useQuery({
    queryKey: ['passwords'],
    queryFn: () => base44.entities.Password.list(),
    initialData: [],
  });

  const { data: monitors = [] } = useQuery({
    queryKey: ['breach-monitors'],
    queryFn: () => base44.entities.BreachMonitor.list(),
    initialData: [],
  });

  const createAchievementMutation = useMutation({
    mutationFn: (data) => base44.entities.Achievement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Check achievements when data changes
  useEffect(() => {
    if (user && passwords && monitors) {
      checkAchievements();
    }
  }, [user, passwords, monitors]);

  const checkAchievements = async () => {
    const unlockedIds = achievements.map(a => a.achievement_id);
    
    // Check password_guardian
    if (passwords.length >= 5 && !unlockedIds.includes('password_guardian')) {
      await unlockAchievement('password_guardian');
    }

    // Check vault_master
    if (passwords.length >= 20 && !unlockedIds.includes('vault_master')) {
      await unlockAchievement('vault_master');
    }

    // Check breach_detector
    if (monitors.length >= 1 && !unlockedIds.includes('breach_detector')) {
      await unlockAchievement('breach_detector');
    }

    // Check protected_identity
    if (monitors.length >= 3 && !unlockedIds.includes('protected_identity')) {
      await unlockAchievement('protected_identity');
    }

    // Check security_pro
    if (user?.risk_score >= 75 && !unlockedIds.includes('security_pro')) {
      await unlockAchievement('security_pro');
    }

    // Check security_champion
    if (user?.risk_score >= 90 && !unlockedIds.includes('security_champion')) {
      await unlockAchievement('security_champion');
    }

    // Check premium_member
    const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';
    if (isPremium && !unlockedIds.includes('premium_member')) {
      await unlockAchievement('premium_member');
    }

    // Check streaks
    if (user?.current_streak >= 7 && !unlockedIds.includes('streak_7')) {
      await unlockAchievement('streak_7');
    }

    if (user?.current_streak >= 30 && !unlockedIds.includes('streak_30')) {
      await unlockAchievement('streak_30');
    }
  };

  const unlockAchievement = async (achievementId) => {
    const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    if (!achievement) return;

    try {
      await createAchievementMutation.mutateAsync({
        achievement_id: achievement.id,
        name: achievement.name,
        description: achievement.desc,
        category: achievement.category,
        icon: achievement.icon,
        points: achievement.points,
        unlocked: true,
        unlocked_date: new Date().toISOString(),
        progress: 100,
        requirement: achievement.hint
      });

      // Update total points
      const currentPoints = user?.total_points || 0;
      await updateUserMutation.mutateAsync({ 
        total_points: currentPoints + achievement.points 
      });

      // Show celebration
      toast.success(`🎉 Achievement Unlocked: ${achievement.name} (+${achievement.points} points)!`);

      // Save in-app notification
      const notifications = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
      notifications.unshift({
        id: `notif_${Date.now()}`,
        type: 'achievement',
        title: '🎉 Achievement Unlocked!',
        message: `${achievement.icon} ${achievement.name} - ${achievement.desc} (+${achievement.points} points)`,
        timestamp: Date.now(),
        read: false
      });
      localStorage.setItem('inAppNotifications', JSON.stringify(notifications));
      window.dispatchEvent(new CustomEvent('notificationAdded'));
    } catch (error) {
      console.error('Error unlocking achievement:', error);
    }
  };

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

  const grouped = {
    beginner: ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'beginner'),
    intermediate: ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'intermediate'),
    advanced: ACHIEVEMENT_DEFINITIONS.filter(a => a.category === 'advanced')
  };

  const isUnlocked = (id) => achievements.some(a => a.achievement_id === id && a.unlocked);

  const getProgress = (achievementId) => {
    switch(achievementId) {
      case 'password_guardian':
        return { current: passwords.length, target: 5, percentage: Math.min((passwords.length / 5) * 100, 100) };
      case 'vault_master':
        return { current: passwords.length, target: 20, percentage: Math.min((passwords.length / 20) * 100, 100) };
      case 'protected_identity':
        return { current: monitors.length, target: 3, percentage: Math.min((monitors.length / 3) * 100, 100) };
      case 'breach_detector':
        return { current: monitors.length, target: 1, percentage: Math.min((monitors.length / 1) * 100, 100) };
      case 'security_pro':
        const score75 = user?.risk_score || 0;
        return { current: score75, target: 75, percentage: Math.min((score75 / 75) * 100, 100) };
      case 'security_champion':
        const score90 = user?.risk_score || 0;
        return { current: score90, target: 90, percentage: Math.min((score90 / 90) * 100, 100) };
      case 'streak_7':
        return { current: user?.current_streak || 0, target: 7, percentage: Math.min(((user?.current_streak || 0) / 7) * 100, 100) };
      case 'streak_30':
        return { current: user?.current_streak || 0, target: 30, percentage: Math.min(((user?.current_streak || 0) / 30) * 100, 100) };
      default:
        return { current: 0, target: 1, percentage: 0 };
    }
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? ACHIEVEMENT_DEFINITIONS 
    : grouped[selectedCategory];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Achievements
        </h1>
        <p className="text-gray-400 mt-1">Unlock badges and level up your security game</p>
      </div>

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

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-cyan-400" />
            Your Level: {levelInfo.title}
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

      <div className="flex gap-2 flex-wrap">
        {['all', 'beginner', 'intermediate', 'advanced'].map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat 
              ? "bg-cyan-500 text-white" 
              : "border-cyan-500/20 text-gray-300 hover:bg-cyan-500/10"
            }
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
            {cat !== 'all' && ` (${grouped[cat]?.filter(a => isUnlocked(a.id)).length}/${grouped[cat]?.length})`}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAchievements.map((achievement) => {
          const unlocked = isUnlocked(achievement.id);
          const progress = getProgress(achievement.id);
          
          return (
            <div
              key={achievement.id}
              onClick={() => setSelectedAchievement(achievement)}
              className={`relative bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-xl p-6 border transition-all cursor-pointer ${
                unlocked
                  ? 'border-green-500/50 hover:border-green-500/70 hover:scale-105'
                  : 'border-gray-700 opacity-60 hover:opacity-80'
              }`}
            >
              {!unlocked && progress.percentage === 0 && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center z-10">
                  <Lock className="w-8 h-8 text-gray-500" />
                </div>
              )}

              <div className="text-center">
                <div className={`text-5xl mb-3 ${unlocked ? '' : 'grayscale'}`}>
                  {achievement.icon}
                </div>
                <h3 className="text-white font-semibold mb-2">{achievement.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{achievement.desc}</p>
                <Badge className={`${
                  unlocked
                    ? 'bg-green-500/20 text-green-400 border-green-500/50'
                    : 'bg-gray-500/20 text-gray-400 border-gray-500/50'
                } border mb-3`}>
                  {achievement.points} points
                </Badge>

                {!unlocked && progress.percentage > 0 && (
                  <div className="mt-3">
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400">{progress.current}/{progress.target}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedAchievement && (
        <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
          <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-2xl flex items-center gap-3">
                <span className="text-5xl">{selectedAchievement.icon}</span>
                {selectedAchievement.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-gray-400">{selectedAchievement.desc}</p>
              
              <div className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Points</p>
                    <p className="text-xl font-bold text-white">{selectedAchievement.points}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Category</p>
                    <p className="text-sm font-semibold text-cyan-400 capitalize">{selectedAchievement.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <Badge className={isUnlocked(selectedAchievement.id) ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                      {isUnlocked(selectedAchievement.id) ? 'Unlocked' : 'Locked'}
                    </Badge>
                  </div>
                </div>
              </div>

              {!isUnlocked(selectedAchievement.id) && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-400 font-semibold mb-1">How to unlock:</h4>
                      <p className="text-gray-300 text-sm">{selectedAchievement.hint}</p>
                    </div>
                  </div>
                  
                  {(() => {
                    const progress = getProgress(selectedAchievement.id);
                    return progress.percentage > 0 && (
                      <div className="mt-3">
                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400">Progress: {progress.current}/{progress.target}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {isUnlocked(selectedAchievement.id) && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-semibold">Achievement Unlocked!</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Unlocked on {new Date(achievements.find(a => a.achievement_id === selectedAchievement.id)?.unlocked_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}