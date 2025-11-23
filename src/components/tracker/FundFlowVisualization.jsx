import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Loader2, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function FundFlowVisualization({ monitors }) {
  const [selectedMonitor, setSelectedMonitor] = useState(null);
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeFlow = async () => {
    if (!selectedMonitor) {
      toast.error("Please select a wallet");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('blockchainIntelligence', {
        action: 'analyze-fund-flow',
        data: {
          wallet_address: selectedMonitor.wallet_address,
          blockchain: selectedMonitor.blockchain,
          depth: 5
        }
      });
      setFlowData(response.data.data);
      toast.success("Flow analysis complete");
    } catch (error) {
      toast.error("Analysis failed: " + error.message);
    }
    setLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Fund Flow Mapping
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={selectedMonitor?.id} onValueChange={(id) => 
              setSelectedMonitor(monitors.find(m => m.id === id))
            }>
              <SelectTrigger className="w-64 bg-[#0f1419] border-purple-500/20 text-white">
                <SelectValue placeholder="Select wallet" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-purple-500/20">
                {monitors.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.wallet_address.substring(0, 10)}... ({m.blockchain})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={analyzeFlow} disabled={loading || !selectedMonitor}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Flow'
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!flowData ? (
          <div className="text-center py-20">
            <Activity className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Select a wallet and click "Analyze Flow" to visualize fund movement</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Flow Stats */}
            <div className="grid grid-cols-5 gap-4">
              <div className="p-3 bg-[#0f1419] rounded-lg text-center">
                <p className="text-xs text-gray-400 mb-1">Total Hops</p>
                <p className="text-white font-bold text-lg">{flowData.totalHops}</p>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg text-center">
                <p className="text-xs text-gray-400 mb-1">Risk Level</p>
                <Badge className={
                  flowData.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                  flowData.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/20 text-green-400'
                }>
                  {flowData.riskLevel}
                </Badge>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg text-center">
                <p className="text-xs text-gray-400 mb-1">Exchange</p>
                <Badge className={flowData.exchangeDetected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                  {flowData.exchangeDetected ? 'Detected' : 'None'}
                </Badge>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg text-center">
                <p className="text-xs text-gray-400 mb-1">Mixer</p>
                <Badge className={flowData.mixerDetected ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}>
                  {flowData.mixerDetected ? 'Detected' : 'None'}
                </Badge>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg text-center">
                <p className="text-xs text-gray-400 mb-1">Bridge</p>
                <Badge className={flowData.bridgeUsed ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}>
                  {flowData.bridgeUsed ? 'Used' : 'None'}
                </Badge>
              </div>
            </div>

            {/* Visual Flow Graph */}
            <div className="p-6 bg-[#0f1419] rounded-lg">
              <h3 className="text-white font-semibold mb-4">Transaction Flow Visualization</h3>
              <div className="space-y-4">
                {flowData.edges.map((edge, idx) => {
                  const fromNode = flowData.nodes.find(n => n.id === edge.from);
                  const toNode = flowData.nodes.find(n => n.id === edge.to);
                  
                  return (
                    <div key={idx} className="relative">
                      <div className={`p-4 rounded-lg border-2 ${
                        fromNode.type === 'source' ? 'bg-red-500/10 border-red-500' :
                        fromNode.type === 'exchange' ? 'bg-green-500/10 border-green-500' :
                        fromNode.type === 'mixer' ? 'bg-yellow-500/10 border-yellow-500' :
                        'bg-gray-500/10 border-gray-500'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">{fromNode.type}</Badge>
                            <p className="text-white font-mono text-xs">{fromNode.id}</p>
                            <p className="text-gray-400 text-xs mt-1">Balance: {fromNode.balance}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center my-2">
                        <div className="flex-1 border-t-2 border-dashed border-purple-500/30" />
                        <div className="px-4 py-2 bg-purple-500/10 rounded-lg mx-4">
                          <p className="text-white font-bold text-sm">{edge.value}</p>
                          <p className="text-gray-400 text-xs">{new Date(edge.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex-1 border-t-2 border-dashed border-purple-500/30" />
                      </div>
                      
                      <div className={`p-4 rounded-lg border-2 ${
                        toNode.type === 'exchange' ? 'bg-green-500/10 border-green-500' :
                        toNode.type === 'mixer' ? 'bg-yellow-500/10 border-yellow-500' :
                        toNode.type === 'bridge' ? 'bg-purple-500/10 border-purple-500' :
                        'bg-gray-500/10 border-gray-500'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">{toNode.type}</Badge>
                            <p className="text-white font-mono text-xs">{toNode.id}</p>
                            <p className="text-gray-400 text-xs mt-1">Balance: {toNode.balance}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alerts */}
            {flowData.exchangeDetected && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  ⚠️ Critical: Exchange Deposit Detected
                </h4>
                <p className="text-white text-sm mb-2">
                  Funds have been deposited to the following exchanges:
                </p>
                <div className="flex flex-wrap gap-2">
                  {flowData.exchanges.map((ex, i) => (
                    <Badge key={i} className="bg-green-500/20 text-green-400">{ex}</Badge>
                  ))}
                </div>
                <p className="text-gray-400 text-xs mt-3">
                  → Immediate action required: Contact exchange compliance teams
                </p>
              </div>
            )}

            {flowData.mixerDetected && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Mixer/Tumbler Usage Detected
                </h4>
                <p className="text-white text-sm">
                  Funds passed through mixing services to obscure the trail. This significantly increases difficulty of recovery.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}