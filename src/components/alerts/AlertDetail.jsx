import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Wifi, Lock, Eye, CheckCircle, XCircle } from 'lucide-react';

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
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/50' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' }
};

export default function AlertDetail({ alert, onClose, onResolve, onDismiss, isUpdating }) {
  const Icon = alertIcons[alert.alert_type] || AlertTriangle;
  const colors = severityColors[alert.severity];

  return (
    <Dialog open={!!alert} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${colors.text}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span>{alert.title}</span>
                <Badge className={`${colors.bg} ${colors.text} ${colors.border} border`}>
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-xs text-gray-400 font-normal mt-1">
                {new Date(alert.created_date).toLocaleString()}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Alert Details</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{alert.message}</p>
          </div>

          {alert.affected_item && (
            <div className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Affected Item</h3>
              <p className="text-cyan-400 text-sm font-mono">{alert.affected_item}</p>
            </div>
          )}

          {alert.recommendation && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-4 border border-green-500/20">
              <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                💡 Mia's Recommendation
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed">{alert.recommendation}</p>
            </div>
          )}

          {alert.status === 'resolved' && alert.resolved_date && (
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Alert Resolved</span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Resolved on {new Date(alert.resolved_date).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          {alert.status === 'active' && (
            <>
              <Button
                variant="outline"
                onClick={() => onDismiss(alert.id)}
                disabled={isUpdating}
                className="border-gray-600 text-gray-300"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Dismiss
              </Button>
              <Button
                onClick={() => onResolve(alert.id)}
                disabled={isUpdating}
                className="bg-gradient-to-r from-green-500 to-emerald-500"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Resolved
              </Button>
            </>
          )}
          {alert.status !== 'active' && (
            <Button onClick={onClose} className="bg-cyan-500">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}