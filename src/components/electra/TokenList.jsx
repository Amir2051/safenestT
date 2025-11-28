import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Layers, AlertCircle } from "lucide-react";

export default function TokenList({ address }) {
  // OmniXEP Support
  // Using the backend proxy to call omni_getbalance or omni_listtransactions
  // Since omni_getbalance requires PropertyID, we might need to list properties first 
  // OR iterate known properties.
  // Assuming we want to show specific tokens or use omni_getallbalancesforaddress if available.
  
  const { data, isLoading } = useQuery({
    queryKey: ['electra-tokens', address],
    queryFn: async () => {
      // Attempt to fetch all balances for address via RPC
      const res = await base44.functions.invoke('electraService', {
        method: 'omni_getallbalancesforaddress',
        params: [address]
      });

      // Fallback if RPC fails or not supported (demo mode)
      if (res.data.error) {
         console.warn("Omni API error:", res.data.error);
         return [];
      }
      return res.data.result || [];
    }
  });

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;

  return (
    <Card className="bg-[#1a1f2e] border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" /> OmniXEP Assets / NFTs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-2">
            {data.map((token, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg border border-purple-500/10">
                 <div>
                   <p className="text-white font-bold">{token.name || `Property #${token.propertyid}`}</p>
                   <p className="text-xs text-gray-400">ID: {token.propertyid}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-purple-400 font-mono font-bold">{token.balance}</p>
                   {token.reserved > 0 && <p className="text-xs text-yellow-500">Reserved: {token.reserved}</p>}
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No OmniXEP tokens found for this address.</p>
            <p className="text-xs mt-1 opacity-50">Make sure your Node supports Omni Layer.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}