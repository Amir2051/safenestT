import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function AlertsCenter({ alerts, monitors }) {
  const queryClient = useQueryClient();

  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId) => {
      return await base44.asServiceRole.entities.BlockchainAlert.update(alertId, {
        status: 'acknowledged'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blockchain-alerts'] });
      toast.success("Alert acknowledged");
    }
  });

  const severityColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  };

  const alertIcons = {
    new_transaction: Bell,
    exchange_deposit: CheckCircle,
    mixer_used: AlertTriangle,
    large_transfer: Bell,
    cold_storage_activation: AlertTriangle,
    high_risk_interaction: AlertTriangle
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          Real-Time Alerts & Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No alerts at this time</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const Icon = alertIcons[alert.alert_type] || Bell;
              
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${
                    alert.status === 'new' ? 'bg-red-500/10 border-red-500 animate-pulse' : 
                    'bg-[#0f1419] border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`w-5 h-5 mt-0.5 ${
                        alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'high' ? 'text-orange-400' :
                        'text-yellow-400'
                      }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-white font-bold">{alert.title}</h4>
                          <Badge className={severityColors[alert.severity]}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline">{alert.alert_type}</Badge>
                        </div>
                        <p className="text-gray-300 text-sm mb-2">{alert.message}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          {alert.wallet_address && (
                            <div>
                              <p className="text-gray-400">Wallet</p>
                              <p className="text-white font-mono">{alert.wallet_address.substring(0, 20)}...</p>
                            </div>
                          )}
                          {alert.amount_usd && (
                            <div>
                              <p className="text-gray-400">Amount</p>
                              <p className="text-white font-bold">${alert.amount_usd?.toLocaleString()}</p>
                            </div>
                          )}
                          {alert.detected_entity && (
                            <div>
                              <p className="text-gray-400">Detected</p>
                              <p className="text-white">{alert.detected_entity}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-gray-400">Time</p>
                            <p className="text-white">{new Date(alert.created_date).toLocaleString()}</p>
                          </div>
                        </div>

                        {alert.transaction_hash && (
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-gray-400 text-xs font-mono">{alert.transaction_hash}</p>
                            <Button variant="ghost" size="sm" className="text-cyan-400">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {alert.status === 'new' && (
                      <Button
                        onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                        size="sm"
                        className="bg-cyan-500"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}