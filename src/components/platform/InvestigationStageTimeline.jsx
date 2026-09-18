import React from "react";
import { CheckCircle2, XCircle, Loader2, Circle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visual horizontal stage timeline for the investigation pipeline.
 * Shows each phase as a node with its live status, connected by a progress
 * rail. Responsive: scrolls horizontally on small screens.
 *
 * Props:
 *  - phases: [{ id, label, description }]
 *  - statuses: { [phaseId]: "pending" | "running" | "completed" | "failed" }
 *  - running:  phaseId currently executing (optional)
 *  - current:  phaseId the workflow cursor is on (optional)
 *  - onSelect: (phaseId) => void  — clicking a node triggers its run
 *  - disabled: boolean — disable all interactions
 */
const NODE = {
  pending: { Icon: Circle, cls: "border-white/15 text-gray-500 bg-white/[0.02]", rail: "bg-white/10" },
  running: { Icon: Loader2, cls: "border-cyan-400/60 text-cyan-300 bg-cyan-500/10", rail: "bg-cyan-500/40", spin: true },
  completed: { Icon: CheckCircle2, cls: "border-green-400/50 text-green-300 bg-green-500/10", rail: "bg-green-500/50" },
  failed: { Icon: XCircle, cls: "border-red-400/50 text-red-300 bg-red-500/10", rail: "bg-red-500/40" },
};

export default function InvestigationStageTimeline({ phases, statuses = {}, running, current, onSelect, disabled }) {
  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <ol className="flex items-stretch gap-0 min-w-max">
        {phases.map((ph, i) => {
          const st = running === ph.id ? "running" : statuses[ph.id] || "pending";
          const cfg = NODE[st] || NODE.pending;
          const isCurrent = current === ph.id;
          const last = i === phases.length - 1;
          const nextDone = !last && (statuses[phases[i + 1].id] === "completed");
          return (
            <li key={ph.id} className="flex items-stretch">
              <button
                type="button"
                onClick={() => !disabled && onSelect?.(ph.id)}
                disabled={disabled}
                className={cn(
                  "group flex flex-col items-center text-center w-28 sm:w-32 shrink-0 rounded-lg border p-2 transition-colors",
                  cfg.cls,
                  isCurrent && "ring-1 ring-cyan-400/40",
                  !disabled && "hover:brightness-125 cursor-pointer",
                  disabled && "cursor-default"
                )}
                title={ph.description}
              >
                <cfg.Icon className={cn("w-5 h-5 mb-1", cfg.spin && "animate-spin")} />
                <span className="text-[11px] font-medium text-white leading-tight">{ph.label}</span>
                <span className={cn("text-[9px] uppercase tracking-wide mt-0.5", cfg.cls.split(" ").find((c) => c.startsWith("text-")))}>{st}</span>
              </button>
              {!last && (
                <div className="flex items-center self-center px-1">
                  <div className={cn("h-0.5 w-6 sm:w-8 rounded-full", nextDone ? "bg-green-500/50" : "bg-white/10")}>
                    <ChevronRight className="hidden" />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}