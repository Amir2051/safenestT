import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Activity, Zap } from "lucide-react";

export default function AIPriorityBadge({ score, size = "default" }) {
  if (!score && score !== 0) return null;

  const getConfig = () => {
    if (score >= 80) {
      return {
        level: 'CRITICAL',
        color: 'bg-red-500/20 text-red-400 border-red-500/50',
        icon: AlertTriangle,
        pulse: true
      };
    } else if (score >= 60) {
      return {
        level: 'HIGH',
        color: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
        icon: TrendingUp,
        pulse: false
      };
    } else if (score >= 40) {
      return {
        level: 'MEDIUM',
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
        icon: Activity,
        pulse: false
      };
    } else {
      return {
        level: 'LOW',
        color: 'bg-green-500/20 text-green-400 border-green-500/50',
        icon: Zap,
        pulse: false
      };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const sizeClass = size === "sm" ? "text-xs" : "text-sm";

  return (
    <Badge 
      className={`${config.color} ${sizeClass} ${config.pulse ? 'animate-pulse' : ''}`}
      title={`AI Priority Score: ${score}/100`}
    >
      <Icon className="w-3 h-3 mr-1" />
      {config.level} ({score})
    </Badge>
  );
}