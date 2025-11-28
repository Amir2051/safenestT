import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

export default function SendForm({ wallet }) {
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState("input"); // input, confirm, pin
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async () => {
      // 1. Call backend to perform sendtoaddress RPC
      const response = await base44.functions.invoke('electraService', {
        method: 'sendtoaddress',
        params: [toAddress, parseFloat(amount)]
      });

      if (response.data.error) throw new Error(response.data.error.message || "Transaction failed");
      return response.data.result;
    },
    onSuccess: (txid) => {
      toast.success(`Transaction Sent! TXID: ${txid}`);
      setStep("success");
      setAmount("");
      setToAddress("");
      setPin("");
      queryClient.invalidateQueries(['electra-balance']);
      queryClient.invalidateQueries(['electra-txs']);
    },
    onError: (err) => {
      toast.error(`Send failed: ${err.message}`);
      setStep("input");
    }
  });

  const handleVerify = () => {
    if (!toAddress || !amount) {
      toast.error("Please fill in all fields");
      return;
    }
    setStep("pin");
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    // Mock PIN check for "Security Layer" feature
    if (pin !== "1234") { // In real app, check against user's stored PIN hash
      toast.error("Invalid PIN");
      return;
    }
    setStep("process");
    sendMutation.mutate();
  };

  if (step === "success") {
    return (
      <Card className="bg-[#1a1f2e] border-green-500/30 max-w-xl mx-auto">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Send className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sent Successfully!</h2>
          <p className="text-gray-400 mb-6">Your XEP is on its way.</p>
          <Button onClick={() => setStep("input")} className="bg-green-600 hover:bg-green-700">Send Another</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1a1f2e] border-purple-500/20 max-w-xl mx-auto">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Send className="w-5 h-5 text-purple-400" /> Send Electra (XEP)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {step === "input" && (
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Recipient Address</Label>
              <Input 
                value={toAddress} 
                onChange={(e) => setToAddress(e.target.value)} 
                className="bg-[#0f1419] text-white border-purple-500/30 font-mono"
                placeholder="EP..."
              />
            </div>
            <div>
              <Label className="text-gray-300">Amount (XEP)</Label>
              <Input 
                type="number"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="bg-[#0f1419] text-white border-purple-500/30 text-lg"
                placeholder="0.00"
              />
            </div>
            <Button onClick={handleVerify} className="w-full bg-purple-600 hover:bg-purple-700 mt-4">
              Review Transaction
            </Button>
          </div>
        )}

        {step === "pin" && (
          <form onSubmit={handlePinSubmit} className="space-y-6">
            <div className="text-center">
               <ShieldCheck className="w-12 h-12 text-purple-400 mx-auto mb-2" />
               <h3 className="text-xl font-bold text-white">Security Verification</h3>
               <p className="text-gray-400 text-sm">Enter your PIN to authorize this transaction.</p>
            </div>
            
            <div className="bg-[#0f1419] p-4 rounded-lg border border-purple-500/20 text-sm">
               <div className="flex justify-between mb-2">
                 <span className="text-gray-400">Sending:</span>
                 <span className="text-white font-bold">{amount} XEP</span>
               </div>
               <div className="flex justify-between">
                 <span className="text-gray-400">To:</span>
                 <span className="text-white font-mono truncate ml-4">{toAddress}</span>
               </div>
            </div>

            <div>
              <Label className="text-gray-300">Enter PIN (Mock: 1234)</Label>
              <div className="relative">
                <Input 
                  type="password"
                  value={pin} 
                  onChange={(e) => setPin(e.target.value)} 
                  className="bg-[#0f1419] text-white border-purple-500/30 text-center tracking-[1em] font-bold text-xl"
                  maxLength={4}
                  autoFocus
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep("input")} className="flex-1 text-gray-400">Cancel</Button>
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">Confirm Send</Button>
            </div>
          </form>
        )}
        
        {step === "process" && (
           <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-white font-medium">Broadcasting Transaction...</p>
           </div>
        )}
      </CardContent>
    </Card>
  );
}