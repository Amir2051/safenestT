import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  AlertTriangle, Shield, ExternalLink, CheckCircle, Search,
  MessageSquare, Instagram, Twitter, Mail, Smartphone
} from "lucide-react";
import { motion } from "framer-motion";

const platformIcons = {
  telegram: MessageSquare,
  instagram: Instagram,
  whatsapp: MessageSquare,
  twitter: Twitter,
  email: Mail,
  snapchat: Smartphone,
  multiple: Shield
};

const scamTypeColors = {
  blackmail: 'text-red-500',
  phishing: 'text-orange-500',
  'rug pull': 'text-pink-500',
  impersonation: 'text-yellow-500',
  'wallet drain': 'text-purple-500',
  wallet: 'text-purple-500',
  website: 'text-red-500',
  app: 'text-orange-500',
  exchange: 'text-yellow-500',
  contract: 'text-pink-500'
};

export default function GlobalScamReports({ alerts, loading }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = alerts.filter(alert => 
    alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.walletAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
        <CardContent className="p-12 text-center">
          <div className="animate-pulse text-white">Loading global reports...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              Global Scam Reports Feed
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 ml-2">
                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-1" />
                LIVE
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Real-time reports from exchanges, users, and security platforms
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              {searchTerm ? 'No reports match your search' : 'No recent reports'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => {
            const PlatformIcon = platformIcons[alert.platform?.toLowerCase()] || Shield;
            const colorClass = scamTypeColors[alert.scamType] || 'text-red-400';
            
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 bg-[#0f1419] rounded-lg border border-red-500/20 hover:border-red-500/40 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-sm mb-1">{alert.title}</h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={
                            alert.riskLevel === 'critical' ? 'bg-red-500/20 text-red-400' :
                            alert.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            alert.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }>
                            {alert.riskLevel}
                          </Badge>
                          <Badge variant="outline" className="text-xs uppercase">
                            {alert.scamType}
                          </Badge>
                          {alert.verified && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-400 text-xs mb-3 line-clamp-2">{alert.summary}</p>
                    
                    {alert.walletAddress && (
                      <div className="p-2 bg-[#1a2332] rounded border border-red-500/20 mb-2">
                        <p className="text-[10px] text-gray-500 mb-1">Scammer Wallet:</p>
                        <p className="text-white font-mono text-xs break-all">{alert.walletAddress}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                      <div className="flex items-center gap-1">
                        <PlatformIcon className="w-3 h-3" />
                        <span className="capitalize">{alert.platform}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      <span>•</span>
                      <span className="capitalize">Source: {alert.source}</span>
                      {alert.victimCount > 1 && (
                        <>
                          <span>•</span>
                          <span className="text-red-400">{alert.victimCount} victims</span>
                        </>
                      )}
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