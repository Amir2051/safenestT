import React from "react";
import { Tag } from "./panelPrimitives";
import { Crosshair, ClipboardList, Download, FileSearch, GitCompare, ShieldCheck, Gauge, FolderOpen } from "lucide-react";

/**
 * Horizontal investigation pipeline: TARGET → ... → DOSSIER.
 * Connected nodes with system indicators. Scrollable on small screens.
 */
const STAGES = [
  { label: "TARGET", icon: Crosshair, tone: "cyan" },
  { label: "PLANNING", icon: ClipboardList, tone: "cyan" },
  { label: "COLLECTION", icon: Download, tone: "cyan" },
  { label: "EVIDENCE", icon: FileSearch, tone: "blue" },
  { label: "CORRELATION", icon: GitCompare, tone: "purple" },
  { label: "REALITY CHECK", icon: ShieldCheck, tone: "amber" },
  { label: "RISK", icon: Gauge, tone: "amber" },
  { label: "DOSSIER", icon: FolderOpen, tone: "green" },
];

const toneRing = {
  cyan: "border-cyan-500/40 text-cyan-300",
  blue: "border-blue-500/40 text-blue-300",
  purple: "border-fuchsia-500/40 text-fuchsia-300",
  amber: "border-amber-500/40 text-amber-300",
  green: "border-emerald-500/40 text-emerald-300",
};

export default function InvestigationPipeline({ activeIndex = 2, simulated = false }) {
  return (
    <div className="rounded-md border border-slate-700/60 bg-[#0a0e13]/80 ic-grid-bg">
      <div className="flex items-center justify-between px-3 h-9 border-b border-slate-700/50">
        <h3 className="text-[11px] font-mono font-semibold tracking-[0.2em] text-slate-300 uppercase">
          INVESTIGATION PIPELINE
        </h3>
        {simulated && <Tag tone="amber">SIMULATED</Tag>}
      </div>

      <div className="p-3 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 min-w-max">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const active = i === activeIndex;
            const done = i < activeIndex;
            return (
              <React.Fragment key={s.label}>
                <div className={`flex flex-col items-center gap-1.5 w-[88px] shrink-0`}>
                  <div className={`w-10 h-10 rounded-md border ${toneRing[s.tone]} bg-black/40 flex items-center justify-center relative ${active ? "ring-2 ring-offset-0 ring-cyan-500/30" : ""}`}>
                    <Icon className="w-4 h-4" />
                    {active && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                    {done && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />}
                  </div>
                  <span className={`text-[9px] font-mono tracking-wider uppercase ${active ? "text-cyan-300" : done ? "text-emerald-300" : "text-slate-500"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STAGES.length - 1 && (
                  <div className={`h-px w-6 ${done ? "bg-emerald-500/50" : "bg-slate-700"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}