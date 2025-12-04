import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Building, AlertOctagon, Search, Loader2, ArrowRight, ArrowLeft, Shield, AlertTriangle, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function FraudTracking() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("crypto");
  const [address, setAddress] = useState("");
  const [scanData, setScanData] = useState(null);

  const handleTrace = async () => {
    if (!address) {
      toast.error("Please enter a wallet address");
      return;
    }

    setLoading(true);
    setScanData(null);

    try {
      const response = await base44.functions.invoke('etherscanService', { address });
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      setScanData(response.data);
      toast.success("Wallet trace completed successfully");
    } catch (error) {
      console.error("Trace error:", error);
      toast.error(`Trace failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-orange-500">
          <AlertOctagon className="w-8 h-8" />
          Fraud & Financial Tracking
        </h1>
        <p className="text-gray-400 mt-1">
            Trace assets across banking and blockchain networks.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#1a2332] border border-gray-700">
            <TabsTrigger value="crypto" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
                <Coins className="w-4 h-4 mr-2" /> Crypto Tracing
            </TabsTrigger>
            <TabsTrigger value="fiat" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                <Building className="w-4 h-4 mr-2" /> Bank & Swift
            </TabsTrigger>
        </TabsList>

        <TabsContent value="crypto">
            <Card className="bg-[#1a2332] border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white">Blockchain Analysis (Chainalysis/Elliptic)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex gap-4">
                        <Input 
                          placeholder="Enter wallet address (0x...)" 
                          className="bg-[#0f1419] border-gray-600 text-white flex-1" 
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                        />
                        <Button 
                          className="bg-orange-600 hover:bg-orange-700" 
                          onClick={handleTrace}
                          disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            Trace
                        </Button>
                    </div>

                    {scanData ? (
                      <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded bg-[#0f1419] border border-gray-700">
                                <h4 className="text-gray-400 text-sm mb-1">ETH Balance</h4>
                                <p className="text-2xl font-bold text-white">{scanData.balance} ETH</p>
                            </div>
                            <div className="p-4 rounded bg-[#0f1419] border border-gray-700">
                                <h4 className="text-gray-400 text-sm mb-1">Transactions</h4>
                                <p className="text-2xl font-bold text-white">{scanData.stats?.total || 0}</p>
                            </div>
                            <div className="p-4 rounded bg-[#0f1419] border border-gray-700">
                                <h4 className="text-gray-400 text-sm mb-1">Flow</h4>
                                <div className="flex items-center gap-3 text-sm mt-1">
                                  <span className="text-green-400 flex items-center"><ArrowLeft className="w-3 h-3 mr-1"/> In: {scanData.stats?.incoming}</span>
                                  <span className="text-red-400 flex items-center"><ArrowRight className="w-3 h-3 mr-1"/> Out: {scanData.stats?.outgoing}</span>
                                </div>
                            </div>
                        </div>

                        {scanData.risks && scanData.risks.length > 0 && (
                          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" /> Risk Indicators Detected
                            </h4>
                            <ul className="list-disc list-inside text-sm text-gray-300">
                              {scanData.risks.map((risk, i) => (
                                <li key={i}>{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="bg-[#0f1419] rounded-lg border border-gray-700 overflow-hidden">
                          <div className="p-4 border-b border-gray-700">
                            <h4 className="font-semibold text-white">Recent Activity</h4>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-800/50 text-gray-400">
                                <tr>
                                  <th className="p-3">Hash</th>
                                  <th className="p-3">Type</th>
                                  <th className="p-3">Value</th>
                                  <th className="p-3">Time</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-800">
                                {scanData.transactions.slice(0, 5).map((tx) => (
                                  <tr key={tx.hash} className="hover:bg-gray-800/30">
                                    <td className="p-3 text-cyan-400">
                                      <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                                        {tx.hash.substring(0, 10)}... <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </td>
                                    <td className="p-3">
                                      {tx.from.toLowerCase() === address.toLowerCase() 
                                        ? <Badge variant="outline" className="text-red-400 border-red-500/30">OUT</Badge>
                                        : <Badge variant="outline" className="text-green-400 border-green-500/30">IN</Badge>
                                      }
                                    </td>
                                    <td className="p-3 text-white">{tx.value} ETH</td>
                                    <td className="p-3 text-gray-400">{new Date(tx.timeStamp * 1000).toLocaleDateString()}</td>
                                  </tr>
                                ))}
                                {scanData.transactions.length === 0 && (
                                  <tr>
                                    <td colSpan="4" className="p-4 text-center text-gray-500">No recent transactions</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      !loading && (
                        <div className="h-64 bg-[#0f1419] rounded border border-gray-700 flex flex-col items-center justify-center text-gray-500">
                            <Search className="w-12 h-12 mb-3 opacity-20" />
                            <p>Enter a wallet address above to trace funds.</p>
                        </div>
                      )
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="fiat">
             <Card className="bg-[#1a2332] border-gray-700">
                <CardHeader>
                    <CardTitle className="text-white">Banking Intelligence (SWIFT/WorldCheck)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="flex gap-4">
                        <Input placeholder="Enter IBAN, SWIFT, or Account Number..." className="bg-[#0f1419] border-gray-600 text-white flex-1" />
                        <Button className="bg-green-600 hover:bg-green-700">
                            <Search className="w-4 h-4 mr-2" /> Search
                        </Button>
                    </div>

                    <div className="p-4 bg-[#0f1419] rounded border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Institution Details</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Bank Name</p>
                                <p className="text-white font-medium">--</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Country</p>
                                <p className="text-white font-medium">--</p>
                            </div>
                             <div>
                                <p className="text-gray-500">Branch</p>
                                <p className="text-white font-medium">--</p>
                            </div>
                             <div>
                                <p className="text-gray-500">Sanction Status</p>
                                <p className="text-white font-medium">--</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}