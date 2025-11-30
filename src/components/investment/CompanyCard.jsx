import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CompanyCard({ company }) {
  return (
    <Card className="bg-slate-900 border-slate-800 overflow-hidden hover:border-blue-500/50 transition-all group">
      <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900 relative">
         {company.logo_url ? (
           <img src={company.logo_url} alt={company.company_name} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
         ) : (
           <div className="w-full h-full flex items-center justify-center">
             <Building className="w-12 h-12 text-slate-700" />
           </div>
         )}
         <div className="absolute top-3 right-3">
           <Badge className="bg-green-500/20 text-green-400 border-green-500/50 backdrop-blur-sm">
             <ShieldCheck className="w-3 h-3 mr-1" /> SafeNestt Verified
           </Badge>
         </div>
      </div>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
           <div>
             <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
               {company.company_name}
             </h3>
             <p className="text-sm text-slate-400">{company.industry}</p>
           </div>
        </div>
        
        <p className="text-slate-300 text-sm line-clamp-2 mb-4 h-10">
          {company.description}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <p className="text-slate-500 text-xs">Min Investment</p>
            <p className="text-white font-mono">${company.min_investment?.toLocaleString()}</p>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-800">
            <p className="text-slate-500 text-xs">Exp. Returns</p>
            <p className="text-green-400 font-mono">{company.expected_returns || "N/A"}</p>
          </div>
        </div>

        <Link to={`${createPageUrl("CompanyProfile")}?id=${company.id}`}>
          <Button className="w-full bg-blue-600 hover:bg-blue-700">
            View & Invest
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}