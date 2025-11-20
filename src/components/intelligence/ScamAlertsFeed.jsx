import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, ExternalLink, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const categoryIcons = {
  wallet: Shield,
  website: ExternalLink,
  app: AlertTriangle,
  exchange: AlertTriangle,
  contract: AlertTriangle
};

const categoryColors = {
  wallet: 'text-purple-400',
  website: 'text-red-400',
  app: 'text-orange-400',
  exchange: 'text-yellow-400',
  contract: 'text-pink-400'
};

export default function ScamAlertsFeed({ alerts, loading }) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
        <CardContent className="p-12 text-center">
          <div className="animate-pulse">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
          Live Crypto Scam Alerts
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50 ml-2">
            LIVE
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400">Real-time security alerts from the community</p>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No recent alerts</p>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const Icon = categoryIcons[alert.category] || AlertTriangle;
            const colorClass = categoryColors[alert.category] || 'text-red-400';
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-[#0f1419] rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-white font-semibold text-sm">{alert.title}</h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge className={
                          alert.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                          alert.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                          alert.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }>
                          {alert.riskLevel}
                        </Badge>
                        {alert.verified && (
                          <CheckCircle className="w-3 h-3 text-green-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs mb-2 line-clamp-2">{alert.summary}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      <span className="uppercase">{alert.category}</span>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span className="capitalize">{alert.source}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}