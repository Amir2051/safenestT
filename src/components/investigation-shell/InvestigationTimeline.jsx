import React from "react";
import { Panel, StatusDot, Tag } from "./panelPrimitives";

/**
 * Vertical investigation timeline.
 */
const toneFor = (s) => ({
  info: "cyan", success: "green", warning: "amber", critical: "red",
}[s] || "slate");

export default function InvestigationTimeline({ events, title = "INVESTIGATION TIMELINE" }) {
  const rows = events || [
    { ts: "2026-09-26 13:40", title: "Case opened", sev: "info", detail: "Target example@email.com registered." },
    { ts: "2026-09-26 13:52", title: "Evidence collected", sev: "info", detail: "3 blockchain transactions imported." },
    { ts: "2026-09-26 14:05", title: "Entities correlated", sev: "success", detail: "Wallet ↔ domain link established." },
    { ts: "2026-09-26 14:11", title: "Risk threshold exceeded", sev: "warning", detail: "Risk score crossed 80." },
    { ts: "2026-09-26 14:20", title: "Finding proposed", sev: "critical", detail: "Cash-out cluster flagged by Nova." },
  ];
  return (
    <Panel title={title} bodyClass="p-3">
      <div className="relative pl-4">
        <div className="absolute left-1 top-1 bottom-1 w-px bg-slate-700/60" />
        {rows.map((e, i) => (
          <div key={i} className="relative pb-4 last:pb-0">
            <span className="absolute -left-[13px] top-1">
              <StatusDot tone={toneFor(e.sev)} />
            </span>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-slate-200">{e.title}</p>
              <span className="text-[10px] font-mono text-slate-500">{e.ts}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{e.detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}