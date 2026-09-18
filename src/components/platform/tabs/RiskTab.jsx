import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, TrendingUp, Cpu, Info } from "lucide-react";
import RiskGauge from "@/components/platform/RiskGauge";
import { RISK_LEVEL_STYLES } from "@/components/platform/investigationStyles";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";

/**
 * Risk tab — displays the DETERMINISTIC risk score computed by the
 * investigation runner (stored on caseItem.workflow.risk_score /
 * risk_level / risk_factors). This is real data from the Risk phase,
 * not a mock. If the Risk phase hasn't been run, show an honest empty
 * state with a clear next step.
 */
export default function RiskTab({ caseItem }) {
  const wf = caseItem?.workflow || {};
  const score = wf.risk_score;
  const level = wf.risk_level || (score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "medium" : "low");
  const factors = wf.risk_factors || [];

  const { data: riskRun } = useQuery({
    queryKey: ["risk-run", caseItem?.id],
    queryFn: () => base44.entities.InvestigationRun.filter({ case_id: caseItem.id, phase: "risk" }, "-started_at", 1),
    enabled: !!caseItem?.id && score != null,
  });
  const summary = riskRun?.[0]?.output?.summary;

  if (score == null) {
    return (
      <EmptyState
        variant="empty"
        icon={ShieldAlert}
        title="No risk score yet"
        description="Run the Risk phase in the Investigation Engine. The score is computed deterministically from the case's findings, loss amount, fraud type, and analyzed targets — no LLM involved."
      />
    );
  }

  const levelCls = RISK_LEVEL_STYLES[level] || RISK_LEVEL_STYLES.medium;
  const totalWeight = factors.reduce((s, f) => s + (Number(f.weight) || 0), 0);

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-5 ${levelCls}`}>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <RiskGauge score={score} level={level} size={150} />
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <ShieldAlert className="w-5 h-5" />
              <p className="text-sm uppercase tracking-wider opacity-80">Risk Level</p>
              <Badge variant="outline" className={`capitalize ${levelCls}`}>{level}</Badge>
            </div>
            <p className="text-base text-white mt-2">
              Score <span className="text-2xl font-bold tabular-nums">{score}</span><span className="opacity-60">/100</span>
            </p>
            <p className="text-xs opacity-70 mt-2 flex items-center gap-1.5 justify-center sm:justify-start">
              <Cpu className="w-3.5 h-3.5" />Computed deterministically by the investigation runner (no LLM).
            </p>
          </div>
        </div>
      </div>

      {summary && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300">{summary}</p>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" />Risk Factors</h3>
        {factors.length === 0 ? (
          <p className="text-xs text-gray-500">No factor breakdown recorded.</p>
        ) : (
          <div className="space-y-2">
            {factors.map((factor, i) => {
              const weight = Number(factor.weight) || 0;
              const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
              return (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white">{factor.factor || factor.name || factor.description || `Factor ${i + 1}`}</p>
                    <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">+{weight}</Badge>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 mt-2 overflow-hidden">
                    <div className="h-full bg-cyan-500/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}