import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function BlockchainFlowMap({ selectedCase }) {
  const [loading, setLoading] = useState(false);
  const [flowData, setFlowData] = useState(null);

  useEffect(() => {
    if (selectedCase?.scammer_wallet) {
      analyzeFlow();
    }
  }, [selectedCase]);

  const analyzeFlow = async () => {
    if (!selectedCase?.scammer_wallet) {
      toast.error("Please select a case first");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('cryptoInvestigation', {
        action: 'analyze-transaction-flow',
        data: { 
          startAddress: selectedCase.scammer_wallet,
          blockchain: selectedCase.blockchain,
          depth: 5
        }
      });

      setFlowData(response.data.data);
      toast.success("Flow analysis complete");
    } catch (error) {
      toast.error("Failed to analyze flow: " + error.message);
    }
    setLoading(false);
  };

  const getNodeColor = (type) => {
    switch (type) {
      case 'scammer': return 'bg-red-500/20 border-red-500 text-red-400';
      case 'mixer': return 'bg-yellow-500/20 border-yellow-500 text-yellow-400';
      case 'exchange': return 'bg-green-500/20 border-green-500 text-green-400';
      case 'bridge': return 'bg-purple-500/20 border-purple-500 text-purple-400';
      default: return 'bg-gray-500/20 border-gray-500 text-gray-400';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Blockchain Transaction Flow Map
          </CardTitle>
          <Button onClick={analyzeFlow} disabled={loading || !selectedCase} size="sm">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Refresh Analysis'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedCase ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Select a case to view transaction flow</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto" />
          </div>
        ) : flowData ? (
          <div className="space-y-6">
            {/* Flow Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Total Hops</p>
                <p className="text-white font-bold text-lg">{flowData.totalHops}</p>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Mixer Detected</p>
                <Badge className={flowData.mixerDetected ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}>
                  {flowData.mixerDetected ? 'YES' : 'NO'}
                </Badge>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Exchange Deposits</p>
                <p className="text-green-400 font-bold text-lg">{flowData.exchangeDeposits.length}</p>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Cross-Chain</p>
                <Badge className={flowData.crossChainTransfers ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}>
                  {flowData.crossChainTransfers ? 'YES' : 'NO'}
                </Badge>
              </div>
            </div>

            {/* Flow Visualization */}
            <div className="p-6 bg-[#0f1419] rounded-lg border border-purple-500/20">
              <h3 className="text-white font-semibold mb-4">Transaction Flow</h3>
              <div className="space-y-4">
                {flowData.flowMap.edges.map((edge, idx) => (
                  <div key={idx} className="relative">
                    {/* From Node */}
                    <div className="flex items-start gap-4 mb-2">
                      <div className={`flex-1 p-4 rounded-lg border-2 ${getNodeColor(
                        flowData.flowMap.nodes.find(n => n.id === edge.from)?.type
                      )}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-mono text-xs break-all">{edge.from}</p>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {flowData.flowMap.nodes.find(n => n.id === edge.from)?.type}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-80">
                          {flowData.flowMap.nodes.find(n => n.id === edge.from)?.label}
                        </p>
                      </div>
                    </div>

                    {/* Arrow & Transaction Info */}
                    <div className="flex items-center justify-center my-2">
                      <div className="flex-1 border-t-2 border-dashed border-purple-500/30" />
                      <div className="px-4 py-2 bg-purple-500/10 rounded-lg border border-purple-500/30 mx-4">
                        <p className="text-white font-bold text-sm">{edge.value}</p>
                        <p className="text-gray-400 text-xs font-mono">{edge.txid}</p>
                      </div>
                      <div className="flex-1 border-t-2 border-dashed border-purple-500/30" />
                    </div>

                    {/* To Node */}
                    <div className="flex items-start gap-4">
                      <div className={`flex-1 p-4 rounded-lg border-2 ${getNodeColor(
                        flowData.flowMap.nodes.find(n => n.id === edge.to)?.type
                      )}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-mono text-xs break-all">{edge.to}</p>
                          <Badge variant="outline" className="ml-2 text-xs">
                            {flowData.flowMap.nodes.find(n => n.id === edge.to)?.type}
                          </Badge>
                        </div>
                        <p className="text-xs opacity-80">
                          {flowData.flowMap.nodes.find(n => n.id === edge.to)?.label}
                        </p>
                        {flowData.flowMap.nodes.find(n => n.id === edge.to)?.exchange && (
                          <Badge className="mt-2 bg-green-500/20 text-green-400">
                            Exchange: {flowData.flowMap.nodes.find(n => n.id === edge.to)?.exchange}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {idx < flowData.flowMap.edges.length - 1 && (
                      <div className="h-8 flex items-center justify-center">
                        <div className="w-0.5 h-full bg-purple-500/30" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Exchange Alerts */}
            {flowData.exchangeDeposits.length > 0 && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Exchange Deposits Detected
                </h4>
                <p className="text-white text-sm mb-2">
                  Funds were deposited to the following exchanges:
                </p>
                <div className="flex flex-wrap gap-2">
                  {flowData.exchangeDeposits.map((exchange, idx) => (
                    <Badge key={idx} className="bg-green-500/20 text-green-400 border-green-500/50">
                      {exchange}
                    </Badge>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  → Contact these exchanges with case details for freezing/recovery
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Click "Refresh Analysis" to generate flow map</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}