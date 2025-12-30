import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, Clock, Eye, CheckCircle, ChevronRight, DollarSign, Calendar, Loader2, AlertTriangle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MyCasesWidget({ user }) {
  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['dashboard-cases'],
    queryFn: async () => {
      if (!user) return [];
      
      // Fetch user's cases with RLS filtering
      if (user.role === 'admin' || user.is_admin || user.job_title === 'Fraud Specialist') {
        return base44.entities.MyCase.list('-created_date', 5);
      } else {
        return base44.entities.MyCase.filter({
          $or: [
            { user_id: user.id },
            { created_by: user.email },
            { client_email: user.email },
            { created_by_email: user.email }
          ]
        }, '-created_date', 5);
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const statusConfig = {
    pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock },
    'in review': { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: Eye },
    'in progress': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Eye },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: FileText },
  };

  const stats = {
    total: cases.length,
    pending: cases.filter(c => c.status?.toLowerCase() === 'pending' || c.status === 'reported').length,
    inProgress: cases.filter(c => c.status === 'In Progress' || c.status === 'investigating').length,
    totalLost: cases.reduce((sum, c) => sum + (c.amount_lost || 0), 0)
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            My Cases
          </CardTitle>
          <Link to={createPageUrl("MyCases")}>
            <Button size="sm" variant="outline" className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-cyan-400" />
              <p className="text-xs text-gray-400">Total Cases</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          
          <div className="p-3 bg-[#0f1419] rounded-lg border border-orange-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-gray-400">Pending</p>
            </div>
            <p className="text-2xl font-bold text-orange-400">{stats.pending}</p>
          </div>
        </div>

        {/* Recent Cases */}
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No cases submitted yet</p>
            <Link to={createPageUrl("ReportScam")}>
              <Button size="sm" className="mt-3 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                Report Your First Case
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {cases.slice(0, 3).map((caseItem) => {
              const status = statusConfig[caseItem.status?.toLowerCase()] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <div
                  key={caseItem.id}
                  className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-white font-medium text-sm truncate flex-1">
                      {caseItem.case_number || caseItem.client_name || 'Case'}
                    </p>
                    <Badge className={`${status.color} border text-xs shrink-0`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {caseItem.status}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {caseItem.created_date ? new Date(caseItem.created_date).toLocaleDateString() : 'N/A'}
                    </span>
                    {caseItem.amount_lost > 0 && (
                      <span className="text-red-400 flex items-center gap-1 font-semibold">
                        <DollarSign className="w-3 h-3" />
                        {caseItem.amount_lost.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {caseItem.investigation_progress > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-cyan-400 font-semibold">{caseItem.investigation_progress}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${caseItem.investigation_progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Alert for cases needing attention */}
        {stats.pending > 0 && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-orange-400 text-sm font-semibold">
                  {stats.pending} case{stats.pending > 1 ? 's' : ''} pending review
                </p>
                <p className="text-orange-300/80 text-xs mt-1">
                  Our team will contact you within 24-48 hours
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}