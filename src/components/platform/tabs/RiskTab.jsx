import React from "react";
import { ShieldAlert, TrendingUp, AlertTriangle } from "lucide-react";
import HermesPanel from "@/components/platform/HermesPanel";
import { HermesAPI } from "@/lib/hermesClient";
import { RISK_LEVEL_STYLES } from "@/components/platform/investigationStyles";
import { Badge } from "@/components/ui/badge";

export default function RiskTab({ caseId, hermesState }) {
  return (
    <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="risk" fetcher={HermesAPI.getRisk}
      emptyTitle="No risk assessment yet" emptyDescription="Risk analysis is performed exclusively by Hermes. The frontend NEVER calculates or overrides the authoritative Hermes risk score. When available, risk factors and scores will appear here."
      render={(data) => {
        const risk = data?.risk || data;
        const level = risk?.risk_level || risk?.level || "medium";
        const score = risk?.risk_score ?? risk?.score;
        const levelCls = RISK_LEVEL_STYLES[level] || RISK_LEVEL_STYLES.medium;
        const factors = risk?.risk_factors || risk?.factors || [];
        const evidence = risk?.evidence || risk?.supporting_evidence || [];
        return (
          <div className="space-y-4">
            {/* Risk score hero */}
            <div className={`rounded-lg border p-6 ${levelCls}`}>
              <div className="flex items-center gap-4">
                <ShieldAlert className="w-12 h-12" />
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-70">Risk Level</p>
                  <p className="text-2xl font-bold capitalize">{level}</p>
                </div>
                {score != null && (
                  <div className="ml-auto text-right">
                    <p className="text-xs uppercase tracking-wider opacity-70">Score</p>
                    <p className="text-3xl font-bold">{score}</p>
                  </div>
                )}
              </div>
              {risk?.calculation_source && <p className="text-xs opacity-60 mt-2">Calculated by: {risk.calculation_source}</p>}
              {risk?.last_calculation && <p className="text-xs opacity-60">Last calculated: {new Date(risk.last_calculation).toLocaleString()}</p>}
            </div>

            {/* Risk factors */}
            {factors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-cyan-400" />Risk Factors</h3>
                <div className="space-y-2">
                  {factors.map((factor, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex items-center gap-2">
                        {factor.severity && <Badge variant="outline" className={`text-[10px] capitalize ${RISK_LEVEL_STYLES[factor.severity] || RISK_LEVEL_STYLES.medium}`}>{factor.severity}</Badge>}
                        <p className="text-sm text-white">{factor.name || factor.factor || factor.description || JSON.stringify(factor).slice(0, 80)}</p>
                      </div>
                      {factor.description && <p className="text-xs text-gray-400 mt-1">{factor.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supporting evidence */}
            {evidence.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-400" />Evidence Supporting Risk</h3>
                <div className="space-y-1">
                  {evidence.map((ev, i) => (
                    <div key={i} className="text-xs text-gray-300 rounded border border-white/10 bg-white/[0.02] px-3 py-2">{typeof ev === "string" ? ev : JSON.stringify(ev)}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3">
              <p className="text-xs text-gray-500">⚠ Risk assessment is authoritative from Hermes. The frontend displays Hermes results and never computes its own risk score.</p>
            </div>
          </div>
        );
      }} />
  );
}