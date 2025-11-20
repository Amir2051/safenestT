import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Shield, Key, Lock, Search, AlertTriangle, RefreshCw, Link } from "lucide-react";
import { motion } from "framer-motion";

const iconMap = {
  shield: Shield,
  key: Key,
  lock: Lock,
  search: Search,
  alert: AlertTriangle,
  refresh: RefreshCw,
  link: Link
};

export default function SecurityTips({ tips, loading }) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardContent className="p-12 text-center">
          <div className="animate-pulse">Loading tips...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          Daily Security Insights
        </CardTitle>
        <p className="text-sm text-gray-400">Expert tips to keep your crypto safe</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {tips.map((tip, index) => {
            const Icon = iconMap[tip.icon] || Shield;
            
            return (
              <motion.div
                key={tip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className="p-5 bg-gradient-to-br from-[#0f1419] to-[#1a2332] rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4 border border-purple-500/30">
                  <Icon className="w-6 h-6 text-purple-400" />
                </div>
                
                <h4 className="text-white font-bold mb-2">{tip.title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{tip.description}</p>
                
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <span className="text-xs text-purple-400 uppercase tracking-wider">
                    {tip.category}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}