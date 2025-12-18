import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, FileText, Users } from "lucide-react";

export default function MergeCasesDialog({ isOpen, onClose, selectedCases, onConfirm, isProcessing }) {
  if (!isOpen || !selectedCases || selectedCases.length < 2) return null;

  // Group by user to check for conflicts visually
  // Normalize emails to lowercase and trim
  const owners = [...new Set(selectedCases.map(c => 
    (c.client_email || c.created_by || 'Unknown').toLowerCase().trim()
  ))];
  const isSingleOwner = owners.length === 1;
  const totalLoss = selectedCases.reduce((sum, c) => sum + (c.amount_stolen_usd || c.amount_lost || 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-red-500/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            Create Profile Case
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Merge multiple cases into a single master profile for comprehensive investigation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isSingleOwner ? (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-400">Owner Mismatch Detected</p>
                <p className="text-xs text-gray-300 mt-1">
                  Selected cases belong to different users. Merging is restricted to a single user profile.
                </p>
                <ul className="text-xs text-gray-400 mt-2 list-disc list-inside">
                  {owners.map(o => <li key={o}>{o}</li>)}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-gray-300">
                  <span className="font-semibold text-blue-400">Target User:</span> {owners[0]}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#0f1419] rounded border border-gray-700">
                  <p className="text-xs text-gray-400">Cases to Link</p>
                  <p className="text-lg font-bold text-white">{selectedCases.length}</p>
                </div>
                <div className="p-3 bg-[#0f1419] rounded border border-gray-700">
                  <p className="text-xs text-gray-400">Total Loss Value</p>
                  <p className="text-lg font-bold text-green-400">${totalLoss.toLocaleString()}</p>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                <p>• Original cases will NOT be deleted</p>
                <p>• A new "Master Case" entity will be created</p>
                <p>• All evidence and timelines will be aggregated</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={!isSingleOwner || isProcessing}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isProcessing ? "Merging..." : "Confirm & Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}