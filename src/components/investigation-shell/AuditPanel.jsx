import React from "react";
import { Panel, StatusDot, Tag } from "./panelPrimitives";

/**
 * Audit activity panel — immutable, attributable event log.
 */
export default function AuditPanel({ events, title = "AUDIT ACTIVITY" }) {
  const rows = events || [
    { ts: "14:21:03", actor: "investigator@...", action: "FINDING_VERIFIED", obj: "F-1042", tone: "green" },
    { ts: "14:18:51", actor: "mia_agent", action: "RUN_COMPLETED", obj: "RUN-7731", tone: "cyan" },
    { ts: "14:15:22", actor: "investigator@...", action: "EVIDENCE_UPLOADED", obj: "EV-5521", tone: "blue" },
    { ts: "14:02:10", actor: "nova_agent", action: "FINDING_PROPOSED", obj: "F-1041", tone: "amber" },
    { ts: "13:58:44", actor: "investigator@...", action: "CASE_OPENED", obj: "#SN-2026-00421", tone: "cyan" },
  ];
  return (
    <Panel title={title} bodyClass="p-0">
      <div className="divide-y divide-slate-800/70">
        {rows.map((e, i) => (
          <div key={i} className="px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <StatusDot tone={e.tone || "cyan"} />
              <span className="text-[11px] font-mono text-slate-300 truncate">{e.action}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-mono text-slate-500">{e.obj}</span>
              <span className="text-[10px] font-mono text-slate-600">{e.ts}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}