import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FeatureRestriction({ 
  feature, 
  requiredPlan = 'basic',
  reason = 'upgrade_required',
  children 
}) {
  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
      
      <CardContent className="p-8 text-center relative">
        <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          {reason === 'trial_expired' ? '⏰ Trial Expired' : '🔒 Premium Feature'}
        </h3>
        
        <p className="text-gray-300 mb-4">
          {reason === 'trial_expired' 
            ? 'Your 3-day trial has ended. Upgrade to continue using this feature.'
            : `This feature requires a ${requiredPlan === 'elite' ? 'Elite' : 'Basic'} subscription or higher.`
          }
        </p>

        {children && (
          <div className="bg-[#0f1419] rounded-lg p-4 mb-4 text-left">
            <p className="text-sm text-gray-400 font-semibold mb-2">
              {requiredPlan === 'elite' ? '✨ Elite Features:' : '💎 Premium Features:'}
            </p>
            {children}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={createPageUrl("Upgrade")}>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold shadow-lg">
              {requiredPlan === 'elite' ? (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Elite
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </>
              )}
            </Button>
          </Link>
          
          <Button
            variant="outline"
            className="border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
            onClick={() => window.history.back()}
          >
            Go Back
          </Button>
        </div>

        {reason === 'trial_expired' && (
          <p className="text-xs text-gray-500 mt-4">
            💡 Upgrade now and get 20% off your first month!
          </p>
        )}
      </CardContent>
    </Card>
  );
}