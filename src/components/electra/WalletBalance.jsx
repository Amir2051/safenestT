import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp, ArrowDownLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WalletBalance({ address }) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['electra-balance', address],
    queryFn: async () => {
      // Using the public REST API as requested
      const res = await fetch(`https://explorer.electraprotocol.com/api/addr/${address}`);
      return res.json();
    },
    refetchInterval: 20000 // Refresh every 20s
  });

  if (isLoading) {
    return <div className="h-32 flex items-center justify-center bg-[#1a1f2e] rounded-xl border border-purple-500/20"><Loader2 className="animate-spin text-purple-400" /></div>;
  }

  const balance = data?.balance || 0;
  const totalReceived = data?.totalReceived || 0;
  const totalSent = data?.totalSent || 0;
  const unconfirmed = data?.unconfirmedBalance || 0;

  return (
    <Card className="bg-gradient-to-r from-[#1a1f2e] to-[#2d1b4e] border-purple-500/30">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-purple-300 font-medium mb-1">Total Balance</p>
            <h2 className="text-4xl font-bold text-white flex items-baseline gap-2">
              {balance.toLocaleString()} <span className="text-lg text-purple-400">XEP</span>
            </h2>
            {unconfirmed !== 0 && (
              <p className="text-yellow-400 text-sm mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {unconfirmed} XEP unconfirmed
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} className={`${isRefetching ? 'animate-spin' : ''} text-purple-300`}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <div className="p-1 bg-green-500/20 rounded"><ArrowDownLeft className="w-4 h-4" /></div>
              <span className="text-sm font-medium">Received</span>
            </div>
            <p className="text-xl font-semibold text-white">{totalReceived.toLocaleString()}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <div className="p-1 bg-red-500/20 rounded"><ArrowUpRight className="w-4 h-4" /></div>
              <span className="text-sm font-medium">Sent</span>
            </div>
            <p className="text-xl font-semibold text-white">{totalSent.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}