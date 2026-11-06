import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Cpu, CheckCircle2, XCircle, History,
  RotateCw, Zap, Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PHASES, runPhase, getRunHistory } from "@/lib/investigationRunner";
import { getProvider, providerLabel, DEFAULT_PROVIDER } from "@/lib/investigationAI";
import { getProviderConfig } from "@/lib/investigationDispatch";
import { runHermesInvestigation, resumeHermesInvestigation, syncHermesInvestigationStep, HermesError } from "@/lib/hermesInvestigation";
import InvestigationStageTimeline from "@/components/platform/InvestigationStageTimeline";
import InvestigationProviderPicker from "@/components/platform/InvestigationProviderPicker";
import ConfirmProviderLaunchDialog from "@/components/platform/ConfirmProviderLaunchDialog";
import { toast } from "sonner";

const TERMINAL_HERMES = [
  "completed", "done", "complete", "success", "succeeded", "finished", "ok",
  "completed_with_errors", "completed_with_warnings", "completed_with_failures",
  "partial_success", "partially_completed", "partial_failure", "partially_failed",
  "failed", "error", "errored", "failed_with_results", "cancelled", "canceled",
  "aborted", "expired", "timeout", "timed_out",
];

const FAILED_HERMES = [
  "failed", "error", "errored", "failed_with_results", "completed_with_errors",
  "completed_with_failures", "partial_failure", "partially_failed", "cancelled",
  "canceled", "aborted", "expired", "timeout", "timed_out",
];

const norm = (s) => String(s || "").toLowerCase().trim().replace(/[\s-]+/g, "_");

export default function InvestigationRunnerPanel({ caseId, caseItem, autoRun, onGoToTargets }) {
  const qc = useQueryClient();
  const wf = caseItem?.workflow || {};

  // ── Per-run provider selection ────────────────────────────────────────────
  // The administrator's saved default only preselects; this value is the
  // provider for the NEXT run and is sent explicitly with the launch request.
  const [runProvider, setRunProvider] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [running, setRunning] = useState(null);
  const [runAllActive, setRunAllActive] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [liveStatuses, setLiveStatuses] = useState(null);
  const [hermesInvestigationId, setHermesInvestigationId] = useState(
    caseItem?.workflow?.hermes_investigation_id || null
  );

  // Administrator-configured default provider (read-only here).
  const { data: providerConfig } = useQuery({
    queryKey: ["investigation-provider"],
    queryFn: getProviderConfig,
    staleTime: 60000,
  });
  const defaultProvider = providerConfig?.provider || DEFAULT_PROVIDER;
  useEffect(() => {
    const configured = providerConfig?.provider;
    if (!configured) return;
    setRunProvider((cur) => cur || configured);
  }, [providerConfig?.provider]);

  // Pre-flight: a case needs at least one target or a description. Fetch the
  // case's InvestigationTarget records so the runner can explain what is missing.
  const { data: targets = [] } = useQuery({
    queryKey: ["targets", caseId],
    queryFn: () => base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });
  const hasTargets = targets.length > 0;
  const hasNarrative = !!(caseItem?.description || caseItem?.case_title);

  // Which provider owns this case (from the persisted run, not the local choice).
  const caseProvider = wf.provider === "hermes" || wf.provider === "mia"
    ? wf.provider
    : (hermesInvestigationId ? "hermes" : null);

  const allComplete = PHASES.every((p) => wf.phases?.[p.id]?.status === "completed");
  const hermesTerminal = !!wf.hermes_status && TERMINAL_HERMES.includes(norm(wf.hermes_status));
  const manualRunning = !!running || runAllActive;
  const hermesActive = !!hermesInvestigationId && !allComplete && !hermesTerminal && !manualRunning && (
    caseItem?.status === "investigating" || caseItem?.status === "queued" ||
    wf.hermes_status === "running" || wf.hermes_status === "queued" || wf.hermes_status === "pending" || !wf.hermes_status
  );

  const canRun = hasTargets || hasNarrative || hermesActive;
  const providerDef = getProvider(runProvider);
  const anyRunning = !!running || runAllActive;

  const { data: history = [], refetch } = useQuery({
    queryKey: ["investigation-runs", caseId],
    queryFn: () => getRunHistory(caseId),
    enabled: !!caseId,
  });

  const testConnection = async () => {
    if (!runProvider) { toast.error("Select a provider first"); return; }
    setTesting(true); setTestResult(null);
    try {
      const raw = await base44.functions.invoke("investigationProviderConfig", { action: "test", provider: runProvider });
      const body = raw?.data ?? raw;
      const res = {
        status: body?.ok ? "ok" : (body?.status === "degraded" ? "degraded" : "failed"),
        provider: providerLabel(body?.provider || runProvider),
        ms: body?.ms,
        error: body?.error,
      };
      setTestResult(res);
      if (res.status === "ok") toast.success(`${res.provider} healthy (${res.ms}ms)`);
      else if (res.status === "degraded") toast.warning(`${res.provider} responded (degraded)`);
      else toast.error(`${res.provider} failed: ${res.error}`);
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

  // ── Existing Hermes investigation auto-sync ──────────────────────────────
  // Only poll the Hermes lifecycle for a case that is actually owned by Hermes.
  const { data: autoSync } = useQuery({
    queryKey: ["hermes-sync", caseId],
    queryFn: () => syncHermesInvestigationStep(caseId),
    enabled: hermesActive && caseProvider === "hermes",
    refetchInterval: hermesActive && caseProvider === "hermes" ? 8000 : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!autoSync) return;
    setLiveStatuses(autoSync.phases || null);
    if (autoSync.hermes_investigation_id) setHermesInvestigationId(autoSync.hermes_investigation_id);
    qc.invalidateQueries({ queryKey: ["investigation-case", caseId] });
    if (autoSync.terminal) {
      invalidateAll();
      const st = norm(autoSync.hermes_status);
      if (st === "completed" || st === "done") {
        toast.success("Hermes investigation completed — results attached to this case");
      } else if (FAILED_HERMES.includes(st)) {
        toast.error(`Hermes investigation ended with status: ${autoSync.hermes_status}`);
      } else if (["completed_with_warnings", "partial_success", "partially_completed"].includes(st)) {
        toast.warning(`Hermes finished with partial results: ${autoSync.hermes_status}`);
      }
    }
  }, [autoSync]);

  const cancelledRef = useRef(false);
  useEffect(() => () => { cancelledRef.current = true; }, []);

  /**
   * Launch the confirmed provider's pipeline.
   * The provider id is passed to the backend, which validates it and runs ONLY
   * that provider. A failure is reported as a failure of that provider — the
   * operator must change the selection and confirm again to retry elsewhere.
   */
  const runPipeline = async () => {
    const providerId = runProvider;
    if (!providerId) { toast.error("Select an investigation provider before launching"); return; }

    setConfirmOpen(false);
    setRunAllActive(true);
    setLastResult(null);
    setLiveStatuses(null);
    setRunning("planning");
    cancelledRef.current = false;

    try {
      const existingId = hermesInvestigationId || caseItem?.workflow?.hermes_investigation_id;
      const wfNow = caseItem?.workflow || {};
      const existingTerminal = !!wfNow.hermes_status && TERMINAL_HERMES.includes(norm(wfNow.hermes_status));
      // Resuming only applies to Hermes: there must be an open Hermes
      // investigation on this case AND Hermes must be the selected provider.
      const shouldResume = providerId === "hermes" && !!existingId && !existingTerminal && (
        caseItem?.status === "investigating" || caseItem?.status === "queued" ||
        wfNow.hermes_status === "running" || wfNow.hermes_status === "queued" || wfNow.hermes_status === "pending"
      );

      const onProgress = (phases, overall, raw) => {
        setLiveStatuses(phases);
        const runPhaseId = Object.keys(phases).find((k) => phases[k] === "running");
        setRunning(runPhaseId || null);
        const hid = raw?.investigation_id || raw?.id || raw?.hermes_investigation_id;
        if (hid) setHermesInvestigationId(hid);
      };

      const shouldStop = () => cancelledRef.current;
      const res = shouldResume
        ? await resumeHermesInvestigation({ caseId, onProgress, shouldStop })
        : await runHermesInvestigation({ caseId, caseItem, provider: providerId, onProgress, shouldStop });

      setLastResult(res);
      const engine = providerLabel(res.provider || providerId);
      if (res.status === "completed") toast.success(`${engine} investigation completed`);
      else if (res.status === "completed_with_errors") toast.warning(`${engine} investigation completed with agent errors — review the findings`);
      else toast.error(`${engine} investigation ${res.status}`);
      if (res.investigation_id) setHermesInvestigationId(res.investigation_id);
      invalidateAll();
    } catch (e) {
      const err = e instanceof HermesError ? e : { message: e?.message || String(e), hermesStatus: e?.status };
      setLastResult({
        status: "failed",
        provider: providerId,
        error: err.message,
        hermesStatus: err.hermesStatus,
        upstreamStatus: err.upstreamStatus,
      });
      const code = err.upstreamStatus ? ` (HTTP ${err.upstreamStatus})` : "";
      toast.error(`${providerLabel(providerId)} investigation failed${code}: ${err.message}`);
    } finally {
      setRunning(null);
      setRunAllActive(false);
      invalidateAll();
    }
  };
  const runAll = () => setConfirmOpen(true);
  const runOne = () => setConfirmOpen(true);

  // Built-in test hook: when the workspace navigates in with ?run=1, open the
  // confirmation for the preselected provider once the case has loaded.
  const autoRunRef = useRef(false);
  useEffect(() => {
    if (!autoRun || autoRunRef.current || !canRun || !runProvider || anyRunning) return;
    autoRunRef.current = true;
    setConfirmOpen(true);
  }, [autoRun, canRun, runProvider, anyRunning]);

  const phaseState = (id) => wf.phases?.[id]?.status || "pending";

  return (
    <section className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#0a0f1a]/80 to-[#0f1419]/80 p-4 sm:p-5 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Investigation Engine</p>
            <p className="text-[11px] text-gray-500">
              Selected for this run:{" "}
              <span className={providerDef ? "text-cyan-300" : "text-amber-300"}>
                {providerDef ? providerDef.label : "none yet"}
              </span>
              {caseProvider ? ` · case last run by ${providerLabel(caseProvider)}` : ""}
            </p>
            {providerDef && <p className="text-[10px] text-gray-600 font-mono mt-0.5">{providerDef.model}</p>}
            {caseProvider === "mia" && wf.mia_status && (
              <p className="text-[10px] font-mono mt-0.5 text-cyan-400/80">
                MIA RUN: <span className={wf.mia_status === "completed" ? "text-green-400" : wf.mia_status === "failed" ? "text-red-400" : "text-cyan-300"}>
                  {String(wf.mia_status).toUpperCase().replace(/_/g, " ")}
                </span>
              </p>
            )}
            {hermesInvestigationId && (
              <p className="text-[10px] text-cyan-400/80 font-mono mt-0.5">
                Hermes ID: {String(hermesInvestigationId).slice(0, 24)}
                {wf.hermes_status && (
                  <span className={`ml-2 ${wf.hermes_status === "completed" ? "text-green-400" : wf.hermes_status === "failed" || wf.hermes_status === "error" ? "text-red-400" : "text-cyan-300"}`}>
                    · {String(wf.hermes_status).toUpperCase()}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${providerDef?.available ? "border-green-500/30 text-green-400" : "border-amber-500/30 text-amber-400"}`}>
            {providerDef?.available ? "ready" : "select a provider"}
          </Badge>
          <Button
            size="sm"
            onClick={runAll}
            disabled={anyRunning || !canRun || !runProvider}
            title={!runProvider ? "Select an investigation provider first" : hermesActive ? "Review the provider and resume the investigation" : "Review the provider and start the pipeline"}
            className="bg-cyan-600 hover:bg-cyan-700 h-8"
          >
            {runAllActive ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : hermesActive ? <RotateCw className="w-3.5 h-3.5 mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
            {hermesActive ? "Resume / Sync" : allComplete ? "Re-run investigation" : "Run full pipeline"}
          </Button>
        </div>
      </header>

      {!hasTargets && !hasNarrative && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 flex items-start gap-2.5">
          <Crosshair className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-amber-100">Nothing to investigate yet</p>
            <p className="text-[11px] text-amber-200/70 mt-0.5 leading-relaxed">
              Add a <span className="font-medium">domain</span>, <span className="font-medium">IP address</span>, <span className="font-medium">wallet address</span>, <span className="font-medium">transaction hash</span>, <span className="font-medium">email</span>, a description, or other indicator, then start the pipeline.
            </p>
            {onGoToTargets && (
              <Button size="sm" variant="outline" onClick={onGoToTargets} className="mt-2 border-amber-500/40 text-amber-200 h-7 text-xs">
                Go to Targets
              </Button>
            )}
          </div>
        </div>
      )}
      {!hasTargets && hasNarrative && !hermesActive && (
        <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.04] p-3 flex items-start gap-2.5">
          <Crosshair className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-cyan-100">Narrative-only investigation</p>
            <p className="text-[11px] text-cyan-200/70 mt-0.5 leading-relaxed">
              This case has no external indicator (wallet, domain, IP, email, or phone). The selected provider analyses the submitted description only, and reports insufficient external indicators when no investigative lead exists. No targets are invented.
            </p>
          </div>
        </div>
      )}

      <InvestigationStageTimeline
        phases={PHASES}
        statuses={Object.fromEntries(PHASES.map((p) => [p.id, liveStatuses?.[p.id] || phaseState(p.id)]))}
        running={running}
        current={wf.current_phase}
        onSelect={runOne}
        disabled={anyRunning}
      />

      <InvestigationProviderPicker
        value={runProvider}
        onChange={setRunProvider}
        disabled={anyRunning}
        defaultProvider={defaultProvider}
        caseProvider={caseProvider}
        onTest={testConnection}
        testing={testing}
        testResult={testResult}
      />

      {lastResult && <LastResult result={lastResult} />}

      {history.length > 0 && (
        <RunHistory history={history} running={running} onRetry={runOne} disabled={anyRunning} />
      )}

      <ConfirmProviderLaunchDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        provider={runProvider}
        resume={hermesActive && runProvider === "hermes"}
        busy={runAllActive}
        onConfirm={runPipeline}
      />
    </section>
  );
}

function LastResult({ result }) {
  const ok = result.status === "completed" || result.status === "completed_with_errors";
  const partial = result.status === "completed_with_errors";
  const engine = providerLabel(result.provider);
  return (
    <div className={`rounded-lg border p-3 ${ok ? (partial ? "border-amber-500/25 bg-amber-500/[0.04]" : "border-green-500/20 bg-green-500/[0.04]") : "border-red-500/20 bg-red-500/[0.04]"}`}>
      <div className="flex items-start gap-2">
        {ok
          ? (partial ? <History className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />)
          : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-white">
            {engine} investigation {ok ? (partial ? "completed with agent errors" : "completed") : "failed"}
          </p>
          {!ok && (result.hermesStatus || result.upstreamStatus) && (
            <p className="text-[11px] text-red-300 mt-0.5 font-mono">
              {result.upstreamStatus ? `HTTP ${result.upstreamStatus} · ` : ""}{result.hermesStatus || "error"}
            </p>
          )}
          {ok ? (
            <pre className="text-[11px] text-gray-400 mt-1 max-h-32 overflow-auto whitespace-pre-wrap">{JSON.stringify(result.output || result.phases, null, 2).slice(0, 1200)}</pre>
          ) : (
            <>
              <p className="text-[11px] text-red-300 mt-1">{result.error}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                Nothing was retried on another provider. Change the provider above and confirm again to retry.
              </p>
            </>
          )}
          {result.report_id && <p className="text-[10px] text-gray-500 mt-1 font-mono">Dossier report: {result.report_id}</p>}
          {result.investigation_id && (
            <p className="text-[10px] text-gray-500 mt-1 font-mono">Hermes ID: {result.investigation_id}</p>
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
            <span className="text-gray-300 font-mono truncate hidden sm:inline">{providerLabel(r.provider)}/{r.model}</span>
            {r.status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : r.status === "failed" ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
            <span className="text-gray-500">{r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : "—"}</span>
            {r.status === "failed" && (
              <button onClick={onRetry} disabled={disabled} title="Retry investigation" className="text-amber-400 hover:text-amber-300 disabled:opacity-40">
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