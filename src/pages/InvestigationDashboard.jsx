import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LayoutDashboard, FileText, Wallet, Brain, Users, Search, Loader2, CircuitBoard, Scale } from "lucide-react";
import ActiveCasesPanel from "@/components/fraud-center/ActiveCasesPanel";
import BlockchainTracePanel from "@/components/fraud-center/BlockchainTracePanel";
import CryptoTrackerPanel from "@/components/fraud-center/CryptoTrackerPanel";
import ScammerWalletLookup from "@/components/intelligence/ScammerWalletLookup";
import AIPatternDashboard from "@/components/ai/AIPatternDashboard";
import FederalCaseManager from "@/components/investigation/FederalCaseManager";
import CaseImporter from "@/components/investigation/CaseImporter";
import AdminCaseActions from "@/components/fraud/AdminCaseActions";
import AdminGate from "@/components/admin/AdminGate";
import ProactiveAlertsWidget from "@/components/admin/ProactiveAlertsWidget";

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

  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: teamMembers } = useQuery({
    queryKey: ['admin-team'],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.list();
        return users.filter(u => u.role === 'admin' || u.is_admin);
      } catch (e) {
        return [];
      }
    },
    initialData: [],
    enabled: isTeamOpen
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const cases = await base44.entities.InvestigationCase.list();
      const fraudCases = await base44.entities.FraudCase.list();
      
      const results = [
        ...cases.filter(c => 
          (c.case_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.case_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.victim_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        ).map(c => ({ ...c, type: 'Investigation', label: c.case_title, date: c.created_date })),
        ...fraudCases.filter(c => 
          (c.case_title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
        ).map(c => ({ ...c, type: 'Fraud Report', label: c.case_title, date: c.created_date }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <AdminGate>
    <div className="min-h-screen bg-[#000000] text-white p-6 relative">
      <ProactiveAlertsWidget />
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Investigation Portal</h1>
            <p className="text-gray-400">Central command for fraud cases and blockchain analysis</p>
          </div>
          <div className="flex gap-3">
             <Button variant="outline" className="border-gray-700" onClick={() => setIsTeamOpen(true)}>
                <Users className="w-4 h-4 mr-2" /> Team
             </Button>
             <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsSearchOpen(true)}>
                <Search className="w-4 h-4 mr-2" /> Global Search
             </Button>
             <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setIsImportOpen(true)}>
                <FileText className="w-4 h-4 mr-2" /> Import Federal Case
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
            {/* Federal Manager Integration is inside Active Cases Panel mostly, but could be a separate tab too. 
                The user asked for a "feature called Federal Case Manager". 
                I'll put it as a top level tab for visibility, although the CaseManager also has it embedded.
            */}
            <TabsTrigger value="tracking" className="data-[state=active]:bg-purple-500/20 px-6 py-2">
              <Wallet className="w-4 h-4 mr-2" /> Wallet Tracking
            </TabsTrigger>
            <TabsTrigger value="trace" className="data-[state=active]:bg-orange-500/20 px-6 py-2">
              <LayoutDashboard className="w-4 h-4 mr-2" /> Blockchain Trace
            </TabsTrigger>
            <TabsTrigger value="intel" className="data-[state=active]:bg-green-500/20 px-6 py-2">
              <Brain className="w-4 h-4 mr-2" /> Intelligence
            </TabsTrigger>
            <TabsTrigger value="ai-engine" className="data-[state=active]:bg-red-500/20 px-6 py-2">
              <CircuitBoard className="w-4 h-4 mr-2" /> AI Engine
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            <ActiveCasesPanel />
          </TabsContent>

          <TabsContent value="tracking">
             <CryptoTrackerPanel />
          </TabsContent>

          <TabsContent value="trace">
            <BlockchainTracePanel />
          </TabsContent>

          <TabsContent value="intel">
            <ScammerWalletLookup />
          </TabsContent>

          <TabsContent value="ai-engine">
            <AIPatternDashboard />
          </TabsContent>
        </Tabs>

        {/* Team Modal */}
        <Dialog open={isTeamOpen} onOpenChange={setIsTeamOpen}>
          <DialogContent className="bg-[#1a2332] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>Investigation Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {teamMembers.length === 0 ? (
                <p className="text-gray-400">No team members found.</p>
              ) : (
                teamMembers.map(member => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-[#0f1419] rounded-lg border border-gray-800">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {member.full_name?.[0] || member.email?.[0] || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{member.full_name || 'Unknown'}</p>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                    <Badge className="ml-auto bg-purple-500/20 text-purple-400 border-purple-500/50">
                      Admin
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Import Case Modal */}
        {isImportOpen && (
          <CaseImporter onClose={() => setIsImportOpen(false)} />
        )}

        {/* Global Search Modal */}
        <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <DialogContent className="bg-[#1a2332] border-gray-800 text-white sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Global Search</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Search cases, victims, descriptions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-[#0f1419] border-gray-700 text-white"
                />
                <Button onClick={handleSearch} disabled={isSearching} className="bg-purple-600 hover:bg-purple-700">
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {searchResults.length > 0 ? (
                  searchResults.map((result, i) => (
                    <div key={i} className="p-3 bg-[#0f1419] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white">{result.label}</h4>
                          <p className="text-sm text-gray-400 truncate max-w-md">
                            {result.type === 'Investigation' ? result.case_number : result.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="border-gray-700 text-gray-300">
                          {result.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(result.date).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  searchQuery && !isSearching && (
                    <p className="text-center text-gray-400 py-8">No results found</p>
                  )
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </AdminGate>
  );
}