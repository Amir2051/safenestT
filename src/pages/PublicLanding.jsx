import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import {
  ShieldCheck, ScanSearch, Wallet, FileLock2, Network, FileText,
  ArrowRight, Lock, Zap, BarChart3, CheckCircle2, BrainCircuit,
  Radar, Eye, GitBranch, Bot,
} from "lucide-react";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "AI Investigations",
    desc: "Six-phase guided workflow — planning, evidence, analysis, reality-check, risk, dossier — powered by MIA, the SafeNestT intelligence command layer.",
    accent: "cyan",
  },
  {
    icon: FileLock2,
    title: "Evidence Vault",
    desc: "Chain-of-custody tracking, hashing, and tamper-evident logs. Every artifact stays auditable and court-ready.",
    accent: "purple",
  },
  {
    icon: Wallet,
    title: "Blockchain Tracing",
    desc: "Wallet intelligence, transaction tracing, and fund-flow mapping across Ethereum, Bitcoin, and more — no fabricated data.",
    accent: "cyan",
  },
  {
    icon: Network,
    title: "Entity Graph",
    desc: "Persistent relationship mapping between wallets, people, domains, and exchanges with auditable lineage per run.",
    accent: "purple",
  },
  {
    icon: BarChart3,
    title: "Risk & Findings",
    desc: "Deterministic risk scoring and AI findings that start as 'proposed' — never auto-verified. You review, you approve.",
    accent: "cyan",
  },
  {
    icon: FileText,
    title: "Audit-Ready Reports",
    desc: "Classified sections (FACT, EVIDENCE, ANALYSIS) with evidence registers and exportable PDF / Markdown / JSON.",
    accent: "purple",
  },
];

const STATS = [
  { value: "6", label: "Investigation phases" },
  { value: "6", label: "Specialized AI agents" },
  { value: "∞", label: "Multi-tenant cases" },
  { value: "100%", label: "Auditable lineage" },
];

const AI_AGENTS = [
  { icon: BrainCircuit, name: "Mia", role: "Intelligence & Investigator Assistant", desc: "Your investigator-facing intelligence assistant for navigating cases, findings, evidence, and the SafeNestT investigation workflow.", accent: "cyan" },
  { icon: ShieldCheck, name: "Aegis", role: "Security & Threat Defense", desc: "Analyzes security signals and threat intelligence to help investigators understand defensive risk and emerging cyber threats.", accent: "purple" },
  { icon: Radar, name: "Orion", role: "OSINT & Digital Intelligence", desc: "Coordinates open-source intelligence across digital footprints, domains, IP addresses, and other investigation targets.", accent: "cyan" },
  { icon: Eye, name: "Nyx", role: "Identity & Exposure Intelligence", desc: "Focuses on identity signals, exposure indicators, and digital-risk intelligence that can support an investigation.", accent: "purple" },
  { icon: Wallet, name: "Vanta", role: "Fraud & Financial Intelligence", desc: "Specializes in fraud analysis, cryptocurrency investigations, wallet intelligence, transactions, and fund-flow analysis.", accent: "cyan" },
  { icon: GitBranch, name: "Nova", role: "Evidence Correlation & Risk Analysis", desc: "Connects evidence, findings, entities, relationships, provenance, and deterministic risk into an investigator-ready picture.", accent: "purple" },
];

const accentMap = {
  cyan: { ring: "border-cyan-500/30", glow: "shadow-cyan-500/20", text: "text-cyan-400", bg: "bg-cyan-500/10" },
  purple: { ring: "border-purple-500/30", glow: "shadow-purple-500/20", text: "text-purple-400", bg: "bg-purple-500/10" },
};

export default function PublicLanding() {
  const { navigateToLogin } = useAuth();

  const goSignIn = () => navigateToLogin();
  const goGetStarted = () => navigateToLogin();

  return (
    <div className="min-h-screen bg-[#020508] text-slate-100 relative overflow-hidden font-mono">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Investigator terminal navigation */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" aria-hidden="true" />
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wider text-lg leading-none">SAFENESTT</h1>
            <p className="text-cyan-400 text-[10px] font-mono mt-0.5">MIA // INVESTIGATION TERMINAL</p>
          </div>
        </div>
        <button
          onClick={goSignIn}
          className="px-4 py-2 text-sm font-semibold text-cyan-400 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/10 transition-colors"
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 pt-16 pb-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 rounded-full border border-cyan-500/30 bg-cyan-500/5">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-semibold text-cyan-300 tracking-[0.18em]">MIA // SECURE INVESTIGATION TERMINAL // ONLINE</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
          INVESTIGATOR COMMAND TERMINAL FOR
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            FRAUD // CRYPTO // CYBERCRIME
          </span>
        </h2>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          A case-centric intelligence operating system for planning investigations, collecting evidence, correlating entities, tracing blockchain activity, validating findings, assessing risk, and producing auditable dossiers. Intelligence is traceable. Evidence is reviewable. No fabricated data. Ever.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={goGetStarted}
            className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-shadow"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={goSignIn}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border border-slate-700 text-slate-200 font-semibold hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
          >
            <Lock className="w-4 h-4" />
            Sign In
          </button>
        </div>
        <p className="mt-4 text-[11px] text-slate-600 tracking-wide">AUTHENTICATED ACCESS // EMAIL + PASSWORD OR GOOGLE // TENANT-ISOLATED WORKSPACE</p>
      </section>

      {/* Stats */}
      <section className="relative z-10 px-6 pb-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-center">
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="mt-1 text-xs text-slate-400 tracking-wide uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-white tracking-tight">INVESTIGATION SYSTEMS</h3>
          <p className="mt-3 text-slate-500 font-mono text-xs uppercase tracking-widest">Live case intelligence // evidence // analysis // reporting</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const a = accentMap[f.accent];
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className={`rounded-2xl border ${a.ring} bg-slate-900/40 p-6 hover:bg-slate-900/60 transition-colors shadow-lg ${a.glow}`}
              >
                <div className={`w-11 h-11 rounded-lg ${a.bg} ${a.ring} border flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${a.text}`} />
                </div>
                <h4 className="text-white font-semibold text-lg">{f.title}</h4>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* AI Intelligence Team */}
      <section className="relative z-10 px-6 pb-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full border border-purple-500/30 bg-purple-500/5">
            <Bot className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs font-semibold text-purple-300 tracking-wide">SAFENESTT INTELLIGENCE TEAM</span>
          </div>
          <h3 className="text-3xl font-bold text-white tracking-tight">MIA INTELLIGENCE // SPECIALIZED AGENTS</h3>
          <p className="mt-3 text-slate-500 max-w-2xl mx-auto text-sm">Six coordinated intelligence roles operate inside the investigation workflow. Agent output remains attributable to evidence, provenance, and investigator review.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {AI_AGENTS.map((agent, index) => {
            const a = accentMap[agent.accent];
            const Icon = agent.icon;
            return (
              <div
                key={agent.name}
                className={"group rounded-2xl border " + a.ring + " bg-slate-900/40 p-6 hover:bg-slate-900/60 transition-all shadow-lg " + a.glow + (index === 0 ? " ring-1 ring-cyan-400/20" : "")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={"w-12 h-12 rounded-xl " + a.bg + " " + a.ring + " border flex items-center justify-center"}>
                    <Icon className={"w-6 h-6 " + a.text} />
                  </div>
                  {index === 0 && (
                    <span className="text-[9px] uppercase tracking-[0.18em] text-cyan-400 border border-cyan-500/20 rounded-full px-2 py-1">Lead</span>
                  )}
                </div>
                <h4 className="mt-5 text-xl font-bold text-white">{agent.name}</h4>
                <p className={"mt-1 text-sm font-medium " + a.text}>{agent.role}</p>
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{agent.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Investigation Workflow */}
      <section className="relative z-10 px-6 pb-20 max-w-6xl mx-auto">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 md:p-10">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-white tracking-tight">CASE EXECUTION PIPELINE</h3>
            <p className="mt-3 text-slate-500 text-sm">TARGET → PLAN → COLLECT → ANALYZE → REALITY CHECK → RISK → DOSSIER. Every stage leaves an auditable trail.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {["Planning", "Evidence", "Analysis", "Reality Check", "Risk", "Dossier"].map((phase, index) => (
              <div key={phase} className="relative rounded-xl border border-slate-800 bg-black/30 p-4 text-center">
                <div className="mx-auto w-8 h-8 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 flex items-center justify-center text-xs font-bold">{index + 1}</div>
                <div className="mt-3 text-xs font-semibold text-slate-200">{phase}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <h3 className="text-2xl font-bold text-white text-center tracking-tight">EVIDENCE // PROVENANCE // HUMAN REVIEW</h3>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {[
              "No fabricated findings, wallets, or relationships",
              "AI findings start as 'proposed' — you verify",
              "Every run has auditable lineage",
            ].map((p) => (
              <div key={p} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-slate-300">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto text-center">
        <h3 className="text-3xl font-bold text-white">Ready to investigate with confidence?</h3>
        <p className="mt-3 text-slate-400">Create your account and open your first case in minutes.</p>
        <button
          onClick={goGetStarted}
          className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-shadow"
        >
          Get Started
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-slate-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <ShieldCheck className="w-4 h-4 text-cyan-500/70" />
            <span>SAFENESTT // MULTI-TENANT INVESTIGATION OPERATING SYSTEM // MIA TERMINAL</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <Link to="/TermsAndConditions" className="hover:text-cyan-400 transition-colors">Terms</Link>
            <Link to="/PrivacyPolicy" className="hover:text-cyan-400 transition-colors">Privacy</Link>
            <Link to="/AcceptableUsePolicy" className="hover:text-cyan-400 transition-colors">Acceptable Use</Link>
            <Link to="/RefundPolicy" className="hover:text-cyan-400 transition-colors">Refunds</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}