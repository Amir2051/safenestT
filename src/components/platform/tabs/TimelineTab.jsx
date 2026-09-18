import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import EmptyState from "@/components/platform/EmptyState";

/**
 * TimelineTab — reconstructs the investigation timeline from REAL persisted
 * records (audit events, AI runs, findings, evidence uploads). No data is
 * fabricated; empty state is honest when nothing has happened yet.
 */
const EVENT_TYPES = ["incident", "evidence_upload", "wallet_activity", "entity_discovery", "agent_action", "finding", "review", "investigator_action", "report_generation", "investigation_run"];

export default function TimelineTab({ caseId }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: audit = [], isLoading: auditLoading } = useQuery({
    queryKey: ["audit-events", caseId],
    queryFn: () => base44.entities.AuditEvent.filter({ case_id: caseId }, "-timestamp", 200),
    enabled: !!caseId,
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["investigation-runs", caseId],
    queryFn: () => base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 200),
    enabled: !!caseId,
  });
  const { data: findings = [] } = useQuery({
    queryKey: ["findings", caseId],
    queryFn: () => base44.entities.InvestigationFinding.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });
  const { data: evidence = [] } = useQuery({
    queryKey: ["evidence", caseId],
    queryFn: () => base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });

  const events = useMemo(() => {
    const list = [];
    (audit || []).forEach((a) => list.push({
      type: a.action?.startsWith("investigation_run") ? "investigation_run" : a.action?.includes("evidence") ? "evidence_upload" : a.action?.includes("finding") ? "finding" : "investigator_action",
      title: a.description || a.action,
      source: a.source || "user",
      timestamp: a.timestamp || a.created_date,
      severity: null,
    }));
    (runs || []).forEach((r) => list.push({
      type: "investigation_run",
      title: `Phase "${r.phase}" ${r.status} via ${r.provider}/${r.model}`,
      source: "ai_run",
      timestamp: r.completed_at || r.started_at || r.created_date,
      severity: r.status === "failed" ? "high" : null,
    }));
    (findings || []).forEach((f) => list.push({
      type: "finding",
      title: f.title,
      source: f.source,
      timestamp: f.created_date,
      severity: f.severity,
    }));
    (evidence || []).forEach((e) => list.push({
      type: "evidence_upload",
      title: `Evidence uploaded: ${e.filename}`,
      source: e.source,
      timestamp: e.uploaded_at || e.created_date,
      severity: null,
    }));
    return list.filter((e) => e.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [audit, runs, findings, evidence]);

  const filtered = events.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!String(e.title || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (auditLoading && events.length === 0) return <EmptyState variant="loading" title="Loading timeline…" />;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search timeline…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#0f1419] border-white/10 text-white" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48 bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Event type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All event types</SelectItem>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState variant="empty" icon={GitBranch} title="No timeline events yet"
          description="The timeline is reconstructed from real audit events, AI runs, findings, and evidence uploads for this case. Activity will appear here as the investigation progresses." />
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
          <div className="space-y-3">
            {filtered.map((event, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-cyan-500/60 ring-2 ring-cyan-500/20" />
                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] capitalize">{(event.type || "event").replace(/_/g, " ")}</Badge>
                    {event.severity && <Badge variant="outline" className={`text-[10px] capitalize ${event.severity === "critical" ? "border-red-500/30 text-red-400" : event.severity === "high" ? "border-amber-500/30 text-amber-400" : "border-white/10 text-gray-400"}`}>{event.severity}</Badge>}
                    {event.source && <Badge variant="outline" className="border-white/10 text-gray-500 text-[10px] capitalize">{event.source.replace(/_/g, " ")}</Badge>}
                    <span className="text-xs text-gray-500 ml-auto">{event.timestamp ? new Date(event.timestamp).toLocaleString() : "—"}</span>
                  </div>
                  <p className="text-sm text-gray-200">{event.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}