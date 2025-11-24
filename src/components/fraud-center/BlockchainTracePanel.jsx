import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search, Wallet, ArrowRight, ExternalLink, AlertTriangle,
  Loader2, Activity, Building2, Shield, Copy, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export default function BlockchainTracePanel({ user }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [blockchain, setBlockchain] = useState("ethereum");
  const [tracing, setTracing] = useState(false);
  const [traceResults, setTraceResults] = useState(null);
  const [selectedCase, setSelectedCase] = useState("");

  const { data: cases = [] } = useQuery({
    queryKey: ['investigation-cases'],
    queryFn: () => base44.entities.InvestigationCase.list('-created_date', 50)
  });

  const handleTrace = async () => {
    if (!walletAddress) {
      toast.error('Please enter a wallet address');
      return;
    }

    setTracing(true);
    setTraceResults(null);

    try {
      // Use LLM to analyze the wallet
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ${blockchain} wallet address for suspicious activity: ${walletAddress}
        
        Provide analysis in this format:
        - Risk assessment (low/medium/high/critical)
        - Known tags or labels for this address
        - Suspicious patterns detected
        - Connected exchanges if any
        - Recommendations for investigation`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string", enum: ["low", "medium", "high", "critical"] },
            known_labels: { type: "array", items: { type: "string" } },
            suspicious_patterns: { type: "array", items: { type: "string" } },
            connected_exchanges: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            summary: { type: "string" }
          }
        }
      });

      setTraceResults({
        wallet: walletAddress,
        blockchain,
        ...response,
        traced_at: new Date().toISOString()
      });

      toast.success('Trace complete');

    } catch (error) {
      console.error('Trace error:', error);
      toast.error('Trace failed: ' + error.message);
    }

    setTracing(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success('Address copied');
  };

  const getExplorerUrl = () => {
    const explorers = {
      ethereum: 'https://etherscan.io/address/',
      bitcoin: 'https://www.blockchain.com/explorer/addresses/btc/',
      bsc: 'https://bscscan.com/address/',
      polygon: 'https://polygonscan.com/address/',
      solana: 'https://solscan.io/account/',
      tron: 'https://tronscan.org/#/address/'
    };
    return explorers[blockchain] + walletAddress;
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Card */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Blockchain Trace
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter wallet address to trace..."
                className="bg-[#0f1419] border-cyan-500/30 text-white font-mono"
              />
            </div>
            <Select value={blockchain} onValueChange={setBlockchain}>
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ethereum">Ethereum</SelectItem>
                <SelectItem value="bitcoin">Bitcoin</SelectItem>
                <SelectItem value="bsc">BSC</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="solana">Solana</SelectItem>
                <SelectItem value="tron">Tron</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleTrace}
              disabled={tracing || !walletAddress}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {tracing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Tracing...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" />Trace Wallet</>
              )}
            </Button>
          </div>

          {/* Link to Case */}
          <div className="flex items-center gap-4">
            <Select value={selectedCase} onValueChange={setSelectedCase}>
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white max-w-xs">
                <SelectValue placeholder="Link to existing case (optional)" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_title || c.case_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {walletAddress && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={copyAddress} className="border-gray-500/30">
                  <Copy className="w-3 h-3 mr-1" /> Copy
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => window.open(getExplorerUrl(), '_blank')}
                  className="border-gray-500/30"
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Explorer
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Trace Results */}
      {traceResults && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Trace Results
              </CardTitle>
              <Badge className={getRiskColor(traceResults.risk_level)}>
                {traceResults.risk_level?.toUpperCase()} RISK
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Info */}
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-cyan-400" />
                <span className="text-white font-mono text-sm break-all">{traceResults.wallet}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{traceResults.blockchain}</Badge>
                <span className="text-gray-500 text-xs">
                  Traced: {new Date(traceResults.traced_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Summary */}
            {traceResults.summary && (
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Summary
                </h4>
                <p className="text-gray-300 text-sm">{traceResults.summary}</p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {/* Known Labels */}
              {traceResults.known_labels?.length > 0 && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <h4 className="text-white font-semibold mb-3">Known Labels</h4>
                  <div className="flex flex-wrap gap-2">
                    {traceResults.known_labels.map((label, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Connected Exchanges */}
              {traceResults.connected_exchanges?.length > 0 && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/20">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-green-400" />
                    Connected Exchanges
                  </h4>
                  <div className="space-y-2">
                    {traceResults.connected_exchanges.map((exchange, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-gray-300">{exchange}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Suspicious Patterns */}
            {traceResults.suspicious_patterns?.length > 0 && (
              <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  Suspicious Patterns
                </h4>
                <ul className="space-y-2">
                  {traceResults.suspicious_patterns.map((pattern, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-orange-400">•</span>
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {traceResults.recommendations?.length > 0 && (
              <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {traceResults.recommendations.map((rec, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 text-purple-400 mt-1 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!traceResults && !tracing && (
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardContent className="p-12 text-center">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Enter a Wallet to Trace</h3>
            <p className="text-gray-400">
              Input a suspicious wallet address above to analyze its activity and connections
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}