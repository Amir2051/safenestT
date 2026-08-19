import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Cpu, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import HermesPanel from "@/components/platform/HermesPanel";
import { HermesAPI } from "@/lib/hermesClient";
import EmptyState from "@/components/platform/EmptyState";

const SUB_TABS = [
  { key: "agents", label: "Agent Activity", icon: Cpu },
  { key: "audit", label: "Case Audit Log", icon: ScrollText },
];

export default function ActivityTab({ caseId, hermesState }) {
  const [sub, setSub] = useState("agents");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        {SUB_TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${sub === t.key ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/[0.04]" : "text-gray-400 hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>
      {sub === "agents" && <AgentActivity caseId={caseId} hermesState={hermesState} />}
      {sub === "audit" && <CaseAuditLog caseId={caseId} />}
    </div>
  );
}

function AgentActivity({ caseId, hermesState }) {
  return (
    <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="agent-activity" fetcher={HermesAPI.getAgentActivity}
      emptyTitle="No agent activity yet" emptyDescription="Agent events are returned by Hermes during investigation. The frontend never fabricates agent activity. When Hermes executes agents, their actions will appear here."
      render={(data) => {
        const events = Array.isArray(data) ? data : data?.events || data?.agent_activity || [];
        if (events.length === 0) return <div className="rounded-lg border border-white/10 p-8 text-center"><p className="text-sm text-gray-500">No agent events returned by Hermes.</p></div>;
        return (
          <div className="rounded-lg border border-white/10 divide-y divide-white/5">
            {events.map((event, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <div className="w-8 h-8 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white">{event.agent || event.agent_name || "Agent"}</p>
                    {event.action && <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">{event.action}</Badge>}
                    {event.status && <Badge variant="outline" className={`text-[10px] ${event.status === "success" ? "border-green-500/30 text-green-400" : event.status === "failed" ? "border-red-500/30 text-red-400" : "border-white/10 text-gray-400"}`}>{event.status}</Badge>}
                  </div>
                  {event.description && <p className="text-xs text-gray-400 mt-0.5">{event.description}</p>}
                  {event.timestamp && <p className="text-xs text-gray-600 mt-0.5">{new Date(event.timestamp).toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        );
      }} />
  );
}

function CaseAuditLog({ caseId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events", caseId],
    queryFn: () => base44.entities.AuditEvent.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });

  if (isLoading) return <EmptyState variant="loading" title="Loading audit log…" />;
  if (events.length === 0) {
    return <EmptyState variant="empty" icon={ScrollText} title="No audit events yet" description="Investigator actions (case creation, evidence upload, target creation, investigation control, finding reviews, report exports) are logged here. Hermes agent events appear when actually returned by Hermes." />;
  }
  return (
    <div className="rounded-lg border border-white/10 divide-y divide-white/5">
      {events.map((ev) => (
        <div key={ev.id} className="flex items-start gap-3 p-3">
          <div className="w-8 h-8 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
            <ScrollText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{ev.action}</Badge>
              <span className="text-xs text-gray-500">{ev.actor_name || ev.actor}</span>
              {ev.source === "hermes" && <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]">Hermes</Badge>}
            </div>
            <p className="text-xs text-gray-300 mt-0.5">{ev.description}</p>
            <p className="text-xs text-gray-600">{new Date(ev.created_date || ev.timestamp).toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}