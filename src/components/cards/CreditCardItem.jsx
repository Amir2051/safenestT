import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, AlertTriangle, CheckCircle, XCircle, 
  Trash2, Shield, TrendingUp, Calendar, Building2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CreditCardItem({ card, onRemove }) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const getCardIcon = () => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
      other: '💳'
    };
    return icons[card.card_type] || '💳';
  };

  const getStatusColor = () => {
    switch (card.status) {
      case 'active': return 'text-green-400';
      case 'compromised': return 'text-red-400';
      case 'expired': return 'text-yellow-400';
      case 'blocked': return 'text-orange-400';
      case 'monitoring': return 'text-cyan-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskColor = () => {
    if (card.risk_score >= 80) return 'from-red-500 to-pink-500';
    if (card.risk_score >= 60) return 'from-orange-500 to-red-500';
    if (card.risk_score >= 30) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  const getRiskBadgeColor = () => {
    if (card.risk_score >= 80) return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (card.risk_score >= 60) return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
    if (card.risk_score >= 30) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-green-500/20 text-green-400 border-green-500/50';
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(card.id);
    }
    setShowRemoveDialog(false);
  };

  return (
    <>
      <Card className={`bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-2 transition-all ${
        card.breach_status === 'exposed' || card.status === 'compromised'
          ? 'border-red-500/50'
          : card.status === 'expired'
          ? 'border-yellow-500/30'
          : 'border-cyan-500/20'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                card.breach_status === 'exposed' ? 'bg-red-500/20' : 'bg-cyan-500/20'
              }`}>
                {getCardIcon()}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">
                  {card.card_nickname || `${card.card_type.toUpperCase()} •••• ${card.card_last_four}`}
                </h3>
                <p className="text-sm text-gray-400">{card.cardholder_name}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowRemoveDialog(true)}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Card Details */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Card Number</span>
              <span className="text-white font-mono">****-****-****-{card.card_last_four}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Expires</span>
              <span className="text-white">
                {card.expiry_month?.toString().padStart(2, '0')}/{card.expiry_year}
              </span>
            </div>

            {card.issuing_bank && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Bank</span>
                <span className="text-white">{card.issuing_bank}</span>
              </div>
            )}
          </div>

          {/* Risk Score */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Risk Score</span>
              <Badge className={`${getRiskBadgeColor()} border`}>
                {card.risk_score}/100
              </Badge>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getRiskColor()} transition-all`}
                style={{ width: `${card.risk_score}%` }}
              />
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className={`${
              card.breach_status === 'safe' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
              card.breach_status === 'exposed' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
              'bg-gray-500/20 text-gray-400 border-gray-500/50'
            } border`}>
              {card.breach_status === 'safe' ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> No Breaches</>
              ) : card.breach_status === 'exposed' ? (
                <><AlertTriangle className="w-3 h-3 mr-1" /> Exposed</>
              ) : (
                '❓ Unknown'
              )}
            </Badge>

            <Badge className={`${getStatusColor()} bg-current/20 border border-current/50`}>
              {card.status}
            </Badge>

            {card.monitoring_enabled && (
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                <Shield className="w-3 h-3 mr-1" /> Monitoring
              </Badge>
            )}
          </div>

          {/* Breaches Found */}
          {card.breaches_found && card.breaches_found.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 font-semibold text-sm">
                  {card.breaches_found.length} Breach{card.breaches_found.length > 1 ? 'es' : ''} Detected
                </p>
              </div>
              {card.breaches_found.slice(0, 2).map((breach, idx) => (
                <div key={idx} className="text-xs text-gray-300 mb-1">
                  • {breach.breach_name} ({breach.breach_date})
                </div>
              ))}
            </div>
          )}

          {/* Suspicious Activity */}
          {card.suspicious_activity && card.suspicious_activity.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <p className="text-yellow-400 font-semibold text-sm">
                  Suspicious Activity Detected
                </p>
              </div>
              {card.suspicious_activity.slice(0, 2).map((activity, idx) => (
                <div key={idx} className="text-xs text-gray-300 mb-1">
                  • {activity.description}
                </div>
              ))}
            </div>
          )}

          {/* Last Checked */}
          {card.last_checked && (
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-700">
              <span>Last checked</span>
              <span>{new Date(card.last_checked).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent className="bg-[#1a2332] border-cyan-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Card from Monitoring?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to remove this card? You will no longer receive breach alerts for this card.
              <br /><br />
              <strong className="text-white">Card: </strong>•••• {card.card_last_four}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-cyan-500/20 text-gray-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}