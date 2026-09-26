import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Cpu, CheckCircle2, XCircle, History, Activity,
  RotateCw, Lock, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PHASES, runPhase, getRunHistory, testProvider, DEFAULT_PROVIDER, DEFAULT_MODEL } from "@/lib/investigationRunner";
import { getProvider } from "@/lib/investigationAI";
import InvestigationStageTimeline from "@/components/platform/InvestigationStageTimeline";
import { toast } from "sonner";

const TEST_TONE = {
  ok: "border-green-500/20 bg-green-500/[0.04] text-green-300",
  degraded: "border-amber-500/20 bg-amber-500/[0.04] text-amber-300",
  failed: "border-red-500/20 bg-red-500/[0.04] text-red-300",
};

export default function InvestigationRunnerPanel({ caseId, caseItem }) {
  const qc = useQueryClient();
  const wf = caseItem?.workflow || {};
  // Hermes is mandatory for the investigation pipeline. Ignore any legacy
  // provider value persisted on older cases so the UI cannot route a run to
  // Base44 InvokeLLM or another legacy provider.
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [running, setRunning] = useState(null);
  const [runAllActive, setRunAllActive] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const providerDef = getProvider(provider);
  const models = providerDef.models;
  const freeOnly = provider === "openrouter";

  useEffect(() => {
    if (model !== DEFAULT_MODEL) setModel(DEFAULT_MODEL);
  }, [provider]);

  const { data: history = [], refetch } = useQuery({
    queryKey: ["investigation-runs", caseId],
    queryFn: () => getRunHistory(caseId),
    enabled: !!caseId,
  });

  const savePreference = async (p, m) => {
    try {
      const cur = await base44.entities.InvestigationCase.get(caseId);
      await base44.entities.InvestigationCase.update(caseId, {
        workflow: { ...(cur.workflow || {}), provider: p, model: m },
      });
    } catch { /* best-effort */ }
  };

  const onProviderChange = () => {
    // Kept for compatibility with the selector component; Hermes is the only
    // supported investigation pipeline provider.
    setProvider(DEFAULT_PROVIDER);
    savePreference(DEFAULT_PROVIDER, model);
  };
  const onModelChange = () => { setModel(DEFAULT_MODEL); savePreference(DEFAULT_PROVIDER, DEFAULT_MODEL); };

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await testProvider({ provider, model });
      setTestResult(res);
      if (res.status === "ok") toast.success(`${provider} healthy (${res.ms}ms)`);
      else if (res.status === "degraded") toast.warning(`${provider} responded (degraded)`);
      else toast.error(`${provider} failed: ${res.error}`);
    } catch (e) {
      setTestResult({ status: "failed", error: e?.message || String(e) });
      toast.error("Health test failed: " + (e?.message || e));
    } finally { setTesting(false); }
  };

  const invalidateAll = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["investigation-case", caseId] });
    qc.invalidateQueries({ queryKey: ["findings", caseId] });
    qc.invalidateQueries({ queryKey: ["reports", caseId] });
    qc.invalidateQueries({ queryKey: ["investigation-runs", caseId] });
  };

  const runOne = async (phaseId) => {
    setRunning(phaseId); setLastResult(null);
    try {
      const res = await runPhase({ caseId, phase: phaseId, provider, model });
      setLastResult(res);
      const label = PHASES.find((p) => p.id === phaseId).label;
      if (res.status === "completed") toast.success(`${label} completed`);
      else toast.error(`${label} failed: ${res.error}`);
      invalidateAll();
    } catch (e) {
      setLastResult({ status: "failed", error: e?.message || String(e) });
      toast.error("Run failed: " + (e?.message || e));
    } finally { setRunning(null); }
  };

  const runAll = async () => {
    setRunAllActive(true);
    for (const ph of PHASES) {
      setRunning(ph.id);
      try {
        const res = await runPhase({ caseId, phase: ph.id, provider, model });
        setLastResult(res);
        if (res.status !== "completed") {
          toast.error(`Pipeline stopped at ${ph.label}: ${res.error}`);
          break;
        }
        toast.success(`${ph.label} completed`);
      } catch (e) {
        toast.error(`Pipeline failed at ${ph.label}: ${e?.message || e}`);
        break;
      } finally { setRunning(null); }
      invalidateAll();
    }
    setRunAllActive(false);
  };

  const phaseState = (id) => wf.phases?.[id]?.status || "pending";
  const anyRunning = !!running || runAllActive;

  return (
    <section className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#0a0f1a]/80 to-[#0f1419]/80 p-4 sm:p-5 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Investigation Engine</p>
            <p className="text-[11px] text-gray-500">{providerDef.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${providerDef.available ? "border-green-500/30 text-green-400" : "border-amber-500/30 text-amber-400"}`}>
            {providerDef.available ? "live" : "upgrade required"}
          </Badge>
          <Button size="sm" onClick={runAll} disabled={anyRunning} className="bg-cyan-600 hover:bg-cyan-700 h-8">
            {runAllActive ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
            Run full pipeline
          </Button>
        </div>
      </header>

      <InvestigationStageTimeline
        phases={PHASES}
        statuses={Object.fromEntries(PHASES.map((p) => [p.id, phaseState(p.id)]))}
        running={running}
        current={wf.current_phase}
        onSelect={runOne}
        disabled={anyRunning}
      />

      <ProviderModelControls
        provider={provider}
        onProvider={onProviderChange}
        model={model}
        onModel={onModelChange}
        models={models}
        freeOnly={freeOnly}
        onTest={testConnection}
        testing={testing}
        testResult={testResult}
      />

      {lastResult && <LastResult result={lastResult} />}

      {history.length > 0 && (
        <RunHistory history={history} running={running} onRetry={runOne} disabled={anyRunning} />
      )}
    </section>
  );
}

function LastResult({ result }) {
  const ok = result.status === "completed";
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-green-500/20 bg-green-500/[0.04]" : "border-red-500/20 bg-red-500/[0.04]"}`}>
      <div className="flex items-start gap-2">
        {ok ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white">{ok ? "Phase completed" : "Phase failed"}</p>
          {ok ? (
            <pre className="text-[11px] text-gray-400 mt-1 max-h-32 overflow-auto whitespace-pre-wrap">{JSON.stringify(result.output, null, 2).slice(0, 1200)}</pre>
          ) : (
            <p className="text-[11px] text-red-300 mt-1">{result.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function RunHistory({ history, running, onRetry, disabled }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2"><History className="w-3 h-3" />AI Run History ({history.length})</p>
      <div className="rounded-lg border border-white/10 divide-y divide-white/5 max-h-44 overflow-auto">
        {history.map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-2 text-xs">
            <Badge variant="outline" className="text-[9px] capitalize border-white/10 text-gray-400">{r.phase.replace(/_/g, " ")}</Badge>
            <span className="text-gray-300 font-mono truncate hidden sm:inline">{r.provider}/{r.model}</span>
            {r.status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : r.status === "failed" ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
            <span className="text-gray-500">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</span>
            {r.status === "failed" && (
              <button onClick={() => onRetry(r.phase)} disabled={disabled} title="Retry phase" className="text-amber-400 hover:text-amber-300 disabled:opacity-40">
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-gray-600 ml-auto">{r.started_at ? new Date(r.started_at).toLocaleString() : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProviderModelControls({ provider, onProvider, model, onModel, models, freeOnly, onTest, testing, testResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-[11px] uppercase tracking-wider text-gray-500">Provider</label>
          <Select value={provider} onValueChange={onProvider}>
            <SelectTrigger className="bg-[#0f1419] border-white/10 text-white h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hermes">Hermes Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end">
          <Button size="sm" variant="outline" onClick={onTest} disabled={testing} className="border-cyan-500/30 text-cyan-400 h-9">
            {testing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
            {testing ? "Testing…" : "Health test"}
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[11px] uppercase tracking-wider text-gray-500">Model</label>
          {freeOnly && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Lock className="w-3 h-3" />Free models only (OpenRouter plan)</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => {
            const locked = freeOnly && m.free === false;
            const active = model === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={locked}
                onClick={() => !locked && onModel(m.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  active
                    ? "border-cyan-400/60 bg-cyan-500/15 text-cyan-200"
                    : locked
                      ? "border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed"
                      : "border-white/10 bg-white/[0.02] text-gray-300 hover:border-cyan-500/30 hover:text-white"
                }`}
                title={locked ? "Paid model — not enabled on this OpenRouter account" : m.label}
              >
                {locked && <Lock className="w-3 h-3" />}
                {m.label}
                {locked && <span className="text-[9px] uppercase">paid</span>}
              </button>
            );
          })}
        </div>
      </div>

      {testResult && (
        <div className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${TEST_TONE[testResult.status] || TEST_TONE.failed}`}>
          {testResult.status === "failed"
            ? <><XCircle className="w-3.5 h-3.5 shrink-0" />{testResult.error}</>
            : <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{testResult.provider}/{testResult.model} — {testResult.status} ({testResult.ms}ms)</>}
        </div>
      )}
    </div>
  );
}