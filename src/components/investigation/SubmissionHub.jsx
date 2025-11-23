import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Plus, CheckCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function SubmissionHub({ submissions, cases }) {
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    case_id: "",
    agency: "FBI",
    submission_method: "online_portal",
    confirmation_number: "",
    notes: ""
  });
  const queryClient = useQueryClient();

  const createSubmissionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.AgencySubmission.create({
        ...data,
        submission_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-submissions'] });
      toast.success("Submission recorded!");
      setShowDialog(false);
      resetForm();
    }
  });

  const resetForm = () => {
    setFormData({
      case_id: "",
      agency: "FBI",
      submission_method: "online_portal",
      confirmation_number: "",
      notes: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.case_id) {
      toast.error("Please select a case");
      return;
    }
    createSubmissionMutation.mutate(formData);
  };

  const agencyLinks = {
    FBI: "https://www.fbi.gov/contact-us/field-offices",
    IC3: "https://www.ic3.gov/Home/FileComplaint",
    FTC: "https://reportfraud.ftc.gov/#/",
    HSI: "https://www.ice.gov/webform/hsi-tip-form",
    Secret_Service: "https://www.secretservice.gov/investigations",
    State_AG: "https://www.naag.org/find-my-ag/",
    Local_PD: ""
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      received: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      under_review: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      investigating: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
      closed: "bg-gray-500/20 text-gray-400 border-gray-500/50",
      no_action: "bg-red-500/20 text-red-400 border-red-500/50"
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    if (status === 'pending') return Clock;
    if (status === 'investigating' || status === 'under_review') return AlertCircle;
    return CheckCircle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Agency Submissions Tracker</h3>
          <p className="text-sm text-gray-400 mt-1">Track and manage all agency submissions</p>
        </div>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Record Submission
        </Button>
      </div>

      {/* Quick Links */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Quick Submit Links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(agencyLinks).map(([agency, url]) => (
            url && (
              <Button
                key={agency}
                variant="outline"
                size="sm"
                className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 justify-between"
                onClick={() => window.open(url, '_blank')}
              >
                <span>{agency.replace('_', ' ')}</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
            )
          ))}
        </CardContent>
      </Card>

      {/* Submissions List */}
      <div className="grid gap-4">
        {submissions.length === 0 ? (
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-12 text-center">
              <Send className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No submissions recorded yet</p>
              <Button
                onClick={() => setShowDialog(true)}
                className="mt-4 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
              >
                Record First Submission
              </Button>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => {
            const caseData = cases.find(c => c.id === submission.case_id);
            const StatusIcon = getStatusIcon(submission.status);

            return (
              <Card
                key={submission.id}
                className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                          {submission.agency.replace('_', ' ')}
                        </Badge>
                        <Badge className={getStatusColor(submission.status)}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {submission.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <h3 className="text-white font-semibold">
                        {caseData?.case_title || 'Unknown Case'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Case: {caseData?.case_number || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 text-xs">Submitted</p>
                      <p className="text-white">
                        {new Date(submission.submission_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 text-xs">Method</p>
                      <p className="text-white capitalize">
                        {submission.submission_method.replace('_', ' ')}
                      </p>
                    </div>
                    
                    {submission.confirmation_number && (
                      <div>
                        <p className="text-gray-400 text-xs">Confirmation #</p>
                        <p className="text-cyan-400 font-mono text-xs">
                          {submission.confirmation_number}
                        </p>
                      </div>
                    )}
                    
                    {submission.agency_case_number && (
                      <div>
                        <p className="text-gray-400 text-xs">Agency Case #</p>
                        <p className="text-green-400 font-mono text-xs">
                          {submission.agency_case_number}
                        </p>
                      </div>
                    )}
                  </div>

                  {submission.notes && (
                    <div className="mt-4 p-3 bg-[#0f1419] rounded border border-cyan-500/10">
                      <p className="text-xs text-gray-400 mb-1">Notes:</p>
                      <p className="text-sm text-white">{submission.notes}</p>
                    </div>
                  )}

                  {submission.response_received && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                      <p className="text-xs text-green-400 mb-1">
                        Agency Response Received - {new Date(submission.response_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-white">{submission.response_details}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create Submission Dialog */}
      {showDialog && (
        <Dialog open onOpenChange={setShowDialog}>
          <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-white">Record Agency Submission</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label className="text-white">Case *</Label>
                <Select value={formData.case_id} onValueChange={(val) => setFormData({...formData, case_id: val})}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                    <SelectValue placeholder="Select case..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.case_number} - {c.case_title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Agency *</Label>
                  <Select value={formData.agency} onValueChange={(val) => setFormData({...formData, agency: val})}>
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                      <SelectItem value="FBI">FBI</SelectItem>
                      <SelectItem value="IC3">IC3</SelectItem>
                      <SelectItem value="FTC">FTC</SelectItem>
                      <SelectItem value="HSI">HSI</SelectItem>
                      <SelectItem value="Secret_Service">Secret Service</SelectItem>
                      <SelectItem value="State_AG">State AG</SelectItem>
                      <SelectItem value="Local_PD">Local PD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Submission Method</Label>
                  <Select value={formData.submission_method} onValueChange={(val) => setFormData({...formData, submission_method: val})}>
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                      <SelectItem value="online_portal">Online Portal</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="fax">Fax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-white">Confirmation Number</Label>
                <Input
                  value={formData.confirmation_number}
                  onChange={(e) => setFormData({...formData, confirmation_number: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                  placeholder="IC3-XXXX or agency reference number"
                />
              </div>

              <div>
                <Label className="text-white">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/20 text-white mt-2 h-24"
                  placeholder="Additional submission details..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-cyan-500/20">
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubmissionMutation.isPending} className="bg-gradient-to-r from-cyan-500 to-blue-600">
                  <Send className="w-4 h-4 mr-2" />
                  {createSubmissionMutation.isPending ? 'Recording...' : 'Record Submission'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}