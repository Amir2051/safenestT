import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, TrendingUp } from "lucide-react";

export default function RiskScoringDashboard({ monitors }) {
  const highRisk = monitors.filter(m => m.risk_score > 70);
  const mediumRisk = monitors.filter(m => m.risk_score > 40 && m.risk_score <= 70);
  const lowRisk = monitors.filter(m => m.risk_score <= 40);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-red-400 mb-1">High Risk</p>
            <p className="text-3xl font-bold text-red-400">{highRisk.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-yellow-400 mb-1">Medium Risk</p>
            <p className="text-3xl font-bold text-yellow-400">{mediumRisk.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
          <CardContent className="p-4">
            <p className="text-sm text-green-400 mb-1">Low Risk</p>
            <p className="text-3xl font-bold text-green-400">{lowRisk.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-400" />
            Wallet Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...monitors].sort((a, b) => b.risk_score - a.risk_score).map((monitor) => (
              <div key={monitor.id} className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-white font-mono text-sm mb-2">{monitor.wallet_address}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={monitor.wallet_type === 'scammer' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'}>
                        {monitor.wallet_type}
                      </Badge>
                      <Badge variant="outline">{monitor.blockchain}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${
                      monitor.risk_score > 70 ? 'text-red-400' :
                      monitor.risk_score > 40 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {monitor.risk_score}
                    </p>
                    <p className="text-xs text-gray-400">Risk Score</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full ${
                      monitor.risk_score > 70 ? 'bg-red-500' :
                      monitor.risk_score > 40 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${monitor.risk_score}%` }}
                  />
                </div>

                {/* Risk Indicators */}
                {monitor.risk_indicators && monitor.risk_indicators.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-xs mb-2">Risk Indicators:</p>
                    <div className="flex flex-wrap gap-2">
                      {monitor.risk_indicators.map((indicator, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs text-orange-400">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {indicator}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exchange/Mixer Flags */}
                <div className="flex gap-2 mt-3">
                  {monitor.exchange_detected && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Exchange: {monitor.exchange_name}
                    </Badge>
                  )}
                  {monitor.mixer_detected && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Mixer Used
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}