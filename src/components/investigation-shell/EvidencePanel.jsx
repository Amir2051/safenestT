import React from "react";
import { Panel, Tag, StatusDot } from "./panelPrimitives";
import { ShieldCheck, BrainCircuit, UserCog } from "lucide-react";

/**
 * Evidence intelligence panel — distinguishes VERIFIED EVIDENCE, AI INFERENCE,
 * and INVESTIGATOR CONCLUSION. MIA never presents inference as verified evidence.
 */
const KIND = {
  verified: { tone: "green", label: "VERIFIED EVIDENCE", icon: ShieldCheck },
  inference: { tone: "purple", label: "AI INFERENCE", icon: BrainCircuit },
  conclusion: { tone: "cyan", label: "INVESTIGATOR CONCLUSION", icon: UserCog },
};

export default function EvidencePanel({ items, title = "EVIDENCE INTELLIGENCE" }) {
  const rows = items || [
    {
      kind: "verified", source: "Etherscan API", ts: "2026-09-26 14:02",
      tool: "blockchain trace", confidence: "HIGH",
      detail: "Wallet 0x7A3F...91F received 2.4 ETH from victim address.",
      verified: true,
    },
    {
      kind: "inference", source: "MIA / Nova", ts: "2026-09-26 14:05",
      tool: "entity correlation", confidence: "MEDIUM",
      detail: "Wallet likely controlled by same operator as 0x91F (overlap pattern).",
      verified: false,
    },
    {
      kind: "conclusion", source: "Investigator", ts: "2026-09-26 14:11",
      tool: "manual review", confidence: "HIGH",
      detail: "Fund flow consistent with pig-butchering cash-out pattern.",
      verified: true,
    },
  ];

  return (
    <Panel title={title} bodyClass="p-0">
      <div className="divide-y divide-slate-800/70">
        {rows.map((r, i) => {
          const k = KIND[r.kind] || KIND.verified;
          const Icon = k.icon;
          return (
            <div key={i} className="px-3 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <Tag tone={k.tone}><Icon className="w-2.5 h-2.5" /> {k.label}</Tag>
                <span className="text-[10px] font-mono text-slate-500">{r.ts}</span>
              </div>
              <p className="text-[12px] text-slate-200 leading-snug mb-1.5">{r.detail}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
                <span>SRC: <span className="text-slate-300">{r.source}</span></span>
                <span>TOOL: <span className="text-slate-300">{r.tool}</span></span>
                <span>CONF: <span className={r.confidence === "HIGH" ? "text-emerald-400" : "text-amber-400"}>{r.confidence}</span></span>
                <span className="flex items-center gap-1">
                  {r.verified
                    ? <span className="text-emerald-400 flex items-center gap-1"><StatusDot tone="green" pulse={false} /> VERIFIED</span>
                    : <span className="text-amber-400 flex items-center gap-1"><StatusDot tone="amber" pulse={false} /> UNVERIFIED</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-slate-700/50 bg-black/30">
        <p className="text-[10px] font-mono text-slate-500 tracking-wider">
          MIA NEVER PRESENTS INFERENCE AS VERIFIED EVIDENCE.
        </p>
      </div>
    </Panel>
  );
}