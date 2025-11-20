import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { motion } from "framer-motion";

const cryptoLogos = {
  BTC: '₿',
  ETH: 'Ξ',
  USDT: '₮',
  BNB: 'BNB',
  SOL: '◎',
  XRP: 'XRP'
};

const cryptoColors = {
  BTC: 'from-orange-500 to-yellow-600',
  ETH: 'from-blue-500 to-purple-600',
  USDT: 'from-green-500 to-emerald-600',
  BNB: 'from-yellow-500 to-orange-600',
  SOL: 'from-purple-500 to-pink-600',
  XRP: 'from-blue-500 to-cyan-600'
};

export default function CryptoPriceTracker({ prices, loading }) {
  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-12 text-center">
          <div className="animate-pulse">Loading prices...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Real-Time Crypto Prices
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50 ml-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />
            LIVE
          </Badge>
        </CardTitle>
        <p className="text-sm text-gray-400">Major cryptocurrencies updated every 60 seconds</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(prices).map(([symbol, data], index) => {
            const isPositive = data.change24h >= 0;
            const gradient = cryptoColors[symbol] || 'from-gray-500 to-gray-600';
            
            return (
              <motion.div
                key={symbol}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                      {cryptoLogos[symbol]}
                    </div>
                    <span className="text-white font-bold">{symbol}</span>
                  </div>
                  <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span className="text-sm font-bold">
                      {Math.abs(data.change24h).toFixed(2)}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <p className="text-2xl font-bold text-white">
                    ${data.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Vol: ${(data.volume24h / 1e9).toFixed(2)}B
                  </p>
                </div>

                {/* Mini chart simulation */}
                <div className="mt-3 flex items-end gap-0.5 h-8">
                  {[...Array(20)].map((_, i) => {
                    const height = Math.random() * 100;
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t ${isPositive ? 'bg-green-500/30' : 'bg-red-500/30'}`}
                        style={{ height: `${height}%` }}
                      />
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}