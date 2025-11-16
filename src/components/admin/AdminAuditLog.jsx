import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Search, Shield } from "lucide-react";

export default function AdminAuditLog() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: actions = [] } = useQuery({
    queryKey: ['admin-actions'],
    queryFn: () => base44.entities.AdminAction.list('-created_date', 100)
  });

  const filteredActions = actions.filter(a =>
    a.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.action_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Admin Audit Log</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-[#0f1419] border-cyan-500/20"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredActions.map((action) => (
          <Card key={action.id} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="text-white font-semibold">{action.action_type.replace(/_/g, ' ')}</span>
                    <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                      {action.admin_email}
                    </Badge>
                  </div>
                  {action.target_user && (
                    <p className="text-sm text-gray-400">Target: {action.target_user}</p>
                  )}
                  {action.reason && (
                    <p className="text-sm text-gray-300 mt-1">{action.reason}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(action.created_date).toLocaleString()}
                  </p>
                </div>
                <Shield className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}