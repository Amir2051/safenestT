import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Search, AlertTriangle, Shield, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

export default function WalletRiskChecker({ onWalletChecked }) {
  const [wallet, setWallet] = useState("");
  const [blockchain, setBlockchain] = useState("ethereum");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkWallet = async () => {
    if (!wallet.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    setChecking(true);
    try {
      const response = await base44.functions.invoke('fraudDetectionAI', {
        action: 'check_wallet',
        data: { wallet, blockchain }
      });

      if (response.data.success) {
        setResult(response.data);
        
        if (response.data.scam_reports > 0 || response.data.analysis.is_suspicious) {
          toast.warning(`⚠️ Suspicious wallet detected!`);
        } else {
          toast.success('No immediate red flags');
        }

        if (onWalletChecked) {
          onWalletChecked(response.data);
        }
      }
    } catch (error) {
      toast.error('Check failed: ' + error.message);
    }
    setChecking(false);
  };

  const riskColors = {
    low: 'bg-green-500/20 text-green-400 border-green-500/50',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    critical: 'bg-red-500/20 text-red-400 border-red-500/50'
  };

  return (
    <Card className="bg-[#1a2332] border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-sm">
          <Wallet className="w-4 h-4 text-purple-400" />
          Wallet Risk Checker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter wallet address..."
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="bg-[#0f1419] border-purple-500/30 text-white font-mono text-sm flex-1"
          />
          <Select value={blockchain} onValueChange={setBlockchain}>
            <SelectTrigger className="w-32 bg-[#0f1419] border-purple-500/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="bitcoin">Bitcoin</SelectItem>
              <SelectItem value="bsc">BSC</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="solana">Solana</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={checkWallet}
            disabled={checking}
            className="bg-gradient-to-r from-purple-500 to-blue-600"
          >
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {result && (
          <div className="space-y-3 pt-3 border-t border-purple-500/20">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                <Badge className={riskColors[result.analysis.risk_level]}>
                  {result.analysis.risk_level.toUpperCase()}
                </Badge>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Risk Score</p>
                <p className="text-lg font-bold text-white">{result.analysis.risk_score}</p>
              </div>
            </div>

            {result.scam_reports > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Database className="w-4 h-4 text-red-400" />
                  <p className="text-red-400 font-semibold text-sm">
                    Found in {result.scam_reports} scam report{result.scam_reports > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {result.related_cases > 0 && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <p className="text-orange-400 font-semibold text-sm">
                  Linked to {result.related_cases} other case{result.related_cases > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {result.analysis.flags?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Detected Flags:</p>
                {result.analysis.flags.map((flag, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                    <AlertTriangle className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                    {flag}
                  </div>
                ))}
              </div>
            )}

            {result.analysis.recommendation && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">AI Recommendation:</p>
                <p className="text-sm text-cyan-300">{result.analysis.recommendation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}