import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';

const severityColors = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' }
};

const threatTypeIcons = {
  extension: '🔌',
  config: '⚙️',
  password: '🔑',
  network: '🌐',
  cookie: '🍪'
};

export default function ThreatsList({ threats }) {
  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          Security Issues Found & Resolved
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {threats.map((threat, idx) => {
            const colors = severityColors[threat.severity] || severityColors.medium;
            return (
              <div
                key={idx}
                className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl flex-shrink-0">
                    {threatTypeIcons[threat.type] || '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-white font-semibold">{threat.name}</h4>
                      <Badge className={`${colors.bg} ${colors.text} ${colors.border} border flex-shrink-0`}>
                        {threat.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">Type:</span>
                      <span className="text-cyan-400 capitalize">{threat.type}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">Action:</span>
                      <span className="text-green-400 capitalize">{threat.action_taken}</span>
                    </div>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}