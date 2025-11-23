import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Database, FileText, Lock } from "lucide-react";

export default function InvestigationSettings() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Investigation System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-semibold">Security Status</h4>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                Fully Encrypted
              </Badge>
              <p className="text-xs text-gray-400 mt-2">
                All case data and evidence files are encrypted at rest and in transit
              </p>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 mb-3">
                <Database className="w-5 h-5 text-cyan-400" />
                <h4 className="text-white font-semibold">Data Retention</h4>
              </div>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                7 Years
              </Badge>
              <p className="text-xs text-gray-400 mt-2">
                Case records retained per federal investigation guidelines
              </p>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 mb-3">
                <FileText className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-semibold">Auto-Documentation</h4>
              </div>
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                Enabled
              </Badge>
              <p className="text-xs text-gray-400 mt-2">
                Automatic audit trail and activity logging for all actions
              </p>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-yellow-400" />
                <h4 className="text-white font-semibold">Access Control</h4>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                Admin Only
              </Badge>
              <p className="text-xs text-gray-400 mt-2">
                Restricted to authorized investigation team members
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mt-6">
            <h4 className="text-blue-300 font-semibold mb-2">System Information</h4>
            <div className="space-y-1 text-sm text-gray-300">
              <p>• Platform: SafeNestt Cyber Investigations v1.0</p>
              <p>• Compliance: CJIS, GDPR, CCPA compliant</p>
              <p>• Blockchain Integration: Alchemy API</p>
              <p>• Evidence Storage: Encrypted cloud storage</p>
              <p>• Backup Frequency: Daily incremental, weekly full</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}