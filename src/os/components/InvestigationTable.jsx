import React from "react";
import { useNavigate } from "react-router-dom";
import { StatusPill, RiskBar, Bar, TD, TH } from "@/os/ui/kit";

const PROGRESS_TONE = (p) => (p >= 100 ? "bg-os-green" : p >= 60 ? "bg-os-cyan" : "bg-os-cobalt");

export default function InvestigationTable({ rows, compact = false }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-os-line">
            <TH>Case</TH>
            <TH>Status</TH>
            <TH>Priority</TH>
            {!compact && <TH>Assignee</TH>}
            <TH>Risk</TH>
            <TH>Progress</TH>
            {!compact && <TH>Last activity</TH>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.code}
              onClick={() => navigate(`/os/investigations/${r.code}`)}
              className="cursor-pointer border-b border-os-line/60 last:border-b-0 hover:bg-os-raised"
            >
              <TD className="max-w-[340px]">
                <div className="truncate text-[12.5px] font-medium text-os-text">{r.title}</div>
                <div className="font-mono text-[10px] text-os-muted">
                  {r.code} · {r.type}
                </div>
              </TD>
              <TD><StatusPill value={r.status} /></TD>
              <TD><StatusPill value={r.priority} /></TD>
              {!compact && <TD className="text-os-muted">{r.assignee}</TD>}
              <TD><RiskBar value={r.risk} /></TD>
              <TD className="w-[120px]">
                <div className="flex items-center gap-2">
                  <Bar value={r.progress} tone={PROGRESS_TONE(r.progress)} className="h-1" />
                  <span className="w-8 shrink-0 font-mono text-[10px] tabular-nums text-os-muted">{r.progress}%</span>
                </div>
              </TD>
              {!compact && <TD className="text-os-muted">{r.lastActivity}</TD>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}