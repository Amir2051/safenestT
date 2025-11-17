import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, Building } from "lucide-react";
import { toast } from "sonner";

export default function BlockchainTracer({ selectedCase, traces, onCaseSelect, cases }) {
  const [tracing, setTracing] = useState(false);

  const handleTrace = async () => {
    if (!selectedCase) {
      toast.error('Please select a case first');
      return;
    }

    setTracing(true);

    try {
      const response = await base44.functions.invoke('fraudRecovery', {
        endpoint: 'trace-stolen-funds',
        case_id: selectedCase.id,
        scammer_wallet: selectedCase.scammer_wallet,
        blockchain: selectedCase.blockchain,
        max_depth: 5
      });

      toast.success(`Traced ${response.data.traces_found} wallets! Found ${response.data.exchanges_found} exchange connections.`);
    } catch (error) {
      toast.error('Tracing failed: ' + error.message);
    }

    setTracing(false);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-400" />
            Blockchain Transaction Tracer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Select Fraud Case</label>
            <Select 
              value={selectedCase?.id || ''} 
              onValueChange={(id) => onCaseSelect(cases.find(c => c.id === id))}
            >
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                <SelectValue placeholder="Choose a case to trace..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                {cases.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_title} - ${c.amount_stolen_usd?.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCase && (
            <div className="p-4 bg-[#0f1419] rounded-lg space-y-2">
              <p className="text-sm text-gray-400">Scammer Wallet:</p>
              <p className="text-white font-mono text-sm break-all">{selectedCase.scammer_wallet}</p>
              <p className="text-sm text-gray-400 mt-2">Blockchain: {selectedCase.blockchain?.toUpperCase()}</p>
            </div>
          )}

          <Button
            onClick={handleTrace}
            disabled={!selectedCase || tracing}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
          >
            {tracing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Tracing blockchain...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Start Blockchain Trace
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {traces.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white">Trace Results ({traces.length} wallets)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {traces.map((trace) => (
                <div key={trace.id} className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Depth {trace.depth_level}
                        </Badge>
                        {trace.linked_to_exchange && (
                          <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                            <Building className="w-3 h-3 mr-1" />
                            {trace.exchange_name}
                          </Badge>
                        )}
                        {trace.exchange_notified && (
                          <Badge className="bg-green-500/20 text-green-400 text-xs">
                            Notified
                          </Badge>
                        )}
                      </div>
                      <p className="text-white font-mono text-xs break-all mb-2">
                        {trace.wallet_address}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Received: {trace.amount_received?.toFixed(4)}</span>
                        <span>Remaining: {trace.amount_remaining?.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}