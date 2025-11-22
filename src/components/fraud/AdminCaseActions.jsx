import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Send, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function AdminCaseActions({ fraudCase }) {
  const [statusUpdate, setStatusUpdate] = useState(fraudCase.status);
  const [adminNotes, setAdminNotes] = useState("");
  const [recoveryProgress, setRecoveryProgress] = useState(fraudCase.recovery_progress || 0);
  const [assignedTo, setAssignedTo] = useState(fraudCase.assigned_to || "");

  const queryClient = useQueryClient();

  const updateCaseMutation = useMutation({
    mutationFn: async (updates) => {
      await base44.asServiceRole.entities.FraudCase.update(fraudCase.id, updates);

      // Create notification for user
      if (updates.status && updates.status !== fraudCase.status) {
        await base44.asServiceRole.entities.EmailNotification.create({
          recipient: fraudCase.created_by,
          subject: `Fraud Case Update: ${updates.status}`,
          template_name: "fraud_case_update",
          status: "pending",
          metadata: {
            case_id: fraudCase.id,
            case_title: fraudCase.case_title,
            new_status: updates.status,
            admin_notes: adminNotes,
          },
        });
      }

      return updates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fraud-cases"] });
      queryClient.invalidateQueries({ queryKey: ["admin-fraud-cases"] });
      toast.success("✅ Case updated and user notified");
      setAdminNotes("");
    },
    onError: (error) => {
      toast.error("Failed to update case: " + error.message);
    },
  });

  const handleUpdateCase = () => {
    if (!statusUpdate) {
      toast.error("Please select a status");
      return;
    }

    const currentNotes = fraudCase.case_notes || [];
    const newNote = {
      timestamp: new Date().toISOString(),
      note: adminNotes || `Status changed to ${statusUpdate}`,
      author: "Admin",
    };

    updateCaseMutation.mutate({
      status: statusUpdate,
      recovery_progress: recoveryProgress,
      assigned_to: assignedTo,
      case_notes: [...currentNotes, newNote],
    });
  };

  return (
    <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-400" />
          Admin Case Management
          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
            ADMIN ONLY
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white mb-2 block">Case Status</Label>
            <Select value={statusUpdate} onValueChange={setStatusUpdate}>
              <SelectTrigger className="bg-[#0f1419] border-red-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-red-500/20">
                <SelectItem value="reported">📋 Reported</SelectItem>
                <SelectItem value="investigating">🔍 Investigating</SelectItem>
                <SelectItem value="traced">🔗 Traced</SelectItem>
                <SelectItem value="recovering">💰 Recovering</SelectItem>
                <SelectItem value="recovered">✅ Recovered</SelectItem>
                <SelectItem value="closed">🔒 Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-white mb-2 block">Recovery Progress (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={recoveryProgress}
              onChange={(e) => setRecoveryProgress(parseInt(e.target.value) || 0)}
              className="bg-[#0f1419] border-red-500/20 text-white"
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-white mb-2 block">Assigned To</Label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Admin email handling this case"
              className="bg-[#0f1419] border-red-500/20 text-white"
            />
          </div>
        </div>

        <div>
          <Label className="text-white mb-2 block">Update Notes (User will see this)</Label>
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add notes about this case update that will be shared with the user..."
            className="bg-[#0f1419] border-red-500/20 text-white h-24"
          />
        </div>

        <Button
          onClick={handleUpdateCase}
          disabled={updateCaseMutation.isPending}
          className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700"
        >
          {updateCaseMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Update Case & Notify User
            </>
          )}
        </Button>

        {/* Case History */}
        {fraudCase.case_notes && fraudCase.case_notes.length > 0 && (
          <div className="mt-6 space-y-3 pt-4 border-t border-red-500/20">
            <h4 className="text-white font-semibold text-sm">Case Update History</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {fraudCase.case_notes.slice().reverse().map((note, idx) => (
                <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-red-500/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-400 text-xs">
                      {new Date(note.timestamp).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {note.author}
                    </Badge>
                  </div>
                  <p className="text-white text-sm">{note.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}