import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

const NY_BOROUGHS = [
  "Bronx", "Brooklyn (Kings County)", "Manhattan (New York County)",
  "Queens", "Staten Island (Richmond County)", "Albany County",
  "Erie County", "Nassau County", "Suffolk County",
  "Westchester County", "Other NY County"
];

const ISSUE_TYPES = [
  { value: "unauthorized_deed_transfer", label: "Unauthorized Deed Transfer" },
  { value: "suspicious_ownership_change", label: "Suspicious Ownership Change" },
  { value: "forged_documents", label: "Forged Documents" },
  { value: "other", label: "Other (describe below)" }
];

export default function EditDeedCaseModal({ caseData, open, onClose }) {
  const queryClient = useQueryClient();
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const [form, setForm] = useState({
    submitter_name: caseData.submitter_name || "",
    submitter_email: caseData.submitter_email || "",
    submitter_phone: caseData.submitter_phone || "",
    property_address: caseData.property_address || "",
    property_city: caseData.property_city || "",
    property_zip: caseData.property_zip || "",
    borough_county: caseData.borough_county || "",
    issue_type: caseData.issue_type || "",
    issue_type_other: caseData.issue_type_other || "",
    description: caseData.description || "",
    date_noticed: caseData.date_noticed || "",
    documents: caseData.documents || [],
  });

  const updateMutation = useMutation({
    mutationFn: () => base44.entities.DeedFraudCase.update(caseData.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deed-fraud-cases"] });
      toast.success("Case updated successfully!");
      onClose();
    },
    onError: (err) => toast.error("Update failed: " + err.message)
  });

  const handleDocUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingDocs(true);
    const uploaded = [];
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ name: file.name, url: file_url, type: file.type, uploaded_at: new Date().toISOString() });
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
    setForm(f => ({ ...f, documents: [...f.documents, ...uploaded] }));
    setUploadingDocs(false);
    toast.success(`${uploaded.length} document(s) uploaded`);
  };

  const removeDoc = (idx) => {
    setForm(f => ({ ...f, documents: f.documents.filter((_, i) => i !== idx) }));
  };

  // Only allow edits if status is New or Under Review
  const isEditable = ["New", "Under Review"].includes(caseData.status);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Edit Case — <span className="font-mono text-cyan-400">{caseData.case_id}</span>
          </DialogTitle>
          {!isEditable && (
            <p className="text-yellow-400 text-xs mt-1">⚠️ This case is <strong>{caseData.status}</strong> — editing is limited to documents only.</p>
          )}
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Personal Info */}
          {isEditable && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 text-sm">Full Name</Label>
                  <Input value={form.submitter_name} onChange={e => setForm(f => ({ ...f, submitter_name: e.target.value }))}
                    className="bg-[#0f1419] border-gray-600 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Phone</Label>
                  <Input value={form.submitter_phone} onChange={e => setForm(f => ({ ...f, submitter_phone: e.target.value }))}
                    className="bg-[#0f1419] border-gray-600 text-white mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* Property */}
          {isEditable && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Property Details</h3>
              <div>
                <Label className="text-gray-300 text-sm">Property Address</Label>
                <Input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))}
                  className="bg-[#0f1419] border-gray-600 text-white mt-1" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-gray-300 text-sm">City</Label>
                  <Input value={form.property_city} onChange={e => setForm(f => ({ ...f, property_city: e.target.value }))}
                    className="bg-[#0f1419] border-gray-600 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">ZIP</Label>
                  <Input value={form.property_zip} onChange={e => setForm(f => ({ ...f, property_zip: e.target.value }))}
                    className="bg-[#0f1419] border-gray-600 text-white mt-1" />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm">Borough / County</Label>
                  <Select value={form.borough_county} onValueChange={v => setForm(f => ({ ...f, borough_county: v }))}>
                    <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white mt-1">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                      {NY_BOROUGHS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Issue */}
          {isEditable && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Issue Details</h3>
              <div>
                <Label className="text-gray-300 text-sm">Issue Type</Label>
                <Select value={form.issue_type} onValueChange={v => setForm(f => ({ ...f, issue_type: v }))}>
                  <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                    {ISSUE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.issue_type === "other" && (
                <div>
                  <Label className="text-gray-300 text-sm">Describe Issue Type</Label>
                  <Input value={form.issue_type_other} onChange={e => setForm(f => ({ ...f, issue_type_other: e.target.value }))}
                    className="bg-[#0f1419] border-gray-600 text-white mt-1" />
                </div>
              )}
              <div>
                <Label className="text-gray-300 text-sm">Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="bg-[#0f1419] border-gray-600 text-white mt-1 h-28" />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Date Noticed</Label>
                <Input type="date" value={form.date_noticed} onChange={e => setForm(f => ({ ...f, date_noticed: e.target.value }))}
                  className="bg-[#0f1419] border-gray-600 text-white mt-1" />
              </div>
            </div>
          )}

          {/* Documents — always available */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Supporting Documents</h3>
            <div className="border-2 border-dashed border-gray-600 hover:border-cyan-500/50 rounded-lg p-6 text-center transition-colors">
              <input id="edit-doc-upload" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={handleDocUpload} disabled={uploadingDocs} />
              <label htmlFor="edit-doc-upload" className="cursor-pointer flex flex-col items-center gap-2">
                {uploadingDocs ? <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" /> : <Upload className="w-8 h-8 text-gray-400" />}
                <span className="text-gray-400 text-sm">{uploadingDocs ? "Uploading..." : "Click to upload additional documents"}</span>
                <span className="text-xs text-gray-600">PDF, JPG, PNG, DOC accepted</span>
              </label>
            </div>

            {form.documents.length > 0 ? (
              <div className="space-y-2">
                {form.documents.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 p-2.5 bg-[#0f1419] rounded border border-gray-700">
                    <FileText className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-white flex-1 truncate hover:text-cyan-400 transition-colors">
                      {doc.name}
                    </a>
                    {doc.uploaded_at && (
                      <span className="text-xs text-gray-600 hidden sm:block">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => removeDoc(i)}
                      className="text-red-400 hover:text-red-300 h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-sm text-center py-2">No documents uploaded yet.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-700">
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700 min-w-[120px]">
              {updateMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}