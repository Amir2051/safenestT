import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, Loader2, FileCheck2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import EmptyState from "@/components/platform/EmptyState";
import { jsPDF } from "jspdf";
import { runPhase, DEFAULT_PROVIDER, DEFAULT_MODEL } from "@/lib/investigationRunner";
import { logAuditEvent } from "@/lib/auditLogger";
import { toast } from "sonner";

const REPORT_TYPES = [
  { value: "investigation_report", label: "Investigation Report" },
  { value: "evidence_report", label: "Evidence Report" },
  { value: "blockchain_trace_report", label: "Blockchain Trace Report" },
  { value: "executive_summary", label: "Executive Summary" },
  { value: "finding_report", label: "Finding Report" },
];

const CLASSIFICATION_STYLES = {
  fact: "border-green-500/30 text-green-400",
  evidence: "border-cyan-500/30 text-cyan-400",
  analysis: "border-amber-500/30 text-amber-400",
  inference: "border-purple-500/30 text-purple-400",
  hypothesis: "border-orange-500/30 text-orange-400",
  unknown: "border-white/15 text-gray-400",
};

export default function ReportsTab({ caseId, hermesState }) {
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState("investigation_report");
  const qc = useQueryClient();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["reports", caseId],
    queryFn: () => base44.entities.InvestigationReport.filter({ case_id: caseId }, "-created_date", 50),
    enabled: !!caseId,
  });

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await runPhase({ caseId, phase: "dossier", provider: DEFAULT_PROVIDER, model: DEFAULT_MODEL });
      if (res.status === "completed") {
        toast.success("Dossier report generated");
        qc.invalidateQueries({ queryKey: ["reports", caseId] });
      } else {
        toast.error("Dossier generation failed: " + (res.error || "unknown"));
      }
    } catch (e) { toast.error("Failed: " + (e.message || e)); }
    finally { setGenerating(false); }
  };

  const exportReport = async (report, format) => {
    try {
      if (format === "json") {
        const blob = new Blob([JSON.stringify(report.content || report, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${report.title}.json`; a.click();
        URL.revokeObjectURL(url);
      } else if (format === "markdown") {
        const md = generateMarkdown(report);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${report.title}.md`; a.click();
        URL.revokeObjectURL(url);
      } else if (format === "pdf") {
        generatePdf(report);
      }
      await logAuditEvent({ action: "report_exported", objectType: "report", objectId: report.id, caseId, description: `Exported ${report.title} as ${format.toUpperCase()}` });
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (e) { toast.error("Export failed: " + (e.message || e)); }
  };

  return (
    <div className="space-y-4">
      {/* Generate */}
      <div className="rounded-lg border border-white/10 p-4 flex items-center gap-3 flex-wrap">
        <FileText className="w-5 h-5 text-cyan-400" />
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-56 bg-[#0f1419] border-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{REPORT_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={generate} disabled={generating} className="bg-cyan-600 hover:bg-cyan-700">
          {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileCheck2 className="w-4 h-4 mr-1.5" />}Generate Report
        </Button>
        <span className="text-xs text-gray-500">Runs the Dossier phase via the investigation engine.</span>
      </div>

      {/* Report list */}
      {isLoading ? (
        <EmptyState variant="loading" title="Loading reports…" />
      ) : reports.length === 0 ? (
        <EmptyState variant="empty" icon={FileText} title="No reports yet" description="Run the Dossier phase in the Investigation Engine to generate a structured report with classified sections and an evidence register." />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{report.title}</p>
                  <p className="text-xs text-gray-500">{REPORT_TYPES.find((r) => r.value === report.report_type)?.label || report.report_type} • {report.generated_by} • {report.generated_date ? new Date(report.generated_date).toLocaleString() : ""}</p>
                </div>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] capitalize">{report.status}</Badge>
              </div>

              {/* Sections with classification */}
              {report.sections?.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {report.sections.map((section, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] uppercase ${CLASSIFICATION_STYLES[section.classification] || CLASSIFICATION_STYLES.unknown}`}>{section.classification || "unknown"}</Badge>
                        <span className="text-gray-300 font-medium">{section.title}</span>
                      </div>
                      {section.content && <p className="text-gray-400 mt-0.5 pl-2 border-l border-white/5">{section.content.slice(0, 200)}{section.content.length > 200 ? "…" : ""}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Evidence register */}
              {report.evidence_register?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1 flex items-center gap-1"><ClipboardList className="w-3 h-3" />Evidence Register</p>
                  <div className="space-y-1">
                    {report.evidence_register.map((ev, i) => (
                      <div key={i} className="text-xs text-gray-400 rounded border border-white/5 bg-black/20 px-2 py-1 flex items-center gap-2">
                        <span className="font-mono text-gray-300">{ev.evidence_id || ev.filename}</span>
                        {ev.type && <span>• {ev.type}</span>}
                        {ev.hash && <span className="text-gray-600">• hash: {ev.hash.slice(0, 12)}…</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.conclusion && <p className="text-xs text-gray-300 border-t border-white/5 pt-2"><span className="text-gray-500">Conclusion: </span>{report.conclusion}</p>}

              {/* Export buttons */}
              <div className="flex gap-2 mt-3 pt-2 border-t border-white/5">
                <Button size="sm" variant="outline" onClick={() => exportReport(report, "pdf")} className="border-white/15 text-gray-200 h-7 text-xs"><Download className="w-3 h-3 mr-1" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => exportReport(report, "markdown")} className="border-white/15 text-gray-200 h-7 text-xs"><Download className="w-3 h-3 mr-1" />Markdown</Button>
                <Button size="sm" variant="outline" onClick={() => exportReport(report, "json")} className="border-white/15 text-gray-200 h-7 text-xs"><Download className="w-3 h-3 mr-1" />JSON</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generatePdf(report) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const maxW = doc.internal.pageSize.getWidth() - margin * 2;
  let y = margin;
  const heading = (text, size = 16) => { doc.setFont("helvetica", "bold"); doc.setFontSize(size); doc.text(text, margin, y); y += size * 1.4; };
  const para = (text, size = 10) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size);
    const lines = doc.splitTextToSize(text || "", maxW);
    lines.forEach((ln) => { if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; } doc.text(ln, margin, y); y += size * 1.5; });
    y += 4;
  };
  heading(report.title || "Investigation Report", 18);
  para(`Type: ${report.report_type || "—"}   |   Generated by: ${report.generated_by || "—"}   |   Date: ${report.generated_date ? new Date(report.generated_date).toLocaleString() : "—"}`);
  y += 6;
  (report.sections || []).forEach((s) => { heading(`[${(s.classification || "unknown").toUpperCase()}] ${s.title || ""}`, 12); para(s.content || ""); });
  if (report.evidence_register?.length) { heading("Evidence Register", 12); report.evidence_register.forEach((ev) => para(`• ${ev.evidence_id || ev.filename || "—"} (${ev.type || "unknown"}) — Hash: ${ev.hash || "—"}`)); }
  if (report.conclusion) { heading("Conclusion", 12); para(report.conclusion); }
  if (report.recommended_actions?.length) { heading("Recommended Actions", 12); report.recommended_actions.forEach((a) => para(`• ${a}`)); }
  doc.save(`${(report.title || "report").replace(/[^a-z0-9]+/gi, "_")}.pdf`);
}

function generateMarkdown(report) {
  let md = `# ${report.title}\n\n`;
  md += `**Type:** ${report.report_type}\n**Generated by:** ${report.generated_by}\n**Date:** ${report.generated_date || ""}\n\n`;
  if (report.sections?.length) {
    md += `## Sections\n\n`;
    report.sections.forEach((s) => {
      md += `### [${(s.classification || "unknown").toUpperCase()}] ${s.title}\n${s.content || ""}\n\n`;
    });
  }
  if (report.evidence_register?.length) {
    md += `## Evidence Register\n\n`;
    report.evidence_register.forEach((ev) => { md += `- **${ev.evidence_id || ev.filename}** (${ev.type || "unknown"}) — Hash: ${ev.hash || "—"}\n`; });
    md += `\n`;
  }
  if (report.conclusion) md += `## Conclusion\n${report.conclusion}\n\n`;
  if (report.recommended_actions?.length) {
    md += `## Recommended Actions\n`;
    report.recommended_actions.forEach((a) => { md += `- ${a}\n`; });
  }
  return md;
}