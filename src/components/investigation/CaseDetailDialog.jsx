import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  X, FileText, Clock, User, DollarSign, Shield, Upload, Plus, 
  MessageSquare, ExternalLink, Calendar, AlertCircle, Database, Building2
} from "lucide-react";
import InvestigationNotes from "./InvestigationNotes.jsx";
import RecommendedAgencies from "./RecommendedAgencies.jsx";
import { toast } from "sonner";

export default function CaseDetailDialog({ caseData, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const updateCaseMutation = useMutation({
    mutationFn: async (updates) => {
      return await base44.entities.InvestigationCase.update(caseData.id, updates);
    },
    onSuccess: () => {
      onUpdate();
      toast.success("Case updated");
    }
  });

  const addNote = async () => {
    if (!newNote.trim()) return;

    const notes = caseData.case_notes || [];
    notes.push({
      timestamp: new Date().toISOString(),
      author: "investigator",
      note: newNote,
      type: "manual"
    });

    await updateCaseMutation.mutateAsync({ case_notes: notes, last_activity: new Date().toISOString() });
    setNewNote("");
  };

  const updateStatus = async (status) => {
    await updateCaseMutation.mutateAsync({ status, last_activity: new Date().toISOString() });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      const evidence = caseData.evidence_files || [];
      evidence.push({
        name: file.name,
        url: data.file_url,
        type: file.type,
        uploaded_date: new Date().toISOString()
      });

      await updateCaseMutation.mutateAsync({ evidence_files: evidence });
      toast.success("Evidence uploaded");
    } catch (error) {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {caseData.case_title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono">
                  {caseData.case_number}
                </Badge>
                <Badge className={`${
                  caseData.priority === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                  caseData.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                  caseData.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                  'bg-gray-500/20 text-gray-400 border-gray-500/50'
                }`}>
                  {caseData.priority}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <select
              value={caseData.status}
              onChange={(e) => updateStatus(e.target.value)}
              className="px-4 py-2 bg-[#0f1419] border border-cyan-500/30 rounded-lg text-white text-sm font-medium"
              style={{ color: '#ffffff' }}
            >
              <option value="new" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>New</option>
              <option value="investigating" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>Investigating</option>
              <option value="documented" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>Documented</option>
              <option value="submitted" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>Submitted</option>
              <option value="law_enforcement" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>Law Enforcement</option>
              <option value="recovering" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>Recovering</option>
              <option value="recovered" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>Recovered</option>
              <option value="closed" style={{ backgroundColor: '#0f1419', color: '#ffffff' }}>Closed</option>
            </select>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#0f1419] border border-cyan-500/30 flex-wrap h-auto">
              <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-gray-300 font-medium">Overview</TabsTrigger>
              <TabsTrigger value="agencies" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-gray-300 font-medium">Agencies</TabsTrigger>
              <TabsTrigger value="evidence" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-gray-300 font-medium">Evidence</TabsTrigger>
              <TabsTrigger value="timeline" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-gray-300 font-medium">Timeline</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-gray-300 font-medium">Notes</TabsTrigger>
              <TabsTrigger value="tracking" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-gray-300 font-medium">Tracking</TabsTrigger>
              <TabsTrigger value="transactions" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300 text-gray-300 font-medium">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="agencies" className="space-y-4">
              <RecommendedAgencies caseData={caseData} />
            </TabsContent>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-300 font-medium">Victim</p>
                  </div>
                  <p className="text-white font-semibold text-base">{caseData.victim_name}</p>
                  {caseData.victim_email && (
                    <p className="text-xs text-gray-300 mt-1">{caseData.victim_email}</p>
                  )}
                  {caseData.victim_phone && (
                    <p className="text-xs text-gray-300">{caseData.victim_phone}</p>
                  )}
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <p className="text-xs text-gray-300 font-medium">Report Created By</p>
                  </div>
                  <p className="text-white font-semibold text-base">{caseData.created_by_name || 'N/A'}</p>
                  <p className="text-xs text-gray-400 mt-1">{caseData.created_by_email || caseData.created_by || 'N/A'}</p>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-300 font-medium">Amount Stolen</p>
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    ${caseData.amount_stolen_usd?.toLocaleString() || 0}
                  </p>
                  {caseData.cryptocurrency && (
                    <p className="text-xs text-gray-300 mt-1 font-medium">{caseData.cryptocurrency}</p>
                  )}
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-300 font-medium">Incident Date</p>
                  </div>
                  <p className="text-white font-semibold text-base">
                    {caseData.incident_date ? new Date(caseData.incident_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {caseData.description && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <p className="text-xs text-gray-300 mb-2 font-medium">Case Description</p>
                  <p className="text-white text-sm leading-relaxed">{caseData.description}</p>
                </div>
              )}

              {(caseData.ic3_complaint_number || caseData.federal_case_number) && (
                <div className="grid grid-cols-2 gap-4">
                  {caseData.ic3_complaint_number && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 mb-2">IC3</Badge>
                      <p className="text-white font-mono">{caseData.ic3_complaint_number}</p>
                    </div>
                  )}
                  {caseData.federal_case_number && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mb-2">Federal</Badge>
                      <p className="text-white font-mono">{caseData.federal_case_number}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="evidence" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg">Evidence Files</h3>
                <label>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  <Button size="sm" disabled={uploading} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </label>
              </div>

              {caseData.evidence_files && caseData.evidence_files.length > 0 ? (
                <div className="grid gap-2">
                  {caseData.evidence_files.map((file, idx) => (
                    <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20 flex items-center justify-between hover:border-cyan-500/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="text-white text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-gray-300">
                            {new Date(file.uploaded_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => window.open(file.url, '_blank')}>
                        <ExternalLink className="w-4 h-4 text-cyan-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No evidence uploaded yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <h3 className="text-white font-semibold text-lg">Case Timeline</h3>
              {caseData.timeline && caseData.timeline.length > 0 ? (
                <div className="space-y-3">
                  {caseData.timeline.map((event, idx) => (
                    <div key={idx} className="p-4 bg-[#0f1419] rounded-lg border-l-4 border-cyan-500 border border-cyan-500/20">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-white font-semibold text-base">{event.event}</p>
                        <p className="text-xs text-gray-300 font-medium">
                          {new Date(event.date).toLocaleString()}
                        </p>
                      </div>
                      {event.details && <p className="text-sm text-gray-300 leading-relaxed">{event.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <Clock className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No timeline events recorded</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <InvestigationNotes caseId={caseData.id} caseData={caseData} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              <h3 className="text-white font-semibold text-lg">Wallet Tracking</h3>
              {caseData.monitored_wallets && caseData.monitored_wallets.length > 0 ? (
                <div className="space-y-2">
                  {caseData.monitored_wallets.map((wallet, idx) => (
                    <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                      <p className="text-white font-mono text-sm">{wallet}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <Shield className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No wallets being monitored</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <Database className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-4">Transaction logging available in main Transactions tab</p>
                <p className="text-xs text-gray-500">Go to Investigation Hub → Transactions to log and view all case transactions</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}