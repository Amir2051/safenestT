import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  X, Globe, Phone, Mail, MapPin, ExternalLink, 
  FileText, Send, Copy, CheckCircle
} from "lucide-react";
import { toast } from "sonner";

export default function AgencyDetailDialog({ agency, onClose, caseData }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryColor = (category) => {
    const colors = {
      federal: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      state: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      local: 'bg-green-500/20 text-green-400 border-green-500/50',
      international: 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    };
    return colors[category] || 'bg-gray-500/20 text-gray-400 border-gray-500/50';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/30 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {agency.agency_name}
              </DialogTitle>
              <Badge className={getCategoryColor(agency.category)}>
                {agency.category}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Contact Information */}
          <Card className="bg-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
              
              {agency.website && (
                <div className="flex items-center justify-between p-3 bg-[#1a2332] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Website</p>
                      <p className="text-white font-medium">{agency.website}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(agency.website, 'Website')}
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(agency.website, '_blank')}
                      className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {agency.submission_portal && (
                <div className="flex items-center justify-between p-3 bg-[#1a2332] rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Submission Portal</p>
                      <p className="text-white font-medium">Online Reporting</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => window.open(agency.submission_portal, '_blank')}
                    className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </Button>
                </div>
              )}

              {agency.phone && (
                <div className="flex items-center justify-between p-3 bg-[#1a2332] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-white font-medium">{agency.phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(agency.phone, 'Phone')}
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.location.href = `tel:${agency.phone}`}
                      className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      Call
                    </Button>
                  </div>
                </div>
              )}

              {agency.email && (
                <div className="flex items-center justify-between p-3 bg-[#1a2332] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-white font-medium">{agency.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(agency.email, 'Email')}
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.location.href = `mailto:${agency.email}`}
                      className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      Email
                    </Button>
                  </div>
                </div>
              )}

              {agency.address && (
                <div className="flex items-start gap-3 p-3 bg-[#1a2332] rounded-lg">
                  <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1">Address</p>
                    <p className="text-white">{agency.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Case Types */}
          {agency.related_case_types && agency.related_case_types.length > 0 && (
            <Card className="bg-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Handles These Case Types</h3>
                <div className="flex flex-wrap gap-2">
                  {agency.related_case_types.map((type, idx) => (
                    <Badge key={idx} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                      {type}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes & Requirements */}
          {agency.notes && (
            <Card className="bg-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Important Information</h3>
                <p className="text-gray-300 leading-relaxed whitespace-pre-line">{agency.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Case Attachment Option */}
          {caseData && (
            <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-3">Report Case to {agency.agency_name}</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Case: <span className="font-semibold">{caseData.case_number} - {caseData.case_title}</span>
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50"
                    onClick={() => {
                      // This would trigger export/submission logic
                      toast.success(`Preparing case report for ${agency.agency_name}`);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export Case Report
                  </Button>
                  {agency.submission_portal && (
                    <Button 
                      className="flex-1 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/50"
                      onClick={() => window.open(agency.submission_portal, '_blank')}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Go to Portal
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}