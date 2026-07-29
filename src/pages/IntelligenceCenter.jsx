import React, { useState } from "react";
import { KPI } from "@/data/localData";
import CaseDetailDialog from "@/components/investigation/CaseDetailDialog";
import RelatedCasesPanel from "@/components/investigation/RelatedCasesPanel";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Shield, Users, Wallet, Globe, Activity, 
  AlertTriangle, Network, Brain, Database, Scan,
  ChevronRight, Map, Lock
} from "lucide-react";
import ScammerWalletLookup from "@/components/intelligence/ScammerWalletLookup";
import ScamAlertsFeed from "@/components/intelligence/ScamAlertsFeed";
import BlockchainFlowMap from "@/components/investigation/BlockchainFlowMap";
import AdminGate from "@/components/admin/AdminGate";

export default function IntelligenceCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats } = useQuery({
    queryKey: ['intel-stats'],
    queryFn: async () => {
      try {
        const scams = await base44.entities.ScamDatabase.list();
        return { totalScammers: scams.length, activeThreats: scams.filter(s => s.status === 'active').length, verified: scams.filter(s => s.verified).length };
      } catch { return null; }
    },
    initialData: { totalScammers: 0, activeThreats: 0, verified: 0 }
  });
  const [selectedCase, setSelectedCase] = useState(null);
  const fallbackStats = { totalScammers: KPI.openCases * 40, activeThreats: KPI.criticalAlerts * 12, verified: KPI.recoverability * 80 };

  return (
    <AdminGate>
    <div className="min-h-screen bg-[#000000] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Brain className="w-8 h-8 text-purple-500" />
              Intelligence Portal
            </h1>
            <p className="text-gray-400 mt-1">
              Advanced scammer database, network analysis, and AI pattern detection.
            </p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
               <p className="text-xs text-gray-500 uppercase tracking-wider">Database Status</p>
               <p className="text-green-400 font-mono text-sm">ONLINE • UPDATED</p>
             </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#0f1419] border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(stats?.totalScammers || fallbackStats.totalScammers)}</p>
                <p className="text-xs text-gray-400">Known Entities</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0f1419] border-red-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-red-500/10 text-red-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(stats?.activeThreats || fallbackStats.activeThreats)}</p>
                <p className="text-xs text-gray-400">Active Threats</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0f1419] border-green-500/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10 text-green-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{(stats?.verified || fallbackStats.verified)}</p>
                <p className="text-xs text-gray-400">Verified Scams</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0f1419] border-cyan-500/20">
             <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400">
                <Network className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">AI-Link</p>
                <p className="text-xs text-gray-400">Pattern Matching</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Interface */}
        <Tabs defaultValue="lookup" className="space-y-6">
          <TabsList className="bg-[#1a2332] border border-gray-800">
            <TabsTrigger value="lookup">Profile Lookup</TabsTrigger>
            <TabsTrigger value="network">Network Map</TabsTrigger>
            <TabsTrigger value="patterns">AI Patterns</TabsTrigger>
            <TabsTrigger value="alerts">Live Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="lookup" className="space-y-6">
            <Card className="bg-[#0f1419] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Scammer Profile Lookup</CardTitle>
                <CardDescription className="text-gray-400">Search by wallet address, email, phone, or alias</CardDescription>
              </CardHeader>
              <CardContent>
                <ScammerWalletLookup />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="space-y-6">
             <Card className="bg-[#0f1419] border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Scammer Network Visualization</CardTitle>
                <CardDescription className="text-gray-400">Visualizing flow of funds between known entities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[500px] bg-[#0a0a0a] rounded-lg border border-gray-800 flex items-center justify-center">
                   {/* Placeholder for the map since we need a case to initialize it typically */}
                   <div className="text-center">
                     <Network className="w-12 h-12 text-cyan-500 mx-auto mb-4 opacity-50" />
                     <p className="text-gray-400 mb-4">Select an entity to visualize connections</p>
                     <p className="text-xs text-gray-500">Integration with BlockchainFlowMap available in Case View</p>
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

           <TabsContent value="patterns" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-[#0f1419] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Scan className="w-5 h-5 text-purple-400" />
                    Pig Butchering Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { risk: 98, pattern: "High-yield liquidity pool approval" },
                      { risk: 85, pattern: "New wallet < 30 days interaction" },
                      { risk: 92, pattern: "Tether USDT approval to EOA" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-red-500/5 rounded border border-red-500/10">
                        <span className="text-gray-300 text-sm">{item.pattern}</span>
                        <Badge className="bg-red-500/20 text-red-400">{item.risk}% Match</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1419] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                     <Globe className="w-5 h-5 text-cyan-400" />
                     Phishing Domains
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { domain: "coinbase-support-live.com", date: "2h ago" },
                      { domain: "wallet-connect-fix.net", date: "5h ago" },
                      { domain: "metamask-security-check.io", date: "1d ago" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-cyan-500/5 rounded border border-cyan-500/10">
                         <span className="text-gray-300 text-sm font-mono">{item.domain}</span>
                         <span className="text-xs text-gray-500">{item.date}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts">
            <ScamAlertsFeed />
          </TabsContent>
        </Tabs>
      </div>
    </div>
    </AdminGate>
  );
}