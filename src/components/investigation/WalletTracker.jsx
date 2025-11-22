import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Loader2, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function WalletTracker({ selectedCase }) {
  const [walletAddress, setWalletAddress] = useState(selectedCase?.scammer_wallet || "");
  const [blockchain, setBlockchain] = useState(selectedCase?.blockchain || "ethereum");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleTrack = async () => {
    if (!walletAddress) {
      toast.error("Please enter a wallet address");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('cryptoInvestigation', {
        action: 'track-wallet',
        data: { address: walletAddress, blockchain }
      });

      setResults(response.data.data);
      toast.success("Wallet tracked successfully");
    } catch (error) {
      toast.error("Failed to track wallet: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Wallet & Transaction Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label className="text-white mb-2 block">Wallet Address</Label>
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x... or bc1..."
                className="bg-[#0f1419] border-cyan-500/20 text-white font-mono"
              />
            </div>
            <div>
              <Label className="text-white mb-2 block">Blockchain</Label>
              <Select value={blockchain} onValueChange={setBlockchain}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="bsc">Binance Smart Chain</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleTrack}
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Tracking...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Track Wallet
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Tracking Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wallet Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Balance</p>
                <p className="text-white font-bold text-lg">{results.balance} {blockchain.toUpperCase()}</p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Total Incoming</p>
                <p className="text-green-400 font-bold text-lg flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {results.totalIncoming}
                </p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Total Outgoing</p>
                <p className="text-red-400 font-bold text-lg flex items-center gap-1">
                  <TrendingDown className="w-4 h-4" />
                  {results.totalOutgoing}
                </p>
              </div>
              <div className="p-4 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Transactions</p>
                <p className="text-white font-bold text-lg">{results.transactions.length}</p>
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <h3 className="text-white font-semibold mb-3">Transaction History</h3>
              <div className="space-y-2">
                {results.transactions.map((tx, idx) => (
                  <div key={idx} className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={tx.from === walletAddress ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                            {tx.from === walletAddress ? 'OUTGOING' : 'INCOMING'}
                          </Badge>
                          <Badge variant="outline">{tx.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-400">From</p>
                            <p className="text-white font-mono text-xs">{tx.from}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">To</p>
                            <p className="text-white font-mono text-xs">{tx.to}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-bold">{tx.value}</p>
                        <p className="text-gray-400 text-xs">{new Date(tx.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                      <p className="text-gray-400 text-xs font-mono">{tx.txid}</p>
                      <Button variant="ghost" size="sm" className="text-cyan-400">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}