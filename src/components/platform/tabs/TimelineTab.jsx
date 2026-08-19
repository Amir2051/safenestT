import React, { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import HermesPanel from "@/components/platform/HermesPanel";
import { HermesAPI } from "@/lib/hermesClient";

const EVENT_TYPES = ["incident", "evidence_upload", "transaction", "wallet_activity", "entity_discovery", "agent_action", "finding", "review", "investigator_action", "report_generation"];

export default function TimelineTab({ caseId, hermesState }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  return (
    <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="timeline" fetcher={HermesAPI.getTimeline}
      emptyTitle="No timeline events yet" emptyDescription="The investigation timeline is reconstructed by Hermes. Events will appear here when Hermes processes the case."
      render={(data) => {
        const events = Array.isArray(data) ? data : data?.events || data?.timeline || [];
        const filtered = events.filter((e) => {
          if (typeFilter !== "all" && (e.event_type || e.type) !== typeFilter) return false;
          if (search) {
            const q = search.toLowerCase();
            const hay = [e.description, e.event_title, e.title, e.event, e.entity, e.source].filter(Boolean).join(" ").toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        if (filtered.length === 0) return <div className="rounded-lg border border-white/10 p-8 text-center"><p className="text-sm text-gray-500">No events match your filters.</p></div>;
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
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
              <div className="space-y-3">
                {filtered.map((event, i) => {
                  const type = event.event_type || event.type || "event";
                  const ts = event.timestamp || event.date || event.created_date;
                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-cyan-500/60 ring-2 ring-cyan-500/20" />
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] capitalize">{type.replace(/_/g, " ")}</Badge>
                          {event.severity && <Badge variant="outline" className={`text-[10px] capitalize ${event.severity === "critical" ? "border-red-500/30 text-red-400" : event.severity === "high" ? "border-amber-500/30 text-amber-400" : "border-white/10 text-gray-400"}`}>{event.severity}</Badge>}
                          <span className="text-xs text-gray-500 ml-auto">{ts ? new Date(ts).toLocaleString() : "—"}</span>
                        </div>
                        <p className="text-sm text-gray-200">{event.description || event.event_title || event.title || event.event}</p>
                        {(event.source || event.entity) && <p className="text-xs text-gray-500 mt-1">{event.source && `Source: ${event.source}`}{event.source && event.entity ? " • " : ""}{event.entity && `Entity: ${event.entity}`}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }} />
  );
}