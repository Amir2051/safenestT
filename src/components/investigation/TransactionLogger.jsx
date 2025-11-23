import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowUpRight, ArrowDownLeft, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TransactionLogger({ cases, caseId }) {
  const [selectedCase, setSelectedCase] = useState(caseId || "");
  const [formData, setFormData] = useState({
    tx_hash: "",
    from_address: "",
    to_address: "",
    amount: "",
    blockchain: "ethereum",
    direction: "outgoing",
    notes: ""
  });
  const queryClient = useQueryClient();

  const [transactions, setTransactions] = useState([]);

  React.useEffect(() => {
    if (selectedCase) {
      base44.entities.Transaction.filter({ case_id: selectedCase }, '-timestamp', 50)
        .then(setTransactions)
        .catch(() => setTransactions([]));
    }
  }, [selectedCase]);

  const createTransactionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Transaction.create({
        ...data,
        case_id: selectedCase,
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Transaction logged");
      setFormData({
        tx_hash: "",
        from_address: "",
        to_address: "",
        amount: "",
        blockchain: "ethereum",
        direction: "outgoing",
        notes: ""
      });
      // Refresh transactions
      base44.entities.Transaction.filter({ case_id: selectedCase }, '-timestamp', 50)
        .then(setTransactions);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCase) {
      toast.error("Please select a case");
      return;
    }
    if (!formData.tx_hash || !formData.from_address || !formData.to_address) {
      toast.error("Please fill in required fields");
      return;
    }
    createTransactionMutation.mutate(formData);
  };

  return (
    <div className="space-y-6">
      {/* Transaction Entry Form */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Log Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Case *</Label>
                <Select value={selectedCase} onValueChange={setSelectedCase}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Select case..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    {(cases || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_number} - {c.case_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white mb-2 block">Blockchain *</Label>
                <Select value={formData.blockchain} onValueChange={(val) => setFormData({...formData, blockchain: val})}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="bitcoin">Bitcoin</SelectItem>
                    <SelectItem value="bsc">BSC</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="tron">Tron</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Transaction Hash *</Label>
              <Input
                value={formData.tx_hash}
                onChange={(e) => setFormData({...formData, tx_hash: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/30 text-white font-mono"
                placeholder="0x..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">From Address *</Label>
                <Input
                  value={formData.from_address}
                  onChange={(e) => setFormData({...formData, from_address: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white font-mono"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">To Address *</Label>
                <Input
                  value={formData.to_address}
                  onChange={(e) => setFormData({...formData, to_address: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Amount</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Direction</Label>
                <Select value={formData.direction} onValueChange={(val) => setFormData({...formData, direction: val})}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    <SelectItem value="incoming">Incoming</SelectItem>
                    <SelectItem value="outgoing">Outgoing</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-white mb-2 block">Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/30 text-white h-20"
                placeholder="Additional details..."
              />
            </div>

            <Button 
              type="submit" 
              disabled={createTransactionMutation.isPending}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              {createTransactionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Log Transaction
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {selectedCase && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No transactions logged yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {tx.direction === 'incoming' ? (
                          <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        )}
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono text-xs">
                          {tx.blockchain}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-300">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-400 w-16">Hash:</p>
                        <p className="text-white font-mono text-xs truncate flex-1">{tx.tx_hash}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`https://etherscan.io/tx/${tx.tx_hash}`, '_blank')}
                        >
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-400 w-16">From:</p>
                        <p className="text-white font-mono text-xs truncate">{tx.from_address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-gray-400 w-16">To:</p>
                        <p className="text-white font-mono text-xs truncate">{tx.to_address}</p>
                      </div>
                      {tx.amount && (
                        <div className="flex items-center gap-2">
                          <p className="text-gray-400 w-16">Amount:</p>
                          <p className="text-white font-semibold">{tx.amount}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}