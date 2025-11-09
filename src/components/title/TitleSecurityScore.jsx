import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, TrendingUp, CheckCircle } from "lucide-react";

export default function TitleSecurityScore({ property }) {
  const score = property.title_security_score || 100;
  const riskFactors = property.risk_factors || [];

  const getScoreColor = (score) => {
    if (score >= 90) return { text: 'text-green-400', bg: 'from-green-500 to-emerald-500', status: 'Excellent' };
    if (score >= 70) return { text: 'text-cyan-400', bg: 'from-cyan-500 to-blue-500', status: 'Good' };
    if (score >= 50) return { text: 'text-yellow-400', bg: 'from-yellow-500 to-amber-500', status: 'Fair' };
    return { text: 'text-red-400', bg: 'from-red-500 to-orange-500', status: 'At Risk' };
  };

  const colors = getScoreColor(score);

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          Title Security Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 mb-6">
          {/* Score Display */}
          <div className="relative">
            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center`}>
              <div className="w-28 h-28 rounded-full bg-[#1a2332] flex items-center justify-center">
                <div className="text-center">
                  <p className={`text-4xl font-bold ${colors.text}`}>{score}</p>
                  <p className="text-xs text-gray-400">/ 100</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${
                score >= 90 ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                score >= 70 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' :
                score >= 50 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                'bg-red-500/20 text-red-400 border-red-500/50'
              } border text-lg px-4 py-2`}>
                {colors.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              {score >= 90 && '🛡️ Your property is highly secure with no detected risks.'}
              {score >= 70 && score < 90 && '✓ Your property is secure with minor monitoring points.'}
              {score >= 50 && score < 70 && '⚠️ Some risks detected. Review alerts and consider Title Lock.'}
              {score < 50 && '🚨 Critical risks detected. Enable Title Lock immediately.'}
            </p>
            {property.score_last_updated && (
              <p className="text-xs text-gray-500">
                Last updated: {new Date(property.score_last_updated).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Risk Factors */}
        {riskFactors.length > 0 && (
          <div className="mt-6">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              Detected Risk Factors ({riskFactors.length})
            </h4>
            <div className="space-y-2">
              {riskFactors.slice(0, 5).map((risk, idx) => (
                <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-red-500/20">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      {getSeverityIcon(risk.severity)}
                      <div>
                        <p className="text-sm text-white font-semibold">{risk.factor}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Detected: {new Date(risk.detected_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${
                      risk.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      risk.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                      risk.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    } text-xs`}>
                      -{risk.impact} pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Breakdown */}
        <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
          <h4 className="text-cyan-400 font-semibold text-sm mb-3">📊 Score Calculation</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Base Score</span>
              <span className="text-white font-semibold">100</span>
            </div>
            {riskFactors.map((risk, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-gray-400">- {risk.factor}</span>
                <span className="text-red-400">-{risk.impact}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-cyan-500/20 flex justify-between font-bold">
              <span className="text-white">Current Score</span>
              <span className={colors.text}>{score}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}