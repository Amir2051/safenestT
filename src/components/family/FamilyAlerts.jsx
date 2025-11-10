import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, Eye, Shield } from "lucide-react";
import { format } from "date-fns";

export default function FamilyAlerts({ groupId, alerts, members }) {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'breach_detected':
        return <Shield className="w-4 h-4" />;
      case 'inappropriate_content':
        return <Eye className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getMemberName = (email) => {
    const member = members.find(m => m.member_email === email);
    return member?.member_name || email;
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white">Family Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg">No Active Alerts</p>
            <p className="text-gray-400 text-sm mt-1">
              Your family is secure!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'critical' ? 'bg-red-500/20' :
                      alert.severity === 'high' ? 'bg-orange-500/20' :
                      'bg-yellow-500/20'
                    }`}>
                      {getAlertIcon(alert.alert_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold">{alert.title}</p>
                        <Badge className={`${getSeverityColor(alert.severity)} border text-xs`}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{alert.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Member: {getMemberName(alert.member_email)}</span>
                        <span>•</span>
                        <span>{format(new Date(alert.created_date), 'MMM dd, HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}