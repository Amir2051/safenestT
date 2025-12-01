import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function PaymentMethodPopup({ user, onUpdate }) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  if (!user) return null;

  const hasPaymentMethod = user.payment_method_added;
  // Only show if user doesn't have payment method AND hasn't dismissed it this session
  const shouldShow = !hasPaymentMethod && isVisible;

  if (!shouldShow) return null;

  const handleAddPayment = () => {
    navigate(createPageUrl("Billing"));
    setIsVisible(false);
  };

  return (
    <Dialog open={shouldShow} onOpenChange={setIsVisible}>
      <DialogContent className="bg-[#1a2332] border-purple-500/20 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="w-6 h-6 text-purple-400" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Please add a payment method to secure your account and enable premium features.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
           <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20 mb-4">
             <p className="text-sm text-purple-200">
               Add a card to ensure uninterrupted service. You won't be charged until you upgrade to a premium plan.
             </p>
           </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button 
            variant="ghost" 
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white"
          >
            Remind me later
          </Button>
          <Button 
            onClick={handleAddPayment}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Add Payment Method
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}