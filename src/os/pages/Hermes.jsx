import React, { useState } from "react";
import { Cpu, ChevronDown, Play, RotateCcw, ShieldCheck, Sparkles, AlertTriangle, Database } from "lucide-react";
import { Panel, StatusPill, Pill, KV, Bar, EmptyNote } from "@/os/ui/kit";
import { HERMES_PHASES, HERMES_RUNS } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const PHASE_COPY = {
  create: ["Create", "Investigation record opened with indicator classes"],
  start: ["Start", "Execution queued on the engine"],
  poll: ["Poll", "Status polled until terminal state"],
  findings: ["Findings", "Structured findings returned"],
  report: ["Report", "Dossier assembled from supported findings"],
  persist: ["Persist", "Findings, report and risk written to the case"],
};

const LEVEL_CLASS = {
  info: "text-os-muted",
  warn: "text-os-amber",
  error: "text-os-red",
};

export default function Hermes() {
  const demoAction = useDemoToast();
  const [runId, setRunId] = useState(HERMES_RUNS[0].id);
  const [openEvent, setOpenEvent] = useState(null);

  const run = HERMES_RUNS.find((r) => r.id === runId) || HERMES_RUNS[0];
  const phaseIdx = HERMES_PHASES.indexOf(run.phase);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-os-text">
            <Cpu className="h-4 w-4 text-os-cyan" /> Hermes AI operations
          </h1>
          <p className="max-w-2xl text-[11.5px] leading-relaxed text-os-muted">
            Six-phase investigation lifecycle. Every run on this screen is simulated — the prototype is <span className="text-os-amber">not connected</span> to a
            Hermes gateway and makes no outbound calls.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Pill tone="warn"><AlertTriangle className="h-3 w-3" /> simulation mode</Pill>
          <button
            onClick={() => demoAction("Starting a Hermes run")}
            className="flex items-center gap-1.5 rounded bg-os-cobalt px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-os-cobalt2"
          >
            <Play className="h-3.5 w-3.5" /> New run
          </button>
        </div>
      </div>

      <Panel title="Lifecycle" subtitle="Phase state for the selected run" bodyClassName="p-3">
        <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {HERMES_PHASES.map((p, i) => {
            const state = i < phaseIdx ? "done" : i === phaseIdx ? (run.status === "failed" ? "error" : "current") : "todo";
            const [label, desc] = PHASE_COPY[p];
            return (
              <li
                key={p}
                className={`rounded border px-2 py-1.5 ${
                  state === "done"
                    ? "border-os-green/30 bg-os-green/5"
                    : state === "current"
                    ? "border-os-cyan/40 bg-os-cyan/10"
                    : state === "error"
                    ? "border-os-red/40 bg-os-red/10"
                    : "border-os-line bg-os-surface"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9.5px] text-os-muted">{i + 1}</span>
                  <span className="text-[11px] font-medium text-os-text">{label}</span>
                  {state === "current" && <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-os-cyan" />}
                  {state === "done" && <ShieldCheck className="ml-auto h-3 w-3 text-os-green" />}
                  {state === "error" && <AlertTriangle className="ml-auto h-3 w-3 text-os-red" />}
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-os-muted">{desc}</p>
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="grid gap-2.5 xl:grid-cols-5">
        <Panel className="xl:col-span-2" title="Run history" subtitle={`${HERMES_RUNS.length} simulated runs`} bodyClassName="p-0">
          <ul className="divide-y divide-os-line">
            {HERMES_RUNS.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => { setRunId(r.id); setOpenEvent(null); }}
                  className={`w-full px-3 py-2 text-left transition-colors ${
                    r.id === run.id ? "bg-os-raised" : "hover:bg-os-raised"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] text-os-cyan">{r.id}</span>
                    <StatusPill value={r.status} />
                    <span className="ml-auto font-mono text-[10px] text-os-muted">{r.duration}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[10px] text-os-muted">{r.case}</span>
                    <span className="truncate text-[10.5px] text-os-muted">· {r.phase}</span>
                  </div>
                  <div className="mt-1"><Bar value={r.progress} tone={r.status === "failed" ? "bg-os-red" : r.progress === 100 ? "bg-os-green" : "bg-os-cyan"} className="h-1" /></div>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-2.5 xl:col-span-3">
          <Panel
            title={`Run ${run.id}`}
            subtitle={`${run.case} · ${run.provider}`}
            actions={<StatusPill value={run.status} />}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KV label="Current phase" value={<span className="capitalize">{run.phase}</span>} />
              <KV label="Progress" value={<span className="font-mono">{run.progress}%</span>} />
              <KV label="Duration" value={run.duration} mono />
              <KV label="Started" value={run.started} mono />
              <KV label="Model" value={run.model} />
              <KV label="Findings" value={<span className="font-mono">{run.findings}</span>} />
              <KV
                label="Persistence"
                value={
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3 text-os-muted" />
                    {run.persisted.replace(/_/g, " ")}
                  </span>
                }
              />
              <KV label="Provider" value={run.provider} />
            </div>

            <div className="mt-3"><Bar value={run.progress} tone={run.status === "failed" ? "bg-os-red" : run.progress === 100 ? "bg-os-green" : "bg-os-cyan"} /></div>

            {run.error && (
              <div className="mt-3 rounded border border-os-red/30 bg-os-red/10 px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-os-red">
                  <AlertTriangle className="h-3.5 w-3.5" /> Run failed
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-os-red/90">{run.error}</p>
                <button
                  onClick={() => demoAction("Retrying the failed run")}
                  className="mt-1.5 flex items-center gap-1 rounded border border-os-red/40 px-2 py-0.5 text-[10.5px] text-os-red hover:bg-os-red/15"
                >
                  <RotateCcw className="h-3 w-3" /> Retry run (demo)
                </button>
              </div>
            )}

            <p className="mt-2.5 text-[10.5px] leading-snug text-os-muted">{run.note}</p>
          </Panel>

          <Panel title="Trace explorer" subtitle="Expand an event for diagnostics" bodyClassName="p-0">
            <ul className="divide-y divide-os-line">
              {run.trace.map((e, i) => {
                const key = `${run.id}-${i}`;
                const open = openEvent === key;
                return (
                  <li key={key}>
                    <button
                      onClick={() => setOpenEvent(open ? null : key)}
                      className="flex w-full items-start gap-2 px-3 py-1.5 text-left hover:bg-os-raised"
                    >
                      <span className="shrink-0 font-mono text-[10px] text-os-muted">{e.t}</span>
                      <span className="shrink-0 rounded border border-os-line2 bg-os-surface px-1 py-0.5 font-mono text-[9px] uppercase text-os-muted">
                        {e.phase}
                      </span>
                      <span className={`min-w-0 flex-1 text-[11px] leading-snug ${LEVEL_CLASS[e.level]}`}>{e.msg}</span>
                      <ChevronDown className={`mt-0.5 h-3 w-3 shrink-0 text-os-muted transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="border-t border-os-line bg-os-bg px-3 py-2">
                        <pre className="overflow-x-auto font-mono text-[10px] leading-relaxed text-os-muted">{`{
  "run_id": "${run.id}",
  "phase": "${e.phase}",
  "event_type": "${e.type}",
  "at": "${e.t}",
  "level": "${e.level}",
  "message": "${e.msg.replace(/"/g, "'")}",
  "correlation_id": "demo-${run.id.slice(-4)}",
  "upstream": "simulated — no request issued"
}`}</pre>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Panel title="Findings from this run" subtitle="Observed vs inference">
              {run.findings > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 rounded border border-os-cyan/25 bg-os-cyan/5 px-2 py-1.5 text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-os-cyan" />
                    <span className="flex-1 text-os-text">Observed findings</span>
                    <span className="font-mono text-os-muted">{Math.ceil(run.findings * 0.6)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded border border-os-violet/25 bg-os-violet/5 px-2 py-1.5 text-[11px]">
                    <Sparkles className="h-3.5 w-3.5 text-os-violet" />
                    <span className="flex-1 text-os-text">AI inferences</span>
                    <span className="font-mono text-os-muted">{Math.floor(run.findings * 0.4)}</span>
                  </div>
                  <p className="pt-0.5 text-[10px] text-os-muted">Inferences are gated until evidence is attached.</p>
                </div>
              ) : <EmptyNote>This run produced no findings.</EmptyNote>}
            </Panel>

            <Panel title="Observed vs inferred" subtitle="How the pipeline separates signal">
              <dl className="space-y-1.5 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-os-muted">Evidence-backed</dt><dd className="font-mono text-os-cyan">verified only</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-os-muted">Model reasoning</dt><dd className="font-mono text-os-violet">labelled</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-os-muted">No-evidence claims</dt><dd className="font-mono text-os-amber">downgraded</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-os-muted">Dossier citations</dt><dd className="font-mono text-os-text">supported only</dd>
                </div>
              </dl>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}