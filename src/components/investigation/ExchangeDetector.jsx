import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ExchangeDetector({ selectedCase }) {
  const [address, setAddress] = useState(selectedCase?.scammer_wallet || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const detectExchange = async () => {
    if (!address) {
      toast.error("Please enter an address");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('cryptoInvestigation', {
        action: 'detect-exchange',
        data: { address, blockchain: selectedCase?.blockchain || 'ethereum' }
      });

      setResult(response.data.data);
      
      if (response.data.data.isExchange) {
        toast.success(`Exchange detected: ${response.data.data.exchangeName}`);
      } else {
        toast.info("No exchange detected");
      }
    } catch (error) {
      toast.error("Detection failed: " + error.message);
    }
    setLoading(false);
  };

  const knownExchanges = [
    { name: 'Binance', logo: '🟡' },
    { name: 'Coinbase', logo: '🔵' },
    { name: 'Kraken', logo: '🟣' },
    { name: 'KuCoin', logo: '🟢' },
    { name: 'OKX', logo: '⚫' },
    { name: 'Bybit', logo: '🟠' },
    { name: 'Huobi', logo: '🔴' },
    { name: 'Gate.io', logo: '🟤' }
  ];

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Exchange Identification System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-white mb-2 block">Wallet Address to Check</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x... or bc1..."
              className="bg-[#0f1419] border-green-500/20 text-white font-mono"
            />
          </div>

          <Button
            onClick={detectExchange}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Detect Exchange
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className={`p-6 rounded-lg border-2 ${
            result.isExchange 
              ? 'bg-green-500/10 border-green-500' 
              : 'bg-gray-500/10 border-gray-500'
          }`}>
            <div className="flex items-start gap-4">
              {result.isExchange ? (
                <CheckCircle className="w-12 h-12 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-12 h-12 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`text-xl font-bold mb-2 ${
                  result.isExchange ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {result.isExchange ? 'Exchange Detected!' : 'No Exchange Detected'}
                </h3>
                
                {result.isExchange ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 text-sm">Exchange Name:</p>
                      <p className="text-white font-bold text-lg">{result.exchangeName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Deposit Address:</p>
                      <p className="text-white font-mono text-xs break-all">{result.depositAddress}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Confidence Level:</p>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        {result.confidence.toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Detected At:</p>
                      <p className="text-white text-sm">{new Date(result.timestamp).toLocaleString()}</p>
                    </div>
                    
                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 font-semibold mb-2">⚠️ Action Required:</p>
                      <p className="text-white text-sm">
                        Contact {result.exchangeName} immediately with:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 text-sm mt-2 space-y-1">
                        <li>Deposit address & TXID</li>
                        <li>Case reference number</li>
                        <li>Law enforcement contact</li>
                        <li>Request account freeze</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-300">
                    This address does not match any known exchange wallet patterns.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Known Exchanges Reference */}
        <div className="p-4 bg-[#0f1419] rounded-lg">
          <h4 className="text-white font-semibold mb-3">Monitored Exchanges</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {knownExchanges.map((exchange, idx) => (
              <div key={idx} className="p-3 bg-[#1a2332] rounded-lg text-center">
                <span className="text-2xl mb-1 block">{exchange.logo}</span>
                <p className="text-white text-sm">{exchange.name}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}