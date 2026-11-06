import React, { useState } from "react";
import { ChevronDown, RefreshCw, AlertTriangle, Activity, Server } from "lucide-react";
import { Panel, StatusPill, Pill, KV, Bar, TD, TH } from "@/os/ui/kit";
import { SERVICES, JOBS, OPS_EVENTS, INTEGRATIONS } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

export default function Operations() {
  const demoAction = useDemoToast();
  const [openJob, setOpenJob] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const errors = OPS_EVENTS.filter((e) => e.level !== "info");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Operations</h1>
          <p className="text-[11.5px] text-os-muted">Service health, background jobs and operational alerts</p>
        </div>
        <button
          onClick={() => demoAction("Refreshing service health")}
          className="flex items-center gap-1 rounded border border-os-line bg-os-panel px-2 py-1.5 text-[11px] text-os-muted hover:text-os-text"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Service health" subtitle="All adapters are simulated in this prototype" bodyClassName="p-0">
          <ul className="divide-y divide-os-line">
            {SERVICES.map((s) => (
              <li key={s.name} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    s.status === "operational" ? "bg-os-green" : s.status === "degraded" ? "bg-os-amber" : "bg-os-muted"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] text-os-text">{s.name}</p>
                  <p className="truncate text-[10.5px] text-os-muted">{s.detail}</p>
                </div>
                <span className="font-mono text-[10.5px] text-os-muted">{s.latency}</span>
                <span className="w-14 text-right font-mono text-[10.5px] text-os-muted">{s.uptime}</span>
                <StatusPill value={s.status} />
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-2.5">
          <Panel title="Error monitor" subtitle={`${errors.length} active signals`} actions={<Pill tone={errors.length ? "warn" : "good"}>{errors.length ? "attention" : "clear"}</Pill>}>
            <button
              onClick={() => setShowErrors((v) => !v)}
              className="flex w-full items-center justify-between rounded border border-os-line bg-os-surface px-2 py-1.5 text-[11.5px] text-os-text hover:border-os-line2"
            >
              <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-os-amber" /> Inspect diagnostics</span>
              <ChevronDown className={`h-3.5 w-3.5 text-os-muted transition-transform ${showErrors ? "rotate-180" : ""}`} />
            </button>
            {showErrors && (
              <div className="mt-2 space-y-1.5">
                {errors.map((e) => (
                  <div key={e.t + e.msg} className="rounded border border-os-line bg-os-bg px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-os-muted">{e.t}</span>
                      <StatusPill value={e.level === "error" ? "failed" : "warning"} />
                    </div>
                    <p className={`mt-0.5 text-[11px] leading-snug ${e.level === "error" ? "text-os-red" : "text-os-amber"}`}>{e.msg}</p>
                    <p className="mt-1 font-mono text-[9.5px] text-os-muted">
                      trace: adapter → retry(2) → abort · correlation demo-{e.t.replace(":", "")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Integration status" bodyClassName="p-0">
            <ul className="divide-y divide-os-line">
              {INTEGRATIONS.slice(0, 4).map((i) => (
                <li key={i.name} className="flex items-center gap-2 px-3 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-os-text">{i.name}</span>
                  <StatusPill value={i.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <Panel title="Background jobs" subtitle="Click a job for its last execution detail" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr className="border-b border-os-line">
                  <TH>Job</TH><TH>Schedule</TH><TH>Last run</TH><TH>Duration</TH><TH>Status</TH>
                </tr>
              </thead>
              <tbody>
                {JOBS.map((j) => (
                  <React.Fragment key={j.name}>
                    <tr
                      onClick={() => setOpenJob(openJob === j.name ? null : j.name)}
                      className="cursor-pointer border-b border-os-line/60 hover:bg-os-raised"
                    >
                      <TD className="max-w-[220px] truncate">
                        <span className="flex items-center gap-1.5">
                          <ChevronDown className={`h-3 w-3 text-os-muted transition-transform ${openJob === j.name ? "rotate-180" : ""}`} />
                          {j.name}
                        </span>
                      </TD>
                      <TD className="text-os-muted">{j.schedule}</TD>
                      <TD className="font-mono text-[10.5px] text-os-muted">{j.last}</TD>
                      <TD className="font-mono text-[10.5px] text-os-muted">{j.duration}</TD>
                      <TD><StatusPill value={j.status} /></TD>
                    </tr>
                    {openJob === j.name && (
                      <tr className="border-b border-os-line/60 bg-os-surface">
                        <td colSpan={5} className="px-3 py-2">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <KV label="Last execution" value={j.last} mono />
                            <KV label="Duration" value={j.duration} mono />
                            <KV label="Result" value={<StatusPill value={j.status} />} />
                          </div>
                          <p className="mt-1.5 text-[10.5px] leading-snug text-os-muted">
                            {j.status === "failed"
                              ? "Upstream adapter refused the connection. Retry is queued for the next window (simulated)."
                              : "Execution completed with no warnings. Output written to the prototype store."}
                          </p>
                          <button
                            onClick={() => demoAction(`Re-running “${j.name}”`)}
                            className="mt-1.5 rounded border border-os-line bg-os-panel px-2 py-0.5 text-[10.5px] text-os-cyan hover:border-os-cobalt/40"
                          >
                            Run now (demo)
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Recent events" subtitle="Synthetic operational stream" bodyClassName="p-0" actions={<Pill tone="cyan"><Activity className="h-3 w-3" /> live-looking, not live</Pill>}>
          <ul className="divide-y divide-os-line">
            {OPS_EVENTS.map((e) => (
              <li key={e.t + e.msg} className="flex gap-2 px-3 py-1.5">
                <span className="font-mono text-[10px] text-os-muted">{e.t}</span>
                <span
                  className={`min-w-0 flex-1 text-[11px] leading-snug ${
                    e.level === "error" ? "text-os-red" : e.level === "warn" ? "text-os-amber" : "text-os-muted"
                  }`}
                >
                  {e.msg}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Queue depth" subtitle="Last 8 hours · simulated" bodyClassName="p-3">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["Evidence ingest", 34, "bg-os-cyan"],
            ["Report rendering", 62, "bg-os-amber"],
            ["Enrichment", 18, "bg-os-cobalt"],
            ["Notifications", 5, "bg-os-green"],
          ].map(([label, value, tone]) => (
            <div key={label}>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-os-muted">{label}</span>
                <span className="font-mono text-os-text">{value}%</span>
              </div>
              <div className="mt-1"><Bar value={value} tone={tone} /></div>
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[10.5px] text-os-muted">
          <Server className="h-3 w-3" /> Queue telemetry is illustrative only; no workers are running.
        </p>
      </Panel>
    </div>
  );
}