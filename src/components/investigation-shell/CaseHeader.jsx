import React from "react";
import { StatusDot, Tag } from "./panelPrimitives";

/**
 * Case header strip — case id, target, status, risk, findings, evidence, entities.
 * Used at the top of the case workspace.
 */
export default function CaseHeader({ caseId = "#SN-2026-00421", target = "john@example.com", status = "ACTIVE", risk = 87, findings = 7, evidence = 24, entities = 16 }) {
  const stats = [
    { label: "RISK", value: `${risk} / 100`, tone: "amber" },
    { label: "FINDINGS", value: findings, tone: "cyan" },
    { label: "EVIDENCE", value: evidence, tone: "blue" },
    { label: "ENTITIES", value: entities, tone: "purple" },
  ];
  return (
    <div className="rounded-md border border-slate-700/60 bg-[#0a0e13]/80 ic-grid-bg p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-[0.2em] text-slate-500 uppercase">CASE</span>
            <span className="text-sm font-mono font-bold text-cyan-300">{caseId}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-wider text-slate-500 uppercase">TARGET</span>
            <span className="text-[13px] font-mono text-slate-200">{target}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-300">
            <StatusDot tone="green" /> {status}
          </span>
          <Tag tone="amber">RISK {risk}</Tag>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded border border-slate-700/50 bg-black/30 px-2.5 py-2">
            <p className="text-[9px] font-mono tracking-[0.2em] text-slate-500 uppercase">{s.label}</p>
            <p className={`mt-0.5 text-lg font-bold font-mono ${
              s.tone === "amber" ? "text-amber-300" : s.tone === "cyan" ? "text-cyan-300"
              : s.tone === "blue" ? "text-blue-300" : "text-fuchsia-300"}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}