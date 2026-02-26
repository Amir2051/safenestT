import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

// Known exchange wallet addresses (hot wallets / deposit addresses)
// Case-insensitive matching applied at runtime
const KNOWN_EXCHANGE_ADDRESSES = {
  'binance': [
    '0x28c6c06298d514db089934071355e5743bf21d60',
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d',
    '0x3f5ce5fbfe3e9af3971dd833d26ba9b5c936f0be',
    '0xbe0eb53f46cd790cd13851d5eff43d12404d33e8',
  ],
  'coinbase': [
    '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43',
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3',
    '0x503828976d22510aad0201ac7ec88293211d23da',
  ],
  'kraken': [
    '0x2910543af39aba0cd09dbb2d50200b3e800a63d2',
    '0x0a869d79a7052c7f1b55a8ebabbea3420f0d1e13',
  ],
  'kucoin': [
    '0xd6216fc19db775df9774a6e33526131da7d19a2c',
    '0xa1d8d972560c2f8144af871db508f0b0b10a3fbf',
  ],
  'okx': [
    '0x6cc5f688a315f3dc28a7781717a9a798a59fda7b',
    '0x236f9f97e0e62388479bf9e5ba4889e46b0273c3',
  ],
  'bybit': [
    '0xf89d7b9c864f589bbf53a82105107622b35eaa40',
  ],
  'huobi': [
    '0xaB5C66752a9e8167967685F1450532fB96d5d24f',
    '0x6748f50f686bfbca6fe8ad62b22228b87f31ff2b',
  ],
};

export default function ExchangeDetector({ selectedCase }) {
  const [address, setAddress] = useState(selectedCase?.scammer_wallet || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [txMatches, setTxMatches] = useState([]);

  const detectExchange = async () => {
    if (!address.trim()) {
      toast.error("Please enter an address");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setTxMatches([]);

    const addr = address.trim().toLowerCase();
    console.log('[ExchangeDetector] Checking address:', addr);

    try {
      // Step 1: Direct address match against known exchange wallets
      let directMatch = null;
      for (const [exchange, addrs] of Object.entries(KNOWN_EXCHANGE_ADDRESSES)) {
        if (addrs.map(a => a.toLowerCase()).includes(addr)) {
          directMatch = exchange;
          console.log('[ExchangeDetector] Direct match found:', exchange);
          break;
        }
      }

      if (directMatch) {
        setResult({ isExchange: true, exchangeName: directMatch.charAt(0).toUpperCase() + directMatch.slice(1), depositAddress: addr, confidence: 'high', timestamp: new Date().toISOString(), matchType: 'direct' });
        toast.success(`Exchange wallet detected: ${directMatch}`);
        setLoading(false);
        return;
      }

      // Step 2: Fetch transactions and check if this wallet sent TO a known exchange
      console.log('[ExchangeDetector] No direct match — fetching transactions...');
      const res = await fetch(`https://api.etherscan.io/api?module=account&action=txlist&address=${addr}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken`);
      const json = await res.json();
      console.log('[ExchangeDetector] Txn response status:', json.status, 'count:', json.result?.length);

      if (json.status !== '1' && json.message !== 'No transactions found') {
        throw new Error(json.message || 'Transaction fetch failed');
      }

      const txns = Array.isArray(json.result) ? json.result : [];
      const matches = [];

      for (const tx of txns) {
        const toAddr = tx.to?.toLowerCase();
        const fromAddr = tx.from?.toLowerCase();
        for (const [exchange, addrs] of Object.entries(KNOWN_EXCHANGE_ADDRESSES)) {
          const knownAddrs = addrs.map(a => a.toLowerCase());
          if (knownAddrs.includes(toAddr) || knownAddrs.includes(fromAddr)) {
            const direction = knownAddrs.includes(toAddr) ? 'sent to' : 'received from';
            console.log(`[ExchangeDetector] TX match: ${exchange} — ${direction}`);
            matches.push({ exchange: exchange.charAt(0).toUpperCase() + exchange.slice(1), direction, txHash: tx.hash, value: (parseFloat(tx.value)/1e18).toFixed(6), date: new Date(parseInt(tx.timeStamp)*1000).toLocaleDateString() });
          }
        }
      }

      setTxMatches(matches);

      if (matches.length > 0) {
        const topExchange = matches[0].exchange;
        setResult({ isExchange: true, exchangeName: topExchange, depositAddress: addr, confidence: 'medium', timestamp: new Date().toISOString(), matchType: 'transaction', matchCount: matches.length });
        toast.success(`Exchange interaction detected: ${topExchange} (${matches.length} transactions)`);
      } else {
        setResult({ isExchange: false, timestamp: new Date().toISOString() });
        toast.info("No known exchange activity found for this address");
      }
    } catch (err) {
      console.error('[ExchangeDetector] Error:', err);
      setError(err.message);
      toast.error("Detection failed: " + err.message);
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