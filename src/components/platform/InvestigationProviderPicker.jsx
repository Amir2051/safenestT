import React from "react";
import { Check, Loader2, Activity, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROVIDERS, providerLabel } from "@/lib/investigationAI";

const TEST_TONE = {
  ok: "border-green-500/20 bg-green-500/[0.04] text-green-300",
  degraded: "border-amber-500/20 bg-amber-500/[0.04] text-amber-300",
  failed: "border-red-500/20 bg-red-500/[0.04] text-red-300",
};

/**
 * The administrator's provider selection for THIS run.
 *
 * Exactly two options (Hermes Agent / MIA Multi-Agent). The saved default only
 * preselects; the selection shown here is what the backend will execute, and it
 * is sent explicitly with the launch request.
 */
export default function InvestigationProviderPicker({
  value,
  onChange,
  disabled,
  defaultProvider,
  caseProvider,
  onTest,
  testing,
  testResult,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11px] uppercase tracking-wider text-gray-500">Investigation provider</p>
        <p className="text-[10px] text-gray-500">
          for this run · default: <span className="text-gray-400">{providerLabel(defaultProvider)}</span>
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {PROVIDERS.map((p) => {
          const active = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(p.id)}
              disabled={disabled}
              className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-60 ${
                active
                  ? "border-cyan-500/50 bg-cyan-500/[0.07]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-medium ${active ? "text-white" : "text-gray-300"}`}>{p.label}</span>
                {active && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
              </div>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{p.description}</p>
              <p className="text-[10px] font-mono text-gray-600 mt-1">{p.model}</p>
            </button>
          );
        })}
      </div>

      {value && value !== defaultProvider && (
        <p className="text-[10px] text-amber-300/80">
          Overrides the administrator default for this run only.
        </p>
      )}
      {caseProvider && value && caseProvider !== value && (
        <p className="text-[10px] text-gray-500">
          This case was last investigated by {providerLabel(caseProvider)}. This run will use {providerLabel(value)}.
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={onTest} disabled={testing || !value} className="border-cyan-500/30 text-cyan-400 h-8">
          {testing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
          {testing ? "Testing…" : "Health test selected provider"}
        </Button>
        {testResult && (
          <div className={`rounded-md border px-2 py-1 text-[11px] flex items-center gap-1.5 ${TEST_TONE[testResult.status] || TEST_TONE.failed}`}>
            {testResult.status === "failed"
              ? <><XCircle className="w-3.5 h-3.5 shrink-0" />{testResult.error}</>
              : <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{testResult.provider} — {testResult.status} ({testResult.ms}ms)</>}
          </div>
        )}
      </div>
    </div>
  );
}