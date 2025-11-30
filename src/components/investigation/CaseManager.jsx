import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, DollarSign, TrendingUp, X } from "lucide-react";
import CollaborationPanel from "@/components/collaboration/CollaborationPanel";
import CaseRiskWidget from "@/components/ai/CaseRiskWidget";

export default function CaseManager({ cases, onSelectCase, selectedCase, recoveryFunds, user }) {
  const getCaseFundSupport = (caseId) => {
    return recoveryFunds
      .filter(f => f.fraud_case_id === caseId && f.transaction_type === 'distribution' && f.status === 'distributed')
      .reduce((sum, f) => sum + f.amount_usd, 0);
  };

  const statusColors = {
    reported: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    investigating: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    traced: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    recovering: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    recovered: "bg-green-500/20 text-green-400 border-green-500/50",
    closed: "bg-gray-500/20 text-gray-400 border-gray-500/50"
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-300px)] min-h-[600px]">
      {/* Left Side: Case List */}
      <Card className="lg:col-span-2 bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20 flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-white">Crypto Fraud Cases</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            {cases.map((fraudCase) => {
              const fundSupport = getCaseFundSupport(fraudCase.id);
              const amountRecovered = (fraudCase.amount_stolen_usd * (fraudCase.recovery_progress || 0)) / 100;
              const isSelected = selectedCase?.id === fraudCase.id;

              return (
                <div
                  key={fraudCase.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-red-500/10 border-red-500' 
                      : 'bg-[#0f1419] border-red-500/10 hover:border-red-500/30'
                  }`}
                  onClick={() => onSelectCase(fraudCase)}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-bold mb-2">{fraudCase.case_title || fraudCase.case_number}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusColors[fraudCase.status] || statusColors.reported}>
                          {fraudCase.status}
                        </Badge>
                        {fraudCase.case_type && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                            {fraudCase.case_type}
                          </Badge>
                        )}
                        {fraudCase.fraud_type && <Badge variant="outline">{fraudCase.fraud_type}</Badge>}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="p-2 bg-[#1a2332] rounded">
                      <p className="text-xs text-gray-400">Amount Lost</p>
                      <p className="text-red-400 font-bold">${fraudCase.amount_stolen_usd?.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-[#1a2332] rounded">
                      <p className="text-xs text-gray-400">Recovered</p>
                      <p className="text-green-400 font-bold">${amountRecovered.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-[#1a2332] rounded">
                      <p className="text-xs text-gray-400">Progress</p>
                      <p className="text-white font-bold">{fraudCase.recovery_progress || 0}%</p>
                    </div>
                    <div className="p-2 bg-[#1a2332] rounded">
                      <p className="text-xs text-gray-400">Fund Support</p>
                      <p className="text-cyan-400 font-bold">${fundSupport.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Reported Date</p>
                      <p className="text-white">
                        {new Date(fraudCase.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs">Created By</p>
                      <p className="text-white font-semibold">{fraudCase.created_by_name || 'N/A'}</p>
                      <p className="text-gray-400 text-[10px] truncate">{fraudCase.created_by_email || fraudCase.created_by}</p>
                    </div>
                  </div>

                  {fundSupport > 0 && (
                    <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded">
                      <p className="text-cyan-400 text-xs flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Recovery Fund provided ${fundSupport.toLocaleString()} in support
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Right Side: Collaboration & Details */}
      <Card className="lg:col-span-1 bg-[#0f1419] border-l border-gray-800 flex flex-col h-full overflow-y-auto">
        {selectedCase ? (
          <>
            <div className="p-4 border-b border-gray-800 bg-[#1a2332] rounded-t-xl flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-white truncate max-w-[200px]">{selectedCase.case_title}</h3>
                <p className="text-xs text-gray-400">Case Collaboration & AI</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onSelectCase(null)}>
                <X className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
            <div className="p-4 space-y-6">
              {/* AI Widget */}
              <CaseRiskWidget caseId={selectedCase.id} />
              
              {/* Collaboration Tools */}
              <div className="h-[500px]">
                 <CollaborationPanel caseId={selectedCase.id} user={user} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
            <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-2">No Case Selected</h3>
            <p className="text-sm">Select a case from the list to view AI analysis and collaborate.</p>
          </div>
        )}
      </Card>
    </div>
  );
}