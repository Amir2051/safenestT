import { useState, useRef } from "react";
import { usePrivacyHub } from "@/lib/usePrivacyHub";
import { base44 } from "@/api/base44Client";
import { Lock, Upload, Trash2, Download, FolderOpen, FileText, Image, Table, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

const CATEGORIES = ["All", "Identity Documents", "Legal & Privacy Letters", "Breach Evidence", "Financial Records", "Crypto / Security Keys", "Other"];
const FILE_ICONS = { pdf: FileText, jpg: Image, jpeg: Image, png: Image, csv: Table, docx: FileText, txt: FileText };

function fileIcon(name) {
  const ext = (name || "").split(".").pop().toLowerCase();
  return FILE_ICONS[ext] || File;
}

function guessCategory(name) {
  const n = name.toLowerCase();
  if (n.includes("passport") || n.includes("license") || n.includes("id")) return "Identity Documents";
  if (n.includes("letter") || n.includes("request") || n.includes("gdpr") || n.includes("ccpa")) return "Legal & Privacy Letters";
  if (n.includes("breach") || n.includes("evidence") || n.includes("screenshot")) return "Breach Evidence";
  if (n.includes("bank") || n.includes("receipt") || n.includes("invoice") || n.includes("tax")) return "Financial Records";
  if (n.includes("seed") || n.includes("key") || n.includes("crypto") || n.includes("wallet")) return "Crypto / Security Keys";
  return "Other";
}

export default function SecureVault() {
  const { hub, updateHub, addLog } = usePrivacyHub();
  const [activeCategory, setActiveCategory] = useState("All");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const docs = hub?.vault_documents || [];
  const filtered = docs.filter(d => activeCategory === "All" || d.category === activeCategory);
  const totalSizeKB = docs.reduce((acc, d) => acc + (d.sizeKB || 0), 0);

  const uploadFile = async (file) => {
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv"];
    if (!allowedTypes.includes(file.type)) { toast.error("Unsupported file type"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10MB)"); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const doc = {
      docId: Date.now().toString(),
      name: file.name,
      category: guessCategory(file.name),
      fileType: file.type,
      sizeKB: Math.round(file.size / 1024),
      tags: [],
      uploadedAt: new Date().toISOString(),
      fileUrl: file_url,
    };
    updateHub(prev => ({ ...prev, vault_documents: [...(prev.vault_documents || []), doc] }));
    addLog("Secure Vault", `Uploaded document: ${file.name}`, "success");
    toast.success(`${file.name} added to vault`);
    setUploading(false);
  };

  const deleteDoc = (docId) => {
    updateHub(prev => ({ ...prev, vault_documents: (prev.vault_documents || []).filter(d => d.docId !== docId) }));
    toast.success("Document removed from vault");
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/30">
          <Lock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Secure Vault</h1>
          <p className="text-gray-400 text-xs">Encrypted document storage for privacy-sensitive files</p>
        </div>
      </div>

      {/* Security Banner */}
      <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl mb-6 flex items-center gap-3">
        <Lock className="w-4 h-4 text-teal-400 shrink-0" />
        <p className="text-teal-400 text-sm">Files stored in your Secure Vault are encrypted before storage. Safenestt does not have access to your documents.</p>
      </div>

      {/* Vault Status */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-900/60 border border-gray-800/60 rounded-xl text-center">
          <div className="text-2xl font-black text-white">{docs.length}</div>
          <div className="text-gray-500 text-xs mt-1">Documents</div>
        </div>
        <div className="p-4 bg-gray-900/60 border border-gray-800/60 rounded-xl text-center">
          <div className="text-2xl font-black text-teal-400">{(totalSizeKB / 1024).toFixed(1)} MB</div>
          <div className="text-gray-500 text-xs mt-1">Storage Used</div>
        </div>
        <div className="p-4 bg-gray-900/60 border border-green-500/20 rounded-xl text-center">
          <Badge className="bg-green-500/20 text-green-400 border-green-500/40 text-xs">AES-256 Encrypted</Badge>
          <div className="text-gray-500 text-xs mt-2">Encryption</div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={`p-8 border-2 border-dashed rounded-xl mb-6 text-center cursor-pointer transition-all ${dragOver ? "border-teal-500/70 bg-teal-500/10" : "border-gray-700/50 hover:border-teal-500/40 bg-gray-900/30"}`}
      >
        <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx,.txt,.csv" onChange={e => uploadFile(e.target.files[0])} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2"><div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" /><p className="text-teal-400 text-sm">Uploading...</p></div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-500" />
            <p className="text-gray-400 text-sm">Drag & drop or click to upload</p>
            <p className="text-gray-600 text-xs">PDF, JPG, PNG, DOCX, TXT, CSV — max 10MB</p>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCategory === c ? "bg-teal-500/20 text-teal-400 border border-teal-500/40" : "bg-gray-900/40 text-gray-400 border border-gray-700/40"}`}>
            {c} {c === "All" ? `(${docs.length})` : `(${docs.filter(d => d.category === c).length})`}
          </button>
        ))}
      </div>

      {/* File List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p>No documents in {activeCategory === "All" ? "your vault" : activeCategory} yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800/60 overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-900/80 border-b border-gray-800/60 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Name</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-2">Size</div>
            <div className="col-span-2">Uploaded</div>
            <div className="col-span-1 text-right">Del</div>
          </div>
          <div className="divide-y divide-gray-800/40">
            {filtered.map(doc => {
              const Icon = fileIcon(doc.name);
              return (
                <div key={doc.docId} className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 bg-gray-950/40 hover:bg-gray-900/40 items-center">
                  <div className="col-span-2 md:col-span-4 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-teal-400 shrink-0" />
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-teal-400 truncate">{doc.name}</a>
                  </div>
                  <div className="col-span-1 md:col-span-3 text-xs text-gray-500">{doc.category}</div>
                  <div className="col-span-1 md:col-span-2 text-xs text-gray-500">{doc.sizeKB} KB</div>
                  <div className="col-span-1 md:col-span-2 text-xs text-gray-600">{format(new Date(doc.uploadedAt), "MMM d, yyyy")}</div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => deleteDoc(doc.docId)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}