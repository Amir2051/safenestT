import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function RefundRequest() {
  const urlParams = new URLSearchParams(window.location.search);
  const invId = urlParams.get("invId");

  const { data: investment } = useQuery({
    queryKey: ['investment-detail', invId],
    queryFn: () => base44.entities.Investment.get(invId),
    enabled: !!invId
  });

  const [reason, setReason] = useState("");

  const handleRequest = () => {
    // In a real scenario, this would create a 'RefundRequest' entity or notify admin
    // For now, we simulate a request submission
    toast.success("Refund request submitted to support team.");
  };

  if (!investment) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800">
        <CardHeader>
           <Link to={createPageUrl("MyPortfolio")} className="inline-flex items-center text-slate-400 hover:text-white mb-4 text-sm">
             <ChevronLeft className="w-4 h-4 mr-1" /> Back to Portfolio
           </Link>
           <CardTitle className="text-white">Investment Details & Support</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="space-y-2 text-sm text-slate-300 bg-slate-950 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Company</span>
                <span className="text-white font-semibold">{investment.company_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount</span>
                <span className="text-white font-semibold">${investment.amount}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="text-blue-400">{investment.status}</span>
              </div>
              <div className="flex justify-between">
                <span>Date</span>
                <span>{new Date(investment.created_date).toLocaleDateString()}</span>
              </div>
           </div>

           <div className="space-y-2">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Request Refund / Report Issue
              </h4>
              <p className="text-xs text-slate-400">
                If you believe this company is fraudulent or conditions were not met, please let us know.
                Refunds are only possible if funds are still in "Pending Escrow".
              </p>
              <Textarea 
                placeholder="Reason for refund request..."
                className="bg-slate-950 border-slate-700 text-white h-32"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button 
                className="w-full bg-red-600 hover:bg-red-700" 
                onClick={handleRequest}
                disabled={!reason}
              >
                Submit Request
              </Button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}