import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet, TrendingUp, Shield, Trash2, Eye, EyeOff } from "lucide-react";

export default function WalletCard({ wallet, onDelete }) {
  const blockchainColors = {
    bitcoin: 'text-orange-400',
    ethereum: 'text-blue-400',
    bsc: 'text-yellow-400',
    polygon: 'text-purple-400',
    solana: 'text-green-400',
    tron: 'text-red-400'
  };

  const riskColor = wallet.risk_score > 70 ? 'text-red-400' :
                    wallet.risk_score > 40 ? 'text-yellow-400' : 'text-green-400';

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20 hover:border-purple-500/40 transition-all">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">{wallet.wallet_name}</h3>
              <p className={`text-sm ${blockchainColors[wallet.blockchain] || 'text-gray-400'}`}>
                {wallet.blockchain.toUpperCase()}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {wallet.wallet_type}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="p-3 bg-[#0f1419] rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Address</p>
            <p className="text-white font-mono text-xs break-all">{wallet.wallet_address}</p>
          </div>

          {wallet.balance_usd > 0 && (
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
              <span className="text-xs text-gray-400">Balance</span>
              <span className="text-green-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                ${wallet.balance_usd.toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
            <span className="text-xs text-gray-400">Risk Score</span>
            <span className={`font-bold flex items-center gap-1 ${riskColor}`}>
              <Shield className="w-4 h-4" />
              {wallet.risk_score}/100
            </span>
          </div>

          {wallet.notes && (
            <div className="p-3 bg-[#0f1419] rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-white text-sm">{wallet.notes}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Badge className={wallet.is_monitored ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
            {wallet.is_monitored ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
            {wallet.is_monitored ? 'Monitored' : 'Not Monitored'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="ml-auto text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}