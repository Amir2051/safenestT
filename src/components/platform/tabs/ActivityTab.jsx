import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Cpu, ScrollText, CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";
import { AGENT_STYLES } from "@/components/platform/investigationStyles";

const SUB_TABS = [
  { key: "agents", label: "AI Run History", icon: Cpu },
  { key: "audit", label: "Case Audit Log", icon: ScrollText },
];

export default function ActivityTab({ caseId }) {
  const [sub, setSub] = useState("agents");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        {SUB_TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${sub === t.key ? "text-cyan-300 border-b-2 border-cyan-400 bg-cyan-500/[0.04]" : "text-gray-400 hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>
      {sub === "agents" && <RunHistory caseId={caseId} />}
      {sub === "audit" && <CaseAuditLog caseId={caseId} />}
    </div>
  );
}

function RunHistory({ caseId }) {
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["investigation-runs-activity", caseId],
    queryFn: () => base44.entities.InvestigationRun.filter({ case_id: caseId }, "-started_at", 100),
    enabled: !!caseId,
  });

  if (isLoading) return <EmptyState variant="loading" title="Loading run history…" />;
  if (!runs.length)
    return <EmptyState variant="empty" icon={Cpu} title="No AI runs yet" description="Run a phase in the Investigation Engine. Each execution is persisted here with its provider, model, status, and duration — including the multi-agent analysis specialists." />;

  return (
    <div className="rounded-lg border border-white/10 divide-y divide-white/5">
      {runs.map((r) => {
        const agents = r.output?.agents_run || (r.phase === "analysis" ? [] : null);
        const failed = r.output?.agents_failed || [];
        return (
          <div key={r.id} className="flex items-start gap-3 p-3">
            <div className="w-8 h-8 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize border-cyan-500/30 text-cyan-400 text-[10px]">{r.phase.replace(/_/g, " ")}</Badge>
                <span className="text-xs text-gray-300 font-mono truncate">{r.provider}/{r.model}</span>
                {r.status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : r.status === "failed" ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                {r.duration_ms != null && <span className="text-[11px] text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{(r.duration_ms / 1000).toFixed(1)}s</span>}
              </div>
              {agents?.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {agents.map((a) => <AgentBadge key={a} agent={a} />)}
                </div>
              )}
              {failed.length > 0 && (
                <p className="text-[11px] text-red-400 mt-1">Failed agents: {failed.map((f) => f.analyst || f).join(", ")}</p>
              )}
              {r.status === "failed" && r.error && <p className="text-[11px] text-red-300 mt-1">{r.error}</p>}
              <p className="text-[11px] text-gray-600 mt-0.5">{r.started_at ? new Date(r.started_at).toLocaleString() : ""}{r.run_by_email ? ` · ${r.run_by_email}` : ""}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentBadge({ agent }) {
  const a = AGENT_STYLES[agent];
  if (!a) return <Badge variant="outline" className="text-[9px] border-white/15 text-gray-400 capitalize">{String(agent).replace(/_/g, " ")}</Badge>;
  return <Badge variant="outline" className={`text-[9px] capitalize ${a.cls}`}>{a.label}</Badge>;
}

function CaseAuditLog({ caseId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events", caseId],
    queryFn: () => base44.entities.AuditEvent.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });

  if (isLoading) return <EmptyState variant="loading" title="Loading audit log…" />;
  if (events.length === 0)
    return <EmptyState variant="empty" icon={ScrollText} title="No audit events yet" description="Investigator actions (case creation, evidence upload, target creation, investigation runs, finding reviews, report exports) are logged here." />;

  return (
    <div className="rounded-lg border border-white/10 divide-y divide-white/5">
      {events.map((ev) => (
        <div key={ev.id} className="flex items-start gap-3 p-3">
          <div className="w-8 h-8 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
            <ScrollText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{ev.action}</Badge>
              <span className="text-xs text-gray-500">{ev.actor_name || ev.actor}</span>
              {ev.source === "hermes" && <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]">Hermes</Badge>}
              {ev.source === "ai_run" && <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">AI</Badge>}
            </div>
            <p className="text-xs text-gray-300 mt-0.5">{ev.description}</p>
            <p className="text-[11px] text-gray-600">{new Date(ev.created_date || ev.timestamp).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}