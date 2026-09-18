import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  Target, FileSearch, Crosshair, Network, GitBranch, FlaskConical,
  ShieldAlert, FileText, ScrollText, ArrowLeft, User, DollarSign, Gauge, Sparkles, Briefcase, Satellite,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";
import { getHermesStatus, pingHermes } from "@/lib/hermesClient";
import OsintProvidersTab from "@/components/platform/tabs/OsintProvidersTab";
import { PHASES } from "@/lib/investigationRunner";
import InvestigationRunnerPanel from "@/components/platform/InvestigationRunnerPanel";
import OverviewTab from "@/components/platform/tabs/OverviewTab";
import EvidenceVaultTab from "@/components/platform/tabs/EvidenceVaultTab";
import TargetsTab from "@/components/platform/tabs/TargetsTab";
import BlockchainTab from "@/components/platform/tabs/BlockchainTab";
import EntitiesTab from "@/components/platform/tabs/EntitiesTab";
import TimelineTab from "@/components/platform/tabs/TimelineTab";
import FindingsTab from "@/components/platform/tabs/FindingsTab";
import RiskTab from "@/components/platform/tabs/RiskTab";
import ReportsTab from "@/components/platform/tabs/ReportsTab";
import ActivityTab from "@/components/platform/tabs/ActivityTab";

const TABS = [
  { key: "overview", label: "Overview", icon: Target },
  { key: "evidence", label: "Evidence", icon: FileSearch },
  { key: "targets", label: "Targets", icon: Crosshair },
  { key: "findings", label: "Findings", icon: FlaskConical },
  { key: "risk", label: "Risk", icon: ShieldAlert },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "activity", label: "Activity", icon: ScrollText },
  { key: "blockchain", label: "Blockchain", icon: Network },
  { key: "entities", label: "Entities", icon: FileSearch },
  { key: "osint", label: "OSINT", icon: Satellite },
  { key: "timeline", label: "Timeline", icon: GitBranch },
];

export default function InvestigationWorkspace() {
  const [params] = useSearchParams();
  const caseId = params.get("case_id");
  const requestedTab = params.get("tab");
  const [activeTab, setActiveTab] = useState(requestedTab || "overview");
  const hermes = getHermesStatus();
  // Real Hermes reachability — pings the server-side proxy. Falls back to the
  // static "configured" state while the first check is in flight.
  const { data: hermesHealth } = useQuery({
    queryKey: ["hermes-health"],
    queryFn: () => pingHermes(),
    staleTime: 30000,
  });
  const hermesState = hermesHealth?.state || hermes.state;

  // Honour a ?tab= deep link (Evidence / Findings & Risk / Reports & Dossiers).
  useEffect(() => {
    if (requestedTab && TABS.some((t) => t.key === requestedTab)) setActiveTab(requestedTab);
  }, [requestedTab]);

  const { data: caseItem, isLoading } = useQuery({
    queryKey: ["investigation-case", caseId],
    queryFn: () => base44.entities.InvestigationCase.get(caseId),
    enabled: !!caseId,
  });

  // Recent cases for the AI Investigations landing (shown when no case is open).
  const { data: recentCases = [] } = useQuery({
    queryKey: ["investigation-cases-recent"],
    queryFn: () => base44.entities.InvestigationCase.list("-last_activity", 12),
    enabled: !caseId,
  });

  if (!caseId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/[0.07] to-cyan-500/[0.04] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-purple-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white tracking-tight">AI Investigations</h1>
              <p className="text-sm text-gray-400 mt-0.5">Pick a case to launch the case-aware AI runner — planning, evidence, multi-agent analysis, reality check, risk, and dossier.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/CasesManagement" className="text-xs px-3 py-1.5 rounded-md border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 transition-colors">Browse all cases</Link>
            <Link to="/CaseImport" className="text-xs px-3 py-1.5 rounded-md border border-white/15 text-gray-300 hover:bg-white/5 transition-colors">Import a case</Link>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Recent cases</h2>
          {recentCases.length === 0 ? (
            <EmptyState variant="empty" icon={Briefcase} title="No cases yet"
              description="Create or import a case to begin an AI investigation."
              action={<Link to="/CasesManagement"><Badge variant="outline" className="border-cyan-500/30 text-cyan-400 cursor-pointer">Go to Cases</Badge></Link>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentCases.map((c) => (
                <Link key={c.id} to={`/InvestigationWorkspace?case_id=${c.id}&tab=overview`}
                  className="group rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:border-cyan-500/40 hover:bg-cyan-500/[0.04] transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs text-gray-500 font-mono truncate">#{c.case_number || c.id?.slice(-6)}</span>
                    <Badge variant="outline" className="capitalize border-cyan-500/30 text-cyan-400">{(c.status || "new").replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-sm font-medium text-white truncate group-hover:text-cyan-200">{c.case_title || "Untitled case"}</p>
                  <p className="text-xs text-gray-500 mt-1 capitalize">{c.fraud_type?.replace(/_/g, " ") || "investigation"}</p>
                  <div className="flex items-center justify-between mt-3 text-[11px] text-gray-500">
                    <span className="truncate">{c.victim_name || "—"}</span>
                    <span className="text-cyan-400 group-hover:text-cyan-300 shrink-0">Open runner →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (isLoading) return <div className="p-8"><EmptyState variant="loading" title="Loading case…" /></div>;
  if (!caseItem) return <div className="p-8"><EmptyState variant="error" title="Case not found" description="This case may have been deleted or you may not have access." /></div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <Link to="/CasesManagement" className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-400 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" />Back to cases
      </Link>

      <CaseHeader caseItem={caseItem} hermesState={hermesState} hermesMs={hermesHealth?.ms} />

      <InvestigationRunnerPanel caseId={caseId} caseItem={caseItem} />

      <nav className="sticky top-0 z-20 -mx-4 sm:mx-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex gap-1 overflow-x-auto px-4 sm:px-0 py-2 no-scrollbar" role="tablist" aria-label="Investigation sections">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              role="tab"
              aria-selected={activeTab === t.key}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? "text-cyan-300 bg-cyan-500/10 border border-cyan-500/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <t.icon className="w-4 h-4" />{t.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="pt-1">
        {activeTab === "overview" && <OverviewTab caseId={caseId} caseItem={caseItem} hermesState={hermesState} />}
        {activeTab === "evidence" && <EvidenceVaultTab caseId={caseId} />}
        {activeTab === "targets" && <TargetsTab caseId={caseId} hermesState={hermesState} />}
        {activeTab === "findings" && <FindingsTab caseId={caseId} />}
        {activeTab === "risk" && <RiskTab caseId={caseId} caseItem={caseItem} hermesState={hermesState} />}
        {activeTab === "reports" && <ReportsTab caseId={caseId} hermesState={hermesState} />}
        {activeTab === "activity" && <ActivityTab caseId={caseId} hermesState={hermesState} />}
        {activeTab === "blockchain" && <BlockchainTab caseId={caseId} hermesState={hermesState} />}
        {activeTab === "entities" && <EntitiesTab caseId={caseId} hermesState={hermesState} />}
        {activeTab === "timeline" && <TimelineTab caseId={caseId} hermesState={hermesState} />}
        {activeTab === "osint" && <OsintProvidersTab caseId={caseId} />}
      </div>
    </div>
  );
}

const PRIORITY_TONE = {
  critical: "border-red-500/30 text-red-400 bg-red-500/10",
  high: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  medium: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
  low: "border-white/15 text-gray-400 bg-white/5",
};
const RISK_TONE = {
  critical: "text-red-400",
  high: "text-amber-400",
  medium: "text-cyan-400",
  low: "text-green-400",
};

function CaseHeader({ caseItem, hermesState, hermesMs }) {
  const priority = caseItem.priority || caseItem.case_priority || "medium";
  const wf = caseItem.workflow || {};
  const phase = wf.current_phase || "planning";
  const riskScore = wf.risk_score;
  const riskLevel = wf.risk_level || (riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low");
  const completed = PHASES.filter((p) => wf.phases?.[p.id]?.status === "completed").length;
  const progress = Math.round((completed / PHASES.length) * 100);
  const amount = Number(caseItem.amount_stolen_usd) || 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {caseItem.case_number && <span className="text-xs text-gray-600 font-mono">#{caseItem.case_number}</span>}
            <Badge variant="outline" className="capitalize border-cyan-500/30 text-cyan-400">{(caseItem.status || "new").replace(/_/g, " ")}</Badge>
            <Badge variant="outline" className={`capitalize ${PRIORITY_TONE[priority] || PRIORITY_TONE.medium}`}>{priority} priority</Badge>
            <Badge variant="outline" className="capitalize border-purple-500/30 text-purple-400">{phase.replace(/_/g, " ")}</Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{caseItem.case_title || "Untitled case"}</h1>
          <p className="text-sm text-gray-500 mt-1 capitalize">{caseItem.fraud_type?.replace(/_/g, " ") || "investigation"}</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {riskScore != null && (
            <div className="text-center">
              <div className="flex items-center gap-1 text-gray-500"><Gauge className="w-3 h-3" />Risk</div>
              <div className={`text-2xl font-bold ${RISK_TONE[riskLevel] || "text-gray-400"}`}>{riskScore}</div>
              <div className={`text-[10px] uppercase ${RISK_TONE[riskLevel] || "text-gray-500"}`}>{riskLevel}</div>
            </div>
          )}
          {amount > 0 && (
            <div className="text-center">
              <div className="flex items-center gap-1 text-gray-500 justify-center"><DollarSign className="w-3 h-3" />Loss</div>
              <div className="text-lg font-bold text-white">${amount.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
          <span>Pipeline progress</span>
          <span>{completed}/{PHASES.length} phases · {progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500 pt-1 border-t border-white/5">
        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Victim: <span className="text-gray-300">{caseItem.victim_name || "—"}</span></span>
        {caseItem.assigned_investigator && <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />Investigator: <span className="text-gray-300">{caseItem.assigned_investigator}</span></span>}
        <span className="ml-auto font-mono text-gray-600">ID: {caseItem.id?.slice(-8)}</span>
        {hermesState === "ok" ? (
          <span className="text-green-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Hermes connected{hermesMs != null ? ` · ${hermesMs}ms` : ""}</span>
        ) : (
          <span className="text-amber-400">Hermes: {hermesState.replace(/_/g, " ")}</span>
        )}
      </div>
    </div>
  );
}