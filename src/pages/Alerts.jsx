
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, CheckCircle, XCircle, Shield, Wifi, Lock, 
  Eye, Filter, ChevronRight 
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import AlertDetail from "../components/alerts/AlertDetail.jsx";

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
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50', dot: 'bg-orange-500' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', dot: 'bg-yellow-500' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', dot: 'bg-blue-500' }
};

export default function Alerts() {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => base44.entities.Alert.list('-created_date'),
    initialData: [],
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // Find the alert in the current cache to get its details before update
      const currentAlerts = queryClient.getQueryData(['alerts']);
      const alert = currentAlerts ? currentAlerts.find(a => a.id === id) : null;
      
      const result = await base44.entities.Alert.update(id, data);
      
      // Log alert action
      if (data.status === 'resolved') {
        await base44.entities.AuditLog.create({
          action_type: 'alert_resolved',
          action_category: 'alert',
          description: `Resolved alert: ${alert?.title || 'Unknown Alert'}`,
          metadata: {
            affected_item: alert?.title || 'Unknown Alert',
            previous_value: alert?.status || 'unknown',
            new_value: 'resolved',
            alert_id: id,
          },
          severity: 'info',
          status: 'success'
        });
      } else if (data.status === 'dismissed') {
        await base44.entities.AuditLog.create({
          action_type: 'alert_dismissed',
          action_category: 'alert',
          description: `Dismissed alert: ${alert?.title || 'Unknown Alert'}`,
          metadata: {
            affected_item: alert?.title || 'Unknown Alert',
            previous_value: alert?.status || 'unknown',
            new_value: 'dismissed',
            alert_id: id,
          },
          severity: 'info',
          status: 'success'
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] }); // Invalidate audit logs to reflect new entries
      setSelectedAlert(null);
    },
  });

  const resolveAlert = (alertId) => {
    updateAlertMutation.mutate({
      id: alertId,
      data: {
        status: 'resolved',
        resolved_date: new Date().toISOString()
      }
    });
  };

  const dismissAlert = (alertId) => {
    updateAlertMutation.mutate({
      id: alertId,
      data: { status: 'dismissed' }
    });
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    return matchesStatus && matchesSeverity;
  });

  const stats = {
    total: alerts.length,
    active: alerts.filter(a => a.status === 'active').length,
    critical: alerts.filter(a => a.severity === 'critical' && a.status === 'active').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
          Security Alerts
        </h1>
        <p className="text-gray-400 mt-1">Monitor and manage your security notifications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Total Alerts</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Critical</p>
            <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Resolved</p>
            <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-300 font-medium">Filters:</span>
            </div>
            <div className="flex gap-3 flex-wrap flex-1">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-32 bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-400">
              {filteredAlerts.length} result{filteredAlerts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 animate-pulse">
              <CardContent className="p-6 h-24" />
            </Card>
          ))
        ) : filteredAlerts.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No alerts found</p>
              <p className="text-gray-400 text-sm mt-1">Your security looks great! 🎉</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => {
            const Icon = alertIcons[alert.alert_type] || AlertTriangle;
            const colors = severityColors[alert.severity];

            return (
              <Card
                key={alert.id}
                className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer group"
                onClick={() => setSelectedAlert(alert)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {alert.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                            {alert.severity}
                          </Badge>
                          {alert.status === 'resolved' && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{alert.message}</p>
                      {alert.affected_item && (
                        <p className="text-cyan-400 text-xs mb-2 truncate">
                          📍 {alert.affected_item}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(alert.created_date).toLocaleString()}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Alert Detail Dialog */}
      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={resolveAlert}
          onDismiss={dismissAlert}
          isUpdating={updateAlertMutation.isPending}
        />
      )}
    </div>
  );
}
