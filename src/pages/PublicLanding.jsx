import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  ShieldCheck, Lock, ArrowRight, FileSearch, Wallet, Network,
  Scale, Building2, Users, ShieldAlert, Fingerprint, GitBranch,
  ClipboardCheck, Radar, CheckCircle2, Activity, ScrollText
} from "lucide-react";
import TerminalPanel from "@/components/investigation-shell/TerminalPanel";
import { ThreatIntelPanel } from "@/components/investigation-shell/IntelPanels";
import AgentGrid from "@/components/investigation-shell/AgentGrid";
import InvestigationPipeline from "@/components/investigation-shell/InvestigationPipeline";
import EvidencePanel from "@/components/investigation-shell/EvidencePanel";
import EntityGraph from "@/components/investigation-shell/EntityGraph";
import { SectionLabel, Tag } from "@/components/investigation-shell/panelPrimitives";

/**
 * SafeNestT — public homepage.
 * Positions SafeNestT as a Security Operations & Investigation Services (SO & IS)
 * platform: case-centric investigations, evidence with provenance, threat
 * intelligence, and auditable client representation — no fabricated data.
 */

const INVESTIGATION_TYPES = [
  { icon: Wallet, label: "Cryptocurrency Theft & Fraud", desc: "On-chain tracing, wallet attribution, and fund-flow mapping across major blockchains, with transaction-pattern analysis." },
  { icon: FileSearch, label: "Phishing & Account Takeover", desc: "Domain, infrastructure, and impersonation analysis with evidence preserved for agency referral." },
  { icon: ShieldAlert, label: "Investment & Romance Scams", desc: "Pig-butchering, fake-exchange, and rug-pull investigations with actor attribution and fund recovery support." },
  { icon: Lock, label: "Ransomware & Extortion", desc: "Incident scoping, payment tracing, and leak-site / negotiator intelligence." },
  { icon: Fingerprint, label: "Identity Theft & Impersonation", desc: "Subject identification, alias resolution, and digital footprint mapping across platforms." },
  { icon: Network, label: "Cyber Intrusion & BEC", desc: "Business-email-compromise, unauthorized access, and insider-threat investigations." },
];

const WORKFLOW = [
  { icon: ClipboardCheck, label: "Planning", desc: "Scope, objectives, legal authority, and target model defined per case." },
  { icon: FileSearch, label: "Evidence", desc: "Artifacts collected, hashed, and chain-of-custody logged — every item traceable." },
  { icon: GitBranch, label: "Analysis", desc: "Entity extraction, correlation, and graph construction across evidence sources." },
  { icon: ShieldCheck, label: "Reality Check", desc: "Findings separated into fact, evidence, analysis, and inference — nothing fabricated." },
  { icon: Radar, label: "Risk", desc: "Quantified risk scoring with explicit confidence levels and reviewer verification." },
  { icon: Scale, label: "Dossier", desc: "Auditable, exportable case dossier for legal, regulatory, or law-enforcement use." },
];

const AUDIENCE = [
  { icon: Building2, label: "Enterprise Security Teams", desc: "Centralize fraud, insider, and cyber investigations under tenant-isolated workspaces with role-based access." },
  { icon: Users, label: "Investigation Firms & Analysts", desc: "Case-centric workflow, evidence management, and client-representation tooling built for practitioners." },
  { icon: Scale, label: "Legal & Compliance", desc: "Defensible chain of custody and structured dossiers ready for filings, referrals, and regulatory submission." },
];

function FeatureRow({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-md border border-slate-800/60 bg-[#06090d]/60 hover:border-cyan-500/30 transition-colors">
      <div className="w-10 h-10 shrink-0 rounded-md bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-cyan-400" />
      </div>
      <div className="min-w-0">
        <h4 className="text-slate-100 font-semibold text-sm">{title}</h4>
        <p className="text-slate-400 text-[13px] leading-relaxed mt-1">{desc}</p>
      </div>
    </div>
  );
}

export default function PublicLanding() {
  const { navigateToLogin } = useAuth();
  const go = () => navigateToLogin();
  const goOrg = () => base44.auth.redirectToLogin(`${window.location.origin}/OrganizationOnboarding`);

  return (
    <div className="min-h-screen bg-[#05080b] text-slate-200 relative overflow-hidden font-sans">
      <div className="absolute inset-0 ic-grid-bg pointer-events-none opacity-50" aria-hidden="true" />
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
            <p className="text-[9px] text-cyan-500/80 tracking-wider mt-0.5">SECURITY OPERATIONS & INVESTIGATION SERVICES</p>
          </div>
        </div>
        <button
          onClick={go}
          className="px-3 h-8 text-[11px] font-mono font-semibold tracking-wider uppercase text-cyan-300 border border-cyan-500/40 rounded-md hover:bg-cyan-500/10 transition-colors"
        >
          Sign In
        </button>
      </header>

      {/* HERO */}
      <section className="relative z-10 px-4 sm:px-6 pt-10 pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto items-start">
          <div className="lg:col-span-7">
            <SectionLabel>Investigation Operating System</SectionLabel>
            <h1 className="mt-3 text-4xl xl:text-5xl font-bold text-slate-100 tracking-tight leading-[1.1]">
              Security Operations<br />
              <span className="text-cyan-400">&amp; Investigation Services</span>
            </h1>
            <p className="mt-5 text-[15px] text-slate-400 leading-relaxed max-w-2xl">
              SafeNestT is a case-centric intelligence platform for fraud, cryptocurrency, and cybercrime
              investigations. It unifies planning, evidence collection, correlation, risk scoring, and
              auditable dossier generation into a single, defensible workflow — so every finding is
              traceable, every artifact is reviewable, and nothing is fabricated.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <button
                onClick={goOrg}
                className="group inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-shadow"
              >
                Create Organization Account
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={go}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border border-slate-700/70 text-slate-300 font-semibold text-sm hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
              >
                Sign In
              </button>
              <a
                href="#workflow"
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md border border-slate-700/70 text-slate-300 font-semibold text-sm hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
              >
                How Investigations Work
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag tone="slate">TENANT-ISOLATED</Tag>
              <Tag tone="slate">AUDITABLE LINEAGE</Tag>
              <Tag tone="slate">EVIDENCE PROVENANCE</Tag>
              <Tag tone="slate">NO FABRICATED DATA</Tag>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-md border border-slate-800/60 bg-[#06090d]/70 ic-grid-bg overflow-hidden">
              <TerminalPanel />
            </div>
          </div>
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section className="relative z-10 px-4 sm:px-6 pb-14 max-w-7xl mx-auto">
        <SectionLabel className="mb-4">Who SafeNestT Serves</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AUDIENCE.map((a) => (
            <FeatureRow key={a.label} icon={a.icon} title={a.label} desc={a.desc} />
          ))}
        </div>
      </section>

      {/* INVESTIGATION TYPES */}
      <section className="relative z-10 px-4 sm:px-6 pb-14 max-w-7xl mx-auto">
        <SectionLabel className="mb-4">Investigations We Handle</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {INVESTIGATION_TYPES.map((t) => (
            <FeatureRow key={t.label} icon={t.icon} title={t.label} desc={t.desc} />
          ))}
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="relative z-10 px-4 sm:px-6 pb-14 max-w-7xl mx-auto scroll-mt-16">
        <SectionLabel className="mb-3">Investigation Workflow</SectionLabel>
        <p className="text-slate-400 text-[14px] max-w-2xl mb-6">
          Every case progresses through a structured, auditable pipeline. Outputs from each phase
          persist with lineage, so a reviewer can trace any finding back to the evidence and the
          run that produced it.
        </p>
        <div className="rounded-md border border-slate-800/60 bg-[#06090d]/60 p-4 sm:p-6">
          <InvestigationPipeline activeIndex={2} simulated />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {WORKFLOW.map((w) => (
              <div key={w.label} className="flex items-start gap-3 p-3 rounded-md bg-slate-900/30 border border-slate-800/50">
                <w.icon className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-slate-200 text-[13px] font-semibold leading-none">{w.label}</p>
                  <p className="text-slate-500 text-[12px] mt-1 leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVIDENCE & PROVENANCE */}
      <section className="relative z-10 px-4 sm:px-6 pb-14 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">Evidence & Provenance</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <p className="text-slate-400 text-[14px] leading-relaxed">
              SafeNestT maintains strict separation between verified evidence, AI inference, and
              investigator conclusions. Each artifact is hashed and chain-of-custody logged; AI-generated
              findings begin as <span className="text-cyan-300">proposed</span> and require human review
              before they are marked verified. A full audit trail records who did what, and when.
            </p>
            <ul className="space-y-2">
              {[
                "Chain-of-custody logging on every evidence item",
                "Findings classified as fact, evidence, analysis, or inference",
                "Confidence levels and reviewer verification on every finding",
                "Immutable audit events for all case actions",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-slate-300 text-[13px]">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <EvidencePanel />
        </div>
      </section>

      {/* THREAT INTELLIGENCE + GRAPH */}
      <section className="relative z-10 px-4 sm:px-6 pb-14 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">Threat Intelligence & Entity Graphs</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThreatIntelPanel simulated />
          <EntityGraph simulated />
        </div>
      </section>

      {/* AI AGENTS */}
      <section className="relative z-10 px-4 sm:px-6 pb-14 max-w-7xl mx-auto">
        <SectionLabel className="mb-3">Investigation AI Agents</SectionLabel>
        <p className="text-slate-400 text-[14px] max-w-2xl mb-6">
          Specialized agents assist across the investigation lifecycle — always operating under human
          review and against the evidence in your case.
        </p>
        <AgentGrid simulated />
      </section>

      {/* ENTERPRISE */}
      <section className="relative z-10 px-4 sm:px-6 pb-14 max-w-7xl mx-auto">
        <SectionLabel className="mb-4">Built for Professional & Enterprise Use</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureRow icon={Building2} title="Multi-Tenant Isolation" desc="Tenant-scoped data isolation and role-based access control keep each organization's cases private and scoped." />
          <FeatureRow icon={ScrollText} title="Auditable Client Representation" desc="Recorded client authorizations scope every action taken on a client's behalf, with a full filing lineage." />
          <FeatureRow icon={Activity} title="Operational Telemetry" desc="Live investigation activity, evidence queues, and risk overview for security-operations command centers." />
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 sm:px-6 pb-16 max-w-3xl mx-auto">
        <div className="rounded-md border border-cyan-500/25 bg-[#06090d] ic-grid-bg p-6 sm:p-8 text-center">
          <SectionLabel className="mb-3 justify-center">Access Investigation Platform</SectionLabel>
          <p className="text-slate-400 text-[14px] mb-5">
            Authenticate to open your tenant-isolated investigator workspace.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={goOrg}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20"
            >
              <Lock className="w-4 h-4" /> Create Organization Account
            </button>
            <button
              onClick={go}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-md border border-slate-700/70 text-slate-300 font-semibold text-sm hover:border-cyan-500/40 hover:text-cyan-300 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="relative z-10 px-4 sm:px-6 py-6 border-t border-slate-800/60 bg-[#06090d]/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-500/70" />
            SAFENESTT // SECURITY OPERATIONS & INVESTIGATION SERVICES
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