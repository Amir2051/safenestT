import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, CreditCard, FileText } from "lucide-react";

export default function PaymentTransactionsView({ transactions, totalAmount }) {
  if (!transactions || transactions.length === 0) {
    return (
      <Card className="bg-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6 text-center">
          <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No payment transactions recorded</p>
          {totalAmount > 0 && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
              <p className="text-white font-semibold">Total Amount Lost: ${totalAmount.toLocaleString()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const calculatedTotal = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Total Summary */}
      <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300 text-sm">Total Amount Sent to Scammer</p>
              <p className="text-red-400 font-bold text-2xl mt-1">
                ${calculatedTotal.toLocaleString()}
              </p>
              <p className="text-gray-500 text-xs mt-1">Across {transactions.length} payment(s)</p>
            </div>
            <DollarSign className="w-12 h-12 text-red-400" />
          </div>
        </CardContent>
      </Card>

      {/* Individual Transactions */}
      <div className="space-y-2">
        <h4 className="text-white font-semibold text-sm">Payment History</h4>
        {transactions.map((tx, idx) => (
          <Card key={idx} className="bg-[#1a2332] border-cyan-500/20">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                      Payment #{idx + 1}
                    </Badge>
                    {tx.date && (
                      <span className="text-gray-400 text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(tx.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Amount</p>
                      <p className="text-white font-semibold">
                        ${parseFloat(tx.amount || 0).toLocaleString()} {tx.currency || ''}
                      </p>
                    </div>

                    {tx.payment_method && (
                      <div>
                        <p className="text-gray-400 text-xs">Payment Method</p>
                        <p className="text-white flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-cyan-400" />
                          {tx.payment_method}
                        </p>
                      </div>
                    )}

                    {tx.notes && (
                      <div className="col-span-2 mt-2 pt-2 border-t border-gray-700">
                        <p className="text-gray-400 text-xs mb-1">Notes</p>
                        <p className="text-gray-300 text-xs">{tx.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-red-400 font-bold text-lg">
                    ${parseFloat(tx.amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}