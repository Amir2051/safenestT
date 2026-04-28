import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Home, Search, Eye, FileText, Download, CheckCircle,
  Clock, AlertTriangle, Loader2, User, Mail, Phone, MapPin
} from "lucide-react";
import EvidenceFilesPanel from "@/components/cases/EvidenceFilesPanel";
import { toast } from "sonner";

const STATUS_OPTIONS = ["New", "Under Review", "Filed", "Filed with NYS", "Closed"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

const statusColors = {
  New: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
  "Under Review": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  Filed: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  "Filed with NYS": "bg-purple-500/20 text-purple-400 border-purple-500/50",
  Closed: "bg-gray-500/20 text-gray-400 border-gray-500/50"
};

const priorityColors = {
  Low: "bg-gray-500/20 text-gray-400",
  Medium: "bg-yellow-500/20 text-yellow-400",
  High: "bg-orange-500/20 text-orange-400",
  Urgent: "bg-red-500/20 text-red-400"
};

const ISSUE_LABELS = {
  unauthorized_deed_transfer: "Unauthorized Deed Transfer",
  suspicious_ownership_change: "Suspicious Ownership Change",
  forged_documents: "Forged Documents",
  other: "Other"
};

export default function AdminDeedFraud() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countyFilter, setCountyFilter] = useState("all");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [nysRef, setNysRef] = useState("");
  const queryClient = useQueryClient();

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["admin-deed-fraud"],
    queryFn: () => base44.entities.DeedFraudCase.list("-created_date", 1000)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeedFraudCase.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-deed-fraud"] });
      setSelectedCase(updated);
      toast.success("Case updated successfully");
    },
    onError: (err) => toast.error("Update failed: " + err.message)
  });

  const openCase = (c) => {
    setSelectedCase(c);
    setEditNotes(c.admin_notes || "");
    setEditStatus(c.status || "New");
    setEditPriority(c.priority || "Medium");
    setNysRef(c.nys_filing_reference || "");
  };

  const handleSave = () => {
    updateMutation.mutate({
      id: selectedCase.id,
      data: {
        admin_notes: editNotes,
        status: editStatus,
        priority: editPriority,
        nys_filing_reference: nysRef
      }
    });
  };

  const exportCase = (c) => {
    const data = JSON.stringify(c.nys_structured_data || c, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deed-fraud-case-${c.case_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Case exported as JSON");
  };

  const filtered = cases.filter(c => {
    const matchSearch = !search ||
      c.case_id?.toLowerCase().includes(search.toLowerCase()) ||
      c.submitter_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.property_address?.toLowerCase().includes(search.toLowerCase()) ||
      c.submitter_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchCounty = countyFilter === "all" || c.borough_county === countyFilter;
    return matchSearch && matchStatus && matchCounty;
  });

  const stats = {
    total: cases.length,
    newCases: cases.filter(c => c.status === "New").length,
    underReview: cases.filter(c => c.status === "Under Review").length,
    filed: cases.filter(c => c.status === "Filed" || c.status === "Filed with NYS").length
  };

  const uniqueCounties = [...new Set(cases.map(c => c.borough_county).filter(Boolean))];

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-red-500/20 rounded-xl flex items-center justify-center border border-purple-500/30">
          <Home className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Deed Fraud Case Management</h1>
          <p className="text-gray-400 text-sm">Admin panel — NY State deed fraud reporting & case management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Cases", value: stats.total, color: "text-cyan-400", iconEl: <FileText className="w-8 h-8 text-cyan-400" /> },
          { label: "New", value: stats.newCases, color: "text-yellow-400", iconEl: <Clock className="w-8 h-8 text-yellow-400" /> },
          { label: "Under Review", value: stats.underReview, color: "text-blue-400", iconEl: <Eye className="w-8 h-8 text-blue-400" /> },
          { label: "Filed", value: stats.filed, color: "text-green-400", iconEl: <CheckCircle className="w-8 h-8 text-green-400" /> }
        ].map(({ label, value, color, iconEl }) => (
          <Card key={label} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              {iconEl}
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, case ID, address..."
                className="pl-10 bg-[#0f1419] border-gray-600 text-white" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white w-full lg:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={countyFilter} onValueChange={setCountyFilter}>
              <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white w-full lg:w-[200px]">
                <SelectValue placeholder="All Counties" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                <SelectItem value="all">All Counties</SelectItem>
                {uniqueCounties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Cases ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No deed fraud cases found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(c => (
                <div key={c.id} className="p-4 bg-[#0f1419] rounded-lg border border-gray-700 hover:border-cyan-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-mono text-cyan-400 font-bold text-sm">{c.case_id}</span>
                        <Badge className={`${statusColors[c.status] || ""} border text-xs`}>{c.status}</Badge>
                        <Badge className={`${priorityColors[c.priority] || ""} text-xs`}>{c.priority}</Badge>
                      </div>
                      <p className="text-white font-medium">{c.submitter_name}</p>
                      <p className="text-gray-400 text-sm flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {c.property_address}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>{c.borough_county}</span>
                        <span>{ISSUE_LABELS[c.issue_type] || c.issue_type}</span>
                        <span>{new Date(c.created_date).toLocaleDateString()}</span>
                        {c.documents?.length > 0 && <span>{c.documents.length} doc(s)</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => exportCase(c)}
                        className="border-gray-600 text-gray-400 hover:text-white">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button size="sm" onClick={() => openCase(c)}
                        className="bg-cyan-600 hover:bg-cyan-700">
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Case Detail Dialog */}
      {selectedCase && (
        <Dialog open={!!selectedCase} onOpenChange={(o) => !o && setSelectedCase(null)}>
          <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Home className="w-5 h-5 text-cyan-400" />
                Case {selectedCase.case_id}
                <Badge className={`${statusColors[selectedCase.status] || ""} border ml-auto`}>{selectedCase.status}</Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* Submitter */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700 space-y-2">
                <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Submitter Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="text-white">{selectedCase.submitter_name}</span></div>
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span className="text-white">{selectedCase.submitter_email}</span></div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span className="text-white">{selectedCase.submitter_phone || "N/A"}</span></div>
                </div>
              </div>

              {/* Property */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700 space-y-2">
                <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Address</p><p className="text-white">{selectedCase.property_address}</p></div>
                  <div><p className="text-gray-500">Borough/County</p><p className="text-white">{selectedCase.borough_county}</p></div>
                  <div><p className="text-gray-500">Issue Type</p><p className="text-white">{ISSUE_LABELS[selectedCase.issue_type] || selectedCase.issue_type}</p></div>
                  <div><p className="text-gray-500">Date Noticed</p><p className="text-white">{selectedCase.date_noticed || "N/A"}</p></div>
                </div>
              </div>

              {/* Description */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide mb-2">Description</h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{selectedCase.description}</p>
              </div>

              {/* Documents / Evidence */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                <h3 className="text-cyan-400 font-semibold text-sm uppercase tracking-wide mb-3">Evidence & Documents</h3>
                <EvidenceFilesPanel
                  caseId={selectedCase.id}
                  deedFraudDocuments={selectedCase.documents || []}
                  allowUpload={true}
                />
              </div>

              {/* Admin Actions */}
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 space-y-4">
                <h3 className="text-purple-400 font-semibold text-sm uppercase tracking-wide">Admin Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-gray-300 text-xs">Update Status</Label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                        {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">Priority</Label>
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                        {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 text-xs">NYS Filing Reference</Label>
                    <Input value={nysRef} onChange={e => setNysRef(e.target.value)}
                      className="bg-[#0f1419] border-gray-600 text-white mt-1" placeholder="NYS-2026-XXXXX" />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300 text-xs">Internal Notes</Label>
                  <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                    className="bg-[#0f1419] border-gray-600 text-white mt-1 h-24"
                    placeholder="Add internal case notes..." />
                </div>
              </div>
            </div>

            <DialogFooter className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => exportCase(selectedCase)}
                className="border-gray-600 text-gray-400 hover:text-white">
                <Download className="w-4 h-4 mr-2" /> Export JSON
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}
                className="bg-cyan-600 hover:bg-cyan-700">
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}