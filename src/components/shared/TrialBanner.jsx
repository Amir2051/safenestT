import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Sparkles, Zap, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function TrialBanner({ user }) {
  if (!user) return null;

  const isTrialActive = user.subscription_plan === 'trial' && user.payment_status === 'trial';
  const isTrialExpired = user.subscription_plan === 'free' && user.payment_status === 'expired';
  const daysRemaining = user.trial_days_remaining || 0;

  // Don't show if user has active paid subscription
  if (['basic', 'elite'].includes(user.subscription_plan) && user.payment_status === 'active') {
    return null;
  }

  if (isTrialExpired) {
    return (
      <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-white font-bold">⏰ Your 3-Day Trial Has Ended</p>
                <p className="text-red-300 text-sm">
                  Upgrade now to restore premium features and continue protecting your data
                </p>
              </div>
            </div>
            <Link to={createPageUrl("Upgrade")}>
              <Button className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isTrialActive) {
    const urgency = daysRemaining <= 1 ? 'high' : daysRemaining <= 2 ? 'medium' : 'low';
    
    return (
      <Card className={`border-2 ${
        urgency === 'high' 
          ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30 animate-pulse' 
          : urgency === 'medium'
          ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
          : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30'
      }`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                urgency === 'high' ? 'bg-red-500/20' : 
                urgency === 'medium' ? 'bg-yellow-500/20' : 
                'bg-blue-500/20'
              }`}>
                <Clock className={`w-5 h-5 ${
                  urgency === 'high' ? 'text-red-400' : 
                  urgency === 'medium' ? 'text-yellow-400' : 
                  'text-blue-400'
                }`} />
              </div>
              <div>
                <p className="text-white font-bold flex items-center gap-2">
                  🎁 Free Trial Active
                  <Badge className={`${
                    urgency === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                    urgency === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                    'bg-blue-500/20 text-blue-400 border-blue-500/50'
                  } border`}>
                    {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                  </Badge>
                </p>
                <p className={`text-sm ${
                  urgency === 'high' ? 'text-red-300' :
                  urgency === 'medium' ? 'text-yellow-300' :
                  'text-blue-300'
                }`}>
                  {urgency === 'high' 
                    ? '🚨 Trial ending soon! Upgrade now to avoid losing access to premium features'
                    : urgency === 'medium'
                    ? '⏰ Upgrade before your trial ends to keep full access'
                    : '✨ Enjoying your trial? Upgrade anytime for uninterrupted premium protection'
                  }
                </p>
              </div>
            </div>
            <Link to={createPageUrl("Upgrade")}>
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg">
                <Zap className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}