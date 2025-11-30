import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ChevronLeft, Building, DollarSign, Lock, FileText, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CompanyProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  
  const { data: company, isLoading } = useQuery({
    queryKey: ['company-profile', id],
    queryFn: () => base44.entities.VerifiedCompany.get(id),
    enabled: !!id
  });

  if (isLoading || !company) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header Image / Gradient */}
      <div className="h-64 bg-gradient-to-r from-blue-900 to-slate-900 relative">
        <div className="absolute top-6 left-6">
           <Link to={createPageUrl("VerifiedHub")}>
             <Button variant="ghost" className="text-white hover:bg-white/10">
               <ChevronLeft className="w-5 h-5 mr-1" /> Back to Hub
             </Button>
           </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-20 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left: Logo & Actions */}
          <div className="w-full md:w-1/3 space-y-6">
            <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-xl">
               {company.logo_url ? (
                 <img src={company.logo_url} alt="logo" className="w-full h-48 object-cover rounded-xl" />
               ) : (
                 <div className="w-full h-48 bg-slate-800 rounded-xl flex items-center justify-center">
                    <Building className="w-16 h-16 text-slate-600" />
                 </div>
               )}
            </div>
            
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                   <span className="text-slate-400">Min Investment</span>
                   <span className="text-xl font-bold text-white">${company.min_investment?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-slate-400">Exp. Returns</span>
                   <span className="text-xl font-bold text-green-400">{company.expected_returns || "N/A"}</span>
                </div>
                <Link to={`${createPageUrl("InvestmentCheckout")}?companyId=${company.id}`}>
                  <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-semibold">
                    Invest Now
                  </Button>
                </Link>
                <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Funds held in Escrow until Verified
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right: Details */}
          <div className="flex-1 space-y-8">
            <div>
               <div className="flex items-center gap-3 mb-2">
                 <h1 className="text-4xl font-bold">{company.company_name}</h1>
                 <Badge className="bg-green-500/20 text-green-400 border-green-500/50 h-7">
                   <ShieldCheck className="w-4 h-4 mr-1" /> SafeNestt Verified
                 </Badge>
               </div>
               <div className="flex items-center gap-4 text-slate-400 text-sm">
                  <span>{company.industry}</span>
                  <span>•</span>
                  <a href={company.website} target="_blank" className="flex items-center hover:text-blue-400">
                    <Globe className="w-4 h-4 mr-1" /> Website
                  </a>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-xl font-semibold border-b border-slate-800 pb-2">About</h3>
               <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                 {company.description}
               </p>
            </div>

            <div className="space-y-4">
               <h3 className="text-xl font-semibold border-b border-slate-800 pb-2">Escrow & Security</h3>
               <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Fund Release Conditions
                  </h4>
                  <p className="text-sm text-slate-300">{company.escrow_requirements || "Standard SafeNestt Escrow conditions apply."}</p>
               </div>
            </div>

            <div className="space-y-4">
               <h3 className="text-xl font-semibold border-b border-slate-800 pb-2">Verification Data</h3>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                     <p className="text-xs text-slate-500">Registration ID</p>
                     <p className="font-mono">{company.registration_number || "N/A"}</p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-800">
                     <p className="text-xs text-slate-500">Fraud Check</p>
                     <p className="text-green-400 flex items-center gap-1">
                       <ShieldCheck className="w-3 h-3" /> Passed
                     </p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}