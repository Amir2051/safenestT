import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, Wifi, Lock, Eye, ChevronRight } from 'lucide-react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";

const alertIcons = {
  breach: Shield,
  wifi: Wifi,
  phishing: AlertTriangle,
  password: Lock,
  permission: Eye,
  vpn: Shield,
  dark_web: Eye
};

const severityColors = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
};

export default function RecentAlertsCard({ alerts, isLoading }) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-[#1a2332] rounded-lg h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          Recent Alerts
        </CardTitle>
        <Link to={createPageUrl('Alerts')}>
          <Badge variant="outline" className="text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/10 cursor-pointer">
            View All
          </Badge>
        </Link>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-gray-400 text-sm">No active alerts</p>
            <p className="text-green-400 text-xs mt-1">You're all secure! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => {
              const Icon = alertIcons[alert.alert_type] || AlertTriangle;
              return (
                <div
                  key={alert.id}
                  className="bg-[#0f1419] rounded-lg p-3 border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.severity === 'critical' ? 'bg-red-500/20' :
                      alert.severity === 'high' ? 'bg-orange-500/20' :
                      alert.severity === 'medium' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'high' ? 'text-orange-400' :
                        alert.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-white truncate">{alert.title}</h4>
                        <Badge className={`${severityColors[alert.severity]} text-xs flex-shrink-0`}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2">{alert.message}</p>
                      {alert.affected_item && (
                        <p className="text-xs text-cyan-400 mt-1 truncate">{alert.affected_item}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-2" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}