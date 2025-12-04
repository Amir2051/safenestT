import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Building, AlertOctagon, Search, Loader2, ArrowRight } from "lucide-react";

export default function FraudTracking() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("crypto");

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
                        <Input placeholder="Enter wallet address or TXID..." className="bg-[#0f1419] border-gray-600 text-white flex-1" />
                        <Button className="bg-orange-600 hover:bg-orange-700">
                            <Search className="w-4 h-4 mr-2" /> Trace
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded bg-[#0f1419] border border-gray-700">
                            <h4 className="text-gray-400 text-sm mb-1">Risk Score</h4>
                            <p className="text-2xl font-bold text-white">--</p>
                        </div>
                        <div className="p-4 rounded bg-[#0f1419] border border-gray-700">
                            <h4 className="text-gray-400 text-sm mb-1">Entity Owner</h4>
                            <p className="text-2xl font-bold text-white">--</p>
                        </div>
                        <div className="p-4 rounded bg-[#0f1419] border border-gray-700">
                            <h4 className="text-gray-400 text-sm mb-1">Total Received</h4>
                            <p className="text-2xl font-bold text-white">--</p>
                        </div>
                    </div>

                    <div className="h-64 bg-[#0f1419] rounded border border-gray-700 flex items-center justify-center text-gray-500">
                        Transaction Graph Visualization Area
                    </div>
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