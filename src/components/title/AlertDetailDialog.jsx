import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, FileText, Calendar, User, DollarSign,
  ExternalLink, MapPin, CheckCircle, XCircle, Eye
} from "lucide-react";
import { format } from "date-fns";

export default function AlertDetailDialog({ alert, onClose, onUpdate }) {
  const [notes, setNotes] = useState(alert.user_notes || '');

  const handleSaveNotes = () => {
    onUpdate({ user_notes: notes });
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <Dialog open={!!alert} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            Alert Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Badges */}
          <div className="flex gap-2">
            <Badge className={`${getSeverityColor(alert.severity)} border`}>
              {alert.severity} severity
            </Badge>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 border">
              {alert.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Property Info */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-bold">Property Address</h3>
            </div>
            <p className="text-gray-300">{alert.property_address}</p>
          </div>

          {/* Filing Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-semibold">Filing Type</h4>
              </div>
              <p className="text-gray-300">{alert.filing_type}</p>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-semibold">Filing Date</h4>
              </div>
              <p className="text-gray-300">{format(new Date(alert.filing_date), 'MMM dd, yyyy')}</p>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-orange-400" />
                <h4 className="text-white font-semibold">Filing Party</h4>
              </div>
              <p className="text-gray-300">{alert.filing_party}</p>
            </div>

            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                <h4 className="text-white font-semibold">Document ID</h4>
              </div>
              <p className="text-gray-300 font-mono text-sm">{alert.document_id}</p>
            </div>
          </div>

          {alert.document_amount && (
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <h4 className="text-white font-semibold">Document Amount</h4>
              </div>
              <p className="text-gray-300 text-lg font-bold">{alert.document_amount}</p>
            </div>
          )}

          {/* Full Document Data */}
          {alert.full_document_data && (
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
              <h4 className="text-white font-semibold mb-2">Full ACRIS Data</h4>
              <pre className="text-xs text-gray-400 overflow-x-auto">
                {JSON.stringify(alert.full_document_data, null, 2)}
              </pre>
            </div>
          )}

          {/* User Notes */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold">Your Notes</h4>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this alert..."
              className="bg-[#0f1419] border-cyan-500/20 text-white min-h-[100px]"
            />
            <Button
              onClick={handleSaveNotes}
              size="sm"
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              Save Notes
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {alert.acris_url && (
              <Button
                onClick={() => window.open(alert.acris_url, '_blank')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on ACRIS
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-500/20 text-gray-400"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}