import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, CheckCircle2, XCircle, Clock, Loader2, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EmptyState from "@/components/platform/EmptyState";
import { SeverityBadge, ConfidenceBadge, AgentBadge, FINDING_STATUS_STYLES } from "@/components/platform/investigationStyles";
import { logAuditEvent } from "@/lib/auditLogger";
import { getCurrentUser } from "@/lib/tenantContext";
import { toast } from "sonner";
import { ChevronDown, Info } from "lucide-react";
import {
  buildCaseReport, cleanFindingTitle, parseEngineDescription, describeEvidence, findingStatus,
} from "@/lib/report/reportModel";

// Status colours for every status the engine can write (incl. reality-check ones).
const STATUS_CLS = {
  verified: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  partially_supported: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  under_review: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  proposed: "border-white/15 text-gray-300 bg-white/5",
  unsupported: "border-red-500/40 text-red-300 bg-red-500/10",
  rejected: "border-red-500/40 text-red-300 bg-red-500/10",
  superseded: "border-white/10 text-gray-500 bg-white/5",
  no_supporting_data: "border-orange-500/40 text-orange-300 bg-orange-500/10",
};

/**
 * Findings — reads real, persisted InvestigationFinding records (created by
 * the Analysis phase of the investigation runner). AI findings start as
 * "proposed" and require investigator review. Review actions persist status
 * changes + an auditable review_history entry on the entity itself.
 */
export default function FindingsTab({ caseId, caseItem }) {
  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["findings", caseId],
    queryFn: () => base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });
  const { data: evidence = [] } = useQuery({
    queryKey: ["evidence-for-findings", caseId],
    queryFn: () => base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });
  // Engine dossiers carry the raw lookup results for older evidence records.
  const { data: engineReports = [] } = useQuery({
    queryKey: ["engine-dossiers", caseId],
    queryFn: () => base44.entities.InvestigationReport.filter({ case_id: caseId, report_type: "dossier" }, "-created_date", 20),
    enabled: !!caseId,
  });

  if (isLoading) return <EmptyState variant="loading" title="Loading findings…" />;
  if (!findings.length)
    return (
      <EmptyState
        variant="empty"
        icon={FlaskConical}
        title="No findings yet"
        description="Run the Analysis phase in the Investigation Engine to generate proposed findings. AI findings start as 'proposed' and require investigator review — they are never auto-verified."
      />
    );

  return <FindingsList findings={findings} caseId={caseId} evidence={evidence} caseItem={caseItem} engineReports={engineReports} />;
}

function FindingsList({ findings, caseId, evidence, caseItem, engineReports }) {
  const [reviewFinding, setReviewFinding] = useState(null);

  // Same normalization as the client report, so what investigators review is
  // exactly what a client will read.
  const model = React.useMemo(() => {
    try { return buildCaseReport({ caseItem: caseItem || {}, findings, evidence, engineReports }); } catch { return null; }
  }, [caseItem, findings, evidence, engineReports]);
  const evRefById = React.useMemo(() => new Map((model?.evidence || []).map((e) => [e.id, e])), [model]);
  const currentIds = new Set([...(model?.findings || []), ...(model?.excluded_findings || [])].map((f) => f.id));
  const byId = new Map(findings.map((f) => [f.id, f]));
  const current = (model?.findings || []).map((m) => ({ m, raw: byId.get(m.id) })).filter((x) => x.raw);
  const excluded = (model?.excluded_findings || []).map((m) => ({ m, raw: byId.get(m.id) })).filter((x) => x.raw);
  const superseded = findings.filter((f) => !currentIds.has(f.id));
  const counts = model?.counts;

  return (
    <>
      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            ["Verified", counts.verified, "text-emerald-300"],
            ["Partially supported", counts.partially_supported, "text-amber-300"],
            ["Awaiting review", counts.unreviewed, "text-sky-300"],
            ["Excluded", counts.excluded, "text-red-300"],
          ].map(([k, v, cls]) => (
            <div key={k} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">{k}</p>
              <p className={`text-xl font-semibold tabular-nums ${cls}`}>{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {current.map(({ m, raw }) => (
          <FindingCard key={m.id} m={m} raw={raw} evRefById={evRefById} onReview={() => setReviewFinding(raw)} />
        ))}
      </div>

      {excluded.length > 0 && (
        <Folded title={`Excluded from conclusions (${excluded.length})`}>
          {excluded.map(({ m, raw }) => <FindingCard key={m.id} m={m} raw={raw} evRefById={evRefById} compact onReview={() => setReviewFinding(raw)} />)}
        </Folded>
      )}
      {superseded.length > 0 && (
        <Folded title={`Superseded by a later analysis run (${superseded.length})`} hint="Kept for the audit trail. Not shown in client reports.">
          {superseded.map((f) => (
            <div key={f.id} className="text-xs text-gray-500 border-t border-white/5 pt-2">
              {cleanFindingTitle(f.title)} <span className="text-gray-600">· {findingStatus(f.status).label} · {f.created_date ? new Date(f.created_date).toLocaleString() : ""}</span>
            </div>
          ))}
        </Folded>
      )}

      {reviewFinding && <ReviewDialog finding={reviewFinding} caseId={caseId} onClose={() => setReviewFinding(null)} />}
    </>
  );
}

function Folded({ title, hint, children }) {
  return (
    <details className="group mt-4 rounded-lg border border-white/10">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-xs text-gray-400">
        <span>{title}</span><ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 space-y-2">
        {hint && <p className="text-[11px] text-gray-600">{hint}</p>}
        {children}
      </div>
    </details>
  );
}

function FindingCard({ m, raw, evRefById, onReview, compact }) {
  // "No supporting data" findings stay reviewable: an investigator may hold outside evidence.
  const reviewable = raw.status === "proposed" || raw.status === "under_review" || raw.status === "partially_supported";
  const canReview = reviewable && (!compact || m.status === "no_supporting_data");
  return (
    <div className={`rounded-lg border border-white/10 bg-white/[0.02] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[11px] font-mono text-gray-500">{m.ref}</span>
            <p className="text-sm font-medium text-white break-words">{/^here'?s a thinking process/i.test(m.title) ? "Malformed analysis output (discarded)" : m.title}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Badge variant="outline" className={`text-[10px] ${STATUS_CLS[m.status] || STATUS_CLS.proposed}`}>{m.status_label}</Badge>
            <SeverityBadge severity={m.severity} />
            <ConfidenceBadge confidence={m.confidence} />
            <span className="text-[11px] text-gray-500">{[m.finding_kind || m.category, m.source].filter(Boolean).join(" · ")}</span>
            {raw.hermes_raw?.agent && <AgentBadge agent={raw.hermes_raw.agent} />}
          </div>
          {compact && m.status === "no_supporting_data" && <p className="text-[11px] text-orange-300/90">{m.status_meaning}</p>}
          {!compact && m.description && <p className="text-[13px] text-gray-300 break-words">{m.description}</p>}
          {!compact && m.assessment && (
            <div className="mt-2 rounded-md border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-0.5 flex items-center gap-1"><Info className="w-3 h-3" />Evidence assessment</p>
              <p className="text-xs text-gray-300 break-words">{m.assessment}</p>
            </div>
          )}
          {!compact && m.limitation && <p className="text-[11px] text-amber-300/90 mt-2">Limitation: {m.limitation}</p>}
          {!compact && (raw.evidence_refs?.length > 0) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {raw.evidence_refs.map((eid) => {
                const ev = evRefById.get(eid);
                const weak = ev && !ev.supports;
                return (
                  <span key={eid} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${weak ? "border-white/10 bg-white/[0.02] text-gray-500" : "border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-300"}`} title={ev ? `${ev.label} · ${ev.nature}` : "Case intake record"}>
                    <FileSearch className="w-2.5 h-2.5" />{ev ? `${ev.ref} ${ev.label}` : "Case record"}{ev && !ev.is_primary && <span className="opacity-80">· {ev.result.label}</span>}
                  </span>
                );
              })}
            </div>
          )}
          {!compact && (
            <p className="text-[11px] text-gray-500 mt-2">
              {m.status_meaning}{m.reviewer ? ` Reviewed by ${m.reviewer}.` : ""}
              {raw.created_date ? ` · Created ${new Date(raw.created_date).toLocaleString()}` : ""}
            </p>
          )}
        </div>
        {canReview && onReview && (
          <Button size="sm" variant="outline" onClick={onReview} className="border-cyan-500/30 text-cyan-400 shrink-0">Review</Button>
        )}
      </div>
    </div>
  );
}

function ReviewDialog({ finding, caseId, onClose }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(null);
  const qc = useQueryClient();

  const submit = async (act) => {
    setBusy(act);
    try {
      const user = await getCurrentUser().catch(() => null);
      const newStatus = act === "verify" ? "verified" : act === "reject" ? "rejected" : "under_review";
      await base44.entities.InvestigationFinding.update(finding.id, {
        status: newStatus,
        review_notes: notes,
        reviewer: user?.email,
        reviewer_name: user?.full_name || user?.email,
        review_date: new Date().toISOString(),
        review_history: [
          ...(finding.review_history || []),
          { timestamp: new Date().toISOString(), reviewer: user?.email || "system", action: act, notes },
        ],
      });
      await logAuditEvent({ action: `finding_${act}`, objectType: "finding", objectId: finding.id, caseId, description: `Finding "${finding.title}" ${act}: ${notes}` });
      toast.success(`Finding ${act === "verify" ? "verified" : act === "reject" ? "rejected" : "marked under review"}`);
      qc.invalidateQueries({ queryKey: ["findings", caseId] });
      onClose();
    } catch (e) {
      toast.error("Failed: " + (e.message || e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0f1419] border-white/15 text-white max-w-lg">
        <DialogHeader><DialogTitle className="text-white">Review Finding</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border border-white/10 bg-black/30 p-3">
            <p className="text-sm font-medium text-white">{finding.title}</p>
            {finding.description && <p className="text-xs text-gray-400 mt-1">{finding.description}</p>}
            <div className="flex gap-2 mt-2"><SeverityBadge severity={finding.severity} /><ConfidenceBadge confidence={finding.confidence} /></div>
          </div>
          {finding.evidence_refs?.length > 0 && (
            <p className="text-xs text-gray-400">Evidence refs: {finding.evidence_refs.join(", ")}</p>
          )}
          <div><Textarea placeholder="Review notes…" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white min-h-[80px]" /></div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => submit("verify")} disabled={!!busy} className="border-green-500/30 text-green-400">{busy === "verify" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}Verify</Button>
          <Button variant="outline" onClick={() => submit("reject")} disabled={!!busy} className="border-red-500/30 text-red-400">{busy === "reject" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}Reject</Button>
          <Button variant="outline" onClick={() => submit("request_more")} disabled={!!busy} className="border-amber-500/30 text-amber-400">{busy === "request_more" ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Clock className="w-4 h-4 mr-1.5" />}Under Review</Button>
          <Button variant="outline" onClick={onClose} className="border-white/15 text-gray-200">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}