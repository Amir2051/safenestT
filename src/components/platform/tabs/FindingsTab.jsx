import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import EmptyState from "@/components/platform/EmptyState";
import { SeverityBadge, ConfidenceBadge, FINDING_STATUS_STYLES } from "@/components/platform/investigationStyles";
import { logAuditEvent } from "@/lib/auditLogger";
import { getCurrentUser } from "@/lib/tenantContext";
import { toast } from "sonner";

/**
 * Findings — reads real, persisted InvestigationFinding records (created by
 * the Analysis phase of the investigation runner). AI findings start as
 * "proposed" and require investigator review. Review actions persist status
 * changes + an auditable review_history entry on the entity itself.
 */
export default function FindingsTab({ caseId }) {
  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["findings", caseId],
    queryFn: () => base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 200),
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

  return <FindingsList findings={findings} caseId={caseId} />;
}

function FindingsList({ findings, caseId }) {
  const [reviewFinding, setReviewFinding] = useState(null);
  return (
    <>
      <div className="space-y-3">
        {findings.map((finding) => {
          const statusCls = FINDING_STATUS_STYLES[finding.status] || FINDING_STATUS_STYLES.proposed;
          return (
            <div key={finding.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-medium text-white">{finding.title}</p>
                    <SeverityBadge severity={finding.severity} />
                    <ConfidenceBadge confidence={finding.confidence} />
                    <Badge variant="outline" className={`text-[10px] capitalize ${statusCls}`}>{(finding.status || "proposed").replace(/_/g, " ")}</Badge>
                    {finding.source === "ai_run" && <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-400">AI</Badge>}
                  </div>
                  {finding.description && <p className="text-xs text-gray-400">{finding.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {finding.category && <span className="capitalize">{finding.category.replace(/_/g, " ")}</span>}
                    {finding.evidence_refs?.length > 0 && <span>{finding.evidence_refs.length} evidence ref(s)</span>}
                    {finding.created_date && <span>{new Date(finding.created_date).toLocaleString()}</span>}
                  </div>
                </div>
                {(finding.status === "proposed" || finding.status === "under_review") && (
                  <Button size="sm" variant="outline" onClick={() => setReviewFinding(finding)} className="border-cyan-500/30 text-cyan-400 shrink-0">Review</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {reviewFinding && <ReviewDialog finding={reviewFinding} caseId={caseId} onClose={() => setReviewFinding(null)} />}
    </>
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