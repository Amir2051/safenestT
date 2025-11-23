import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Shield } from "lucide-react";

export default function InvestigationAuditLog() {
  const { data: logs = [] } = useQuery({
    queryKey: ['investigation-logs'],
    queryFn: () => base44.asServiceRole.entities.InvestigationLog.list('-created_date', 100)
  });

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-gray-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          Investigation Audit Trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="p-3 bg-[#0f1419] rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <Badge variant="outline">{log.action_type}</Badge>
                  <span className="text-gray-400 text-xs">{log.admin_email}</span>
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(log.created_date).toLocaleString()}
                </span>
              </div>
              <p className="text-white text-sm">{log.description}</p>
              {log.wallet_address && (
                <p className="text-gray-400 text-xs font-mono mt-1">{log.wallet_address}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}