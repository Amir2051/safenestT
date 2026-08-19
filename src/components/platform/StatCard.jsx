import React from "react";
import { cn } from "@/lib/utils";

const TONES = {
  cyan: "border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-400",
  amber: "border-amber-500/20 bg-amber-500/[0.04] text-amber-400",
  red: "border-red-500/20 bg-red-500/[0.04] text-red-400",
  green: "border-green-500/20 bg-green-500/[0.04] text-green-400",
  purple: "border-purple-500/20 bg-purple-500/[0.04] text-purple-400",
  slate: "border-white/10 bg-white/[0.02] text-gray-300",
};

/**
 * SOC-style operational stat card. `value` must be real backend data
 * (a count). Never pass fabricated numbers.
 */
export default function StatCard({ label, value, icon: Icon, tone = "slate", hint, loading }) {
  return (
    <div className={cn("rounded-lg border p-4 flex items-center gap-4", TONES[tone])}>
      {Icon && (
        <div className="w-10 h-10 rounded-md bg-black/30 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-gray-500 truncate">{label}</p>
        {loading ? (
          <div className="h-6 w-12 bg-white/5 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-2xl font-bold text-white tabular-nums">{value ?? 0}</p>
        )}
        {hint && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
}