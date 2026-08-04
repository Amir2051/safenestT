import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Upload, FileDown, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CSV_FIELDS = [
  "case_number", "client_name", "client_email", "phone_number",
  "issue_type", "status", "urgency", "description", "amount_lost",
  "blockchain", "cryptocurrency", "scammer_wallet", "victim_wallet",
  "transaction_hash", "transaction_date", "scammer_bank_name",
  "scammer_routing_number", "scammer_account_number", "victim_bank_name",
  "victim_account_number", "assigned_to", "ic3_complaint_number",
  "federal_case_number", "recovery_amount", "investigation_progress",
  "created_date", "created_by_email"
];

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return /[",\n]/.test(str) ? `"${str}"` : str;
}

function casesToCSV(cases) {
  const header = CSV_FIELDS.join(",");
  const rows = cases.map(c => CSV_FIELDS.map(f => escapeCSV(c[f])).join(","));
  return [header, ...rows].join("\n");
}

function casesToJSON(cases) {
  return JSON.stringify(cases.map(c => {
    const clean = {};
    CSV_FIELDS.forEach(f => { if (c[f] !== undefined) clean[f] = c[f]; });
    return clean;
  }), null, 2);
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = {};
    let field = "", inQuotes = false;
    const raw = [];
    const chars = lines[i];
    for (let j = 0; j < chars.length; j++) {
      const ch = chars[j];
      if (ch === '"') {
        if (inQuotes && chars[j + 1] === '"') { field += '"'; j++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        raw.push(field); field = "";
      } else field += ch;
    }
    raw.push(field);
    headers.forEach((h, idx) => { row[h] = raw[idx] || ""; });
    rows.push(row);
  }
  return rows;
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CaseImportExport({ cases, isAdmin, onImported }) {
  const [format, setFormat] = useState("csv");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef(null);

  const handleExport = () => {
    if (!cases || cases.length === 0) {
      toast.error("No cases to export");
      return;
    }
    setExporting(true);
    try {
      const ts = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        downloadFile(casesToCSV(cases), `cases-export-${ts}.csv`, "text/csv");
      } else {
        downloadFile(casesToJSON(cases), `cases-export-${ts}.json`, "application/json");
      }
      toast.success(`Exported ${cases.length} cases`);
    } catch (e) {
      toast.error("Export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      let records = [];
      if (file.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        records = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        records = parseCSV(text);
      }

      const valid = records.filter(r => r.client_name || r.case_number);
      if (valid.length === 0) {
        toast.error("No valid case records found in file");
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }

      const toCreate = valid.map(r => ({
        case_number: r.case_number || `IMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        client_name: r.client_name || "Imported",
        client_email: r.client_email || "",
        phone_number: r.phone_number || "",
        issue_type: r.issue_type || "other",
        status: r.status || "Pending",
        urgency: r.urgency || "Medium",
        description: r.description || "",
        amount_lost: parseFloat(r.amount_lost) || 0,
        blockchain: r.blockchain || "",
        cryptocurrency: r.cryptocurrency || "",
        scammer_wallet: r.scammer_wallet || "",
        victim_wallet: r.victim_wallet || "",
        transaction_hash: r.transaction_hash || "",
        transaction_date: r.transaction_date || "",
        scammer_bank_name: r.scammer_bank_name || "",
        scammer_routing_number: r.scammer_routing_number || "",
        scammer_account_number: r.scammer_account_number || "",
        victim_bank_name: r.victim_bank_name || "",
        victim_account_number: r.victim_account_number || "",
        assigned_to: r.assigned_to || "",
        ic3_complaint_number: r.ic3_complaint_number || "",
        federal_case_number: r.federal_case_number || "",
        recovery_amount: parseFloat(r.recovery_amount) || 0,
        investigation_progress: parseFloat(r.investigation_progress) || 0,
        created_by_email: r.created_by_email || "",
      }));

      const result = await base44.entities.MyCase.bulkCreate(toCreate);
      toast.success(`Imported ${result.length || toCreate.length} cases`);
      if (onImported) onImported();
    } catch (err) {
      toast.error("Import failed: " + err.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/20 text-white">
          <FileDown className="w-4 h-4 mr-2" /> Import / Export
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0a0f1a] border-cyan-500/30 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Case Import / Export</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Format</label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="bg-[#0f1419] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white/5 rounded-lg p-3 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-medium">Export</span>
              <span className="text-xs text-gray-400">{cases?.length || 0} cases ready</span>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              {isAdmin ? "Download all visible cases." : "Download your own cases."}
            </p>
            <Button onClick={handleExport} disabled={exporting} size="sm" className="bg-cyan-500 text-black hover:bg-cyan-400">
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : format === "csv" ? <FileSpreadsheet className="w-4 h-4 mr-2" /> : <FileJson className="w-4 h-4 mr-2" />}
              Download {format.toUpperCase()}
            </Button>
          </div>

          {isAdmin && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-medium">Import</span>
                <span className="text-xs text-gray-400">Admin only</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Upload a CSV or JSON file to bulk-create cases.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json"
                onChange={handleImport}
                disabled={importing}
                className="hidden"
              />
              <Button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                size="sm"
                variant="outline"
                className="border-cyan-500/40 text-cyan-400"
              >
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {importing ? "Importing..." : "Choose File"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}