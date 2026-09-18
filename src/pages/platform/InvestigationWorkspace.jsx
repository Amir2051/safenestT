import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  Target, FileSearch, Crosshair, Network, GitBranch, FlaskConical,
  ShieldAlert, FileText, ScrollText, ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";
import { getHermesStatus } from "@/lib/hermesClient";
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
  { key: "blockchain", label: "Blockchain", icon: Network },
  { key: "entities", label: "Entities", icon: FileSearch },
  { key: "timeline", label: "Timeline", icon: GitBranch },
  { key: "findings", label: "Findings", icon: FlaskConical },
  { key: "risk", label: "Risk", icon: ShieldAlert },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "activity", label: "Activity", icon: ScrollText },
];

export default function InvestigationWorkspace() {
  const [params] = useSearchParams();
  const caseId = params.get("case_id");
  const [activeTab, setActiveTab] = useState("overview");
  const hermes = getHermesStatus();

  const { data: caseItem, isLoading } = useQuery({
    queryKey: ["investigation-case", caseId],
    queryFn: () => base44.entities.InvestigationCase.get(caseId),
    enabled: !!caseId,
  });

  if (!caseId) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState variant="empty" icon={Target} title="No case selected" description="Select a case to view its investigation workspace."
          action={<Link to="/CasesManagement"><Badge variant="outline" className="border-cyan-500/30 text-cyan-400 cursor-pointer">Go to Cases</Badge></Link>} />
      </div>
    );
  }
  if (isLoading) return <div className="p-8"><EmptyState variant="loading" title="Loading case…" /></div>;
  if (!caseItem) return <div className="p-8"><EmptyState variant="error" title="Case not found" description="This case may have been deleted or you may not have access." /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link to="/CasesManagement" className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-400"><ArrowLeft className="w-4 h-4 mr-1" />Back to cases</Link>
      <CaseHeader caseItem={caseItem} hermesState={hermes.state} />
      <InvestigationRunnerPanel caseId={caseId} caseItem={caseItem} />

      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-px">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${activeTab === t.key ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/[0.04]" : "text-gray-400 hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab caseId={caseId} caseItem={caseItem} hermesState={hermes.state} />}
      {activeTab === "evidence" && <EvidenceVaultTab caseId={caseId} />}
      {activeTab === "targets" && <TargetsTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "blockchain" && <BlockchainTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "entities" && <EntitiesTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "timeline" && <TimelineTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "findings" && <FindingsTab caseId={caseId} />}
      {activeTab === "risk" && <RiskTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "reports" && <ReportsTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "activity" && <ActivityTab caseId={caseId} hermesState={hermes.state} />}
    </div>
  );
}

function CaseHeader({ caseItem, hermesState }) {
  const priority = caseItem.priority || caseItem.case_priority || "medium";
  const phase = caseItem.workflow?.current_phase || "planning";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {caseItem.case_number && <span className="text-xs text-gray-600 font-mono">#{caseItem.case_number}</span>}
            <Badge variant="outline" className="capitalize border-cyan-500/30 text-cyan-400">{(caseItem.status || "new").replace(/_/g, " ")}</Badge>
            <Badge variant="outline" className={`capitalize ${priority === "critical" ? "border-red-500/30 text-red-400" : priority === "high" ? "border-amber-500/30 text-amber-400" : "border-white/15 text-gray-400"}`}>{priority} priority</Badge>
            <Badge variant="outline" className="capitalize border-purple-500/30 text-purple-400">{phase.replace(/_/g, " ")}</Badge>
          </div>
          <h1 className="text-xl font-bold text-white">{caseItem.case_title || "Untitled case"}</h1>
          <p className="text-sm text-gray-500 mt-1">{caseItem.fraud_type?.replace(/_/g, " ") || "investigation"} • Victim: {caseItem.victim_name || "—"}</p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-0.5">
          <p>Case ID: <span className="font-mono text-gray-400">{caseItem.id?.slice(-8)}</span></p>
          {caseItem.assigned_investigator && <p>Investigator: {caseItem.assigned_investigator}</p>}
          {caseItem.workflow?.risk_score != null && <p>Risk score: <span className="text-amber-400 font-medium">{caseItem.workflow.risk_score}</span></p>}
          {hermesState !== "ok" && <p className="text-amber-400">Hermes: {hermesState.replace(/_/g, " ")}</p>}
        </div>
      </div>
    </div>
  );
}