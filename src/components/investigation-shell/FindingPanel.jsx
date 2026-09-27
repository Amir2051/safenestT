import React from "react";
import { Panel, Tag, Bar } from "./panelPrimitives";

/**
 * Findings list — AI findings start as 'proposed' and are NOT auto-verified.
 */
export default function FindingPanel({ items, title = "FINDINGS" }) {
  const rows = items || [
    { title: "Shared wallet operator pattern", severity: "high", confidence: "MEDIUM", status: "proposed", score: 62 },
    { title: "Exchange cash-out cluster identified", severity: "critical", confidence: "HIGH", status: "under_review", score: 81 },
    { title: "Domain registrant overlap", severity: "medium", confidence: "LOW", status: "proposed", score: 38 },
    { title: "Confirmed victim fund path", severity: "high", confidence: "HIGH", status: "verified", score: 94 },
  ];

  const sev = {
    critical: { tone: "red", text: "text-red-400" },
    high: { tone: "amber", text: "text-amber-400" },
    medium: { tone: "cyan", text: "text-cyan-400" },
    low: { tone: "slate", text: "text-slate-400" },
  };
  const statusTone = {
    proposed: "amber", under_review: "cyan", verified: "green", rejected: "red", superseded: "slate",
  };

  return (
    <Panel title={title} bodyClass="p-0">
      <div className="divide-y divide-slate-800/70">
        {rows.map((f, i) => (
          <div key={i} className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[12px] text-slate-200 truncate">{f.title}</p>
              <Tag tone={sev[f.severity]?.tone || "slate"}>{f.severity}</Tag>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5">
              <span>CONF: <span className="text-slate-300">{f.confidence}</span></span>
              <Tag tone={statusTone[f.status] || "slate"}>{f.status.replace("_", " ")}</Tag>
            </div>
            <Bar value={f.score} tone={sev[f.severity]?.tone || "cyan"} />
          </div>
        ))}
      </div>
    </Panel>
  );
}