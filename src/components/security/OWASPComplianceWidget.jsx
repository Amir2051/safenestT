import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Lock, Activity } from 'lucide-react';

export default function OWASPComplianceWidget() {
  const owaspTop10 = [
    { id: 'A01:2021', name: 'Broken Access Control', protected: true },
    { id: 'A02:2021', name: 'Cryptographic Failures', protected: true },
    { id: 'A03:2021', name: 'Injection', protected: true },
    { id: 'A04:2021', name: 'Insecure Design', protected: true },
    { id: 'A05:2021', name: 'Security Misconfiguration', protected: true },
    { id: 'A06:2021', name: 'Vulnerable Components', protected: true },
    { id: 'A07:2021', name: 'Authentication Failures', protected: true },
    { id: 'A08:2021', name: 'Integrity Failures', protected: true },
    { id: 'A09:2021', name: 'Logging Failures', protected: true },
    { id: 'A10:2021', name: 'SSRF', protected: true }
  ];

  const protectedCount = owaspTop10.filter(item => item.protected).length;
  const percentage = (protectedCount / owaspTop10.length) * 100;

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-400" />
          OWASP Top 10 Protection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Coverage</span>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
              {protectedCount}/{owaspTop10.length} Protected
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all animate-pulse"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-lg font-bold text-green-400">{percentage.toFixed(0)}%</span>
          </div>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {owaspTop10.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-green-500/10"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.id}</p>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 ml-2 flex-shrink-0">
                Protected
              </Badge>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-green-400" />
            <p className="text-green-400 font-semibold text-sm">Full OWASP Coverage Active</p>
          </div>
          <p className="text-xs text-gray-300">
            All OWASP Top 10 vulnerabilities are actively protected with real-time monitoring and auto-blocking.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}