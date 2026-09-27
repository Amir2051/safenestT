import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, ArrowRight } from "lucide-react";
import TerminalPanel from "@/components/investigation-shell/TerminalPanel";
import { IntelligencePanel, ThreatIntelPanel } from "@/components/investigation-shell/IntelPanels";
import AgentGrid from "@/components/investigation-shell/AgentGrid";
import InvestigationPipeline from "@/components/investigation-shell/InvestigationPipeline";
import EvidencePanel from "@/components/investigation-shell/EvidencePanel";
import EntityGraph from "@/components/investigation-shell/EntityGraph";
import { SectionLabel, Tag } from "@/components/investigation-shell/panelPrimitives";

/**
 * SafeNestT // MIA — public homepage as a cyber-investigation command center.
 * All terminal/intel telemetry is static presentation data (labelled SIMULATED).
 */
export default function PublicLanding() {
  const { navigateToLogin } = useAuth();
  const go = () => navigateToLogin();

  return (
    <div className="min-h-screen bg-[#05080b] text-slate-200 relative overflow-hidden font-mono">
      {/* terminal texture + ambient */}
      <div className="absolute inset-0 ic-grid-bg pointer-events-none opacity-60" aria-hidden="true" />
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-cyan-500/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-blue-500/[0.05] rounded-full blur-[120px]" />
      </div>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" aria-hidden="true" />

      {/* top bar */}
      <header className="relative z-10 px-4 sm:px-6 h-12 flex items-center justify-between border-b border-slate-800/60 bg-[#06090d]/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-wider text-slate-100 leading-none">SAFENESTT</p>
            <p className="text-[9px] text-cyan-500/80 tracking-wider mt-0.5">MIA // INVESTIGATION INTELLIGENCE PLATFORM</p>
          </div>
        </div>
        <button
          onClick={go}
          className="px-3 h-8 text-[11px] font-mono font-semibold tracking-wider uppercase text-cyan-300 border border-cyan-500/40 rounded-md hover:bg-cyan-500/10 transition-colors"
        >
          Sign In
        </button>
      </header>

      {/* ── HERO: three-part command composition ─────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pt-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto">
          {/* LEFT */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div>
              <SectionLabel>Investigation Terminal</SectionLabel>
              <h1 className="text-3xl xl:text-4xl font-bold text-slate-100 tracking-tight leading-tight">
                SAFENESTT
                <span className="block text-cyan-400 text-lg xl:text-xl font-mono tracking-wider mt-1">
                  MIA INVESTIGATION INTELLIGENCE PLATFORM
                </span>
              </h1>
              <p className="mt-4 text-[13px] text-slate-400 leading-relaxed font-sans">
                A case-centric intelligence operating system for fraud, crypto, and cybercrime
                investigations — planning, evidence, correlation, risk, and auditable dossiers.
                Intelligence is traceable. Evidence is reviewable. No fabricated data.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={go}
                className="group inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-mono text-[12px] font-semibold tracking-wider uppercase shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow"
              >
                Access Investigation Platform
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <p className="text-[10px] text-slate-600 tracking-wider text-center">
                TENANT-ISOLATED INVESTIGATOR WORKSPACE
              </p>
            </div>
          </div>

          {/* CENTER — terminal */}
          <div className="lg:col-span-6">
            <TerminalPanel />
          </div>

          {/* RIGHT — intelligence console */}
          <div className="lg:col-span-3">
            <IntelligencePanel />
          </div>
        </div>
      </section>

      {/* ── AI AGENT COMMAND GRID ─────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">AI Agent Command Grid</SectionLabel>
        <AgentGrid simulated />
      </section>

      {/* ── INVESTIGATION PIPELINE ────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">Investigation Pipeline</SectionLabel>
        <InvestigationPipeline activeIndex={3} simulated />
      </section>

      {/* ── EVIDENCE INTELLIGENCE ─────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">Evidence Intelligence</SectionLabel>
        <EvidencePanel />
      </section>

      {/* ── INVESTIGATION GRAPH ───────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">Investigation Graph</SectionLabel>
        <EntityGraph simulated />
      </section>

      {/* ── THREAT INTELLIGENCE ───────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">Threat Intelligence</SectionLabel>
        <ThreatIntelPanel simulated />
      </section>

      {/* ── AUTH CTA ──────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-4 sm:px-6 pb-16 max-w-3xl mx-auto">
        <div className="rounded-md border border-cyan-500/25 bg-[#06090d] ic-grid-bg p-6 sm:p-8 text-center">
          <SectionLabel className="mb-3 justify-center">Access Investigation Platform</SectionLabel>
          <p className="text-slate-400 text-[13px] font-sans mb-5">
            Authenticate to open your tenant-isolated investigator workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={go}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-mono text-[12px] font-semibold tracking-wider uppercase shadow-lg shadow-cyan-500/20"
            >
              <Lock className="w-4 h-4" /> AUTHENTICATE
            </button>
            <span className="text-[10px] font-mono text-slate-600 tracking-wider">
              EMAIL + PASSWORD // GOOGLE AUTHENTICATION
            </span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Tag tone="slate">TENANT-ISOLATED</Tag>
            <Tag tone="slate">AUDITABLE LINEAGE</Tag>
            <Tag tone="slate">NO FABRICATED DATA</Tag>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-6 border-t border-slate-800/60 bg-[#06090d]/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/70" />
            SAFENESTT // MULTI-TENANT INVESTIGATION OPERATING SYSTEM // MIA TERMINAL
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 tracking-wider uppercase">
            <Link to="/TermsAndConditions" className="hover:text-cyan-400">Terms</Link>
            <Link to="/PrivacyPolicy" className="hover:text-cyan-400">Privacy</Link>
            <Link to="/AcceptableUsePolicy" className="hover:text-cyan-400">Acceptable Use</Link>
            <Link to="/RefundPolicy" className="hover:text-cyan-400">Refunds</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}