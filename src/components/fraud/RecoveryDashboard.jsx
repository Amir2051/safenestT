import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, DollarSign, FileText, CheckCircle } from "lucide-react";

export default function RecoveryDashboard({ cases }) {
  const totalStolen = cases.reduce((sum, c) => sum + (c.amount_stolen_usd || 0), 0);
  const totalRecovered = cases.reduce((sum, c) => {
    const recovered = (c.amount_stolen_usd || 0) * ((c.recovery_progress || 0) / 100);
    return sum + recovered;
  }, 0);
  const recoveryRate = totalStolen > 0 ? (totalRecovered / totalStolen) * 100 : 0;

  const casesInRecovery = cases.filter(c => c.status === 'recovering' || c.status === 'recovered');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Total Stolen</p>
                <p className="text-2xl font-bold text-red-400">${totalStolen.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Recovered</p>
                <p className="text-2xl font-bold text-green-400">${totalRecovered.toLocaleString()}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">Recovery Rate</p>
                <p className="text-2xl font-bold text-purple-400">{recoveryRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Active Recovery Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {casesInRecovery.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No active recovery cases</p>
            </div>
          ) : (
            <div className="space-y-4">
              {casesInRecovery.map(fraudCase => (
                <div key={fraudCase.id} className="p-4 bg-[#0f1419] rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{fraudCase.case_title}</h3>
                      <p className="text-sm text-gray-400">{fraudCase.fraud_type.replace('_', ' ')}</p>
                    </div>
                    <Badge className={
                      fraudCase.status === 'recovered' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                    }>
                      {fraudCase.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Amount Stolen:</span>
                      <span className="text-red-400 font-bold">${fraudCase.amount_stolen_usd?.toLocaleString()}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">Recovery Progress:</span>
                        <span className="text-green-400 font-bold">{fraudCase.recovery_progress?.toFixed(1)}%</span>
                      </div>
                      <Progress value={fraudCase.recovery_progress || 0} className="h-2" />
                    </div>

                    {fraudCase.exchanges_notified && fraudCase.exchanges_notified.length > 0 && (
                      <div className="pt-2 border-t border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Exchanges Notified:</p>
                        <div className="flex gap-2 flex-wrap">
                          {fraudCase.exchanges_notified.map((exchange, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {exchange}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}