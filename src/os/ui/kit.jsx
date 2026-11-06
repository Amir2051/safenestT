import React from "react";

/** Shared visual primitives for the SafeNestT OS prototype shell. */

const TONES = {
  neutral: "border-os-line2 bg-os-raised text-os-muted",
  info: "border-os-cobalt/40 bg-os-cobalt/10 text-os-cobalt",
  cyan: "border-os-cyan/40 bg-os-cyan/10 text-os-cyan",
  good: "border-os-green/40 bg-os-green/10 text-os-green",
  warn: "border-os-amber/40 bg-os-amber/10 text-os-amber",
  bad: "border-os-red/40 bg-os-red/10 text-os-red",
  violet: "border-os-violet/40 bg-os-violet/10 text-os-violet",
};

export function Pill({ children, tone = "neutral", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE = {
  active: "cyan",
  review: "warn",
  completed: "good",
  intake: "neutral",
  running: "cyan",
  failed: "bad",
  success: "good",
  saved: "good",
  pending: "warn",
  pending_approval: "warn",
  approved: "info",
  draft: "neutral",
  idle: "neutral",
  warning: "warn",
  degraded: "warn",
  operational: "good",
  maintenance: "neutral",
  verified: "good",
  under_review: "info",
  partially_supported: "warn",
  proposed: "neutral",
  quarantined: "bad",
  not_connected: "neutral",
  demo: "info",
  observed: "cyan",
  inference: "violet",
  critical: "bad",
  high: "warn",
  medium: "info",
  low: "good",
};

export function StatusPill({ value, label }) {
  const text = (label || value || "unknown").toString().replace(/_/g, " ");
  return <Pill tone={STATUS_TONE[value] || "neutral"}>{text}</Pill>;
}

export function Panel({ title, subtitle, actions, children, className = "", bodyClassName = "p-4" }) {
  return (
    <section className={`rounded-md border border-os-line bg-os-panel ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-os-line px-4 py-2.5">
          <div className="min-w-0">
            {title && (
              <h2 className="truncate text-[12px] font-semibold uppercase tracking-[0.14em] text-os-text">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-os-muted">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function Tile({ label, value, sub, onClick, icon: Icon, tone = "text-os-text" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`group rounded-md border border-os-line bg-os-panel px-3 py-2.5 text-left transition-colors ${
        onClick ? "hover:border-os-line2 hover:bg-os-raised" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-os-muted">{label}</span>
        {Icon && <Icon className="h-3.5 w-3.5 text-os-muted group-hover:text-os-cyan" strokeWidth={1.75} />}
      </div>
      <div className={`mt-1.5 font-mono text-xl leading-none tabular-nums ${tone}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-os-muted">{sub}</div>}
    </Tag>
  );
}

export function RiskBar({ value, width = "w-16" }) {
  const tone = value >= 80 ? "bg-os-red" : value >= 60 ? "bg-os-amber" : value >= 40 ? "bg-os-cobalt" : "bg-os-green";
  return (
    <div className="flex items-center gap-2">
      <div className={`h-1.5 ${width} overflow-hidden rounded-full bg-os-line`}>
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-os-muted">{value}</span>
    </div>
  );
}

export function Bar({ value, tone = "bg-os-cobalt", className = "h-1.5" }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-os-line ${className}`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function KV({ label, value, mono = false, className = "" }) {
  return (
    <div className={className}>
      <dt className="text-[10px] font-medium uppercase tracking-[0.1em] text-os-muted">{label}</dt>
      <dd className={`mt-0.5 text-[12px] text-os-text ${mono ? "font-mono tabular-nums" : ""}`}>{value ?? "—"}</dd>
    </div>
  );
}

export function SectionTitle({ children, hint }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-os-muted">{children}</h3>
      {hint && <span className="text-[11px] text-os-muted">{hint}</span>}
    </div>
  );
}

export function EmptyNote({ children }) {
  return (
    <div className="rounded border border-dashed border-os-line2 px-3 py-6 text-center text-[11px] text-os-muted">
      {children}
    </div>
  );
}

export const TH = ({ children, className = "" }) => (
  <th className={`whitespace-nowrap px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-os-muted ${className}`}>
    {children}
  </th>
);

export const TD = ({ children, className = "" }) => (
  <td className={`whitespace-nowrap px-3 py-2 text-[12px] text-os-text ${className}`}>{children}</td>
);