import React from "react";

/**
 * Shared primitives for the SafeNestT investigation command-center UI.
 * Graphite panels, thin borders, monospace telemetry, restrained accents.
 */

export function Panel({ title, actions = null, className = "", bodyClass = "p-3", children }) {
  return (
    <div className={`relative rounded-md border border-slate-700/60 bg-[#0a0e13]/80 backdrop-blur-sm ic-grid-bg ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 px-3 h-9 border-b border-slate-700/50 shrink-0">
          {title && (
            <h3 className="text-[11px] font-mono font-semibold tracking-[0.2em] text-slate-300 uppercase truncate">
              {title}
            </h3>
          )}
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

export function StatusDot({ tone = "green", pulse = true, className = "" }) {
  const map = {
    green: "bg-emerald-400", cyan: "bg-cyan-400", amber: "bg-amber-400",
    red: "bg-red-400", blue: "bg-blue-400", gray: "bg-slate-500", purple: "bg-fuchsia-400",
  };
  return (
    <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[tone] || map.green} ${pulse ? "animate-pulse" : ""} ${className}`} />
  );
}

export function Bar({ value = 0, tone = "cyan", className = "" }) {
  const map = {
    cyan: "bg-cyan-400", blue: "bg-blue-400", green: "bg-emerald-400",
    amber: "bg-amber-400", red: "bg-red-400", purple: "bg-fuchsia-400", slate: "bg-slate-500",
  };
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`h-1.5 w-full rounded-sm bg-slate-800/80 overflow-hidden ${className}`}>
      <div className={`h-full ${map[tone] || map.cyan} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Telemetry({ label, value, valueClass = "text-slate-200" }) {
  return (
    <div className="flex items-center justify-between text-[11px] font-mono py-0.5">
      <span className="text-slate-500 tracking-wider uppercase">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

export function Tag({ children, tone = "slate" }) {
  const map = {
    slate: "border-slate-600/60 text-slate-300 bg-slate-800/40",
    cyan: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
    green: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    amber: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    red: "border-red-500/40 text-red-300 bg-red-500/10",
    blue: "border-blue-500/40 text-blue-300 bg-blue-500/10",
    purple: "border-fuchsia-500/40 text-fuchsia-300 bg-fuchsia-500/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono uppercase tracking-wider ${map[tone] || map.slate}`}>
      {children}
    </span>
  );
}

export function SectionLabel({ children, className = "" }) {
  return (
    <p className={`text-[10px] font-mono font-semibold tracking-[0.24em] text-cyan-500/70 uppercase ${className}`}>
      {children}
    </p>
  );
}

export function MetricStat({ label, value, tone = "cyan", hint }) {
  const toneText = {
    cyan: "text-cyan-300", green: "text-emerald-300", amber: "text-amber-300",
    red: "text-red-300", blue: "text-blue-300", slate: "text-slate-200",
  };
  return (
    <div className="rounded-md border border-slate-700/50 bg-[#0a0e13] px-3 py-2.5">
      <p className="text-[9px] font-mono tracking-[0.2em] text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-bold font-mono ${toneText[tone] || toneText.cyan}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-500 font-mono">{hint}</p>}
    </div>
  );
}