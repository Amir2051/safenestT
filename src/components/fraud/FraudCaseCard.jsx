import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, Eye, Calendar, DollarSign } from "lucide-react";

export default function FraudCaseCard({ fraudCase, onSelect }) {
  const statusColors = {
    reported: 'bg-yellow-500/20 text-yellow-400',
    investigating: 'bg-blue-500/20 text-blue-400',
    traced: 'bg-purple-500/20 text-purple-400',
    recovering: 'bg-orange-500/20 text-orange-400',
    recovered: 'bg-green-500/20 text-green-400',
    closed: 'bg-gray-500/20 text-gray-400'
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer"
          onClick={onSelect}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h3 className="text-white font-bold">{fraudCase.case_title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={statusColors[fraudCase.status] || 'bg-gray-500/20'}>
                {fraudCase.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge variant="outline">{fraudCase.fraud_type.replace('_', ' ')}</Badge>
              <Badge variant="outline">{fraudCase.blockchain?.toUpperCase()}</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Amount Stolen
            </span>
            <span className="text-red-400 font-bold">
              ${fraudCase.amount_stolen_usd?.toLocaleString()}
            </span>
          </div>

          {fraudCase.recovery_progress > 0 && (
            <div className="p-3 bg-[#0f1419] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Recovery Progress
                </span>
                <span className="text-green-400 font-bold">
                  {fraudCase.recovery_progress.toFixed(1)}%
                </span>
              </div>
              <Progress value={fraudCase.recovery_progress} className="h-2" />
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(fraudCase.incident_date).toLocaleDateString()}
            </span>
            {fraudCase.traced_wallets && fraudCase.traced_wallets.length > 0 && (
              <span>{fraudCase.traced_wallets.length} wallets traced</span>
            )}
          </div>
        </div>

        <Button variant="outline" className="w-full border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10">
          <Eye className="w-4 h-4 mr-2" />
          View Case Details
        </Button>
      </CardContent>
    </Card>
  );
}