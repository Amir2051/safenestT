import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Shield, Clock, AlertTriangle, TrendingUp } from "lucide-react";

export default function ParentalControlsPanel({ groupId, children, teens, isAdmin }) {
  const allMonitoredMembers = [...children, ...teens];

  if (!isAdmin) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/30">
        <CardContent className="p-12 text-center">
          <Shield className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Admin Access Required</h3>
          <p className="text-gray-400">
            Only family admins can manage parental controls
          </p>
        </CardContent>
      </Card>
    );
  }

  if (allMonitoredMembers.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardContent className="p-12 text-center">
          <Eye className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">No Children Added</h3>
          <p className="text-gray-400">
            Invite children or teens to enable parental controls and activity monitoring
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Monitored Members ({allMonitoredMembers.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allMonitoredMembers.map(member => (
            <div
              key={member.id}
              className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white font-semibold">{member.member_name}</p>
                  <Badge className="mt-1 bg-purple-500/20 text-purple-400">
                    {member.member_role} • {member.age_category.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${
                    member.security_stats?.risk_score >= 80 ? 'text-green-400' :
                    member.security_stats?.risk_score >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {member.security_stats?.risk_score || 100}
                  </p>
                  <p className="text-xs text-gray-400">Safety Score</p>
                </div>
              </div>

              {/* Monitoring Settings */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    member.monitored_settings?.monitor_web_activity ? 'bg-green-400' : 'bg-gray-600'
                  }`} />
                  <span className="text-gray-400">Web Monitoring</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    member.monitored_settings?.block_inappropriate_content ? 'bg-green-400' : 'bg-gray-600'
                  }`} />
                  <span className="text-gray-400">Content Filter</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    member.monitored_settings?.screen_time_limit_minutes > 0 ? 'bg-green-400' : 'bg-gray-600'
                  }`} />
                  <span className="text-gray-400">Screen Time Limit</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    member.monitored_settings?.bedtime_mode_enabled ? 'bg-green-400' : 'bg-gray-600'
                  }`} />
                  <span className="text-gray-400">Bedtime Mode</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Shield className="w-6 h-6 text-cyan-400 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-2">Advanced Parental Controls Coming Soon</p>
              <ul className="text-cyan-300 text-sm space-y-1">
                <li>• Real-time website and app monitoring</li>
                <li>• Content filtering and blocking</li>
                <li>• Screen time management</li>
                <li>• Bedtime mode with automatic lockout</li>
                <li>• Location tracking and geofencing</li>
                <li>• Activity reports and analytics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}