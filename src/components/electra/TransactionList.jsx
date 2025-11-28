import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, ExternalLink } from "lucide-react";

export default function TransactionList({ address, limit = 50, compact = false }) {
  const [selectedTx, setSelectedTx] = useState(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['electra-txs', address],
    queryFn: async () => {
      // Fetch tx list
      const res = await fetch(`https://explorer.electraprotocol.com/api/addr/${address}`);
      const data = await res.json();
      // The API returns transaction IDs in `transactions` array
      // We might need to fetch details for each if the summary isn't enough, 
      // but usually address endpoint returns full list or we use `api/addr/{addr}/noTxList=0`
      // Let's assume `transactions` contains txids and we map them or the API returns objects.
      // Looking at similar Insights APIs, it usually returns txids. 
      // For better UX, we should fetch the last few TX details.
      // HOWEVER, to prevent spamming, we'll display the list and fetch details on click 
      // OR if the API supports `/api/txs?address=ADDRESS` (common in Insight API)
      
      // Trying an alternative standard endpoint often available on Insight:
      const txsRes = await fetch(`https://explorer.electraprotocol.com/api/txs?address=${address}`);
      if (txsRes.ok) {
          const txData = await txsRes.json();
          return txData.txs; 
      }
      // Fallback: just return IDs if main list fails, formatted as objects
      return (data.transactions || []).slice(0, limit).map(tx => ({ txid: tx, confirm: false })); 
    },
    refetchInterval: 30000
  });

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;

  if (transactions.length === 0) {
    return (
      <Card className="bg-[#1a1f2e] border-purple-500/20">
         <CardContent className="p-8 text-center text-gray-400">No transactions found</CardContent>
      </Card>
    );
  }

  const displayTxs = compact ? transactions.slice(0, limit) : transactions;

  return (
    <Card className="bg-[#1a1f2e] border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-white text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-purple-500/10">
          {displayTxs.map((tx, i) => {
            // Calculate value and direction if possible
            // Note: Basic Insight API tx object structure assumed
            const isIncoming = tx.vout?.some(out => out.scriptPubKey?.addresses?.includes(address));
            const value = isIncoming 
                ? tx.vout?.filter(out => out.scriptPubKey?.addresses?.includes(address)).reduce((a,b) => a + parseFloat(b.value), 0)
                : tx.vin?.length > 0 ? "Sent" : "0"; 
                // Logic simplified for display

            return (
              <Dialog key={tx.txid || i}>
                <DialogTrigger asChild>
                  <div className="p-4 hover:bg-purple-500/5 cursor-pointer transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${isIncoming === true ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {isIncoming === true ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-white font-medium font-mono text-sm truncate w-32 md:w-48">{tx.txid.slice(0,16)}...</p>
                        <p className="text-xs text-gray-400">
                          {tx.time ? new Date(tx.time * 1000).toLocaleDateString() : 'Unknown Date'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className={`font-bold ${isIncoming === true ? 'text-green-400' : 'text-white'}`}>
                         {isIncoming === true ? '+' : ''}{typeof value === 'number' ? value.toFixed(2) : value} XEP
                       </p>
                       <div className="flex items-center justify-end gap-1 mt-1">
                         {tx.confirmations > 0 ? (
                           <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400 bg-green-500/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Confirmed</Badge>
                         ) : (
                           <Badge variant="outline" className="text-[10px] border-yellow-500/30 text-yellow-400 bg-yellow-500/10"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
                         )}
                       </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1f2e] border-purple-500/30 text-white max-w-2xl">
                  <TransactionDetails txid={tx.txid} />
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionDetails({ txid }) {
  const { data: tx, isLoading } = useQuery({
    queryKey: ['electra-tx-detail', txid],
    queryFn: async () => {
      const res = await fetch(`https://explorer.electraprotocol.com/api/tx/${txid}`);
      return res.json();
    }
  });

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Transaction Details</DialogTitle>
      </DialogHeader>
      
      <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20 space-y-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">Transaction ID</p>
          <div className="flex gap-2">
            <code className="flex-1 bg-black/30 p-2 rounded text-xs break-all">{tx.txid}</code>
            <Button size="sm" variant="ghost" onClick={() => window.open(`https://explorer.electraprotocol.com/tx/${tx.txid}`, '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
             <p className="text-gray-400 text-sm mb-1">Confirmations</p>
             <p className="text-white font-mono">{tx.confirmations}</p>
           </div>
           <div>
             <p className="text-gray-400 text-sm mb-1">Block Height</p>
             <p className="text-white font-mono">{tx.blockheight}</p>
           </div>
           <div>
             <p className="text-gray-400 text-sm mb-1">Time</p>
             <p className="text-white">{new Date(tx.time * 1000).toLocaleString()}</p>
           </div>
           <div>
             <p className="text-gray-400 text-sm mb-1">Size</p>
             <p className="text-white font-mono">{tx.size} bytes</p>
           </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Inputs & Outputs</h4>
        <div className="space-y-2">
          {tx.vin?.map((vin, i) => (
             <div key={i} className="flex justify-between text-xs p-2 bg-red-900/10 rounded border border-red-500/10">
               <span className="text-red-300 truncate w-2/3">{vin.addr || 'Coinbase/Unknown'}</span>
               <span className="text-red-300 font-mono">{vin.value} XEP</span>
             </div>
          ))}
          <div className="flex justify-center"><div className="w-px h-4 bg-gray-600"></div></div>
          {tx.vout?.map((vout, i) => (
             <div key={i} className="flex justify-between text-xs p-2 bg-green-900/10 rounded border border-green-500/10">
               <span className="text-green-300 truncate w-2/3">{vout.scriptPubKey?.addresses?.[0]}</span>
               <span className="text-green-300 font-mono">{vout.value} XEP</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}