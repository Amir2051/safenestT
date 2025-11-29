import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, FileText, Wallet, Brain, Users, Search } from "lucide-react";
import ActiveCasesPanel from "@/components/fraud-center/ActiveCasesPanel";
import BlockchainTracePanel from "@/components/fraud-center/BlockchainTracePanel";
import CryptoTrackerPanel from "@/components/fraud-center/CryptoTrackerPanel";
import ScammerWalletLookup from "@/components/intelligence/ScammerWalletLookup";
import AdminCaseActions from "@/components/fraud/AdminCaseActions";

export default function InvestigationDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['investigation-stats'],
    queryFn: async () => {
      const cases = await base44.entities.InvestigationCase.list();
      return {
        total: cases.length,
        active: cases.filter(c => ['new', 'investigating'].includes(c.status)).length,
        recovered: cases.reduce((acc, c) => acc + (c.recovery_amount || 0), 0)
      };
    },
    initialData: { total: 0, active: 0, recovered: 0 }
  });

  return (
    <div className="min-h-screen bg-[#000000] text-white p-6">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Investigation Portal</h1>
            <p className="text-gray-400">Central command for fraud cases and blockchain analysis</p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="border-gray-700">
                <Users className="w-4 h-4 mr-2" /> Team
             </Button>
             <Button className="bg-purple-600 hover:bg-purple-700">
                <Search className="w-4 h-4 mr-2" /> Global Search
             </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0f1419] border-gray-800">
            <CardContent className="p-6">
               <p className="text-gray-400 text-sm">Active Investigations</p>
               <p className="text-3xl font-bold text-white mt-2">{stats.active}</p>
               <div className="mt-2 flex items-center text-xs text-green-400">
                 <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                 Live Updates
               </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0f1419] border-gray-800">
            <CardContent className="p-6">
               <p className="text-gray-400 text-sm">Total Cases Processed</p>
               <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0f1419] border-gray-800">
            <CardContent className="p-6">
               <p className="text-gray-400 text-sm">Total Recovered Value</p>
               <p className="text-3xl font-bold text-green-400 mt-2">${stats.recovered.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Workspace */}
        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList className="bg-[#1a2332] border border-gray-800 h-auto p-1">
            <TabsTrigger value="cases" className="data-[state=active]:bg-cyan-500/20 px-6 py-2">
              <FileText className="w-4 h-4 mr-2" /> Active Cases
            </TabsTrigger>
            <TabsTrigger value="tracking" className="data-[state=active]:bg-purple-500/20 px-6 py-2">
              <Wallet className="w-4 h-4 mr-2" /> Wallet Tracking
            </TabsTrigger>
            <TabsTrigger value="trace" className="data-[state=active]:bg-orange-500/20 px-6 py-2">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Blockchain Trace
            </TabsTrigger>
            <TabsTrigger value="intel" className="data-[state=active]:bg-green-500/20 px-6 py-2">
              <Brain className="w-4 h-4 mr-2" /> Intelligence
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            <ActiveCasesPanel />
          </TabsContent>

          <TabsContent value="tracking">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2">
                 <CryptoTrackerPanel />
               </div>
               <div className="lg:col-span-1">
                 <AdminCaseActions />
               </div>
             </div>
          </TabsContent>

          <TabsContent value="trace">
            <BlockchainTracePanel />
          </TabsContent>

          <TabsContent value="intel">
            <ScammerWalletLookup />
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}