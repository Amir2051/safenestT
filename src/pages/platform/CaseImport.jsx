import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Upload, FileCheck2, ArrowRight, ArrowLeft, CheckCircle2, Loader2,
  FileJson, FileText, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select as UISelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import EmptyState from "@/components/platform/EmptyState";
import SectionHeader from "@/components/platform/SectionHeader";
import { detectTargetsInRecords } from "@/lib/targetDetection";
import { logAuditEvent } from "@/lib/auditLogger";

const STEPS = ["Upload", "Parse", "Map Fields", "Preview", "Imported"];

const STRUCTURED_EXTENSIONS = ["json", "csv"];
const DOC_EXTENSIONS = ["pdf", "docx", "txt"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"];

// Schema fields of InvestigationCase we can map into.
const MAPPABLE_FIELDS = [
  { key: "case_title", label: "Case Title", required: true },
  { key: "victim_name", label: "Victim Name", required: false },
  { key: "victim_email", label: "Victim Email", required: false },
  { key: "fraud_type", label: "Fraud Type", required: true },
  { key: "amount_stolen_usd", label: "Amount Stolen (USD)", required: false },
  { key: "description", label: "Description", required: false },
  { key: "case_number", label: "Case Number", required: false },
  { key: "cryptocurrency", label: "Cryptocurrency", required: false },
];

function fileIcon(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (STRUCTURED_EXTENSIONS.includes(ext)) return FileJson;
  if (DOC_EXTENSIONS.includes(ext)) return FileText;
  if (IMAGE_EXTENSIONS.includes(ext)) return FileText;
  return FileText;
}

/**
 * Case Import — upload an existing SafeNestT case (JSON/CSV) and map it
 * into a new InvestigationCase. Structured files are parsed; documents
 * and images are preserved as evidence but require Hermes for extraction.
 */
export default function CaseImport() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [mappings, setMappings] = useState({});
  const [creating, setCreating] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [detectedTargets, setDetectedTargets] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState(new Set());
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const ext = file?.name?.split(".").pop()?.toLowerCase();
  const isStructured = ext && STRUCTURED_EXTENSIONS.includes(ext);

  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsed(null);
    setParseError(null);
    setMappings({});
    setStep(1);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);
      setImportLog((l) => [...l, { action: "File uploaded", detail: `${f.name} (${(f.size / 1024).toFixed(1)} KB)`, time: new Date().toISOString() }]);

      if (isStructured) {
        await parseStructured(file_url);
      }
      // documents/images: preserved as evidence; extraction requires Hermes.
    } catch (err) {
      setParseError("Upload failed: " + (err?.message || err));
    }
  };

  const parseStructured = async (url) => {
    setParsing(true);
    setParseError(null);
    try {
      const schema = {
        type: "object",
        properties: {
          cases: { type: "array", items: { type: "object" } },
        },
      };
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: url,
        json_schema: schema,
      });
      if (result?.status === "success") {
        const records = Array.isArray(result.output)
          ? result.output
          : result.output?.cases
          ? result.output.cases
          : [result.output].filter(Boolean);
        setParsed(records);
        // Auto-map by matching source keys to schema fields.
        if (records[0]) {
          const sourceKeys = Object.keys(records[0]);
          const auto = {};
          MAPPABLE_FIELDS.forEach((f) => {
            const match = sourceKeys.find((k) => k.toLowerCase().replace(/[\s_-]/g, "") === f.key.toLowerCase());
            if (match) auto[f.key] = match;
          });
          setMappings(auto);
        }
        setImportLog((l) => [...l, { action: "File parsed", detail: `${records.length} record(s) detected`, time: new Date().toISOString() }]);
        // Detect possible investigation targets in the parsed data
        const targets = detectTargetsInRecords(records);
        setDetectedTargets(targets);
        setSelectedTargets(new Set(targets.map((_, i) => i)));
        if (targets.length > 0) {
          setImportLog((l) => [...l, { action: "Targets detected", detail: `${targets.length} potential target(s) found in data`, time: new Date().toISOString() }]);
        }
        setStep(2);
      } else {
        setParseError(result?.details || "Could not parse file. Ensure it is valid JSON or CSV.");
      }
    } catch (err) {
      setParseError("Parse failed: " + (err?.message || err));
    } finally {
      setParsing(false);
    }
  };

  const previewRecord = () => {
    if (!parsed?.[0]) return null;
    const out = {};
    MAPPABLE_FIELDS.forEach((f) => {
      const sourceKey = mappings[f.key];
      if (sourceKey && parsed[0][sourceKey] != null) out[f.key] = parsed[0][sourceKey];
    });
    return out;
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const record = previewRecord();
      const newCase = await base44.entities.InvestigationCase.create({
        ...record,
        case_title: record.case_title || file?.name || "Imported case",
        fraud_type: record.fraud_type || "other",
        status: "new",
        priority: "medium",
        case_priority: "medium",
        investigation_progress: 0,
        amount_stolen_usd: record.amount_stolen_usd ? Number(record.amount_stolen_usd) : 0,
      });
      setCreatedId(newCase.id);
      setImportLog((l) => [...l, { action: "Case created", detail: `ID: ${newCase.id}`, time: new Date().toISOString() }]);
      await logAuditEvent({ action: "case_imported", objectType: "case", objectId: newCase.id, caseId: newCase.id, description: `Imported case: ${record?.case_title || file?.name || "Imported case"}` });
      queryClient.invalidateQueries({ queryKey: ["cases-management"] });
      queryClient.invalidateQueries({ queryKey: ["ops-cases"] });

      // Create selected targets as InvestigationTarget records
      const targetsToAdd = detectedTargets.filter((_, i) => selectedTargets.has(i));
      if (targetsToAdd.length > 0 && fileUrl) {
        try {
          for (const t of targetsToAdd) {
            await base44.entities.InvestigationTarget.create({
              case_id: newCase.id,
              type: t.type,
              value: t.value,
              source: "case_import",
              status: "pending",
            });
          }
          setImportLog((l) => [...l, { action: "Targets created", detail: `${targetsToAdd.length} target(s) added to case`, time: new Date().toISOString() }]);
          queryClient.invalidateQueries({ queryKey: ["targets", newCase.id] });

          // Also create an evidence record for the imported file
          await base44.entities.EvidenceItem.create({
            case_id: newCase.id,
            filename: file?.name || "imported",
            file_url: fileUrl,
            evidence_type: "document",
            source: "case_import",
            original_import: true,
            original_filename: file?.name,
            processing_status: "uploaded",
            uploaded_at: new Date().toISOString(),
            detected_targets: targetsToAdd,
          });
          setImportLog((l) => [...l, { action: "Evidence preserved", detail: `Original file stored as evidence`, time: new Date().toISOString() }]);
        } catch (e) {
          setImportLog((l) => [...l, { action: "Target creation warning", detail: `Some targets could not be created: ${e?.message || e}`, time: new Date().toISOString() }]);
        }
      } else if (fileUrl) {
        // No targets detected, but still preserve the file as evidence
        try {
          await base44.entities.EvidenceItem.create({
            case_id: newCase.id,
            filename: file?.name || "imported",
            file_url: fileUrl,
            evidence_type: "document",
            source: "case_import",
            original_import: true,
            original_filename: file?.name,
            processing_status: "uploaded",
            uploaded_at: new Date().toISOString(),
          });
          setImportLog((l) => [...l, { action: "Evidence preserved", detail: `Original file stored as evidence`, time: new Date().toISOString() }]);
        } catch (e) { /* evidence preservation is best-effort */ }
      }

      setStep(4);
    } catch (err) {
      setParseError("Failed to create case: " + (err?.message || err));
    } finally {
      setCreating(false);
    }
  };

  const reset = () => {
    setFile(null); setFileUrl(null); setParsed(null); setMappings({});
    setParseError(null); setCreatedId(null); setImportLog([]); setDetectedTargets([]); setSelectedTargets(new Set()); setStep(0);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <SectionHeader title="Import Existing Case" description="Upload a case from the original SafeNestT application and map it into a new investigation case." icon={Upload} />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs ${i <= step ? "border-cyan-500/30 bg-cyan-500/[0.06] text-cyan-300" : "border-white/10 text-gray-500"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i < step ? "bg-cyan-500 text-black" : i === step ? "border border-cyan-400 text-cyan-400" : "border border-white/20 text-gray-600"}`}>
                {i < step ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </span>
              {s}
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? "bg-cyan-500/40" : "bg-white/10"}`} />}
          </React.Fragment>
        ))}
      </div>

      {parseError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div><p className="text-sm font-medium text-red-300">Import error</p><p className="text-xs text-gray-400 mt-0.5">{parseError}</p></div>
        </div>
      )}

      {/* Step 0: Upload */}
      {step === 0 && (
        <label className="block rounded-lg border-2 border-dashed border-white/15 hover:border-cyan-500/40 p-12 text-center cursor-pointer transition-colors">
          <input type="file" className="hidden" accept=".json,.csv,.pdf,.docx,.txt,.png,.jpg,.jpeg" onChange={handleFileSelect} />
          <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-300 font-medium">Click to select a case file</p>
          <p className="text-xs text-gray-500 mt-1">Supported: JSON, CSV (parsed & mapped) • PDF, DOCX, TXT, images (preserved as evidence; extraction requires Hermes)</p>
        </label>
      )}

      {/* Step 1: Parsing */}
      {step === 1 && (
        <div className="rounded-lg border border-white/10 p-8">
          {parsing ? (
            <EmptyState variant="loading" title="Parsing file…" description="Extracting structured data from the uploaded file." />
          ) : isStructured ? null : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {React.createElement(fileIcon(file.name), { className: "w-8 h-8 text-gray-400" })}
                <div><p className="text-sm text-white font-medium">{file.name}</p><p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p></div>
              </div>
              <EmptyState
                variant="not_connected"
                icon={FileText}
                title="Document/image — extraction requires Hermes"
                description="This file is preserved as evidence. Entity extraction and OCR are performed by Hermes during investigation. You can still create a case and attach this file as evidence."
              />
              <div className="flex gap-2">
                <Button onClick={() => setStep(2)} className="bg-cyan-600 hover:bg-cyan-700">Continue without parsing <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
                <Button variant="outline" onClick={reset} className="border-white/15 text-gray-200">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Field mapping */}
      {step === 2 && (
        <div className="rounded-lg border border-white/10 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-300">{parsed ? `${parsed.length} record(s) detected. Map source fields to case fields.` : "No parsed records. Enter case details manually."}</p>
            {parsed?.[0] && <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">Source fields: {Object.keys(parsed[0]).length}</Badge>}
          </div>
          {parsed?.[0] ? (
            <div className="space-y-2">
              {MAPPABLE_FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <div><p className="text-sm text-white">{f.label}{f.required && <span className="text-red-400 ml-1">*</span>}<span className="text-xs text-gray-600 ml-2 font-mono">{f.key}</span></p></div>
                  <FieldMapper sourceKeys={parsed?.[0] ? Object.keys(parsed[0]) : []} value={mappings[f.key]} onChange={(v) => setMappings((m) => ({ ...m, [f.key]: v }))} />
                </div>
              ))}
            </div>
          ) : (
            <ManualEntryForm onChange={() => {}} />
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={() => setStep(3)} className="bg-cyan-600 hover:bg-cyan-700">Preview <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
            <Button variant="outline" onClick={() => setStep(1)} className="border-white/15 text-gray-200"><ArrowLeft className="w-4 h-4 mr-1.5" />Back</Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="rounded-lg border border-white/10 p-6 space-y-4">
          <p className="text-sm text-gray-300">Review the case that will be created:</p>
          <div className="rounded-md border border-white/10 bg-black/30 p-4 space-y-1.5">
            {previewRecord() && Object.entries(previewRecord()).map(([k, v]) => (
              <div key={k} className="flex gap-3 text-sm"><span className="text-gray-500 w-40 shrink-0 font-mono">{k}</span><span className="text-gray-200 truncate">{String(v)}</span></div>
            ))}
            {!previewRecord() && <p className="text-sm text-gray-500">No mapped fields — a case will be created with the filename as the title and this file attached as evidence.</p>}
          </div>

          {/* Detected targets */}
          {detectedTargets.length > 0 && (
            <div>
              <p className="text-sm text-gray-300 mb-2">Detected investigation targets ({detectedTargets.length}):</p>
              <p className="text-xs text-gray-500 mb-2">Review and select which targets to add. These will be created as pending targets — Hermes analyzes them during investigation.</p>
              <div className="space-y-1 max-h-48 overflow-auto rounded-md border border-white/10">
                {detectedTargets.map((t, i) => (
                  <label key={i} className="flex items-center gap-3 p-2 hover:bg-white/[0.03] cursor-pointer">
                    <input type="checkbox" checked={selectedTargets.has(i)} onChange={() => {
                      const next = new Set(selectedTargets);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      setSelectedTargets(next);
                    }} className="accent-cyan-500" />
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">{t.type.replace(/_/g, " ")}</Badge>
                    <span className="text-sm text-gray-200 font-mono truncate">{t.value}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleCreate} disabled={creating} className="bg-green-600 hover:bg-green-700">
              {creating ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Creating…</> : <><FileCheck2 className="w-4 h-4 mr-1.5" />Create Case</>}
            </Button>
            <Button variant="outline" onClick={() => setStep(2)} className="border-white/15 text-gray-200"><ArrowLeft className="w-4 h-4 mr-1.5" />Back</Button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 4 && createdId && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/[0.04] p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
          <p className="text-lg font-medium text-white">Case imported successfully</p>
          <p className="text-sm text-gray-400">The imported case is ready. You can now add targets, upload evidence, and start an investigation.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate(`/InvestigationWorkspace?case_id=${createdId}`)} className="bg-cyan-600 hover:bg-cyan-700">Open Investigation Workspace <ArrowRight className="w-4 h-4 ml-1.5" /></Button>
            <Button variant="outline" onClick={reset} className="border-white/15 text-gray-200">Import Another</Button>
          </div>
        </div>
      )}

      {/* Import audit log */}
      {importLog.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Import Audit Record</p>
          <div className="rounded-lg border border-white/10 divide-y divide-white/5">
            {importLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 text-xs">
                <span className="text-gray-600 font-mono">{new Date(entry.time).toLocaleTimeString()}</span>
                <span className="text-gray-200">{entry.action}</span>
                <span className="text-gray-500 truncate flex-1">{entry.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldMapper({ sourceKeys, value, onChange }) {
  return (
    <UISelect value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? null : v)}>
      <SelectTrigger className="bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="— none —" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__none">— none —</SelectItem>
        {sourceKeys.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
      </SelectContent>
    </UISelect>
  );
}

function ManualEntryForm() {
  return <p className="text-sm text-gray-500">Manual entry form appears here when no structured records are detected.</p>;
}