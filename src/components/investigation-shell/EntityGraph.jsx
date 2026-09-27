import React from "react";
import { Panel, Tag } from "./panelPrimitives";
import { User, AtSign, Globe, Bitcoin, ArrowLeftRight, Building2 } from "lucide-react";

/**
 * Entity relationship graph — SVG nodes + edges. Intelligence-analysis style.
 * Static presentation layout (demo) unless `nodes`/`edges` provided.
 */
const DEFAULT_NODES = [
  { id: "person", label: "PERSON", icon: User, tone: "cyan", x: 50, y: 30 },
  { id: "email", label: "EMAIL", icon: AtSign, tone: "cyan", x: 50, y: 130 },
  { id: "ip", label: "IP ADDRESS", icon: Globe, tone: "blue", x: 50, y: 230 },
  { id: "domain", label: "DOMAIN", icon: Globe, tone: "purple", x: 230, y: 180 },
  { id: "wallet", label: "WALLET", icon: Bitcoin, tone: "amber", x: 230, y: 80 },
  { id: "tx", label: "TRANSACTION", icon: ArrowLeftRight, tone: "amber", x: 410, y: 80 },
  { id: "exchange", label: "EXCHANGE", icon: Building2, tone: "green", x: 410, y: 230 },
];

const DEFAULT_EDGES = [
  ["person", "email"], ["email", "ip"], ["ip", "domain"],
  ["email", "wallet"], ["wallet", "tx"], ["tx", "exchange"], ["domain", "exchange"],
];

const toneFill = {
  cyan: "border-cyan-500/50 text-cyan-300 bg-cyan-500/10",
  blue: "border-blue-500/50 text-blue-300 bg-blue-500/10",
  purple: "border-fuchsia-500/50 text-fuchsia-300 bg-fuchsia-500/10",
  amber: "border-amber-500/50 text-amber-300 bg-amber-500/10",
  green: "border-emerald-500/50 text-emerald-300 bg-emerald-500/10",
};

export default function EntityGraph({ nodes, edges, title = "ENTITY GRAPH", simulated = false }) {
  const n = nodes || DEFAULT_NODES;
  const e = edges || DEFAULT_EDGES;
  const byId = Object.fromEntries(n.map((x) => [x.id, x]));
  return (
    <Panel
      title={title}
      actions={simulated ? <Tag tone="amber">SIMULATED</Tag> : null}
      bodyClass="p-3"
    >
      <div className="relative w-full overflow-x-auto no-scrollbar">
        <svg width="470" height="270" className="block" style={{ minWidth: 470 }}>
          {/* edges */}
          {e.map(([a, b], i) => {
            const A = byId[a], B = byId[b];
            if (!A || !B) return null;
            return (
              <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            );
          })}
          {/* nodes */}
          {n.map((node) => {
            const Icon = node.icon;
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r="22" fill="rgba(10,14,19,0.95)" stroke="rgba(148,163,184,0.3)" />
                <foreignObject x={node.x - 14} y={node.y - 14} width="28" height="28">
                  <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${toneFill[node.tone] || toneFill.cyan}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </foreignObject>
                <text x={node.x} y={node.y + 36} textAnchor="middle"
                  className="fill-slate-400 font-mono" style={{ fontSize: 9, letterSpacing: "0.1em" }}>
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </Panel>
  );
}