import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Shield, MapPin, Eye, Users, Clock, 
  ExternalLink, Volume2, Navigation 
} from "lucide-react";

export default function FamilyAlerts({ groupId, alerts, members }) {
  const severityConfig = {
    critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    low: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' }
  };

  const alertTypeIcons = {
    breach_detected: Shield,
    inappropriate_content: Eye,
    location_alert: MapPin,
    excessive_screen_time: Clock,
    suspicious_activity: AlertTriangle,
    shared_vault_access: Users,
    sos_emergency: AlertTriangle
  };

  const getMemberName = (email) => {
    const member = members.find(m => m.member_email === email);
    return member?.member_name || email;
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    // SOS alerts always first
    if (a.alert_type === 'sos_emergency' && b.alert_type !== 'sos_emergency') return -1;
    if (b.alert_type === 'sos_emergency' && a.alert_type !== 'sos_emergency') return 1;
    
    // Then by date
    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-400" />
          Family Alerts ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-2">No Active Alerts</p>
            <p className="text-gray-400 text-sm">
              Your family is secure. All members are safe.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAlerts.map((alert) => {
              const Icon = alertTypeIcons[alert.alert_type] || AlertTriangle;
              const severity = severityConfig[alert.severity];
              const isSOSAlert = alert.alert_type === 'sos_emergency';
              const hasLocation = alert.metadata?.location;
              const hasAudio = alert.metadata?.has_audio;
              
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${severity.bg} ${severity.border} ${
                    isSOSAlert ? 'animate-pulse ring-2 ring-red-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 ${severity.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${severity.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold ${severity.color}`}>
                            {alert.title}
                          </h3>
                          {isSOSAlert && (
                            <Badge className="bg-red-600 text-white animate-pulse">
                              🆘 EMERGENCY
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{getMemberName(alert.member_email)}</span>
                          <span>•</span>
                          <span>{new Date(alert.created_date).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${severity.bg} ${severity.color} border ${severity.border}`}>
                      {alert.severity}
                    </Badge>
                  </div>

                  {/* SOS-specific information */}
                  {isSOSAlert && (
                    <div className="space-y-2 mt-3">
                      {hasLocation && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-red-300 font-semibold text-sm mb-1 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Last Known Location:
                              </p>
                              <p className="text-red-200 text-xs mb-2">
                                {alert.metadata.location.address}
                              </p>
                              {alert.metadata.location.battery_level && (
                                <p className="text-red-200 text-xs">
                                  Battery: {alert.metadata.location.battery_level}%
                                  {alert.metadata.location.is_charging && ' (Charging)'}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  const loc = alert.metadata.location;
                                  window.open(
                                    `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`,
                                    '_blank'
                                  );
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View Map
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  const loc = alert.metadata.location;
                                  window.open(
                                    `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`,
                                    '_blank'
                                  );
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Navigation className="w-3 h-3 mr-1" />
                                Navigate
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {hasAudio && alert.metadata.audio_url && (
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-blue-400" />
                              <span className="text-blue-300 text-sm font-semibold">
                                Audio Recording Available
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => window.open(alert.metadata.audio_url, '_blank')}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Volume2 className="w-3 h-3 mr-1" />
                              Listen
                            </Button>
                          </div>
                        </div>
                      )}

                      {!hasLocation && (
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-yellow-300 text-xs">
                            ⚠️ Location information unavailable
                          </p>
                        </div>
                      )}

                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                        <p className="text-orange-300 text-xs font-semibold">
                          🚨 Emergency Action Required:
                        </p>
                        <ul className="text-orange-200 text-xs mt-1 space-y-1 ml-4">
                          <li>• Contact {getMemberName(alert.member_email)} immediately</li>
                          <li>• Coordinate with other family members</li>
                          <li>• Consider contacting local authorities if needed</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}