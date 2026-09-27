import React from "react";
import { Panel, Bar, Tag, StatusDot } from "./panelPrimitives";
import { FileText, CheckCircle2, Clock } from "lucide-react";

/**
 * Dossier generation panel — shows classified sections + export readiness.
 */
export default function DossierPanel({ title = "DOSSIER GENERATION" }) {
  const sections = [
    { name: "Executive Summary", cls: "analysis", done: true },
    { name: "Evidence Register", cls: "evidence", done: true },
    { name: "Entity Map", cls: "fact", done: true },
    { name: "Blockchain Trace", cls: "evidence", done: true },
    { name: "Findings & Risk", cls: "analysis", done: false },
    { name: "Recommended Actions", cls: "inference", done: false },
  ];
  const clsTone = {
    fact: "green", evidence: "blue", analysis: "cyan", inference: "purple", hypothesis: "amber", unknown: "slate",
  };
  const done = sections.filter((s) => s.done).length;
  return (
    <Panel title={title} bodyClass="p-3 space-y-3">
      <div>
        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
          <span className="text-slate-500 tracking-wider uppercase">Generation</span>
          <span className="text-cyan-300">{done}/{sections.length} SECTIONS</span>
        </div>
        <Bar value={(done / sections.length) * 100} tone="cyan" />
      </div>
      <div className="divide-y divide-slate-800/70">
        {sections.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[12px] text-slate-200">{s.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag tone={clsTone[s.cls]}>{s.cls}</Tag>
              {s.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                : <Clock className="w-3.5 h-3.5 text-amber-400" />}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Tag tone="green"><StatusDot tone="green" pulse={false} /> PDF</Tag>
        <Tag tone="cyan"><StatusDot tone="cyan" pulse={false} /> MARKDOWN</Tag>
        <Tag tone="slate"><StatusDot tone="gray" pulse={false} /> JSON</Tag>
      </div>
    </Panel>
  );
}