import React from "react";
import { Panel, Telemetry, StatusDot, Bar, Tag } from "./panelPrimitives";

/**
 * Compact intelligence console for the public homepage right column.
 * Static presentation telemetry — clearly labelled SIMULATED.
 */
export function IntelligencePanel() {
  return (
    <Panel
      title="MIA // INTELLIGENCE CONSOLE"
      actions={<Tag tone="amber">SIMULATED</Tag>}
      bodyClass="p-3 space-y-2.5"
    >
      <Telemetry label="Active Investigations" value="24" valueClass="text-cyan-300" />
      <Telemetry label="Evidence Collected" value="1,842" valueClass="text-slate-200" />
      <Telemetry label="Findings" value="317" valueClass="text-slate-200" />
      <div>
        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
          <span className="text-slate-500 tracking-wider uppercase">Risk Level</span>
          <span className="text-amber-400">ELEVATED</span>
        </div>
        <Bar value={67} tone="amber" />
      </div>
      <div className="pt-2 border-t border-slate-700/40 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
            <StatusDot tone="green" /> AI Agents
          </span>
          <span className="text-emerald-300">6 ONLINE</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
            <StatusDot tone="cyan" /> Threat Intel
          </span>
          <span className="text-cyan-300">CONNECTED</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
            <StatusDot tone="blue" /> Blockchain
          </span>
          <span className="text-blue-300">MONITORING</span>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500 tracking-wider uppercase flex items-center gap-1.5">
            <StatusDot tone="amber" /> Evidence Engine
          </span>
          <span className="text-amber-300">READY</span>
        </div>
      </div>
    </Panel>
  );
}

/**
 * Threat intelligence telemetry panel — used on dashboard & public page.
 * `rows` is an array of { label, value, tone, bar? }.
 */
export function ThreatIntelPanel({ rows, title = "THREAT INTELLIGENCE", simulated = false }) {
  const defaults = [
    { label: "IP Reputation", value: "FLAGGED", tone: "amber", bar: 62 },
    { label: "Domain Intelligence", value: "SUSPICIOUS", tone: "amber", bar: 55 },
    { label: "Dark Web Exposure", value: "3 HITS", tone: "red", bar: 78 },
    { label: "Identity Exposure", value: "MODERATE", tone: "amber", bar: 48 },
    { label: "Malware Indicators", value: "0 FOUND", tone: "green", bar: 8 },
    { label: "Crypto Wallet Activity", value: "ACTIVE", tone: "cyan", bar: 71 },
    { label: "Fraud Indicators", value: "HIGH", tone: "red", bar: 84 },
    { label: "Threat Score", value: "72 / 100", tone: "red", bar: 72 },
  ];
  const data = rows || defaults;
  return (
    <Panel
      title={title}
      actions={simulated ? <Tag tone="amber">SIMULATED</Tag> : null}
      bodyClass="p-3 space-y-2"
    >
      {data.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-[11px] font-mono mb-1">
            <span className="text-slate-500 tracking-wider uppercase">{r.label}</span>
            <span className={
              r.tone === "green" ? "text-emerald-400"
              : r.tone === "amber" ? "text-amber-400"
              : r.tone === "red" ? "text-red-400"
              : r.tone === "blue" ? "text-blue-400"
              : "text-cyan-300"
            }>{r.value}</span>
          </div>
          {typeof r.bar === "number" && <Bar value={r.bar} tone={r.tone || "cyan"} />}
        </div>
      ))}
    </Panel>
  );
}