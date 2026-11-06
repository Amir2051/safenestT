import React from "react";
import {
  BarChart, Bar as RBar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Panel, Pill, KV, TD, TH, Bar } from "@/os/ui/kit";
import { ANALYTICS, INVESTIGATIONS } from "@/os/lib/demoData";

const TOOLTIP = {
  contentStyle: { background: "#141A22", border: "1px solid #2E3A48", borderRadius: 4, fontSize: 11 },
  labelStyle: { color: "#8A96A7", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em" },
  itemStyle: { color: "#E7ECF3" },
};

const MIX = [
  ["Investment fraud", 4, 38],
  ["BEC / invoice fraud", 3, 26],
  ["Money laundering", 2, 21],
  ["Ransomware", 1, 11],
  ["Other", 2, 4],
];

export default function Analytics() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Analytics</h1>
          <p className="text-[11.5px] text-os-muted">Workspace performance across the synthetic dataset</p>
        </div>
        <Pill tone="cyan">all figures synthetic</Pill>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Cases opened (Nov)", "22", "+14% vs Oct"],
          ["Median resolution", "13 days", "−2 days vs Oct"],
          ["Findings per case", "6.4", "68% evidence-backed"],
          ["Evidence verified", "82%", "2 items pending"],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded border border-os-line bg-os-panel px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-os-muted">{label}</div>
            <div className="mt-1 font-mono text-lg leading-none text-os-text">{value}</div>
            <div className="mt-0.5 text-[10.5px] text-os-muted">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-2.5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Case volume" subtitle="Opened vs closed · last 6 months">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={ANALYTICS.volume} margin={{ top: 4, right: 6, left: -24, bottom: 0 }} barGap={2}>
              <CartesianGrid stroke="#1c242e" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "#8A96A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A96A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} cursor={{ fill: "#19212B" }} />
              <Legend wrapperStyle={{ fontSize: 10, color: "#8A96A7" }} />
              <RBar dataKey="opened" name="Opened" fill="#3B82F6" radius={[2, 2, 0, 0]} barSize={12} />
              <RBar dataKey="closed" name="Closed" fill="#22D3EE" radius={[2, 2, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Case origin" subtitle="Where matters come from">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={ANALYTICS.sources} dataKey="value" nameKey="name" innerRadius={44} outerRadius={72} paddingAngle={2} stroke="#141A22">
                {ANALYTICS.sources.map((s) => (
                  <Cell key={s.name} fill={s.tone} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-1 space-y-1">
            {ANALYTICS.sources.map((s) => (
              <li key={s.name} className="flex items-center gap-1.5 text-[10.5px] text-os-muted">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.tone }} />
                <span className="flex-1 truncate">{s.name}</span>
                <span className="font-mono text-os-text">{s.value}%</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title="Median resolution time" subtitle="Days from intake to dossier">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={ANALYTICS.resolution} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid stroke="#1c242e" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: "#8A96A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A96A7", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP} />
              <Line type="monotone" dataKey="days" name="Days" stroke="#8B5CF6" strokeWidth={1.8} dot={{ r: 2.5, fill: "#8B5CF6" }} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Case mix" subtitle="Share of open matters" bodyClassName="p-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-os-line">
                <TH>Category</TH><TH>Cases</TH><TH>Share</TH>
              </tr>
            </thead>
            <tbody>
              {MIX.map(([name, count, share]) => (
                <tr key={name} className="border-b border-os-line/60 last:border-b-0">
                  <TD>{name}</TD>
                  <TD className="font-mono tabular-nums">{count}</TD>
                  <TD className="w-[45%]">
                    <div className="flex items-center gap-2">
                      <Bar value={share} tone="bg-os-cyan" className="h-1" />
                      <span className="w-8 text-right font-mono text-[10px] text-os-muted">{share}%</span>
                    </div>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Risk posture" subtitle="Distribution across the current case set" bodyClassName="p-3">
        <div className="grid gap-3 sm:grid-cols-4">
          {INVESTIGATIONS.slice(0, 4).map((i) => (
            <div key={i.code} className="rounded border border-os-line bg-os-surface px-2.5 py-2">
              <p className="truncate text-[11px] text-os-text">{i.code}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-lg leading-none text-os-text">{i.risk}</span>
                <span className="text-[10px] text-os-muted">/100 risk</span>
              </div>
              <div className="mt-1.5">
                <Bar value={i.risk} tone={i.risk >= 80 ? "bg-os-red" : i.risk >= 60 ? "bg-os-amber" : "bg-os-cobalt"} className="h-1" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid gap-3 border-t border-os-line pt-2.5 sm:grid-cols-3">
          <KV label="Mean risk" value={<span className="font-mono">{Math.round(INVESTIGATIONS.reduce((a, i) => a + i.risk, 0) / INVESTIGATIONS.length)}</span>} />
          <KV label="Critical matters" value={<span className="font-mono">{INVESTIGATIONS.filter((i) => i.priority === "critical").length}</span>} />
          <KV label="Reported loss (demo)" value={<span className="font-mono">${(INVESTIGATIONS.reduce((a, i) => a + i.lossUsd, 0) / 1e6).toFixed(2)}M</span>} />
        </div>
      </Panel>
    </div>
  );
}