import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

export default function SecurityScoreCard({ score, alerts, passwords, user }) {
  const getScoreColor = (s) => {
    if (s >= 80) return { text: 'text-green-400', bg: 'from-green-500 to-emerald-400', glow: 'shadow-green-500/50' };
    if (s >= 60) return { text: 'text-yellow-400', bg: 'from-yellow-500 to-amber-400', glow: 'shadow-yellow-500/50' };
    return { text: 'text-red-400', bg: 'from-red-500 to-orange-400', glow: 'shadow-red-500/50' };
  };

  const getScoreLabel = (s) => {
    if (s >= 90) return { label: 'Excellent', icon: '🛡️' };
    if (s >= 80) return { label: 'Good', icon: '✅' };
    if (s >= 60) return { label: 'Fair', icon: '⚠️' };
    return { label: 'At Risk', icon: '🚨' };
  };

  const colors = getScoreColor(score);
  const status = getScoreLabel(score);

  const weakPasswords = passwords.filter(p => p.password_strength === 'weak' || p.password_strength === 'medium').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />
      
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          Security Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className={`text-6xl font-bold ${colors.text}`}>
                {score}
              </div>
              <div>
                <div className="text-2xl">{status.icon}</div>
                <div className={`text-sm font-semibold ${colors.text}`}>{status.label}</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-2">Out of 100 points</p>
          </div>
          
          {/* Circular Progress */}
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="url(#gradient)"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - score / 100)}`}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" className={score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : 'text-red-500'} stopColor="currentColor" />
                  <stop offset="100%" className={score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-orange-400'} stopColor="currentColor" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`text-2xl font-bold ${colors.text}`}>{score}%</div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f1419] rounded-lg p-3 border border-cyan-500/20">
            <div className="text-xs text-gray-400 mb-1">Active Alerts</div>
            <div className="text-xl font-bold text-white">{alerts.length}</div>
            {criticalAlerts > 0 && (
              <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {criticalAlerts} critical
              </div>
            )}
          </div>
          
          <div className="bg-[#0f1419] rounded-lg p-3 border border-cyan-500/20">
            <div className="text-xs text-gray-400 mb-1">Passwords</div>
            <div className="text-xl font-bold text-white">{passwords.length}</div>
            {weakPasswords > 0 && (
              <div className="text-xs text-yellow-400 mt-1">{weakPasswords} weak</div>
            )}
          </div>
          
          <div className="bg-[#0f1419] rounded-lg p-3 border border-cyan-500/20">
            <div className="text-xs text-gray-400 mb-1">VPN Status</div>
            <div className={`text-xl font-bold ${user?.vpn_enabled ? 'text-green-400' : 'text-red-400'}`}>
              {user?.vpn_enabled ? 'ON' : 'OFF'}
            </div>
          </div>
          
          <div className="bg-[#0f1419] rounded-lg p-3 border border-cyan-500/20">
            <div className="text-xs text-gray-400 mb-1">2FA</div>
            <div className={`text-xl font-bold ${user?.two_factor_enabled ? 'text-green-400' : 'text-red-400'}`}>
              {user?.two_factor_enabled ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {score < 80 && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-400 mb-1">Quick Improvements</p>
                <ul className="text-xs text-gray-300 space-y-1">
                  {!user?.vpn_enabled && <li>• Enable VPN protection</li>}
                  {!user?.two_factor_enabled && <li>• Set up two-factor authentication</li>}
                  {weakPasswords > 0 && <li>• Update {weakPasswords} weak password{weakPasswords > 1 ? 's' : ''}</li>}
                  {criticalAlerts > 0 && <li>• Resolve {criticalAlerts} critical alert{criticalAlerts > 1 ? 's' : ''}</li>}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}