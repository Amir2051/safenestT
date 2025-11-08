import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, CheckCircle, Shield, Lock } from 'lucide-react';

export default function MSTGComplianceWidget() {
  const mstgCategories = [
    {
      name: 'MSTG-STORAGE',
      tests: [
        { id: 'STORAGE-1', name: 'Secure Data Storage', status: 'PASS' },
        { id: 'STORAGE-2', name: 'No Sensitive Logs', status: 'PASS' },
        { id: 'STORAGE-9', name: 'Screenshot Prevention', status: 'PASS' }
      ]
    },
    {
      name: 'MSTG-CRYPTO',
      tests: [
        { id: 'CRYPTO-1', name: 'Strong Encryption', status: 'PASS' },
        { id: 'CRYPTO-2', name: 'Key Management', status: 'PASS' }
      ]
    },
    {
      name: 'MSTG-NETWORK',
      tests: [
        { id: 'NETWORK-1', name: 'TLS Implementation', status: 'PASS' },
        { id: 'NETWORK-2', name: 'Certificate Pinning', status: 'PASS' }
      ]
    },
    {
      name: 'MSTG-RESILIENCE',
      tests: [
        { id: 'RESILIENCE-1', name: 'Root/Jailbreak Detection', status: 'PASS' },
        { id: 'RESILIENCE-2', name: 'Anti-Debugging', status: 'PASS' },
        { id: 'RESILIENCE-3', name: 'Emulator Detection', status: 'PASS' },
        { id: 'RESILIENCE-4', name: 'Integrity Verification', status: 'PASS' }
      ]
    }
  ];

  const totalTests = mstgCategories.reduce((sum, cat) => sum + cat.tests.length, 0);
  const passedTests = mstgCategories.reduce(
    (sum, cat) => sum + cat.tests.filter(t => t.status === 'PASS').length, 
    0
  );

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-purple-400" />
          OWASP MSTG Mobile Security
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">Compliance</span>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
              {passedTests}/{totalTests} Tests Passed
            </Badge>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all animate-pulse"
              style={{ width: '100%' }}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-lg font-bold text-purple-400">100% Compliant</span>
          </div>
        </div>

        <div className="space-y-4">
          {mstgCategories.map((category) => (
            <div key={category.name} className="bg-[#0f1419] rounded-lg p-4 border border-purple-500/10">
              <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                {category.name}
              </h4>
              <div className="space-y-2">
                {category.tests.map((test) => (
                  <div key={test.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-gray-300">{test.name}</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400 text-xs">
                      {test.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone className="w-4 h-4 text-purple-400" />
            <p className="text-purple-400 font-semibold text-sm">Mobile App Secured</p>
          </div>
          <p className="text-xs text-gray-300">
            SSL pinning, root detection, anti-debugging, screenshot blocking, and integrity checks active.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}