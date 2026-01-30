import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Shield, AlertTriangle, CheckCircle2, 
  Info, Ban, Clock, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CallScreeningPanel({ user }) {
  const [testNumber, setTestNumber] = useState('');
  const [screening, setScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState(null);
  const queryClient = useQueryClient();

  const { data: recentScreenings } = useQuery({
    queryKey: ['call-screening-logs'],
    queryFn: async () => {
      const logs = await base44.entities.CallScreeningLog.list('-created_date', 20);
      return logs || [];
    },
    enabled: !!user
  });

  const handleScreenCall = async () => {
    if (!testNumber.trim()) {
      toast.error('Enter a phone number to screen');
      return;
    }

    setScreening(true);
    setScreeningResult(null);

    try {
      const response = await base44.functions.invoke('phoneIntelligenceOSINT', {
        action: 'screen-call',
        phone_number: testNumber
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Screening failed');
      }

      setScreeningResult(response.data);
      queryClient.invalidateQueries({ queryKey: ['call-screening-logs'] });
    } catch (error) {
      console.error('Screening error:', error);
      toast.error(error.message || 'Failed to screen call');
    } finally {
      setScreening(false);
    }
  };

  const getDecisionIcon = (decision) => {
    switch (decision) {
      case 'ALLOWED':
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'WARNED':
        return <AlertTriangle className="w-6 h-6 text-yellow-400" />;
      case 'BLOCKED':
        return <Ban className="w-6 h-6 text-red-400" />;
      default:
        return <Shield className="w-6 h-6 text-gray-400" />;
    }
  };

  const getDecisionColor = (decision) => {
    switch (decision) {
      case 'ALLOWED':
        return 'from-green-500/10 to-emerald-500/10 border-green-500/30';
      case 'WARNED':
        return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
      case 'BLOCKED':
        return 'from-red-500/10 to-pink-500/10 border-red-500/30';
      default:
        return 'from-gray-500/10 to-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Call Screening */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            Test Call Screening
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleScreenCall()}
              placeholder="Enter phone number to test..."
              className="bg-[#0f1419] border-cyan-500/30 text-white flex-1"
            />
            <Button
              onClick={handleScreenCall}
              disabled={screening || !testNumber.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              {screening ? 'Screening...' : 'Screen Call'}
            </Button>
          </div>

          {/* Screening Result */}
          {screeningResult && (
            <Card className={`bg-gradient-to-br ${getDecisionColor(screeningResult.decision)}`}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  {getDecisionIcon(screeningResult.decision)}
                  <div>
                    <Badge className={
                      screeningResult.decision === 'ALLOWED' ? 'bg-green-500/20 text-green-400 border-green-500/50 text-lg py-2 px-4' :
                      screeningResult.decision === 'WARNED' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-lg py-2 px-4' :
                      'bg-red-500/20 text-red-400 border-red-500/50 text-lg py-2 px-4'
                    }>
                      {screeningResult.decision}
                    </Badge>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-black/20 rounded-lg p-4 border border-white/10 mb-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Info className="w-4 h-4 text-cyan-400 mt-0.5" />
                    <p className="text-white font-semibold text-sm">Why this action occurred:</p>
                  </div>
                  <p className="text-gray-300 text-sm">{screeningResult.explanation}</p>
                </div>

                {/* Layers Triggered */}
                {screeningResult.layers_triggered?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-white font-semibold text-sm mb-2">Detection Layers Triggered:</p>
                    {screeningResult.layers_triggered.map((layer, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded border border-white/10">
                        <div className="flex items-center gap-2">
                          <Badge className={
                            layer.layer.includes('LAYER_1') ? 'bg-blue-500/20 text-blue-400' :
                            layer.layer.includes('LAYER_2') ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-green-500/20 text-green-400'
                          }>
                            {layer.layer.includes('LAYER_1') ? 'L1' :
                             layer.layer.includes('LAYER_2') ? 'L2' : 'L3'}
                          </Badge>
                          <span className="text-gray-300 text-sm">{layer.reason}</span>
                        </div>
                        <Badge className="bg-gray-500/20 text-gray-400">
                          {layer.confidence}% confidence
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Recent Screening Logs */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Recent Call Screenings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentScreenings && recentScreenings.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentScreenings.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-white font-mono text-sm">{log.phone_number}</span>
                      <Badge className={
                        log.screening_decision === 'ALLOWED' ? 'bg-green-500/20 text-green-400' :
                        log.screening_decision === 'WARNED' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }>
                        {log.screening_decision}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_date).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{log.explanation}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No screening logs yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forensic Compliance */}
      <Alert className="bg-gray-500/10 border-gray-500/30">
        <Info className="h-4 w-4 text-gray-400" />
        <AlertDescription className="text-gray-300 text-xs">
          <strong>Compliance Notice:</strong> This system adheres to Android Call Screening APIs and iOS CallKit frameworks. 
          No call audio is recorded. All screening decisions are logged for transparency and can be reviewed or appealed.
        </AlertDescription>
      </Alert>
    </div>
  );
}