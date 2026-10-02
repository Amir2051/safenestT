import React from "react";
import { Panel, Bar, StatusDot, Tag } from "./panelPrimitives";
import { BrainCircuit, ShieldCheck, Radar, Eye, Wallet, GitBranch } from "lucide-react";

/**
 * AI AGENT COMMAND GRID — six specialized investigation agents.
 * Static role/telemetry presentation (agent availability is real once wired).
 */
export const MIA_AGENTS = [
  {
    name: "MIA", role: "Investigation Orchestrator", icon: BrainCircuit, tone: "cyan",
    task: "Correlating evidence", modules: ["OSINT", "THREAT INTEL", "ENTITY GRAPH", "RISK ANALYSIS"],
    activity: 82,
  },
  {
    name: "AEGIS", role: "Cybersecurity / Threat Defense", icon: ShieldCheck, tone: "blue",
    task: "Monitoring threat surface", modules: ["MALWARE", "INTRUSION", "DEFENSE"],
    activity: 64,
  },
  {
    name: "ORION", role: "OSINT / Digital Intelligence", icon: Radar, tone: "cyan",
    task: "Sweeping digital footprint", modules: ["DOMAINS", "IP", "SOCIAL"],
    activity: 71,
  },
  {
    name: "NYX", role: "Identity / Exposure Intelligence", icon: Eye, tone: "purple",
    task: "Scanning identity exposure", modules: ["BREACHES", "EXPOSURE", "IDENTITY"],
    activity: 58,
  },
  {
    name: "VANTA", role: "Fraud / Financial Intelligence", icon: Wallet, tone: "amber",
    task: "Tracing fund flow", modules: ["WALLETS", "TX", "EXCHANGES"],
    activity: 76,
  },
  {
    name: "NOVA", role: "Evidence Correlation / Risk Analysis", icon: GitBranch, tone: "green",
    task: "Validating findings", modules: ["EVIDENCE", "RISK", "LINEAGE"],
    activity: 69,
  },
];

const toneMap = {
  cyan: { text: "text-cyan-300", bar: "cyan", dot: "cyan", ring: "border-cyan-500/30" },
  blue: { text: "text-blue-300", bar: "blue", dot: "blue", ring: "border-blue-500/30" },
  purple: { text: "text-fuchsia-300", bar: "purple", dot: "purple", ring: "border-fuchsia-500/30" },
  amber: { text: "text-amber-300", bar: "amber", dot: "amber", ring: "border-amber-500/30" },
  green: { text: "text-emerald-300", bar: "green", dot: "green", ring: "border-emerald-500/30" },
};

export function AgentStatusCard({ agent }) {
  const t = toneMap[agent.tone] || toneMap.cyan;
  const Icon = agent.icon;
  return (
    <div className={`rounded-md border ${t.ring} bg-[#0a0e13]/80 p-3 flex flex-col gap-2 ic-grid-bg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded border ${t.ring} bg-black/40 flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${t.text}`} />
          </div>
          <div>
            <p className={`text-sm font-bold tracking-wider ${t.text}`}>{agent.name}</p>
            <p className="text-[9px] font-mono text-slate-500 tracking-wider uppercase">{agent.role}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-emerald-300">
          <StatusDot tone="green" /> ONLINE
        </span>
      </div>

      <div>
        <p className="text-[9px] font-mono text-slate-500 tracking-wider uppercase mb-0.5">Current Task</p>
        <p className="text-[11px] font-mono text-slate-200">{agent.task}</p>
      </div>

      <div>
        <p className="text-[9px] font-mono text-slate-500 tracking-wider uppercase mb-1">Modules</p>
        <div className="flex flex-wrap gap-1">
          {agent.modules.map((m) => (
            <Tag key={m} tone="slate">{m}</Tag>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[9px] font-mono mb-1">
          <span className="text-slate-500 tracking-wider uppercase">Activity</span>
          <span className={t.text}>{agent.activity}%</span>
        </div>
        <Bar value={agent.activity} tone={t.bar} />
      </div>
    </div>
  );
}

export default function AgentGrid({ title = "AI AGENT COMMAND GRID" }) {
  return (
    <Panel
      title={title}
      bodyClass="p-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MIA_AGENTS.map((a) => (
          <AgentStatusCard key={a.name} agent={a} />
        ))}
      </div>
    </Panel>
  );
}