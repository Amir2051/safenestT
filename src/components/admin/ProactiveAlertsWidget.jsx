import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertOctagon, X, Check, ExternalLink, ShieldAlert, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ProactiveAlertsWidget() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);

  const { data: alerts = [] } = useQuery({
    queryKey: ['admin-scam-alerts'],
    queryFn: () => base44.entities.AdminScamAlert.filter({ status: 'new' }, '-created_date', 5),
    refetchInterval: 10000 // Poll every 10s for real-time feel
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return await base44.entities.AdminScamAlert.update(id, {
        status,
        acknowledged_by: (await base44.auth.me()).email,
        acknowledged_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-scam-alerts']);
      toast.success("Alert updated");
    }
  });

  const handleReview = (alert) => {
    // If target is a case, navigate to investigation dashboard and maybe pre-select it (complex without state management across pages, so just go to dashboard)
    if (alert.target_type === 'case') {
      navigate(createPageUrl('InvestigationDashboard'));
      toast.info(`Review Case ID: ${alert.target_id}. Use Global Search to find it.`);
    } else if (alert.target_type === 'user') {
      navigate(createPageUrl('AdminUserApprovals')); // Or relevant user page
      toast.info(`Review User ID: ${alert.target_id}`);
    }
    // Mark as acknowledged when reviewing? Maybe not automatically.
  };

  if (alerts.length === 0) return null;

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-red-600 text-white p-3 rounded-full shadow-lg cursor-pointer animate-pulse"
        onClick={() => setIsMinimized(false)}
      >
        <Bell className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 bg-white text-red-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-red-600">
          {alerts.length}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <Card className="bg-[#1a2332] border-red-500 shadow-2xl shadow-red-900/20">
        <CardHeader className="p-3 border-b border-red-500/30 bg-red-500/10 flex flex-row items-center justify-between">
          <CardTitle className="text-white text-sm font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
            Proactive Scam Alerts ({alerts.length})
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setIsMinimized(true)}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0 max-h-[400px] overflow-y-auto">
          {alerts.map(alert => (
            <div key={alert.id} className="p-3 border-b border-gray-700 hover:bg-white/5 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-red-200 text-sm">{alert.title}</h4>
                <Badge variant="outline" className={`text-[10px] uppercase ${
                  alert.severity === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                  alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                  'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                }`}>
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mb-2">{alert.message}</p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-xs border-gray-600 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 flex-1"
                  onClick={() => handleReview(alert)}
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Review
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 text-xs text-gray-400 hover:text-white hover:bg-white/10"
                  onClick={() => updateAlertMutation.mutate({ id: alert.id, status: 'dismissed' })}
                >
                  Dismiss
                </Button>
                <Button 
                  size="sm" 
                  className="h-7 text-xs bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/50"
                  onClick={() => updateAlertMutation.mutate({ id: alert.id, status: 'acknowledged' })}
                >
                  <Check className="w-3 h-3 mr-1" /> Ack
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}