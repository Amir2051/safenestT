import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Network, ExternalLink, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function MultiBlockchainTracer({ selectedCase }) {
  const [tracing, setTracing] = useState(false);
  const [results, setResults] = useState(null);
  const [customWallet, setCustomWallet] = useState("");
  const [customBlockchain, setCustomBlockchain] = useState("ethereum");
  const [copied, setCopied] = useState("");

  const blockchains = [
    { id: "ethereum", name: "Ethereum", explorer: "etherscan.io" },
    { id: "bitcoin", name: "Bitcoin", explorer: "blockchain.com" },
    { id: "bsc", name: "BSC", explorer: "bscscan.com" },
    { id: "polygon", name: "Polygon", explorer: "polygonscan.com" },
    { id: "tron", name: "Tron", explorer: "tronscan.org" },
    { id: "solana", name: "Solana", explorer: "solscan.io" }
  ];

  const handleMultiChainTrace = async () => {
    if (!selectedCase) {
      toast.error("Please select a case first");
      return;
    }

    setTracing(true);
    try {
      // Trace across multiple blockchains
      const chains = ["ethereum", "bsc", "polygon"];
      const allResults = {};

      for (const chain of chains) {
        const response = await base44.functions.invoke("fraudRecovery", {
          endpoint: "trace-stolen-funds",
          case_id: selectedCase.id,
          scammer_wallet: selectedCase.scammer_wallet,
          blockchain: chain,
          max_depth: 3
        });

        allResults[chain] = {
          traces_found: response.data.traces_found,
          exchanges_found: response.data.exchanges_found,
          traces: response.data.traces || []
        };

        // Small delay between chains
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setResults(allResults);
      toast.success(`Traced across ${chains.length} blockchains!`);
    } catch (error) {
      toast.error("Multi-chain tracing failed: " + error.message);
    }
    setTracing(false);
  };

  const handleCustomTrace = async () => {
    if (!customWallet.trim()) {
      toast.error("Please enter a wallet address");
      return;
    }

    setTracing(true);
    try {
      const response = await base44.functions.invoke("fraudRecovery", {
        endpoint: "trace-stolen-funds",
        case_id: selectedCase?.id || "custom",
        scammer_wallet: customWallet,
        blockchain: customBlockchain,
        max_depth: 5
      });

      setResults({
        [customBlockchain]: {
          traces_found: response.data.traces_found,
          exchanges_found: response.data.exchanges_found,
          traces: response.data.traces || []
        }
      });

      toast.success(`Found ${response.data.traces_found} connected wallets!`);
    } catch (error) {
      toast.error("Tracing failed: " + error.message);
    }
    setTracing(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(""), 2000);
  };

  const openExplorer = (blockchain, address) => {
    const chain = blockchains.find(b => b.id === blockchain);
    if (chain) {
      window.open(`https://${chain.explorer}/address/${address}`, "_blank");
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Network className="w-5 h-5 text-cyan-400" />
          Multi-Blockchain Tracer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="case" className="w-full">
          <TabsList className="bg-[#0f1419] border border-cyan-500/20">
            <TabsTrigger value="case">From Case</TabsTrigger>
            <TabsTrigger value="custom">Custom Wallet</TabsTrigger>
          </TabsList>

          <TabsContent value="case" className="space-y-4">
            <div className="p-4 bg-[#0f1419] rounded-lg">
              <p className="text-sm text-gray-400 mb-2">Selected Case:</p>
              {selectedCase ? (
                <>
                  <p className="text-white font-semibold">{selectedCase.case_title}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                    {selectedCase.scammer_wallet}
                  </p>
                </>
              ) : (
                <p className="text-gray-500 text-sm">No case selected</p>
              )}
            </div>

            <Button
              onClick={handleMultiChainTrace}
              disabled={!selectedCase || tracing}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {tracing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tracing across chains...
                </>
              ) : (
                <>
                  <Network className="w-4 h-4 mr-2" />
                  Trace Across All Blockchains
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Wallet Address</label>
                <Input
                  placeholder="0x... or enter any wallet address"
                  value={customWallet}
                  onChange={(e) => setCustomWallet(e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/20 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Blockchain</label>
                <select
                  value={customBlockchain}
                  onChange={(e) => setCustomBlockchain(e.target.value)}
                  className="w-full px-4 py-2 bg-[#0f1419] border border-cyan-500/20 rounded-lg text-white"
                >
                  {blockchains.map(chain => (
                    <option key={chain.id} value={chain.id}>{chain.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleCustomTrace}
              disabled={tracing}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {tracing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Tracing...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Trace Wallet
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {results && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">Trace Results</h3>
              <Badge className="bg-cyan-500/20 text-cyan-400">
                {Object.keys(results).length} Chain{Object.keys(results).length > 1 ? "s" : ""}
              </Badge>
            </div>

            {Object.entries(results).map(([chain, data]) => (
              <Card key={chain} className="bg-[#0f1419] border-cyan-500/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-sm capitalize flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                      {chain}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {data.traces_found} wallets
                      </Badge>
                      {data.exchanges_found > 0 && (
                        <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                          {data.exchanges_found} exchanges
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.traces.slice(0, 5).map((trace, i) => (
                    <div key={i} className="p-3 bg-[#1a2332] rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">Depth {trace.depth_level}</Badge>
                        {trace.linked_to_exchange && (
                          <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                            {trace.exchange_name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-white font-mono text-xs flex-1 truncate">
                          {trace.wallet_address}
                        </p>
                        <button
                          onClick={() => copyToClipboard(trace.wallet_address)}
                          className="text-gray-400 hover:text-white"
                        >
                          {copied === trace.wallet_address ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openExplorer(chain, trace.wallet_address)}
                          className="text-gray-400 hover:text-white"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Amount: {trace.amount_remaining?.toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                  {data.traces.length > 5 && (
                    <p className="text-xs text-gray-400 text-center pt-2">
                      + {data.traces.length - 5} more wallets
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}