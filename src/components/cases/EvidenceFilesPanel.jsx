import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Eye, Download, RefreshCw, Upload, Loader2, AlertTriangle, File } from "lucide-react";
import { toast } from "sonner";

/**
 * EvidenceFilesPanel
 * 
 * Fetches ALL evidence for a case from CaseEvidenceFile entity (source of truth)
 * AND merges with any legacy evidence_files array on the case record itself.
 * 
 * Props:
 *  - caseId: string (required)
 *  - legacyFiles: array of {name, url, type, uploaded_date} (optional, from case record)
 *  - deedFraudDocuments: array of {name, url, type, uploaded_at} (optional, from DeedFraudCase.documents)
 *  - allowUpload: bool (default false)
 *  - onUploadComplete: callback
 *  - compact: bool (default false)
 */
export default function EvidenceFilesPanel({
  caseId,
  legacyFiles = [],
  deedFraudDocuments = [],
  allowUpload = false,
  onUploadComplete,
  compact = false
}) {
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // Primary source: CaseEvidenceFile entity
  const { data: evidenceRecords = [], isLoading, refetch } = useQuery({
    queryKey: ["evidence-files", caseId],
    queryFn: () => base44.entities.CaseEvidenceFile.filter({ case_id: caseId }, "-uploaded_at", 200),
    enabled: !!caseId,
    staleTime: 0 // Always fresh
  });

  // Merge all sources, deduplicate by URL
  const allFiles = useMemo(() => {
    const seen = new Set();
    const merged = [];

    // 1. CaseEvidenceFile records (highest priority — source of truth)
    for (const r of evidenceRecords) {
      if (r.file_url && !seen.has(r.file_url)) {
        seen.add(r.file_url);
        merged.push({
          name: r.filename || "Unknown file",
          url: r.file_url,
          type: r.mime_type || "",
          date: r.uploaded_at || r.created_date,
          source: "db"
        });
      }
    }

    // 2. DeedFraudCase.documents array
    for (const d of deedFraudDocuments) {
      if (d.url && !seen.has(d.url)) {
        seen.add(d.url);
        merged.push({
          name: d.name || "Document",
          url: d.url,
          type: d.type || "",
          date: d.uploaded_at || d.uploaded_date,
          source: "deed"
        });
      }
    }

    // 3. Legacy evidence_files array on case
    for (const f of legacyFiles) {
      if (f.url && !seen.has(f.url)) {
        seen.add(f.url);
        merged.push({
          name: f.name || "File",
          url: f.url,
          type: f.type || "",
          date: f.uploaded_date,
          source: "legacy"
        });
      }
    }

    return merged;
  }, [evidenceRecords, legacyFiles, deedFraudDocuments]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    let successCount = 0;
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.CaseEvidenceFile.create({
          case_id: caseId,
          file_url,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
          case_owner_email: "",
        });
        successCount++;
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded`);
      queryClient.invalidateQueries({ queryKey: ["evidence-files", caseId] });
      if (onUploadComplete) onUploadComplete();
    }
    setUploading(false);
    e.target.value = "";
  };

  const getFileIcon = (type, name) => {
    const t = (type || name || "").toLowerCase();
    if (t.includes("image") || t.includes("jpg") || t.includes("jpeg") || t.includes("png") || t.includes("gif") || t.includes("webp"))
      return <Image className="w-5 h-5 text-purple-400" />;
    if (t.includes("pdf"))
      return <FileText className="w-5 h-5 text-red-400" />;
    return <File className="w-5 h-5 text-cyan-400" />;
  };

  const isImage = (type, name) => {
    const t = (type || name || "").toLowerCase();
    return t.includes("image") || t.includes("jpg") || t.includes("jpeg") || t.includes("png") || t.includes("gif") || t.includes("webp");
  };

  return (
    <div className="space-y-3">
      {/* Upload button */}
      {allowUpload && (
        <div>
          <input id={`ev-upload-${caseId}`} type="file" multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <label htmlFor={`ev-upload-${caseId}`}>
            <Button asChild variant="outline" size="sm"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer">
              <span>
                {uploading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                  : <><Upload className="w-4 h-4 mr-2" /> Upload Evidence</>}
              </span>
            </Button>
          </label>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading evidence files...</span>
        </div>
      )}

      {/* No files */}
      {!isLoading && allFiles.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center border border-dashed border-gray-700 rounded-lg">
          <AlertTriangle className="w-8 h-8 text-gray-600" />
          <p className="text-gray-500 text-sm">No evidence files uploaded yet.</p>
          {allowUpload && <p className="text-gray-600 text-xs">Use the button above to upload files.</p>}
        </div>
      )}

      {/* File list */}
      {allFiles.length > 0 && (
        <div className={`space-y-2 ${compact ? "" : ""}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {allFiles.length} file{allFiles.length !== 1 ? "s" : ""}
            </span>
            <button onClick={() => refetch()} className="text-gray-500 hover:text-cyan-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Image thumbnails grid */}
          {!compact && allFiles.some(f => isImage(f.type, f.name)) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
              {allFiles.filter(f => isImage(f.type, f.name)).map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                  className="relative aspect-square rounded overflow-hidden border border-gray-700 hover:border-cyan-500/50 group transition-all bg-black/30">
                  <img
                    src={f.url}
                    alt={f.name}
                    className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                    onError={e => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                  <div className="hidden absolute inset-0 items-center justify-center bg-black/50">
                    <Image className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* All files list */}
          {allFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 bg-[#0f1419] rounded-lg border border-gray-700/50 hover:border-cyan-500/20 transition-colors group">
              {getFileIcon(f.type, f.name)}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{f.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {f.date && (
                    <span className="text-xs text-gray-500">
                      {new Date(f.date).toLocaleDateString()}
                    </span>
                  )}
                  {f.source === "db" && (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] h-4 px-1">Verified</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={f.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-cyan-400 hover:bg-cyan-500/10">
                    <Eye className="w-4 h-4" />
                  </Button>
                </a>
                <a href={f.url} download={f.name} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-gray-400 hover:bg-gray-500/10">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}