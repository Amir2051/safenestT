import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Layers, AlertTriangle, ShieldCheck, Search } from 'lucide-react';
import { toast } from "sonner";

export default function AdvancedBlockchainViewer({ walletAddress, blockchain }) {
    const [depth, setDepth] = useState(2);
    
    const { data: flowData, isLoading, refetch } = useQuery({
        queryKey: ['blockchain-flow', walletAddress, blockchain, depth],
        queryFn: async () => {
            if (!walletAddress) return null;
            const res = await base44.functions.invoke('blockchainIntelligence', {
                action: 'analyze-fund-flow',
                data: { wallet_address: walletAddress, blockchain, depth }
            });
            return res.data.data;
        },
        enabled: !!walletAddress
    });

    if (!walletAddress) return <div className="text-gray-400 p-4">No wallet address provided for analysis.</div>;

    return (
        <div className="space-y-6">
            <Card className="bg-[#0f1419] border-cyan-500/20">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-cyan-400" />
                            Transaction Flow Analysis
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Depth:</span>
                            <div className="flex gap-1">
                                {[1, 2, 3].map(d => (
                                    <Button
                                        key={d}
                                        size="sm"
                                        variant={depth === d ? "default" : "outline"}
                                        className={depth === d ? "bg-cyan-600 hover:bg-cyan-700" : "border-cyan-500/30 text-cyan-400"}
                                        onClick={() => setDepth(d)}
                                    >
                                        {d}
                                    </Button>
                                ))}
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => refetch()}
                                className="ml-2 border-cyan-500/30 text-cyan-400"
                            >
                                <Search className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        </div>
                    ) : flowData ? (
                        <div className="space-y-6">
                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-3 bg-cyan-900/20 rounded border border-cyan-500/20 text-center">
                                    <p className="text-xs text-cyan-400 mb-1">Total Hops Traced</p>
                                    <p className="text-xl font-bold text-white">{flowData.totalHops}</p>
                                </div>
                                <div className={`p-3 rounded border text-center ${flowData.riskLevel === 'high' ? 'bg-red-900/20 border-red-500/20' : 'bg-green-900/20 border-green-500/20'}`}>
                                    <p className={`text-xs mb-1 ${flowData.riskLevel === 'high' ? 'text-red-400' : 'text-green-400'}`}>Risk Level</p>
                                    <p className="text-xl font-bold text-white uppercase">{flowData.riskLevel}</p>
                                </div>
                                <div className="p-3 bg-purple-900/20 rounded border border-purple-500/20 text-center">
                                    <p className="text-xs text-purple-400 mb-1">Exchanges</p>
                                    <p className="text-xl font-bold text-white">{flowData.exchanges?.length || 0}</p>
                                </div>
                                <div className="p-3 bg-orange-900/20 rounded border border-orange-500/20 text-center">
                                    <p className="text-xs text-orange-400 mb-1">Mixers Detected</p>
                                    <p className="text-xl font-bold text-white">{flowData.mixerDetected ? 'YES' : 'NO'}</p>
                                </div>
                            </div>

                            {/* Visual Flow Representation (Simplified List/Tree) */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-300 mb-2">Trace Path</h4>
                                {flowData.edges.length === 0 ? (
                                    <p className="text-gray-500 italic">No outgoing transactions found in this range.</p>
                                ) : (
                                    <div className="relative pl-4 border-l-2 border-cyan-500/20 space-y-6">
                                        {flowData.edges.map((edge, idx) => (
                                            <div key={idx} className="relative">
                                                <div className="absolute -left-[21px] top-3 w-3 h-3 rounded-full bg-cyan-500 border-2 border-[#0f1419]" />
                                                <div className="bg-[#151a23] p-3 rounded border border-cyan-500/10 hover:border-cyan-500/30 transition-colors">
                                                    <div className="flex flex-wrap justify-between items-start gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 text-sm text-white mb-1">
                                                                <span className="font-mono text-cyan-400 text-xs truncate max-w-[120px]" title={edge.from}>{edge.from}</span>
                                                                <ArrowRight className="w-3 h-3 text-gray-500" />
                                                                <span className="font-mono text-cyan-400 text-xs truncate max-w-[120px]" title={edge.to}>{edge.to}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500">{new Date(edge.timestamp).toLocaleString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-sm font-bold text-white">{edge.value} ETH</span>
                                                            {/* Check if target is special */}
                                                            {flowData.nodes.find(n => n.id === edge.to && n.type !== 'unknown' && n.type !== 'source') && (
                                                                <div className="mt-1">
                                                                    <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px]">
                                                                        {flowData.nodes.find(n => n.id === edge.to).type.toUpperCase()}
                                                                    </Badge>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}