import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ReportFraudDialog({ alert, open, onClose }) {
  const [details, setDetails] = useState('');
  const queryClient = useQueryClient();

  const reportFraudMutation = useMutation({
    mutationFn: async () => {
      // Update alert as fraud reported
      await base44.entities.TitleAlert.update(alert.id, {
        fraud_reported: true,
        status: 'investigating',
        user_notes: details
      });

      // Create high-priority security alert
      await base44.entities.Alert.create({
        alert_type: 'dark_web',
        severity: 'critical',
        title: `🚨 Title Fraud Reported: ${alert.property_address}`,
        message: `User reported suspicious property filing. Document ID: ${alert.document_id}, Filed by: ${alert.filing_party}`,
        status: 'active',
        affected_item: alert.property_address,
        recommendation: 'Contact NYC authorities and property attorney immediately'
      });

      // Log audit trail
      await base44.entities.AuditLog.create({
        action_type: 'fraud_reported',
        action_category: 'security',
        description: `Title fraud reported for property: ${alert.property_address}`,
        metadata: {
          alert_id: alert.id,
          document_id: alert.document_id,
          filing_party: alert.filing_party,
          user_details: details
        },
        severity: 'critical',
        status: 'success'
      });

      // Send notification email
      const user = await base44.auth.me();
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: '🚨 Title Fraud Report Received - SafeNest',
        body: `
Your fraud report has been received for:
Property: ${alert.property_address}
Document ID: ${alert.document_id}
Filing Party: ${alert.filing_party}

Next Steps:
1. We've flagged this alert in your dashboard
2. Contact NYC Department of Finance: (212) 639-9675
3. File a police report if you believe identity theft occurred
4. Consult with a real estate attorney
5. Request a title search from a title company

SafeNest Security Team
        `
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['title-alerts'] });
      toast.success('🚨 Fraud report submitted. Check your email for next steps.');
      onClose();
    },
    onError: () => {
      toast.error('Failed to submit fraud report. Please try again.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    reportFraudMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-red-500/30 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Flag className="w-6 h-6 text-red-400" />
            Report Fraudulent Filing
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-semibold mb-2">Property: {alert?.property_address}</p>
                <p className="text-sm text-gray-300 mb-1">Filing Type: {alert?.filing_type}</p>
                <p className="text-sm text-gray-300 mb-1">Filed By: {alert?.filing_party}</p>
                <p className="text-sm text-gray-300">Document ID: {alert?.document_id}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-gray-300 font-semibold">
              Describe why you believe this filing is fraudulent:
            </label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Example: I did not authorize this transaction. I have not sold or mortgaged my property. This signature is not mine..."
              className="bg-[#0f1419] border-red-500/20 text-white min-h-[120px]"
              required
            />
          </div>

          <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-sm text-cyan-300">
              <strong>📞 Immediate Actions:</strong>
            </p>
            <ul className="text-sm text-gray-300 mt-2 space-y-1">
              <li>• Contact NYC Dept of Finance: (212) 639-9675</li>
              <li>• File a police report for identity theft</li>
              <li>• Consult a real estate attorney</li>
              <li>• Request title insurance claim if applicable</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-500/20 text-gray-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={reportFraudMutation.isPending || !details}
              className="bg-red-500 hover:bg-red-600"
            >
              {reportFraudMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 mr-2" />
                  Submit Fraud Report
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}