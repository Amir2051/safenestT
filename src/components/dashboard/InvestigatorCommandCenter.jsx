// SafeNestT — AI Investigator Command Center.
// Database-backed: MyCase, InvestigationRun, and Transaction records only.
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Radar, Wallet, Activity, Brain, Crosshair, TrendingDown, Link2, Globe2 } from "lucide-react";

const fmtUsd = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
const GLOW = {
  critical: "shadow-[0_0_25px_rgba(255,80,80,0.35)] border-red-500/40",
  high: "shadow-[0_0_20px_rgba(255,160,60,0.3)] border-orange-500/40",
  medium: "shadow-[0_0_18px_rgba(250,204,21,0.25)] border-yellow-500/30",
  low: "shadow-[0_0_15px_rgba(80,200,255,0.2)] border-cyan-500/30",
};

function Kpi({ icon: Icon, label, value, accent }) {
  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`relative overflow-hidden rounded-2xl border bg-white/[0.03] p-4 ${accent}`}>
    <Icon className="w-5 h-5 text-cyan-300 mb-2" />
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-[11px] uppercase tracking-widest text-slate-400">{label}</div>
  </motion.div>;
}

export default function InvestigatorCommandCenter({ data = {} }) {
  const cases = Array.isArray(data.cases) ? data.cases : [];
  const runs = Array.isArray(data.investigationRuns) ? data.investigationRuns : [];
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const caseIds = useMemo(() => new Set(cases.map(c => c.id)), [cases]);
  const scopedRuns = useMemo(() => runs.filter(r => caseIds.has(r.case_id)), [runs, caseIds]);
  const scopedTransactions = useMemo(() => transactions.filter(t => caseIds.has(t.case_id)), [transactions, caseIds]);
  const activeCases = useMemo(() =>
    cases.filter(c => !["resolved", "completed", "recovered", "closed"].includes(String(c.status || "").toLowerCase()))
      .sort((a, b) => (Number(b.amount_lost) || 0) - (Number(a.amount_lost) || 0)).slice(0, 6), [cases]);

  const totalLoss = cases.reduce((sum, c) => sum + (Number(c.amount_lost) || 0), 0);
  const walletSet = new Set();
  cases.forEach(c => [c.scammer_wallet, c.victim_wallet, ...(Array.isArray(c.monitored_wallets) ? c.monitored_wallets : [])]
    .filter(Boolean).forEach(w => walletSet.add(String(w).trim())));
  const linkedConnections = cases.reduce((sum, c) => sum + (Array.isArray(c.linked_case_ids) ? c.linked_case_ids.length : 0), 0);
  const recentRuns = [...scopedRuns].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)).slice(0, 5);
  const signals = activeCases.slice(0, 4).map(c => ({
    id: c.id, title: c.case_title || c.title || c.case_number || "Untitled case",
    severity: ["critical", "high", "medium"].includes(String(c.priority || "").toLowerCase()) ? String(c.priority).toLowerCase() : "low",
    source: c.issue_type || c.fraud_type || "case record", status: c.status || "unknown"
  }));
  const walletRows = Array.from(walletSet).slice(0, 6).map(address => {
    const related = cases.filter(c => [c.scammer_wallet, c.victim_wallet, ...(Array.isArray(c.monitored_wallets) ? c.monitored_wallets : [])]
      .filter(Boolean).map(String).includes(address));
    const txCount = scopedTransactions.filter(t => String(t.from_address || "").trim() === address || String(t.to_address || "").trim() === address).length;
    return { address, cases: related.length, txCount };
  });

  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 grid place-items-center border border-cyan-500/30"><Brain className="w-5 h-5 text-cyan-300" /></div>
        <div><h2 className="text-lg font-semibold text-white">AI Investigator Command Center</h2><p className="text-xs text-slate-400">Live case correlation · wallet tracing · investigation runs</p></div>
      </div>
      <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">DATABASE LIVE</span>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Kpi icon={Crosshair} label="Active Cases" value={activeCases.length} accent={GLOW.high} />
      <Kpi icon={TrendingDown} label="Loss Tracked" value={fmtUsd(totalLoss)} accent={GLOW.critical} />
      <Kpi icon={Wallet} label="Wallets Monitored" value={walletSet.size} accent={GLOW.medium} />
      <Kpi icon={Link2} label="Cross-Case Links" value={linkedConnections} accent={GLOW.low} />
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center gap-2 mb-3"><Radar className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-semibold text-white">Active Investigations</h3></div>
        <div className="space-y-2">
          {activeCases.length === 0 ? <div className="py-8 text-center text-sm text-slate-500">No active MyCase records.</div> : activeCases.map(c => {
            const progress = Math.max(0, Math.min(100, Number(c.investigation_progress) || 0));
            const sev = String(c.priority || "").toLowerCase();
            return <motion.div key={c.id} whileHover={{ x: 4 }} className="rounded-xl border border-white/5 bg-black/20 p-3">
              <div className="flex items-center justify-between"><span className="text-sm text-white font-medium truncate">{c.case_title || c.title || c.case_number || "Untitled case"}</span><span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${GLOW[sev] || GLOW.low}`}>{c.priority || "unclassified"}</span></div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400"><span>{c.case_number || c.id}</span><span>{fmtUsd(c.amount_lost)}</span><span className="text-cyan-300">{progress}% done</span>{Array.isArray(c.linked_case_ids) && c.linked_case_ids.length > 0 && <span className="text-violet-300">{c.linked_case_ids.length} links</span>}</div>
              <div className="h-1 mt-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${progress}%` }} /></div>
            </motion.div>;
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-4 h-4 text-red-300" /><h3 className="text-sm font-semibold text-white">Case Signals</h3></div>
          <div className="space-y-2">{signals.length === 0 ? <p className="text-xs text-slate-500">No active case signals.</p> : signals.map(t =>
            <div key={t.id} className={`rounded-lg border p-2 ${GLOW[t.severity]}`}><div className="flex items-center justify-between"><span className="text-xs text-white truncate">{t.title}</span><span className="text-[9px] uppercase text-slate-400">{t.severity}</span></div><div className="text-[10px] text-slate-500">{t.source} · {t.status}</div></div>
          )}</div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 mb-3"><Activity className="w-4 h-4 text-violet-300" /><h3 className="text-sm font-semibold text-white">Investigation Runs</h3></div>
          <div className="space-y-2">{recentRuns.length === 0 ? <p className="text-xs text-slate-500">No investigation runs recorded for current cases.</p> : recentRuns.map(r =>
            <div key={r.id} className="rounded-lg border border-violet-500/20 bg-black/20 p-2"><div className="flex items-center justify-between"><span className="text-xs text-white capitalize">{r.phase || "investigation"}</span><span className="text-[10px] text-emerald-300">{r.status || "unknown"}</span></div><div className="text-[10px] text-slate-500">{r.case_id}</div></div>
          )}</div>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 mb-3"><Globe2 className="w-4 h-4 text-cyan-300" /><h3 className="text-sm font-semibold text-white">Case Wallets</h3><span className="text-[11px] text-slate-500">wallets recorded in MyCase + linked transactions</span></div>
      <div className="grid sm:grid-cols-2 gap-2">{walletRows.length === 0 ? <p className="text-xs text-slate-500">No wallet addresses recorded on current cases.</p> : walletRows.map(w =>
        <div key={w.address} className="rounded-lg border border-cyan-500/20 bg-black/20 p-2"><div className="flex items-center justify-between"><code className="text-[11px] text-cyan-200 truncate">{w.address.slice(0, 10)}…{w.address.slice(-6)}</code><span className="text-[10px] text-slate-300">{w.cases} case{w.cases === 1 ? "" : "s"}</span></div><div className="text-[10px] text-slate-500 mt-1">{w.txCount} linked transaction record{w.txCount === 1 ? "" : "s"}</div></div>
      )}</div>
    </div>
  </div>;
}
