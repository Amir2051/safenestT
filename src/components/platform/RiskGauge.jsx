import React from "react";
import { cn } from "@/lib/utils";

/**
 * Circular risk gauge (0–100). Color follows the risk level.
 * Purely presentational — the score is computed deterministically by
 * the investigation runner and passed in.
 */
const LEVEL = {
  critical: { color: "#f87171", label: "Critical", text: "text-red-400", ring: "text-red-500" },
  high: { color: "#fbbf24", label: "High", text: "text-amber-400", ring: "text-amber-500" },
  medium: { color: "#22d3ee", label: "Medium", text: "text-cyan-400", ring: "text-cyan-500" },
  low: { color: "#4ade80", label: "Low", text: "text-green-400", ring: "text-green-500" },
};

export default function RiskGauge({ score = 0, level = "medium", size = 140, stroke = 12 }) {
  const cfg = LEVEL[level] || LEVEL.medium;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const dash = (pct / 100) * c;
  const center = size / 2;

  return (
    <div className="flex flex-col items-center" role="img" aria-label={`Risk score ${pct} of 100, ${cfg.label}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={center} cy={center} r={r} fill="none" stroke={cfg.color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`} className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="-mt-[60px] flex flex-col items-center pointer-events-none" style={{ marginTop: -(size / 2 + 6) }}>
        <span className={cn("text-3xl font-bold tabular-nums", cfg.text)}>{Math.round(pct)}</span>
        <span className="text-[10px] uppercase tracking-wider text-gray-500">{cfg.label}</span>
      </div>
    </div>
  );
}