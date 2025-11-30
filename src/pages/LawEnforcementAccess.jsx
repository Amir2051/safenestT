import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Lock, Search, FileText, ChevronRight, BadgeCheck, Key } from "lucide-react";
import { toast } from "sonner";
import AgencyReportGenerator from "@/components/investigation/AgencyReportGenerator";
import AdminGate from "@/components/admin/AdminGate";

export default function LawEnforcementAccess() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    // Mock authentication for secure portal visualization
    setTimeout(() => {
      if (accessCode.length > 5) {
        setIsAuthenticated(true);
        toast.success("Secure connection established");
      } else {
        toast.error("Invalid agency credentials");
      }
      setLoading(false);
    }, 1500);
  };

  if (!isAuthenticated) {
    return (
      <AdminGate>
      <div className="min-h-screen bg-[#050a10] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        
        <Card className="w-full max-w-md bg-[#0f1419] border-blue-900/30 shadow-2xl shadow-blue-900/20 relative z-10">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center border border-blue-500/30">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white">Agency Access Portal</CardTitle>
              <CardDescription className="text-blue-400/60">
                Law Enforcement & Regulatory Agencies Only
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 uppercase tracking-wider">Agency ID / Access Code</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <Input 
                    type="password" 
                    placeholder="••••••••••••"
                    className="bg-[#0a0e14] border-gray-800 text-white pl-10 h-12"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 bg-blue-700 hover:bg-blue-600 text-white font-semibold tracking-wide"
                disabled={loading}
              >
                {loading ? "Verifying Credentials..." : "Authenticate Securely"}
              </Button>
              <p className="text-xs text-center text-gray-600 pt-4">
                Unauthorized access is a federal offense under 18 U.S.C. § 1030.
                <br/>All activities are logged and monitored.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
      </AdminGate>
    );
  }

  return (
    <AdminGate>
    <div className="min-h-screen bg-[#050a10] text-white">
      {/* LE Header */}
      <header className="bg-[#0a0e14] border-b border-blue-900/30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-500" />
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">LEO Portal</h1>
              <p className="text-[10px] text-blue-400 uppercase tracking-widest">Official Use Only</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-400">
              Session ID: LE-{Math.floor(Math.random()*10000)}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)} className="text-gray-400 hover:text-white">
              Log Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Search */}
        <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
          <h2 className="text-3xl font-bold">Case Evidence Lookup</h2>
          <div className="relative">
            <Search className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
            <Input 
              placeholder="Enter Case ID, Suspect Name, or Wallet Address..."
              className="w-full h-14 bg-[#0f1419] border-gray-800 text-white pl-12 rounded-xl text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button className="absolute right-2 top-2 h-10 bg-blue-700 hover:bg-blue-600">
              Search Database
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0f1419] border-blue-900/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Evidence Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-between border-gray-800 hover:bg-blue-900/10 text-gray-300">
                Request New Case File <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-gray-800 hover:bg-blue-900/10 text-gray-300">
                Subpoena Generator <ChevronRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between border-gray-800 hover:bg-blue-900/10 text-gray-300">
                Download Templates <ChevronRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#0f1419] border-blue-900/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-blue-400" />
                Verification Center
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm text-gray-400">Verify the authenticity of SafeNestT generated reports and forensic data.</p>
               <div className="flex gap-2">
                 <Input placeholder="Report Hash / ID" className="bg-[#0a0e14] border-gray-800" />
                 <Button size="icon" className="bg-blue-700"><Search className="w-4 h-4" /></Button>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f1419] border-blue-900/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                Secure Transfer
              </CardTitle>
            </CardHeader>
             <CardContent className="space-y-4">
               <p className="text-sm text-gray-400">Securely upload court orders or warrant documentation.</p>
               <Button className="w-full bg-blue-900/20 text-blue-400 border border-blue-500/30 hover:bg-blue-900/40">
                 Upload Secure Documents
               </Button>
            </CardContent>
          </Card>
        </div>

        {/* Mock Results Area */}
        <div className="border-t border-gray-800 pt-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-300">Recent Inquiries</h3>
          <div className="bg-[#0f1419] rounded-lg border border-gray-800 p-8 text-center text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>Search history is cleared after 24 hours for security.</p>
          </div>
        </div>

      </div>
    </div>
    </AdminGate>
  );
}