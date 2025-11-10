import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Clock, CheckCircle, Radio } from "lucide-react";
import { format } from "date-fns";

export default function ActivityFeed({ anomalies, signalHistory }) {
  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getAnomalyTypeLabel = (type) => {
    switch (type) {
      case 'forced_2g_downgrade':
        return '🔻 Forced 2G Downgrade';
      case 'unknown_tower_id':
        return '❓ Unknown Tower ID';
      case 'signal_interference':
        return '📡 Signal Interference';
      default:
        return type;
    }
  };

  // Combine anomalies and normal events
  const allEvents = [
    ...anomalies.map(a => ({ ...a, type: 'anomaly' })),
    ...signalHistory
      .filter(h => h.status === 'normal')
      .slice(-5)
      .map(h => ({ ...h, type: 'normal' }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 20);

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Activity Feed
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allEvents.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No activity yet</p>
            <p className="text-gray-500 text-sm mt-1">Start monitoring to see events</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {allEvents.map((event, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border transition-all ${
                  event.type === 'anomaly'
                    ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/30'
                    : 'bg-[#0f1419] border-cyan-500/10 hover:border-cyan-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    {event.type === 'anomaly' ? (
                      getSeverityIcon(event.severity)
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      {event.type === 'anomaly' ? (
                        <>
                          <p className="text-white font-semibold text-sm mb-1">
                            {getAnomalyTypeLabel(event.anomaly_type)}
                          </p>
                          <p className="text-gray-300 text-xs mb-2">
                            {event.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            Cell ID: <span className="font-mono">{event.cell_id}</span>
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-white text-sm">
                            Normal tower connection
                          </p>
                          <p className="text-xs text-gray-500">
                            Cell: <span className="font-mono">{event.cell_id}</span> • {event.connection_type}
                          </p>
                        </>
                      )}
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {event.type === 'anomaly' ? (
                      <>
                        <Badge className={`${getSeverityColor(event.severity)} border text-xs`}>
                          {event.severity}
                        </Badge>
                        {event.resolved && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                            ✓ Resolved
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                        🟢 Normal
                      </Badge>
                    )}
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