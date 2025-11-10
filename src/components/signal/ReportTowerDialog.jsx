import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Flag, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ReportTowerDialog({ open, onClose, currentTower }) {
  const [reportReason, setReportReason] = useState('imsi_catcher_suspected');
  const [comments, setComments] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!currentTower) {
        throw new Error('No tower data available');
      }

      const response = await base44.functions.invoke('signalWatchService', {
        endpoint: 'report',
        tower_info: currentTower,
        report_reason: reportReason,
        user_comments: comments,
        is_anonymous: isAnonymous
      });

      return response.data;
    },
    onSuccess: (data) => {
      setSubmitted(true);
      toast.success(`✅ Report submitted! ${data.similar_reports > 0 ? `${data.similar_reports} similar reports found.` : ''}`);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setComments('');
      }, 3000);
    },
    onError: (error) => {
      toast.error('Failed to submit report: ' + error.message);
    }
  });

  const handleSubmit = () => {
    reportMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-red-500/30 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-400" />
            Report Suspicious Tower
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
            <p className="text-gray-400">
              Your report helps protect the entire SafeNest community.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tower Info (Auto-filled) */}
            <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <p className="text-xs text-gray-400 mb-1">Reporting Tower:</p>
              <p className="text-white font-mono text-sm">
                {currentTower?.cell_id || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {currentTower?.carrier_name} • {currentTower?.connection_type}
              </p>
            </div>

            {/* Report Reason */}
            <div>
              <Label className="text-gray-300 mb-2 block">Reason for Report</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger className="bg-[#0f1419] border-red-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-red-500/20">
                  <SelectItem value="imsi_catcher_suspected">IMSI Catcher Suspected</SelectItem>
                  <SelectItem value="forced_2g_downgrade">Forced 2G Downgrade</SelectItem>
                  <SelectItem value="unknown_tower_id">Unknown Tower ID</SelectItem>
                  <SelectItem value="signal_interference">Signal Interference</SelectItem>
                  <SelectItem value="suspicious_behavior">Suspicious Behavior</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Comments */}
            <div>
              <Label className="text-gray-300 mb-2 block">Additional Comments (Optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Describe what you experienced..."
                className="bg-[#0f1419] border-red-500/20 text-white h-24"
              />
            </div>

            {/* Anonymous Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-purple-500/10">
              <div>
                <p className="text-white font-semibold text-sm">Send Anonymously</p>
                <p className="text-xs text-gray-400">Your identity will not be shared</p>
              </div>
              <Switch
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-gray-500/20"
                disabled={reportMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={reportMutation.isPending || !currentTower}
                className="flex-1 bg-red-500 hover:bg-red-600"
              >
                {reportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Reports are reviewed by our security team and contribute to community safety
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}