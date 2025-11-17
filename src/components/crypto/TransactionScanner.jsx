import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TransactionScanner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formData, setFormData] = useState({
    from_address: '',
    to_address: '',
    amount: 0,
    blockchain: 'ethereum'
  });

  const handleScan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await base44.functions.invoke('cryptoScamDetection', {
        endpoint: 'validate-transaction',
        ...formData
      });

      setResult(response.data);
      
      if (response.data.scam_check.is_scam) {
        toast.error('⚠️ TRANSACTION BLOCKED - Known scam wallet detected!');
      } else if (response.data.scam_check.risk_score > 70) {
        toast.warning('⚠️ HIGH RISK - Proceed with extreme caution');
      } else {
        toast.success('✅ Transaction validated - Low risk');
      }
    } catch (error) {
      toast.error('Failed to validate: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          Transaction Scanner
        </CardTitle>
        <p className="text-sm text-gray-400">Validate transactions before sending</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <Label className="text-white">From Address</Label>
            <Input
              value={formData.from_address}
              onChange={(e) => setFormData({...formData, from_address: e.target.value})}
              placeholder="Your wallet address"
              className="bg-[#0f1419] border-cyan-500/20 text-white font-mono text-sm"
              required
            />
          </div>

          <div>
            <Label className="text-white">To Address (Recipient)</Label>
            <Input
              value={formData.to_address}
              onChange={(e) => setFormData({...formData, to_address: e.target.value})}
              placeholder="Recipient wallet address"
              className="bg-[#0f1419] border-cyan-500/20 text-white font-mono text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Amount</Label>
              <Input
                type="number"
                step="0.00001"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Blockchain</Label>
              <Select value={formData.blockchain} onValueChange={(v) => setFormData({...formData, blockchain: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="bsc">BSC</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Validate Transaction
              </>
            )}
          </Button>
        </form>

        {result && (
          <div className="mt-6 space-y-4">
            <div className={`p-4 rounded-lg border ${
              result.scam_check.is_scam ? 'bg-red-500/10 border-red-500/50' :
              result.scam_check.risk_score > 70 ? 'bg-yellow-500/10 border-yellow-500/50' :
              'bg-green-500/10 border-green-500/50'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {result.scam_check.is_scam ? (
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                ) : result.scam_check.risk_score > 70 ? (
                  <Shield className="w-6 h-6 text-yellow-400" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                )}
                <div>
                  <h3 className={`font-bold ${
                    result.scam_check.is_scam ? 'text-red-400' :
                    result.scam_check.risk_score > 70 ? 'text-yellow-400' :
                    'text-green-400'
                  }`}>
                    {result.allowed ? 'Transaction Validated' : 'TRANSACTION BLOCKED'}
                  </h3>
                  <p className="text-white text-sm">{result.scam_check.recommendation}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Risk Score</span>
                  <Badge className={
                    result.scam_check.risk_score > 70 ? 'bg-red-500/20 text-red-400' :
                    result.scam_check.risk_score > 40 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-green-500/20 text-green-400'
                  }>
                    {result.scam_check.risk_score}/100
                  </Badge>
                </div>

                {result.scam_check.risk_factors && result.scam_check.risk_factors.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Risk Factors:</p>
                    {result.scam_check.risk_factors.map((factor, i) => (
                      <p key={i} className="text-sm text-white">• {factor}</p>
                    ))}
                  </div>
                )}

                {result.scam_check.is_scam && result.scam_check.reason && (
                  <div className="mt-3 p-3 bg-red-500/10 rounded">
                    <p className="text-sm text-red-400 font-semibold">Reason:</p>
                    <p className="text-sm text-white">{result.scam_check.reason}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}