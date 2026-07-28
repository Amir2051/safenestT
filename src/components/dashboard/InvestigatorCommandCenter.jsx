// SafeNestT — AI Investigator Command Center (futuristic).
// Consumes the local real-shaped data layer (src/lib/safenestData) so the
// console is fully populated offline, and mirrors InvestigationCase shapes so
// it can be swapped to base44.entities in production. Glassmorphism + motion.
import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Radar, Wallet, Activity, Brain, Crosshair, TrendingDown, Link2, Globe2 } from "lucide-react";
import { data } from "@/lib/safenestData";

const fmtUsd = (n) => "$" + (n || 0).toLocaleString("en-US");

const GLOW = {
  critical: "shadow-[0_0_25px_rgba(255,80,80,0.35)] border-red-500/40",
  high: "shadow-[0_0_20px_rgba(255,160,60,0.3)] border-orange-500/40",
  medium: "shadow-[0_0_18px_rgba(250,204,21,0.25)] border-yellow-500/30",
  low: "shadow-[0_0_15px_rgba(80,200,255,0.2)] border-cyan-500/30",
};

function Kpi({ icon: Icon, label, value, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl border bg-white/[0.03] backdrop-blur-xl p-4 ${accent}`}
    >
      <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-cyan-500/10 blur-2xl" />
      <Icon className="w-5 h-5 text-cyan-300 mb-2" />
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-slate-400">{label}</div>
    </motion.div>
  );
}

export default function InvestigatorCommandCenter() {
  const { cases, wallets, threats, intelligence, kpis } = data;
  const activeCases = cases.filter((c) => !["recovered", "closed"].includes(c.status));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 grid place-items-center border border-cyan-500/30">
            <Brain className="w-5 h-5 text-cyan-300" />
            <span className="absolute -inset-1 rounded-xl border border-cyan-400/20 animate-ping" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI Investigator Command Center</h2>
            <p className="text-xs text-slate-400">Real-time correlation · wallet tracing · threat fusion</p>
          </div>
        </div>
        <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          LIVE
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={Crosshair} label="Active Cases" value={kpis.activeCases} accent={GLOW.high} />
        <Kpi icon={TrendingDown} label="Loss Tracked" value={fmtUsd(kpis.totalLossUsd)} accent={GLOW.critical} />
        <Kpi icon={Wallet} label="Wallets Monitored" value={kpis.monitoredWallets} accent={GLOW.medium} />
        <Kpi icon={Link2} label="Cross-Case Links" value={kpis.linkedConnections} accent={GLOW.low} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Active cases */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Radar className="w-4 h-4 text-cyan-300" />
            <h3 className="text-sm font-semibold text-white">Active Investigations</h3>
          </div>
          <div className="space-y-2">
            {activeCases.map((c) => (
              <motion.div key={c.id} whileHover={{ x: 4 }} className="rounded-xl border border-white/5 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium truncate">{c.case_title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${GLOW[c.priority] || GLOW.low}`}>{c.priority}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                  <span>{c.case_number}</span>
                  <span>{fmtUsd(c.amount_stolen_usd)}</span>
                  <span className="text-cyan-300">{c.investigation_progress}% done</span>
                  {c.linked_case_ids?.length > 0 && (
                    <span className="flex items-center gap-1 text-violet-300"><Link2 className="w-3 h-3" />{c.linked_case_ids.length}</span>
                  )}
                </div>
                {/* progress bar */}
                <div className="h-1 mt-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${c.investigation_progress}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Threat fusion + intel */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-4 h-4 text-red-300" />
              <h3 className="text-sm font-semibold text-white">Threat Fusion</h3>
            </div>
            <div className="space-y-2">
              {threats.map((t) => (
                <div key={t.id} className={`rounded-lg border p-2 ${GLOW[t.severity] || GLOW.low}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white truncate">{t.title}</span>
                    <span className="text-[9px] uppercase text-slate-400">{t.severity}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">{t.source} · {t.status}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-violet-300" />
              <h3 className="text-sm font-semibold text-white">Intel Signals</h3>
            </div>
            <div className="space-y-2">
              {intelligence.map((i) => (
                <div key={i.id} className="rounded-lg border border-violet-500/20 bg-black/20 p-2">
                  <div className="text-xs text-white">{i.title}</div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span className="capitalize">{i.category}</span>
                    <span className="text-emerald-300">{Math.round(i.confidence * 100)}% conf</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wallet monitor strip */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe2 className="w-4 h-4 text-cyan-300" />
          <h3 className="text-sm font-semibold text-white">Monitored Wallets</h3>
          <span className="text-[11px] text-slate-500">on-chain tracing · hop detection</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {wallets.map((w) => (
            <div key={w.address} className={`rounded-lg border p-2 ${GLOW[w.risk] || GLOW.low}`}>
              <div className="flex items-center justify-between">
                <code className="text-[11px] text-cyan-200 truncate">{w.address.slice(0, 10)}…{w.address.slice(-6)}</code>
                <span className="text-[10px] uppercase text-slate-300">{w.risk}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">{w.label} · {w.chains.join("/")} · {w.tx_count} tx · {fmtUsd(w.total_usd)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
