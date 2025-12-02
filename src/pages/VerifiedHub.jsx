import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShieldCheck, Lock } from "lucide-react";
import CompanyCard from "@/components/investment/CompanyCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function VerifiedHub() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("All");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoadingUser(false);
    }).catch(() => setLoadingUser(false));
  }, []);

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['verified-companies-public'],
    queryFn: async () => {
      // In a real scenario, use a filter for { verification_status: 'active', is_public: true }
      // Assuming list returns all, we filter client side for now or use filter if supported
      const all = await base44.entities.VerifiedCompany.filter({ verification_status: 'active', is_public: true });
      return all;
    },
    enabled: !!user && (user.role === 'admin' || user.is_admin)
  });

  if (loadingUser) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>;

  // Restrict access for non-admins
  if (!user || (user.role !== 'admin' && !user.is_admin)) {
     return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-lg shadow-cyan-900/20">
                <Lock className="w-10 h-10 text-slate-500" />
            </div>
            <h1 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Verified Investment Hub</h1>
            <p className="text-xl text-cyan-400 mb-6 font-medium">Inactive - Coming Soon</p>
            <p className="max-w-md text-slate-400 leading-relaxed">
                This investment platform is currently under development and restricted to administrative access only. 
                Please check back later for public launch.
            </p>
            <Link to={createPageUrl("Dashboard")}>
                <Button className="mt-8 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" variant="outline">Return to Dashboard</Button>
            </Link>
        </div>
     );
  }

  const industries = ["All", "Tech", "Real Estate", "Crypto", "Energy"];

  const filtered = companies.filter(c => {
    const matchesSearch = c.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = industryFilter === "All" || c.industry === industryFilter;
    return matchesSearch && matchesIndustry;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-blue-900/20 to-slate-950 py-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Verified Investment Hub</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Invest Safely with Verified Partners
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
            Browse vetted opportunities. Funds are held in SafeNestt Escrow until verification conditions are met. Zero scam risk.
          </p>

          <div className="max-w-xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input 
                placeholder="Search companies..." 
                className="pl-10 bg-slate-900 border-slate-700 text-white h-12 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            {industries.map(ind => (
              <Button 
                key={ind} 
                variant={industryFilter === ind ? "default" : "outline"}
                onClick={() => setIndustryFilter(ind)}
                className={`rounded-full ${industryFilter === ind ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700 text-slate-400'}`}
              >
                {ind}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-2xl font-bold">Active Opportunities</h2>
           <Link to={createPageUrl("MyPortfolio")}>
             <Button variant="outline" className="border-slate-700 text-slate-300">My Portfolio</Button>
           </Link>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-500 py-20">Loading opportunities...</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filtered.map(company => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/50 rounded-xl border border-slate-800">
             <p className="text-slate-400">No active investments found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}