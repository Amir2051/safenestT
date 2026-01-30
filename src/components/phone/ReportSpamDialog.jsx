import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ReportSpamDialog({ phoneNumber, open, onClose, user }) {
  const [reportType, setReportType] = useState('SPAM');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType) {
      toast.error('Please select a report type');
      return;
    }

    setSubmitting(true);

    try {
      const response = await base44.functions.invoke('phoneIntelligenceOSINT', {
        action: 'report-spam',
        phone_number: phoneNumber,
        report_type: reportType,
        description,
        call_metadata: {
          call_time: new Date().toISOString()
        }
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Report failed');
      }

      toast.success('Thank you for reporting this number!');
      onClose();
    } catch (error) {
      console.error('Report error:', error);
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-400" />
            Report Spam Number
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">Phone Number</p>
            <p className="text-white font-mono text-lg">{phoneNumber}</p>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">Report Type *</p>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-cyan-500/30 text-white">
                <SelectItem value="SPAM">Spam</SelectItem>
                <SelectItem value="SCAM">Scam / Fraud</SelectItem>
                <SelectItem value="ROBOCALL">Robocall</SelectItem>
                <SelectItem value="TELEMARKETER">Telemarketer</SelectItem>
                <SelectItem value="HARASSMENT">Harassment</SelectItem>
                <SelectItem value="PHISHING">Phishing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">Description (Optional)</p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              className="bg-[#0f1419] border-cyan-500/30 text-white min-h-[100px]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-700"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-red-500 to-pink-500"
              disabled={submitting}
            >
              {submitting ? (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}