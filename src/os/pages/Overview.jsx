import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { FolderSearch, CheckCircle2, ClipboardCheck, Archive, ListChecks, FileText, ArrowUpRight, RefreshCw } from "lucide-react";
import InvestigationTable from "@/os/components/InvestigationTable";
import { Panel, Tile, StatusPill, RiskBar, Bar, Pill, EmptyNote } from "@/os/ui/kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  INVESTIGATIONS, EVIDENCE, FINDINGS, REPORTS, RISK_DISTRIBUTION, ACTIVITY_SERIES, TEAM, SERVICES, OPS_EVENTS,
} from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const RANGES = ["7 days", "30 days", "90 days"];
const SCALE = { "7 days": 1, "30 days": 3.4, "90 days": 9.6 };

const TOOLTIP = {
  contentStyle: { background: "#141A22", border: "1px solid #2E3A48", borderRadius: 4, fontSize: 11 },
  labelStyle: { color: "#8A96A7", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" },
  itemStyle: { color: "#E7ECF3" },
};

export default function Overview() {
  const navigate = useNavigate();
  const demoAction = useDemoToast();
  const [range, setRange] = useState("7 days");
  const [drill, setDrill] = useState(null);

  const active = INVESTIGATIONS.filter((i) => i.status === "active").length;
  const completed = INVESTIGATIONS.filter((i) => i.status === "completed").length;
  const reviews = INVESTIGATIONS.filter((i) => i.status === "review").length;
  const pendingReports = REPORTS.filter((r) => r.status === "pending_approval").length;

  const series = useMemo(
    () => ACTIVITY_SERIES.map((d) => ({
      ...d,
      runs: Math.round(d.runs * (SCALE[range] > 1 ? 1 : 1)),
      findings: Math.round(d.findings * (SCALE[range] > 1 ? 1.6 : 1)),
    })),
    [range]
  );

  const tiles = [
    { key: "active", label: "Active investigations", value: active, sub: "3 critical · 4 in review queue", icon: FolderSearch },
    { key: "completed", label: "Completed", value: completed, sub: "Last 30 days", icon: CheckCircle2 },
    { key: "reviews", label: "Pending reviews", value: reviews + pendingReports, sub: `${pendingReports} reports · ${reviews} cases`, icon: ClipboardCheck },
    { key: "evidence", label: "Evidence items", value: EVIDENCE.length * 24, sub: "2 awaiting custody verification", icon: Archive },
    { key: "findings", label: "Findings generated", value: FINDINGS.length * 11, sub: "68% evidence-backed", icon: ListChecks },
    { key: "reports", label: "Reports awaiting approval", value: pendingReports, sub: "Oldest waiting 9 hrs", icon: FileText },
  ];

  const drillRows = {
    active: INVESTIGATIONS.filter((i) => i.status === "active"),
    completed: INVESTIGATIONS.filter((i) => i.status === "completed"),
    reviews: INVESTIGATIONS.filter((i) => i.status === "review"),
    evidence: [],
    findings: [],
    reports: [],
  };

  const teamTotal = TEAM.reduce((a, m) => a + m.active, 0);
  const maxRisk = Math.max(...RISK_DISTRIBUTION.map((r) => r.count));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Operational overview</h1>
          <p className="text-[11.5px] text-os-muted">
            Meridian Investigations · Thursday 06 Nov 2026 · 21:57 local
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded border border-os-line bg-os-panel p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded px-2 py-1 text-[11px] ${
                  range === r ? "bg-os-cobalt/20 text-os-text" : "text-os-muted hover:text-os-text"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={() => demoAction("Refreshing metrics")}
            className="flex items-center gap-1 rounded border border-os-line bg-os-panel px-2 py-1.5 text-[11px] text-os-muted hover:text-os-text"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Tile
            key={t.key}
            label={t.label}
            value={<span>{t.value}</span>}
            sub={t.sub}
            icon={t.icon}
            onClick={() => setDrill(t)}
          />
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Investigation activity"
          subtitle={`Runs and findings · last ${range.toLowerCase()}`}
          actions={<Pill tone="cyan">synthetic</Pill>}
        >
          <ResponsiveContainer width="100%" height={182}>
            <AreaChart data={series} margin={{ top: 4, right: 6, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="osRuns" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="osFindings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1c242e" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#8A96A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A96A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} />
              <Area type="monotone" dataKey="runs" stroke="#22D3EE" strokeWidth={1.6} fill="url(#osRuns)" name="Runs" />
              <Area type="monotone" dataKey="findings" stroke="#3B82F6" strokeWidth={1.6} fill="url(#osFindings)" name="Findings" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-2 flex items-center gap-4 border-t border-os-line pt-2 text-[10.5px] text-os-muted">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-os-cyan" /> Investigation runs</span>
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-3 rounded-full bg-os-cobalt" /> Findings generated</span>
          </div>
        </Panel>

        <div className="space-y-2.5">
          <Panel title="Risk distribution" subtitle="10 open matters">
            <div className="space-y-2.5">
              {RISK_DISTRIBUTION.map((r) => (
                <div key={r.band}>
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-os-muted">{r.band}</span>
                    <span className="font-mono tabular-nums text-os-text">{r.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-os-line">
                    <div className="h-full rounded-full" style={{ width: `${(r.count / maxRisk) * 100}%`, background: r.tone }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="System services" subtitle="Prototype adapters" bodyClassName="p-0">
            <ul className="divide-y divide-os-line">
              {SERVICES.slice(0, 4).map((s) => (
                <li key={s.name} className="flex items-center gap-2 px-3 py-1.5">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      s.status === "operational" ? "bg-os-green" : s.status === "degraded" ? "bg-os-amber" : "bg-os-muted"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-os-text">{s.name}</span>
                  <span className="font-mono text-[10px] text-os-muted">{s.latency}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => navigate("/os/operations")}
              className="flex w-full items-center justify-center gap-1 border-t border-os-line py-1.5 text-[10.5px] text-os-cyan hover:bg-os-raised"
            >
              Open operations <ArrowUpRight className="h-3 w-3" />
            </button>
          </Panel>
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          title="Recent operations"
          subtitle="Click a row to open the investigation"
          bodyClassName="p-0"
          actions={
            <button onClick={() => navigate("/os/investigations")} className="text-[10.5px] text-os-cyan hover:underline">
              View all
            </button>
          }
        >
          <InvestigationTable rows={INVESTIGATIONS.slice(0, 6)} compact />
        </Panel>

        <div className="space-y-2.5">
          <Panel title="Team workload" subtitle={`${teamTotal} active assignments`} bodyClassName="p-3">
            <ul className="space-y-2.5">
              {TEAM.slice(0, 5).map((m) => (
                <li key={m.name}>
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-os-raised font-mono text-[9px] font-bold text-os-cyan">
                      {m.initials}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-os-text">{m.name}</span>
                    <span className="font-mono text-[10px] tabular-nums text-os-muted">{m.capacity}%</span>
                  </div>
                  <div className="mt-1 pl-7">
                    <Bar
                      value={m.capacity}
                      tone={m.capacity >= 85 ? "bg-os-red" : m.capacity >= 65 ? "bg-os-amber" : "bg-os-cobalt"}
                      className="h-1"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Operational alerts" subtitle="Synthetic event stream" bodyClassName="p-0">
            <ul className="divide-y divide-os-line">
              {OPS_EVENTS.slice(0, 4).map((e) => (
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
      </div>

      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{drill?.label}</DialogTitle>
            <DialogDescription className="text-[12px]">
              {drill?.sub} · drill-down on synthetic prototype data
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto">
            {drill && drillRows[drill.key].length > 0 ? (
              <InvestigationTable rows={drillRows[drill.key]} compact />
            ) : drill?.key === "evidence" ? (
              <ul className="divide-y divide-os-line rounded border border-os-line">
                {EVIDENCE.slice(0, 6).map((e) => (
                  <li key={e.ref} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                    <span className="font-mono text-[10.5px] text-os-muted">{e.ref}</span>
                    <span className="flex-1 text-os-text">{e.type}</span>
                    <StatusPill value={e.custody} />
                  </li>
                ))}
                <li className="px-3 py-2">
                  <button onClick={() => { setDrill(null); navigate("/os/evidence"); }} className="text-[11px] text-os-cyan hover:underline">
                    Open evidence inventory →
                  </button>
                </li>
              </ul>
            ) : drill?.key === "findings" ? (
              <ul className="divide-y divide-os-line rounded border border-os-line">
                {FINDINGS.slice(0, 6).map((f) => (
                  <li key={f.ref} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                    <span className="font-mono text-[10.5px] text-os-muted">{f.ref}</span>
                    <span className="min-w-0 flex-1 truncate text-os-text">{f.title}</span>
                    <StatusPill value={f.kind} />
                  </li>
                ))}
                <li className="px-3 py-2">
                  <button onClick={() => { setDrill(null); navigate("/os/findings"); }} className="text-[11px] text-os-cyan hover:underline">
                    Open findings register →
                  </button>
                </li>
              </ul>
            ) : (
              <ul className="divide-y divide-os-line rounded border border-os-line">
                {REPORTS.filter((r) => r.status === "pending_approval" || r.status === "draft").map((r) => (
                  <li key={r.ref} className="flex items-center gap-2 px-3 py-2 text-[12px]">
                    <span className="font-mono text-[10.5px] text-os-muted">{r.ref}</span>
                    <span className="min-w-0 flex-1 truncate text-os-text">{r.title}</span>
                    <StatusPill value={r.status} />
                  </li>
                ))}
                <li className="px-3 py-2">
                  <button onClick={() => { setDrill(null); navigate("/os/reports"); }} className="text-[11px] text-os-cyan hover:underline">
                    Open reports centre →
                  </button>
                </li>
              </ul>
            )}
          </div>
          <p className="text-[10.5px] text-os-muted">
            Metrics are derived from the prototype dataset only. Nothing here reflects live production figures.
          </p>
        </DialogContent>
      </Dialog>

      {!INVESTIGATIONS.length && <EmptyNote>No synthetic cases loaded.</EmptyNote>}
    </div>
  );
}