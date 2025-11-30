import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, ArrowRight, Lock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function InvestmentCheckout() {
  const urlParams = new URLSearchParams(window.location.search);
  const companyId = urlParams.get("companyId");

  const { data: company } = useQuery({
    queryKey: ['checkout-company', companyId],
    queryFn: () => base44.entities.VerifiedCompany.get(companyId),
    enabled: !!companyId
  });

  const [amount, setAmount] = useState("");
  const [step, setStep] = useState(1); // 1: Input, 2: Confirm, 3: Success
  const [processing, setProcessing] = useState(false);

  const handleInvest = async () => {
    setProcessing(true);
    try {
      const res = await base44.functions.invoke('investmentEscrowService', {
        action: 'invest',
        data: {
          company_id: company.id,
          amount: amount,
          payment_method: 'wallet'
        }
      });

      if (res.data.success) {
        setStep(3);
      } else {
        toast.error(res.data.error);
      }
    } catch (e) {
      toast.error("Investment failed");
    }
    setProcessing(false);
  };

  if (!company) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {step === 1 && (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Invest in {company.company_name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="text-sm text-slate-400 block mb-2">Investment Amount (USD)</label>
                <Input 
                  type="number"
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-slate-950 border-slate-700 text-white text-2xl h-14"
                  placeholder={`Min $${company.min_investment}`}
                />
                <p className="text-xs text-slate-500 mt-2">Minimum investment: ${company.min_investment?.toLocaleString()}</p>
              </div>
              
              <div className="bg-blue-900/10 p-4 rounded-lg border border-blue-500/20">
                 <div className="flex items-center gap-2 text-blue-400 mb-2">
                   <Lock className="w-4 h-4" />
                   <span className="font-semibold">Escrow Protected</span>
                 </div>
                 <p className="text-xs text-slate-300">
                   Your funds will be held in the SafeNestt Escrow Vault. They are only released to {company.company_name} after final verification conditions are met.
                 </p>
              </div>

              <div className="flex gap-3">
                <Link to={createPageUrl("CompanyProfile") + `?id=${company.id}`} className="flex-1">
                  <Button variant="outline" className="w-full border-slate-700 text-slate-300">Cancel</Button>
                </Link>
                <Button 
                  className="flex-1 bg-blue-600 hover:bg-blue-700" 
                  disabled={!amount || Number(amount) < (company.min_investment || 0)}
                  onClick={() => setStep(2)}
                >
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="bg-slate-900 border-slate-800">
             <CardHeader>
              <CardTitle className="text-white">Confirm Investment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span>Company</span>
                  <span className="font-semibold text-white">{company.company_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span className="font-semibold text-white">${Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fee</span>
                  <span className="font-semibold text-white">$0.00</span>
                </div>
                <div className="border-t border-slate-800 my-2 pt-2 flex justify-between text-base font-bold text-white">
                  <span>Total</span>
                  <span>${Number(amount).toLocaleString()}</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg" 
                onClick={handleInvest}
                disabled={processing}
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Pay"}
              </Button>
              
              <Button variant="ghost" className="w-full text-slate-400" onClick={() => setStep(1)} disabled={processing}>
                Back
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="bg-slate-900 border-slate-800 text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
               <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                 <CheckCircle className="w-10 h-10 text-green-500" />
               </div>
               <h2 className="text-2xl font-bold text-white">Investment Placed!</h2>
               <p className="text-slate-400">
                 Your funds are now securely held in escrow. You can track the status in your portfolio.
               </p>
               <Link to={createPageUrl("MyPortfolio")}>
                 <Button className="bg-blue-600 hover:bg-blue-700">
                   Go to Portfolio
                 </Button>
               </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}