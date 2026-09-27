import React from "react";
import { Panel, Bar, Tag } from "./panelPrimitives";
import { Gauge } from "lucide-react";

/**
 * Risk analysis panel — deterministic risk score with contributing factors.
 */
export default function RiskPanel({ score = 72, factors, title = "RISK ANALYSIS" }) {
  const rows = factors || [
    { label: "Wallet exposure", value: 84, tone: "red" },
    { label: "Identity exposure", value: 48, tone: "amber" },
    { label: "Transaction complexity", value: 67, tone: "amber" },
    { label: "Jurisdiction risk", value: 55, tone: "amber" },
    { label: "Recovery likelihood", value: 31, tone: "red" },
  ];
  const band = score >= 80 ? { tone: "red", label: "CRITICAL" }
    : score >= 60 ? { tone: "amber", label: "ELEVATED" }
    : score >= 40 ? { tone: "cyan", label: "MODERATE" }
    : { tone: "green", label: "LOW" };

  return (
    <Panel title={title} bodyClass="p-3 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 rounded-md border border-slate-700/60 bg-black/40 flex items-center justify-center">
          <Gauge className={`w-7 h-7 ${band.tone === "red" ? "text-red-400" : band.tone === "amber" ? "text-amber-400" : band.tone === "green" ? "text-emerald-400" : "text-cyan-400"}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-slate-100">{score}</span>
            <span className="text-[10px] font-mono text-slate-500">/ 100</span>
          </div>
          <Tag tone={band.tone}>{band.label}</Tag>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-slate-500 tracking-wider uppercase">{r.label}</span>
              <span className="text-slate-300">{r.value}</span>
            </div>
            <Bar value={r.value} tone={r.tone} />
          </div>
        ))}
      </div>
    </Panel>
  );
}