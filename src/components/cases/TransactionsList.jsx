import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Calendar, DollarSign } from "lucide-react";

export default function TransactionsList({ transactions, onChange, disabled = false }) {
  const addTransaction = () => {
    onChange([
      ...(transactions || []),
      {
        amount: 0,
        date: '',
        payment_method: '',
        notes: '',
        currency: 'USD'
      }
    ]);
  };

  const updateTransaction = (index, field, value) => {
    const updated = [...(transactions || [])];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeTransaction = (index) => {
    onChange((transactions || []).filter((_, i) => i !== index));
  };

  const totalAmount = (transactions || []).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-white text-base">Payment Transactions</Label>
          <p className="text-gray-400 text-xs mt-1">Add each payment you made to this scammer</p>
        </div>
        <Button
          type="button"
          onClick={addTransaction}
          disabled={disabled}
          size="sm"
          className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Payment
        </Button>
      </div>

      {(transactions || []).length > 0 && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="text-white font-semibold">Total Amount:</span>
            <span className="text-green-400 font-bold text-lg">
              ${totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(transactions || []).map((transaction, idx) => (
          <Card key={idx} className="bg-[#1a2332] border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-cyan-400 font-semibold text-sm">Payment #{idx + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTransaction(idx)}
                  disabled={disabled}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300 text-xs">Amount Sent *</Label>
                  <Input
                    type="number"
                    value={transaction.amount}
                    onChange={(e) => updateTransaction(idx, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    disabled={disabled}
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-300 text-xs">Date Sent</Label>
                  <Input
                    type="date"
                    value={transaction.date}
                    onChange={(e) => updateTransaction(idx, 'date', e.target.value)}
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label className="text-gray-300 text-xs">Payment Method</Label>
                  <Input
                    value={transaction.payment_method}
                    onChange={(e) => updateTransaction(idx, 'payment_method', e.target.value)}
                    placeholder="Wire Transfer, Crypto, etc."
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    disabled={disabled}
                  />
                </div>

                <div>
                  <Label className="text-gray-300 text-xs">Currency</Label>
                  <Input
                    value={transaction.currency}
                    onChange={(e) => updateTransaction(idx, 'currency', e.target.value)}
                    placeholder="USD, BTC, ETH..."
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    disabled={disabled}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-gray-300 text-xs">Notes (Optional)</Label>
                  <Textarea
                    value={transaction.notes}
                    onChange={(e) => updateTransaction(idx, 'notes', e.target.value)}
                    placeholder="Any additional details about this payment..."
                    className="bg-[#0f1419] border-gray-700 text-white mt-1 h-20"
                    disabled={disabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(transactions || []).length === 0 && (
        <div className="text-center py-8 border border-dashed border-gray-700 rounded-lg">
          <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No payment transactions added yet</p>
          <p className="text-gray-500 text-xs mt-1">Click "Add Payment" to record each transaction</p>
        </div>
      )}
    </div>
  );
}