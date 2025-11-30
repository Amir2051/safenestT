import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Briefcase, RefreshCw, ArrowUpRight } from "lucide-react";

export default function MyPortfolio() {
  const { data: investments = [] } = useQuery({
    queryKey: ['my-investments'],
    queryFn: () => base44.entities.Investment.list('-created_date')
  });

  const totalInvested = investments.reduce((acc, i) => acc + (i.status !== 'refunded' ? i.amount : 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
           <h1 className="text-3xl font-bold text-white">My Portfolio</h1>
           <Link to={createPageUrl("VerifiedHub")}>
             <Button variant="outline" className="border-slate-700 text-slate-300">Browse Investments</Button>
           </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Card className="bg-slate-900 border-slate-800">
             <CardContent className="p-6">
               <p className="text-slate-400 text-sm">Total Invested</p>
               <p className="text-3xl font-bold text-white mt-2">${totalInvested.toLocaleString()}</p>
             </CardContent>
           </Card>
           <Card className="bg-slate-900 border-slate-800">
             <CardContent className="p-6">
               <p className="text-slate-400 text-sm">Active Positions</p>
               <p className="text-3xl font-bold text-blue-400 mt-2">{investments.length}</p>
             </CardContent>
           </Card>
        </div>

        {/* List */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Investment History</CardTitle>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No investments yet. Start building your portfolio today.
              </div>
            ) : (
              <div className="space-y-4">
                {investments.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-slate-500" />
                       </div>
                       <div>
                          <h4 className="text-white font-semibold">{inv.company_name}</h4>
                          <p className="text-sm text-slate-400">${inv.amount.toLocaleString()} • {new Date(inv.created_date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={`
                        ${inv.status === 'pending_escrow' ? 'bg-blue-900/50 text-blue-400' :
                          inv.status === 'paid_to_company' ? 'bg-green-900/50 text-green-400' :
                          'bg-gray-800 text-gray-400'}
                      `}>
                        {inv.status === 'pending_escrow' ? 'Held in Escrow' : inv.status.replace('_', ' ')}
                      </Badge>
                      <Link to={`${createPageUrl("RefundRequest")}?invId=${inv.id}`}>
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}