import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { 
  Search, Copy, FileText, Shield, AlertTriangle, 
  Wallet, ArrowRight, ArrowLeft, ExternalLink, Loader2 
} from "lucide-react";

export default function CryptoWalletChecker() {
  const [searchParams] = useSearchParams();
  const [address, setAddress] = useState(searchParams.get("address") || "");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  // Auto-scan if address provided in URL
  useEffect(() => {
    const urlAddress = searchParams.get("address");
    if (urlAddress && !data) {
      handleScan(urlAddress);
    }
  }, [searchParams]);

  const handleScan = async (scanAddress = address) => {
    if (!scanAddress) {
      toast.error("Please enter a wallet address");
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke("etherscanService", { address: scanAddress });
      if (response.data.error) throw new Error(response.data.error);
      setData(response.data);
      toast.success("Wallet scan completed");
    } catch (error) {
      toast.error("Scan failed: " + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyData = () => {
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Raw wallet data copied to clipboard");
  };

  const generateReport = () => {
    if (!data) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(41, 128, 185); // Blue
      doc.text("SafeNestT - Crypto Investigation Report", 10, y);
      y += 10;

      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`Target Wallet: ${data.address}`, 10, y);
      y += 10;
      doc.text(`Date: ${new Date().toLocaleString()}`, 10, y);
      y += 15;

      // Summary
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Executive Summary", 10, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`ETH Balance: ${data.balance} ETH`, 10, y); y += 6;
      doc.text(`Total Transactions: ${data.stats.total}`, 10, y); y += 6;
      doc.text(`Incoming: ${data.stats.incoming} | Outgoing: ${data.stats.outgoing}`, 10, y); y += 6;
      
      // Risks
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(192, 57, 43); // Red
      doc.text("Risk Indicators", 10, y);
      y += 8;
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      if (data.risks.length > 0) {
        data.risks.forEach(risk => {
          doc.text(`• ${risk}`, 10, y);
          y += 6;
        });
      } else {
        doc.text("No high-level risks detected automatically.", 10, y);
        y += 6;
      }

      // Recent Activity
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.text("Recent Transactions (Last 10)", 10, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      
      data.transactions.slice(0, 10).forEach(tx => {
        const type = tx.from.toLowerCase() === data.address.toLowerCase() ? "OUT" : "IN";
        const line = `${new Date(tx.timeStamp * 1000).toLocaleDateString()} | ${type} | ${tx.value} ETH | Hash: ${tx.hash.substring(0, 20)}...`;
        doc.text(line, 10, y);
        y += 5;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });

      doc.save(`Investigation_${data.address.substring(0, 8)}.pdf`);
      toast.success("Report PDF generated");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              Crypto Wallet Checker
            </h1>
            <p className="text-gray-400 mt-1">Advanced blockchain forensics powered by Etherscan</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={copyData} disabled={!data}>
              <Copy className="w-4 h-4 mr-2" /> Copy Raw Data
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={generateReport} disabled={!data}>
              <FileText className="w-4 h-4 mr-2" /> Generate Report
            </Button>
          </div>
        </div>

        <Card className="bg-[#1a2332] border-gray-700">
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Enter Wallet Address (0x...)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-10 bg-[#0f1419] border-gray-600 text-white h-11"
                />
              </div>
              <Button 
                onClick={() => handleScan()} 
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700 h-11 px-8"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Scan Wallet"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-[#1a2332] border-cyan-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">ETH Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-400">{data.balance} ETH</div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a2332] border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Total Txns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.stats.total}</div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a2332] border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Flow</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <div className="flex items-center text-green-400 text-sm">
                    <ArrowLeft className="w-4 h-4 mr-1" /> In: {data.stats.incoming}
                  </div>
                  <div className="flex items-center text-red-400 text-sm">
                    <ArrowRight className="w-4 h-4 mr-1" /> Out: {data.stats.outgoing}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#1a2332] border-red-500/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-400">Risk Level</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.risks.length > 0 ? (
                    <div className="text-red-400 font-bold flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" /> 
                      {data.risks.length} Flagged
                    </div>
                  ) : (
                    <div className="text-green-400 font-bold flex items-center gap-2">
                      <Shield className="w-5 h-5" /> 
                      Low Risk
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {data.risks.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Risk Indicators
                </h3>
                <ul className="list-disc list-inside text-sm text-gray-300">
                  {data.risks.map((risk, i) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="bg-[#1a2332] border border-gray-700">
                <TabsTrigger value="transactions">Transactions</TabsTrigger>
                <TabsTrigger value="erc20">ERC-20 Tokens</TabsTrigger>
                <TabsTrigger value="nfts">NFTs (ERC-721)</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="mt-4">
                <Card className="bg-[#1a2332] border-gray-700">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f1419] text-gray-400">
                          <tr>
                            <th className="p-4">Hash</th>
                            <th className="p-4">Time</th>
                            <th className="p-4">From</th>
                            <th className="p-4">To</th>
                            <th className="p-4">Value (ETH)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {data.transactions.length === 0 && (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-500">No transactions found</td></tr>
                          )}
                          {data.transactions.map((tx) => (
                            <tr key={tx.hash} className="hover:bg-gray-800/50">
                              <td className="p-4 font-mono text-cyan-400 cursor-pointer" title={tx.hash}>
                                <a href={`https://etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                                  {tx.hash.substring(0, 10)}...
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                              <td className="p-4 text-gray-300">
                                {new Date(tx.timeStamp * 1000).toLocaleDateString()}
                              </td>
                              <td className="p-4 font-mono">
                                {tx.from.toLowerCase() === address.toLowerCase() 
                                  ? <Badge variant="outline" className="text-gray-400">You</Badge> 
                                  : <span className="text-blue-400">{tx.from.substring(0, 8)}...</span>}
                              </td>
                              <td className="p-4 font-mono">
                                {tx.to.toLowerCase() === address.toLowerCase() 
                                  ? <Badge variant="outline" className="text-gray-400">You</Badge> 
                                  : <span className="text-purple-400">{tx.to.substring(0, 8)}...</span>}
                              </td>
                              <td className="p-4 font-bold text-white">
                                {tx.from.toLowerCase() === address.toLowerCase() 
                                  ? <span className="text-red-400">- {tx.value}</span> 
                                  : <span className="text-green-400">+ {tx.value}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="erc20" className="mt-4">
                <Card className="bg-[#1a2332] border-gray-700">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f1419] text-gray-400">
                          <tr>
                            <th className="p-4">Token</th>
                            <th className="p-4">Symbol</th>
                            <th className="p-4">Amount</th>
                            <th className="p-4">From</th>
                            <th className="p-4">To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {data.tokens.length === 0 && (
                            <tr><td colSpan="5" className="p-4 text-center text-gray-500">No token transfers found</td></tr>
                          )}
                          {data.tokens.map((tx, i) => (
                            <tr key={i} className="hover:bg-gray-800/50">
                              <td className="p-4 text-white">{tx.tokenName}</td>
                              <td className="p-4 text-gray-400">{tx.tokenSymbol}</td>
                              <td className="p-4 font-mono text-white">
                                {(parseInt(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal))).toFixed(4)}
                              </td>
                              <td className="p-4 font-mono text-gray-400">{tx.from.substring(0, 8)}...</td>
                              <td className="p-4 font-mono text-gray-400">{tx.to.substring(0, 8)}...</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nfts" className="mt-4">
                <Card className="bg-[#1a2332] border-gray-700">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f1419] text-gray-400">
                          <tr>
                            <th className="p-4">Collection</th>
                            <th className="p-4">Token ID</th>
                            <th className="p-4">From</th>
                            <th className="p-4">To</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {data.nfts.length === 0 && (
                            <tr><td colSpan="4" className="p-4 text-center text-gray-500">No NFT transfers found</td></tr>
                          )}
                          {data.nfts.map((tx, i) => (
                            <tr key={i} className="hover:bg-gray-800/50">
                              <td className="p-4 text-white">{tx.tokenName} ({tx.tokenSymbol})</td>
                              <td className="p-4 font-mono text-purple-400">#{tx.tokenID}</td>
                              <td className="p-4 font-mono text-gray-400">{tx.from.substring(0, 8)}...</td>
                              <td className="p-4 font-mono text-gray-400">{tx.to.substring(0, 8)}...</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}