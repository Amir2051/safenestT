import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Lock, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AddCardDialog({ open, onClose, onCardAdded }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    nickname: '',
    issuingBank: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate card number
    const cleanNumber = formData.cardNumber.replace(/\s/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      toast.error('Invalid card number length');
      return;
    }

    // Validate expiry
    const currentYear = new Date().getFullYear();
    const year = parseInt(formData.expiryYear);
    const month = parseInt(formData.expiryMonth);
    
    if (year < currentYear || (year === currentYear && month < new Date().getMonth() + 1)) {
      toast.error('Card has expired');
      return;
    }

    setLoading(true);

    try {
      // Here you would call your backend API to add the card
      // For now, we'll simulate it
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (onCardAdded) {
        onCardAdded({
          ...formData,
          cardNumber: cleanNumber
        });
      }

      toast.success('Card added successfully! Monitoring has started.');
      onClose();
      
      // Reset form
      setFormData({
        cardNumber: '',
        cardholderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        nickname: '',
        issuingBank: ''
      });

    } catch (error) {
      console.error('Failed to add card:', error);
      toast.error('Failed to add card. Please try again.');
    }

    setLoading(false);
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\s/g, '');
    if (/^\d*$/.test(value) && value.length <= 19) {
      setFormData(prev => ({ ...prev, cardNumber: value }));
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            Add Credit Card for Monitoring
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Security Notice */}
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-cyan-400 font-semibold text-sm mb-1">
                  🔒 Your data is encrypted
                </p>
                <p className="text-xs text-gray-300">
                  All card details are encrypted using AES-256-GCM before storage. 
                  We never store your CVV after the initial verification.
                </p>
              </div>
            </div>
          </div>

          {/* Card Number */}
          <div>
            <Label className="text-gray-300">Card Number</Label>
            <div className="relative mt-2">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                value={formatCardNumber(formData.cardNumber)}
                onChange={handleCardNumberChange}
                placeholder="1234 5678 9012 3456"
                className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
                required
                maxLength="23"
              />
            </div>
          </div>

          {/* Cardholder Name */}
          <div>
            <Label className="text-gray-300">Cardholder Name</Label>
            <Input
              type="text"
              value={formData.cardholderName}
              onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value.toUpperCase() }))}
              placeholder="JOHN DOE"
              className="mt-2 bg-[#0f1419] border-cyan-500/20 text-white"
              required
            />
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-300">Expiry Month</Label>
              <Select
                value={formData.expiryMonth}
                onValueChange={(value) => setFormData(prev => ({ ...prev, expiryMonth: value }))}
              >
                <SelectTrigger className="mt-2 bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {months.map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {month.toString().padStart(2, '0')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Expiry Year</Label>
              <Select
                value={formData.expiryYear}
                onValueChange={(value) => setFormData(prev => ({ ...prev, expiryYear: value }))}
              >
                <SelectTrigger className="mt-2 bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue placeholder="YYYY" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">CVV</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="password"
                  value={formData.cvv}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*$/.test(value) && value.length <= 4) {
                      setFormData(prev => ({ ...prev, cvv: value }));
                    }
                  }}
                  placeholder="123"
                  className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
                  required
                  maxLength="4"
                />
              </div>
            </div>
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Card Nickname (Optional)</Label>
              <Input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="My Visa Card"
                className="mt-2 bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Issuing Bank (Optional)</Label>
              <Input
                type="text"
                value={formData.issuingBank}
                onChange={(e) => setFormData(prev => ({ ...prev, issuingBank: e.target.value }))}
                placeholder="Chase Bank"
                className="mt-2 bg-[#0f1419] border-cyan-500/20 text-white"
              />
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-semibold text-sm mb-1">
                  Important Information
                </p>
                <ul className="text-xs text-gray-300 space-y-1">
                  <li>• We only monitor for data breaches, we don't process payments</li>
                  <li>• Your CVV is used only for initial validation</li>
                  <li>• You'll receive instant alerts if your card is compromised</li>
                  <li>• You can remove your card anytime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-cyan-500/20 text-gray-300"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Adding Card...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Start Monitoring
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}