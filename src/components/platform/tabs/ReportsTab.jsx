import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Download, Loader2, Eye, ShieldCheck, ShieldAlert, Stamp, ChevronDown, X, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";
import CaseReportDocument from "@/components/report/CaseReportDocument";
import { buildCaseReport, integrityHash, formatDate } from "@/lib/report/reportModel";
import { renderReportPdf, reportFileName } from "@/lib/report/reportPdf";
import { useAuth } from "@/lib/AuthContext";
import { useCanMutate } from "@/components/shared/MutateGuard";
import { isPlatformAdmin } from "@/lib/organizationRoles";
import { logAuditEvent } from "@/lib/auditLogger";
import { toast } from "sonner";

/**
 * Reports — the client-facing deliverable.
 *
 *  - Draft: built live from the case's current records (never stored).
 *  - Issue: freezes the report model + its SHA-256 into an InvestigationReport
 *    record. Issued reports re-render from that snapshot, so the document a
 *    client received never changes; the hash is re-checked every time.
 *  - Engine dossiers: the raw engine output, kept for audit.
 */
export default function ReportsTab({ caseId, caseItem }) {
  const { user } = useAuth();
  const canMutate = useCanMutate();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState(null); // { model, integrity, draft }
  const [busy, setBusy] = useState("");

  const { data: findings = [], isLoading: lf } = useQuery({
    queryKey: ["report-findings", caseId],
    queryFn: () => base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 500),
    enabled: !!caseId,
  });
  const { data: evidence = [], isLoading: le } = useQuery({
    queryKey: ["report-evidence", caseId],
    queryFn: () => base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 500),
    enabled: !!caseId,
  });
  const { data: reports = [], isLoading: lr } = useQuery({
    queryKey: ["reports", caseId],
    queryFn: () => base44.entities.InvestigationReport.filter({ case_id: caseId }, "-created_date", 100),
    enabled: !!caseId,
  });
  const { data: tenant } = useQuery({
    queryKey: ["report-tenant", caseItem?.tenant_id],
    queryFn: () => base44.entities.Tenant.get(caseItem.tenant_id).catch(() => null),
    enabled: !!caseItem?.tenant_id,
  });

  const organization = tenant && tenant.plan !== "personal" ? { name: tenant.name } : null;
  const preparedBy = user
    ? `${user.full_name || user.email}, ${isPlatformAdmin(user) ? "SafeNestT Investigations" : user.organization_name || "SafeNestT"}`
    : "SafeNestT Investigations";

  // Engine dossiers hold the raw lookup results for older evidence records.
  const engineReports = useMemo(() => reports.filter((r) => r.report_type === "dossier" || r.generated_by === "hermes"), [reports]);

  const draft = useMemo(() => {
    if (!caseItem) return null;
    try {
      return buildCaseReport({ caseItem, findings, evidence, organization, preparedBy, engineReports });
    } catch (e) {
      console.error("[report] draft build failed", e);
      return null;
    }
  }, [caseItem, findings, evidence, organization?.name, preparedBy, engineReports]);

  const issued = reports.filter((r) => r.report_type === "investigation_report" && r.content?.model);
  const engineDossiers = reports.filter((r) => !(r.report_type === "investigation_report" && r.content?.model));

  const downloadPdf = async (model, integrity, { audit, reportId } = {}) => {
    const doc = renderReportPdf(model, { integrity });
    doc.save(reportFileName(model));
    if (audit) {
      await logAuditEvent({ action: "report_exported", objectType: "report", objectId: reportId, caseId, description: `Downloaded ${model.report_number} (PDF)` });
    }
  };

  const issueReport = async () => {
    if (!draft) return;
    setBusy("issue");
    try {
      // Rebuild with a fresh timestamp so report number + data-as-of are exact.
      const model = buildCaseReport({ caseItem, findings, evidence, organization, preparedBy, engineReports, asOf: new Date().toISOString() });
      const integrity = await integrityHash(model);
      const rec = await base44.entities.InvestigationReport.create({
        tenant_id: caseItem.tenant_id,
        case_id: caseId,
        title: `Investigation Report ${model.report_number}`,
        report_type: "investigation_report",
        status: "exported",
        generated_by: "investigator",
        generated_date: model.as_of,
        content: { model, integrity, schema_version: model.schema_version },
        conclusion: model.executive_summary.join(" "),
        recommended_actions: model.next_steps,
        created_by: user?.email,
      });
      await logAuditEvent({
        action: "report_issued", objectType: "report", objectId: rec?.id, caseId,
        description: `Issued ${model.report_number} (SHA-256 ${integrity.slice(0, 16)}…)`,
        metadata: { report_number: model.report_number, integrity },
      });
      qc.invalidateQueries({ queryKey: ["reports", caseId] });
      await downloadPdf(model, integrity);
      toast.success(`Report ${model.report_number} issued`);
    } catch (e) {
      toast.error("Could not issue the report: " + (e?.message || e));
    } finally {
      setBusy("");
    }
  };

  if (lf || le || lr) return <EmptyState variant="loading" title="Preparing report…" />;
  if (!caseItem) return <EmptyState variant="error" title="Case unavailable" description="The case record could not be loaded." />;

  return (
    <div className="space-y-5">
      {/* Draft */}
      <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.03] p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <p className="text-sm font-semibold text-white">Investigation Report</p>
              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-300">DRAFT · LIVE DATA</Badge>
            </div>
            {draft ? (
              <p className="text-xs text-gray-400 mt-1">
                {draft.counts.verified} verified · {draft.counts.partially_supported} partially supported · {draft.counts.unreviewed} awaiting review
                {" · "}{draft.counts.evidence} evidence item(s){draft.risk ? ` · ${draft.risk.level} risk ${draft.risk.score}/100` : ""}
              </p>
            ) : (
              <p className="text-xs text-red-300 mt-1">The report could not be assembled from this case's data.</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={!draft} onClick={() => setViewing({ model: draft, integrity: "", draft: true })} className="border-white/15 text-gray-200">
              <Eye className="w-4 h-4 mr-1.5" />Preview
            </Button>
            <Button size="sm" variant="outline" disabled={!draft} onClick={() => downloadPdf(draft, "")} className="border-white/15 text-gray-200">
              <Download className="w-4 h-4 mr-1.5" />Draft PDF
            </Button>
            {canMutate && (
              <Button size="sm" disabled={!draft || !!busy} onClick={issueReport}>
                {busy === "issue" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Stamp className="w-4 h-4 mr-1.5" />}Issue report
              </Button>
            )}
          </div>
        </div>
        {draft && draft.counts.unreviewed > 0 && (
          <p className="text-[11px] text-amber-300/90 mt-3 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {draft.counts.unreviewed} finding(s) are still unreviewed. They will appear as "Proposed (unreviewed)". Review them in the Findings tab before issuing to a client.
          </p>
        )}
      </div>

      {/* Issued */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Issued reports</h3>
        {issued.length === 0 ? (
          <p className="text-xs text-gray-500 rounded-lg border border-white/10 p-4">No report has been issued for this case yet. Issuing freezes the report exactly as delivered and records its SHA-256 fingerprint.</p>
        ) : (
          <div className="space-y-2">
            {issued.map((r) => <IssuedRow key={r.id} report={r} caseId={caseId} onView={setViewing} onDownload={downloadPdf} />)}
          </div>
        )}
      </div>

      {/* Engine dossiers (raw) */}
      {engineDossiers.length > 0 && (
        <details className="group rounded-lg border border-white/10">
          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-xs text-gray-400">
            <span>Engine dossiers (raw output, {engineDossiers.length}) — internal audit trail, not for clients</span>
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 space-y-2">
            {engineDossiers.map((r) => (
              <div key={r.id} className="text-xs text-gray-400 border-t border-white/5 pt-2">
                <span className="text-gray-300">{r.title}</span> · {r.generated_by} · {r.generated_date ? formatDate(r.generated_date, { withTime: true }) : ""}
              </div>
            ))}
          </div>
        </details>
      )}

      {viewing && <ReportViewer {...viewing} onClose={() => setViewing(null)} onDownload={() => downloadPdf(viewing.model, viewing.integrity)} />}
    </div>
  );
}

function IssuedRow({ report, caseId, onView, onDownload }) {
  const { model, integrity } = report.content || {};
  const [check, setCheck] = useState("checking"); // checking | ok | mismatch
  useEffect(() => {
    let alive = true;
    integrityHash(model)
      .then((h) => { if (alive) setCheck(h && h === integrity ? "ok" : "mismatch"); })
      .catch(() => alive && setCheck("mismatch"));
    return () => { alive = false; };
  }, [model, integrity]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
      <div className="min-w-0">
        <p className="text-sm text-white font-mono truncate">{model?.report_number || report.title}</p>
        <p className="text-[11px] text-gray-500">
          Issued {formatDate(report.generated_date || report.created_date, { withTime: true })}{report.created_by ? ` by ${report.created_by}` : ""}
        </p>
        <p className="text-[11px] mt-0.5 flex items-center gap-1">
          {check === "ok" && <><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-300">Integrity verified</span></>}
          {check === "mismatch" && <><ShieldAlert className="w-3.5 h-3.5 text-red-400" /><span className="text-red-300">Integrity check failed — this record changed after issue</span></>}
          {check === "checking" && <span className="text-gray-500">Checking integrity…</span>}
          <span className="text-gray-600 font-mono ml-1 truncate">{integrity?.slice(0, 16)}…</span>
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={() => onView({ model, integrity, draft: false })} className="border-white/15 text-gray-200 h-8"><Eye className="w-3.5 h-3.5 mr-1" />View</Button>
        <Button size="sm" variant="outline" onClick={() => onDownload(model, integrity, { audit: true, reportId: report.id })} className="border-white/15 text-gray-200 h-8"><Download className="w-3.5 h-3.5 mr-1" />PDF</Button>
      </div>
    </div>
  );
}

function ReportViewer({ model, integrity, draft, onClose, onDownload }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm overflow-y-auto" role="dialog" aria-modal="true" aria-label="Report preview">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-2.5 bg-[#06090d]/95 border-b border-white/10">
        <p className="text-xs text-gray-300 font-mono truncate">{model.report_number}{draft ? " · DRAFT" : ""}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDownload} className="border-white/15 text-gray-200 h-8"><Download className="w-3.5 h-3.5 mr-1" />PDF</Button>
          <Button size="sm" variant="outline" onClick={onClose} className="border-white/15 text-gray-200 h-8" aria-label="Close"><X className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="p-3 sm:p-8">
        <CaseReportDocument model={model} integrity={integrity} draft={draft} />
      </div>
    </div>
  );
}
