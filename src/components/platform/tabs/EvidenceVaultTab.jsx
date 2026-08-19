import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Search, Trash2, FileText, Image as ImageIcon, Loader2, Tag, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import EmptyState from "@/components/platform/EmptyState";
import { PROCESSING_STATUS_STYLES, formatBytes } from "@/components/platform/investigationStyles";
import { logAuditEvent } from "@/lib/auditLogger";
import { toast } from "sonner";

const EVIDENCE_TYPES = ["document", "screenshot", "transaction", "communication", "video", "audio", "blockchain", "image", "archive", "other"];

function typeIcon(type) {
  return type === "image" || type === "screenshot" ? ImageIcon : FileText;
}

export default function EvidenceVaultTab({ caseId }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const qc = useQueryClient();

  const { data: evidence = [], isLoading } = useQuery({
    queryKey: ["evidence", caseId],
    queryFn: () => base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });

  const filtered = evidence.filter((e) => {
    if (typeFilter !== "all" && e.evidence_type !== typeFilter) return false;
    if (statusFilter !== "all" && e.processing_status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [e.filename, e.description, ...(e.tags || [])].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const handleDelete = async (item) => {
    if (!confirm(`Delete evidence "${item.filename}"? This cannot be undone.`)) return;
    try {
      await base44.entities.EvidenceItem.delete(item.id);
      await logAuditEvent({ action: "evidence_deleted", objectType: "evidence", objectId: item.id, caseId, description: `Deleted evidence: ${item.filename}` });
      qc.invalidateQueries({ queryKey: ["evidence", caseId] });
      toast.success("Evidence deleted");
    } catch (e) {
      toast.error("Failed to delete: " + (e.message || e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search evidence by name, description, or tags…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#0f1419] border-white/10 text-white" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem>{EVIDENCE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{Object.keys(PROCESSING_STATUS_STYLES).map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 shrink-0" onClick={() => setShowUpload(true)}><Upload className="w-4 h-4 mr-1.5" />Upload</Button>
      </div>

      {isLoading ? (
        <EmptyState variant="loading" title="Loading evidence…" />
      ) : filtered.length === 0 ? (
        <EmptyState variant="empty" icon={FileText} title={evidence.length === 0 ? "No evidence uploaded" : "No evidence matches your filters"} description={evidence.length === 0 ? "Upload evidence files to build the case evidence vault." : "Try adjusting your search or filters."} action={evidence.length === 0 ? <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setShowUpload(true)}><Upload className="w-4 h-4 mr-1.5" />Upload Evidence</Button> : null} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => {
            const Icon = typeIcon(item.evidence_type);
            const statusCls = PROCESSING_STATUS_STYLES[item.processing_status] || PROCESSING_STATUS_STYLES.uploaded;
            return (
              <div key={item.id} className="relative rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 transition-colors cursor-pointer group" onClick={() => setDetailItem(item)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                    {item.evidence_type === "image" || item.evidence_type === "screenshot" ? (
                      <img src={item.file_url} alt={item.filename} className="w-full h-full object-cover rounded-md" />
                    ) : (
                      <Icon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.filename}</p>
                    <p className="text-xs text-gray-500">{formatBytes(item.file_size)} • {item.mime_type || item.evidence_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className={`text-[10px] ${statusCls}`}>{(item.processing_status || "uploaded").replace(/_/g, " ")}</Badge>
                  {item.tags?.slice(0, 2).map((t) => <Badge key={t} variant="outline" className="text-[10px] border-white/10 text-gray-500">{t}</Badge>)}
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && <UploadModal caseId={caseId} onClose={() => setShowUpload(false)} onDone={() => { setShowUpload(false); qc.invalidateQueries({ queryKey: ["evidence", caseId] }); }} />}
      {detailItem && <EvidenceDetail item={detailItem} onClose={() => setDetailItem(null)} onDelete={() => { handleDelete(detailItem); setDetailItem(null); }} qc={qc} caseId={caseId} />}
    </div>
  );
}

function UploadModal({ caseId, onClose, onDone }) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [evidenceType, setEvidenceType] = useState("document");

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const upload = async () => {
    if (files.length === 0) { toast.error("Select at least one file"); return; }
    setUploading(true);
    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.EvidenceItem.create({
          case_id: caseId,
          filename: file.name,
          file_url,
          evidence_type: file.type?.startsWith("image/") ? "image" : evidenceType,
          mime_type: file.type,
          file_size: file.size,
          source: "manual_upload",
          uploaded_at: new Date().toISOString(),
          description,
          tags: tagList,
          processing_status: "uploaded",
          original_import: false,
        });
        await logAuditEvent({ action: "evidence_uploaded", objectType: "evidence", objectId: file_url, caseId, description: `Uploaded evidence: ${file.name}` });
      }
      toast.success(`${files.length} file(s) uploaded`);
      onDone();
    } catch (e) {
      toast.error("Upload failed: " + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0f1419] border-white/15 text-white max-w-lg">
        <DialogHeader><DialogTitle className="text-white">Upload Evidence</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block rounded-lg border-2 border-dashed border-white/15 hover:border-cyan-500/40 p-8 text-center cursor-pointer transition-colors">
            <input type="file" multiple className="hidden" onChange={handleFiles} />
            <Upload className="w-6 h-6 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Click to select files</p>
            <p className="text-xs text-gray-500 mt-1">PDF, DOC, TXT, CSV, JSON, images, videos</p>
          </label>
          {files.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-auto">
              {files.map((f, i) => <div key={i} className="flex items-center gap-2 text-xs text-gray-300"><FileText className="w-3 h-3" />{f.name} ({formatBytes(f.size)})</div>)}
            </div>
          )}
          <div><Select value={evidenceType} onValueChange={setEvidenceType}><SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{EVIDENCE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
          <div><Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
          <div><Input placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} className="border-white/15 text-gray-200">Cancel</Button>
          <Button onClick={upload} disabled={uploading} className="bg-cyan-600 hover:bg-cyan-700">{uploading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Uploading…</> : "Upload"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceDetail({ item, onClose, onDelete, qc, caseId }) {
  const [newTag, setNewTag] = useState("");

  const addTag = async () => {
    if (!newTag.trim()) return;
    const tags = [...(item.tags || []), newTag.trim()];
    try {
      await base44.entities.EvidenceItem.update(item.id, { tags });
      await logAuditEvent({ action: "evidence_modified", objectType: "evidence", objectId: item.id, caseId, description: `Added tag "${newTag.trim()}" to ${item.filename}` });
      qc.invalidateQueries({ queryKey: ["evidence", caseId] });
      item.tags = tags;
      setNewTag("");
    } catch (e) { toast.error("Failed to add tag"); }
  };

  const removeTag = async (tag) => {
    const tags = (item.tags || []).filter((t) => t !== tag);
    try {
      await base44.entities.EvidenceItem.update(item.id, { tags });
      qc.invalidateQueries({ queryKey: ["evidence", caseId] });
      item.tags = tags;
    } catch (e) { toast.error("Failed to remove tag"); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0f1419] border-white/15 text-white max-w-2xl">
        <DialogHeader><DialogTitle className="text-white">{item.filename}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {(item.evidence_type === "image" || item.evidence_type === "screenshot") && (
            <img src={item.file_url} alt={item.filename} className="w-full max-h-64 object-contain rounded-lg border border-white/10" />
          )}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Type" value={item.evidence_type} />
            <Field label="MIME" value={item.mime_type} />
            <Field label="Size" value={formatBytes(item.file_size)} />
            <Field label="Source" value={item.source?.replace(/_/g, " ")} />
            <Field label="Uploaded by" value={item.uploaded_by_name || item.uploaded_by} />
            <Field label="Uploaded at" value={item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "—"} />
            <Field label="Processing" value={item.processing_status?.replace(/_/g, " ")} />
            <Field label="Hash" value={item.file_hash || "—"} mono />
          </div>
          {item.description && <p className="text-sm text-gray-300">{item.description}</p>}
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {(item.tags || []).map((t) => (
                <Badge key={t} variant="outline" className="border-cyan-500/30 text-cyan-400 gap-1">{t}<button onClick={() => removeTag(t)}><X className="w-3 h-3" /></button></Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Add tag…" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} className="bg-[#0a0f1a] border-white/10 text-white h-8 text-xs" />
              <Button size="sm" variant="outline" onClick={addTag} className="border-white/15 text-gray-200 h-8"><Tag className="w-3 h-3 mr-1" />Add</Button>
            </div>
          </div>
          {(item.detected_targets?.length > 0) && (
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-1.5">Detected Targets</p>
              <div className="space-y-1">{item.detected_targets.map((t, i) => <div key={i} className="text-xs text-gray-300 font-mono bg-black/30 rounded px-2 py-1">{t.type}: {t.value}</div>)}</div>
            </div>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <a href={item.file_url} download target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm" className="border-white/15 text-gray-200"><Download className="w-4 h-4 mr-1.5" />Download</Button></a>
          <Button variant="outline" size="sm" onClick={onDelete} className="border-red-500/30 text-red-400"><Trash2 className="w-4 h-4 mr-1.5" />Delete</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <p className="text-gray-600 uppercase tracking-wider text-[10px]">{label}</p>
      <p className={`text-gray-200 ${mono ? "font-mono" : ""}`}>{value || "—"}</p>
    </div>
  );
}