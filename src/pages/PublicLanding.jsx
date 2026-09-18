import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import {
  ShieldCheck, ScanSearch, Wallet, FileLock2, Network, FileText,
  ArrowRight, Lock, Zap, BarChart3, CheckCircle2,
} from "lucide-react";

const FEATURES = [
  {
    icon: ScanSearch,
    title: "AI Investigations",
    desc: "Six-phase guided workflow — planning, evidence, analysis, reality-check, risk, dossier — powered by the real Hermes engine.",
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
  { value: "1", label: "Unified case OS" },
  { value: "∞", label: "Multi-tenant cases" },
  { value: "100%", label: "Auditable lineage" },
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
    <div className="min-h-screen bg-[#000000] text-slate-100 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[140px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wider text-lg leading-none">SafeNestT</h1>
            <p className="text-cyan-400 text-[10px] font-mono mt-0.5">// INVESTIGATION OS //</p>
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
          <span className="text-xs font-semibold text-cyan-300 tracking-wide">Powered by the Hermes investigation engine</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
          The Investigation OS for
          <br />
          <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Fraud, Crypto & Cybercrime
          </span>
        </h2>
        <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
          Manage the full lifecycle of fraud cases — evidence, blockchain traces, entity graphs, findings, and court-ready reports — in one secure, multi-tenant platform. No fabricated data. Ever.
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
        <p className="mt-4 text-xs text-slate-500">
          Sign in with email &amp; password or Google — choose what works for you.
        </p>
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
          <h3 className="text-3xl font-bold text-white">Everything an investigator needs</h3>
          <p className="mt-3 text-slate-400">One platform. Real engine. Honest results.</p>
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

      {/* Principles */}
      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <h3 className="text-2xl font-bold text-white text-center">Built on honesty</h3>
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
            <span>SafeNestT — Investigation Operating System</span>
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