import React from "react";
import { Tag } from "./panelPrimitives";

/**
 * Simulated live investigation terminal for the public homepage.
 * Static presentation data — clearly labelled SIMULATED. Not real case data.
 */
const BOOT_LINES = [
  "> INITIALIZING CASE INTELLIGENCE...",
  "> CORRELATING ENTITIES...",
  "> ANALYZING DIGITAL EVIDENCE...",
  "> VALIDATING SOURCES...",
  "> BUILDING INVESTIGATION GRAPH...",
];

const SYSTEM_ROWS = [
  ["SYSTEM STATUS", "ONLINE", "green"],
  ["INTELLIGENCE", "ACTIVE", "cyan"],
  ["EVIDENCE ENGINE", "READY", "cyan"],
  ["THREAT INTEL", "CONNECTED", "blue"],
  ["BLOCKCHAIN", "MONITORING", "cyan"],
  ["RISK ENGINE", "READY", "amber"],
];

const ENTITIES = [
  ["IP ADDRESS", "185.220.101.47"],
  ["WALLET", "0x7A3F...91F"],
  ["DOMAIN", "example-site.com"],
  ["PHONE", "+1 555 0142"],
];

export default function TerminalPanel() {
  return (
    <div className="relative rounded-md border border-cyan-500/25 bg-[#06090d] overflow-hidden ic-grid-bg">
      {/* header */}
      <div className="flex items-center justify-between px-3 h-9 border-b border-cyan-500/20 bg-[#080c11]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500/70" />
          <span className="w-2 h-2 rounded-full bg-amber-500/70" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
          <span className="ml-2 text-[11px] font-mono tracking-[0.2em] text-cyan-300 uppercase">
            MIA // INVESTIGATION TERMINAL
          </span>
        </div>
        <Tag tone="amber">SIMULATED</Tag>
      </div>

      {/* body */}
      <div className="p-4 font-mono text-[12px] leading-relaxed">
        {/* system status grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4">
          {SYSTEM_ROWS.map(([k, v, tone]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-slate-500 tracking-wider">{k}</span>
              <span className={
                tone === "green" ? "text-emerald-400"
                : tone === "amber" ? "text-amber-400"
                : tone === "blue" ? "text-blue-400"
                : "text-cyan-400"
              }>{v}</span>
            </div>
          ))}
        </div>

        {/* boot sequence */}
        <div className="space-y-0.5 mb-4 text-slate-400">
          {BOOT_LINES.map((l, i) => (
            <div key={i} className="opacity-90">{l}</div>
          ))}
        </div>

        {/* case block */}
        <div className="border border-slate-700/60 rounded p-3 bg-black/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-500 tracking-wider">CASE</span>
            <span className="text-cyan-300">#SN-2026-00421</span>
          </div>

          <p className="text-slate-500 tracking-wider mb-1">TARGET</p>
          <p className="text-slate-200 mb-3">example@email.com</p>

          <p className="text-slate-500 tracking-wider mb-1">ENTITIES</p>
          <div className="space-y-1 mb-3">
            {ENTITIES.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-slate-500">{k}</span>
                <span className="text-slate-200">{v}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-500 tracking-wider mb-1">RISK</p>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 rounded-sm bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: "87%" }} />
            </div>
            <span className="text-amber-400">87%</span>
          </div>

          <p className="text-slate-500 tracking-wider mb-1">STATUS</p>
          <p className="text-emerald-400">ACTIVE INVESTIGATION <span className="animate-pulse">▊</span></p>
        </div>
      </div>
    </div>
  );
}