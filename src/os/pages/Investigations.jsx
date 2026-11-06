import React, { useMemo, useState } from "react";
import { Plus, Search, X, SlidersHorizontal } from "lucide-react";
import InvestigationTable from "@/os/components/InvestigationTable";
import { Panel, Pill } from "@/os/ui/kit";
import { INVESTIGATIONS, TEAM } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const SELECT = "h-8 rounded border border-os-line bg-os-panel px-2 text-[11.5px] text-os-text focus:border-os-cobalt focus:outline-none";

export default function Investigations() {
  const demoAction = useDemoToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return INVESTIGATIONS.filter((i) => {
      const matchQ = !needle || `${i.code} ${i.title} ${i.type} ${i.tags.join(" ")}`.toLowerCase().includes(needle);
      return matchQ && (status === "all" || i.status === status) && (priority === "all" || i.priority === priority) &&
        (assignee === "all" || i.assignee === assignee);
    });
  }, [q, status, priority, assignee]);

  const clear = () => { setQ(""); setStatus("all"); setPriority("all"); setAssignee("all"); };
  const dirty = q || status !== "all" || priority !== "all" || assignee !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Investigations</h1>
          <p className="text-[11.5px] text-os-muted">All matters across the workspace · {INVESTIGATIONS.length} synthetic records</p>
        </div>
        <button
          onClick={() => demoAction("Creating an investigation")}
          className="flex items-center gap-1.5 rounded bg-os-cobalt px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-os-cobalt2"
        >
          <Plus className="h-3.5 w-3.5" /> New investigation
        </button>
      </div>

      <Panel bodyClassName="p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-os-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by case number, title, type or tag"
              className="h-8 w-full rounded border border-os-line bg-os-bg pl-7 pr-7 text-[11.5px] text-os-text placeholder:text-os-muted/70 focus:border-os-cobalt focus:outline-none"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-os-muted hover:text-os-text">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="review">In review</option>
            <option value="intake">Intake</option>
            <option value="completed">Completed</option>
          </select>

          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={SELECT}>
            <option value="all">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={SELECT}>
            <option value="all">All investigators</option>
            {TEAM.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
            <option value="Unassigned">Unassigned</option>
          </select>

          {dirty && (
            <button onClick={clear} className="flex items-center gap-1 rounded border border-os-line px-2 py-1.5 text-[11px] text-os-muted hover:text-os-text">
              <X className="h-3 w-3" /> Clear
            </button>
          )}

          <span className="ml-auto flex items-center gap-1.5 text-[11px] text-os-muted">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {rows.length} of {INVESTIGATIONS.length} shown
          </span>
        </div>
      </Panel>

      <Panel bodyClassName="p-0">
        {rows.length ? (
          <InvestigationTable rows={rows} />
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-[12.5px] text-os-text">No investigations match these filters.</p>
            <p className="mt-1 text-[11.5px] text-os-muted">Adjust the search or clear the filter set.</p>
            <button onClick={clear} className="mt-3 rounded border border-os-line px-2.5 py-1.5 text-[11px] text-os-cyan hover:bg-os-raised">
              Reset filters
            </button>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-os-muted">
        <Pill tone="neutral">status</Pill>
        <Pill tone="warn">priority</Pill>
        <Pill tone="cyan">risk</Pill>
        <span>Rows are clickable — the full workspace opens for each matter.</span>
      </div>
    </div>
  );
}