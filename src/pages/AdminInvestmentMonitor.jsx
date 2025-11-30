import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function AdminInvestmentMonitor() {
  const { data: investments = [], refetch } = useQuery({
    queryKey: ['admin-investments'],
    queryFn: () => base44.entities.Investment.list('-created_date', 50)
  });

  const handleAction = async (action, investment) => {
    try {
      const res = await base44.functions.invoke('investmentEscrowService', {
        action,
        data: { 
          investment_id: investment.id, 
          reason: action === 'refund' ? 'Admin initiated refund from dashboard' : undefined
        }
      });
      
      if (res.data.success) {
        toast.success(`Successfully ${action === 'release' ? 'released funds' : 'refunded'}`);
        refetch();
      } else {
        toast.error(res.data.error || "Action failed");
      }
    } catch (e) {
      toast.error("Operation error");
    }
  };

  const totalInvested = investments.reduce((acc, i) => acc + (i.status !== 'refunded' ? i.amount : 0), 0);
  const pendingEscrow = investments.filter(i => i.status === 'pending_escrow').reduce((acc, i) => acc + i.amount, 0);
  const flaggedCount = investments.filter(i => i.status === 'flagged').length;

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">Investment Monitor</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Total Volume</p>
            <p className="text-3xl font-bold text-white mt-2">${totalInvested.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
           <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Pending Escrow</p>
            <p className="text-3xl font-bold text-blue-400 mt-2">${pendingEscrow.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">Funds held safely</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
           <CardContent className="p-6">
            <p className="text-slate-400 text-sm">Flagged Transactions</p>
            <p className="text-3xl font-bold text-red-400 mt-2">{flaggedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Recent Investments</CardTitle>
          <Button size="icon" variant="ghost" onClick={refetch}><RefreshCw className="w-4 h-4 text-slate-400"/></Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {investments.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-white font-semibold">{inv.company_name}</h4>
                    <Badge variant="outline" className={`
                      ${inv.status === 'pending_escrow' ? 'text-blue-400 border-blue-500/30' : 
                        inv.status === 'paid_to_company' ? 'text-green-400 border-green-500/30' : 
                        'text-slate-400 border-slate-600'}
                    `}>
                      {inv.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    User: {inv.user_email} • Amount: <span className="text-white font-mono">${inv.amount}</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-1">ID: {inv.id}</p>
                </div>
                
                {inv.status === 'pending_escrow' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction('release', inv)}>
                      Release Funds
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction('refund', inv)}>
                      Refund
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}