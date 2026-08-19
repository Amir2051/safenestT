import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import EmptyState from "@/components/platform/EmptyState";
import SectionHeader from "@/components/platform/SectionHeader";

const ACTION_TYPES = [
  "case_created", "case_imported", "case_modified", "evidence_uploaded", "evidence_deleted", "evidence_modified",
  "target_created", "target_modified", "target_deleted", "target_investigated",
  "investigation_started", "investigation_paused", "investigation_resumed", "investigation_cancelled",
  "finding_verified", "finding_rejected", "finding_review", "report_created", "report_exported",
  "user_login", "user_logout",
];

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-log-all"],
    queryFn: () => base44.entities.AuditEvent.list("-created_date", 500),
  });

  const filtered = events.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [e.action, e.description, e.actor, e.actor_name, e.object_type].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <SectionHeader title="Audit / Activity Center" description="Complete audit trail of all investigator actions and Hermes events. Every action is logged and auditable." icon={ScrollText} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search by action, actor, or description…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#0f1419] border-white/10 text-white" />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full sm:w-56 bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Action type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All actions</SelectItem>{ACTION_TYPES.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <EmptyState variant="loading" title="Loading audit log…" />
      ) : filtered.length === 0 ? (
        <EmptyState variant="empty" icon={ScrollText} title={events.length === 0 ? "No audit events yet" : "No events match your filters"} description={events.length === 0 ? "Investigator actions (case creation, evidence upload, target management, investigation control, finding reviews, report exports) and Hermes agent events are logged here." : "Try adjusting your search or filters."} />
      ) : (
        <div className="rounded-lg border border-white/10 divide-y divide-white/5">
          {filtered.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 p-3">
              <div className="w-8 h-8 rounded-md border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0">
                <ScrollText className="w-4 h-4 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{ev.action?.replace(/_/g, " ")}</Badge>
                  <span className="text-xs text-gray-300">{ev.actor_name || ev.actor}</span>
                  {ev.object_type && <span className="text-xs text-gray-600">→ {ev.object_type}</span>}
                  {ev.source === "hermes" && <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]">Hermes</Badge>}
                </div>
                <p className="text-xs text-gray-300 mt-0.5">{ev.description}</p>
                <p className="text-xs text-gray-600">{new Date(ev.created_date || ev.timestamp).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}