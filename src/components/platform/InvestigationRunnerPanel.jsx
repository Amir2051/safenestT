import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Loader2, Cpu, AlertCircle, CheckCircle2, XCircle, History, Activity, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PHASES, runPhase, getRunHistory, testProvider, DEFAULT_PROVIDER, DEFAULT_MODEL } from "@/lib/investigationRunner";
import { PROVIDERS, getProvider } from "@/lib/investigationAI";
import { toast } from "sonner";

const PHASE_STATUS_STYLE = {
  pending: "border-white/10 text-gray-500",
  running: "border-cyan-500/30 text-cyan-400",
  completed: "border-green-500/30 text-green-400",
  failed: "border-red-500/30 text-red-400",
};

export default function InvestigationRunnerPanel({ caseId, caseItem }) {
  const qc = useQueryClient();
  const wf = caseItem?.workflow || {};
  const [provider, setProvider] = useState(wf.provider || DEFAULT_PROVIDER);
  const [model, setModel] = useState(wf.model || DEFAULT_MODEL);
  const [running, setRunning] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [testing, setTesting] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testProvider({ provider, model });
      setTestResult(res);
      if (res.status === "ok") toast.success(`${provider}/${model} healthy (${res.ms}ms)`);
      else if (res.status === "degraded") toast.warning(`${provider}/${model} responded (degraded)`);
      else toast.error(`${provider}/${model} failed: ${res.error}`);
    } catch (e) {
      setTestResult({ status: "failed", error: e?.message || String(e) });
      toast.error("Health test failed: " + (e?.message || e));
    } finally {
      setTesting(null);
    }
  };

  const { data: history = [], refetch } = useQuery({
    queryKey: ["investigation-runs", caseId],
    queryFn: () => getRunHistory(caseId),
    enabled: !!caseId,
  });

  const providerDef = getProvider(provider);
  const models = providerDef.models;

  // Reset model to the provider's first model when provider changes
  useEffect(() => {
    if (!models.find((m) => m.id === model)) setModel(models[0]?.id || DEFAULT_MODEL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  const savePreference = async (p, m) => {
    try {
      const cur = await base44.entities.InvestigationCase.get(caseId);
      await base44.entities.InvestigationCase.update(caseId, {
        workflow: { ...(cur.workflow || {}), provider: p, model: m },
      });
    } catch (e) {
      /* best-effort persistence */
    }
  };

  const onProviderChange = (v) => {
    setProvider(v);
    savePreference(v, model);
  };
  const onModelChange = (v) => {
    setModel(v);
    savePreference(provider, v);
  };

  const runOne = async (phaseId) => {
    setRunning(phaseId);
    setLastResult(null);
    try {
      const res = await runPhase({ caseId, phase: phaseId, provider, model });
      setLastResult(res);
      const label = PHASES.find((p) => p.id === phaseId).label;
      if (res.status === "completed") toast.success(`${label} completed`);
      else toast.error(`${label} failed: ${res.error}`);
      refetch();
      qc.invalidateQueries({ queryKey: ["investigation-case", caseId] });
      qc.invalidateQueries({ queryKey: ["findings", caseId] });
      qc.invalidateQueries({ queryKey: ["reports", caseId] });
    } catch (e) {
      setLastResult({ status: "failed", error: e?.message || String(e) });
      toast.error("Run failed: " + (e?.message || e));
    } finally {
      setRunning(null);
    }
  };

  const phaseState = (id) => wf.phases?.[id]?.status || "pending";

  return (
    <div className="rounded-lg border border-white/10 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400" />
        <p className="text-sm font-medium text-white">Investigation Engine</p>
        <Badge variant="outline" className={`text-[10px] ${providerDef.available ? "border-green-500/30 text-green-400" : "border-amber-500/30 text-amber-400"}`}>
          {providerDef.available ? "live" : "upgrade required"}
        </Badge>
      </div>
      <p className="text-xs text-gray-500">{providerDef.description}</p>

      {/* Provider + model selector */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Provider</label>
          <Select value={provider} onValueChange={onProviderChange}>
            <SelectTrigger className="bg-[#0f1419] border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.values(PROVIDERS).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}{!p.available ? " (Builder+)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400">Model</label>
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger className="bg-[#0f1419] border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>
              {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col justify-end">
          <Button size="sm" variant="outline" onClick={testConnection} disabled={!!testing} className="border-cyan-500/30 text-cyan-400 h-9">
            {testing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Activity className="w-3 h-3 mr-1" />}Test
          </Button>
        </div>
      </div>

      {testResult && (
        <div className={`rounded-md border p-2 text-xs ${testResult.status === "ok" ? "border-green-500/20 bg-green-500/[0.04] text-green-300" : testResult.status === "degraded" ? "border-amber-500/20 bg-amber-500/[0.04] text-amber-300" : "border-red-500/20 bg-red-500/[0.04] text-red-300"}`}>
          {testResult.status === "failed" ? `✗ ${testResult.error}` : `✓ ${testResult.provider}/${testResult.model} — ${testResult.status} (${testResult.ms}ms)`}
        </div>
      )}

      {/* Phase buttons */}
      <div className="space-y-2">
        <p className="text-xs text-gray-400">Workflow phases</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PHASES.map((ph) => {
            const st = phaseState(ph.id);
            const isRunning = running === ph.id;
            return (
              <div key={ph.id} className={`rounded-md border p-3 ${st === "completed" ? "border-green-500/20 bg-green-500/[0.03]" : st === "failed" ? "border-red-500/20 bg-red-500/[0.03]" : "border-white/10"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-white font-medium">{ph.label}</span>
                  <Badge variant="outline" className={`text-[9px] capitalize ${PHASE_STATUS_STYLE[st]}`}>{st}</Badge>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">{ph.description}</p>
                <Button size="sm" disabled={!!running} onClick={() => runOne(ph.id)} className="w-full bg-cyan-600 hover:bg-cyan-700 h-7 text-xs">
                  {isRunning ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running…</> : <><Play className="w-3 h-3 mr-1" />Run</>}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Last result */}
      {lastResult && (
        <div className={`rounded-md border p-3 ${lastResult.status === "completed" ? "border-green-500/20 bg-green-500/[0.04]" : "border-red-500/20 bg-red-500/[0.04]"}`}>
          <div className="flex items-start gap-2">
            {lastResult.status === "completed" ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white">{lastResult.status === "completed" ? "Phase completed" : "Phase failed"}</p>
              {lastResult.status === "completed" ? (
                <pre className="text-[11px] text-gray-400 mt-1 max-h-40 overflow-auto whitespace-pre-wrap">{JSON.stringify(lastResult.output, null, 2).slice(0, 1200)}</pre>
              ) : (
                <p className="text-[11px] text-red-300 mt-1">{lastResult.error}</p>
              )}
              {lastResult.persisted && Object.keys(lastResult.persisted).length > 0 && (
                <p className="text-[10px] text-cyan-400 mt-1">Persisted: {Object.entries(lastResult.persisted).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : v}`).join(" · ")}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Run history */}
      {history.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2"><History className="w-3 h-3" />AI Run History ({history.length})</p>
          <div className="rounded-md border border-white/10 divide-y divide-white/5 max-h-48 overflow-auto">
            {history.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2 text-xs">
                <Badge variant="outline" className="text-[9px] capitalize border-white/10 text-gray-400">{r.phase.replace(/_/g, " ")}</Badge>
                <span className="text-gray-300 font-mono truncate">{r.provider}/{r.model}</span>
                {r.status === "completed" ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : r.status === "failed" ? <XCircle className="w-3 h-3 text-red-400" /> : <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />}
                <span className="text-gray-500">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</span>
                {r.status === "failed" && (
                  <button onClick={() => runOne(r.phase)} disabled={!!running} title="Retry phase" className="text-amber-400 hover:text-amber-300 disabled:opacity-40">
                    <RotateCw className="w-3 h-3" />
                  </button>
                )}
                <span className="text-gray-600 ml-auto">{r.started_at ? new Date(r.started_at).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}