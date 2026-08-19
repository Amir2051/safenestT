import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  Play, Pause, Square, RefreshCw, Cpu, Target,
  FileSearch, Network, GitBranch, ShieldAlert, FlaskConical, FileText,
  AlertCircle, ArrowLeft, Crosshair, ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";
import { HermesAPI, getHermesStatus } from "@/lib/hermesClient";
import { logAuditEvent } from "@/lib/auditLogger";
import { toast } from "sonner";
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
          action={<Link to="/CasesManagement"><Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">Go to Cases</Button></Link>} />
      </div>
    );
  }
  if (isLoading) return <div className="p-8"><EmptyState variant="loading" title="Loading case…" /></div>;
  if (!caseItem) return <div className="p-8"><EmptyState variant="error" title="Case not found" description="This case may have been deleted or you may not have access." /></div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link to="/CasesManagement" className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-400"><ArrowLeft className="w-4 h-4 mr-1" />Back to cases</Link>
      <CaseHeader caseItem={caseItem} hermesState={hermes.state} />
      <InvestigationControls caseId={caseId} hermesState={hermes.state} />

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
      {activeTab === "findings" && <FindingsTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "risk" && <RiskTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "reports" && <ReportsTab caseId={caseId} hermesState={hermes.state} />}
      {activeTab === "activity" && <ActivityTab caseId={caseId} hermesState={hermes.state} />}
    </div>
  );
}

function CaseHeader({ caseItem, hermesState }) {
  const priority = caseItem.priority || caseItem.case_priority || "medium";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {caseItem.case_number && <span className="text-xs text-gray-600 font-mono">#{caseItem.case_number}</span>}
            <Badge variant="outline" className="capitalize border-cyan-500/30 text-cyan-400">{(caseItem.status || "new").replace(/_/g, " ")}</Badge>
            <Badge variant="outline" className={`capitalize ${priority === "critical" ? "border-red-500/30 text-red-400" : priority === "high" ? "border-amber-500/30 text-amber-400" : "border-white/15 text-gray-400"}`}>{priority} priority</Badge>
          </div>
          <h1 className="text-xl font-bold text-white">{caseItem.case_title || "Untitled case"}</h1>
          <p className="text-sm text-gray-500 mt-1">{caseItem.fraud_type?.replace(/_/g, " ") || "investigation"} • Victim: {caseItem.victim_name || "—"}</p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-0.5">
          <p>Case ID: <span className="font-mono text-gray-400">{caseItem.id?.slice(-8)}</span></p>
          {caseItem.assigned_investigator && <p>Investigator: {caseItem.assigned_investigator}</p>}
          {hermesState !== "ok" && <p className="text-amber-400">Hermes: {hermesState.replace(/_/g, " ")}</p>}
        </div>
      </div>
    </div>
  );
}

function InvestigationControls({ caseId, hermesState }) {
  const [busy, setBusy] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const run = async (fn, label) => {
    setBusy(label);
    setLastResult(null);
    try {
      const res = await fn(caseId);
      setLastResult(res);
      await logAuditEvent({ action: `investigation_${label}`, objectType: "case", objectId: caseId, caseId, description: `Investigation ${label} requested` });
    } catch (e) {
      setLastResult({ status: "error", error: e?.message || String(e) });
    } finally {
      setBusy(null);
    }
  };

  const disabled = hermesState !== "configured" && hermesState !== "ok";

  return (
    <div className="rounded-lg border border-white/10 p-4">
      <p className="text-sm font-medium text-white mb-2 flex items-center gap-2"><Cpu className="w-4 h-4 text-cyan-400" />Investigation Control</p>
      <p className="text-xs text-gray-500 mb-3">Start, pause, resume, or cancel the Hermes investigation for this case.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={disabled || !!busy} onClick={() => run(HermesAPI.startInvestigation, "start")} className="bg-green-600 hover:bg-green-700"><Play className="w-4 h-4 mr-1.5" />Start</Button>
        <Button size="sm" variant="outline" disabled={disabled || !!busy} onClick={() => run(HermesAPI.pauseInvestigation, "pause")} className="border-white/15 text-gray-200"><Pause className="w-4 h-4 mr-1.5" />Pause</Button>
        <Button size="sm" variant="outline" disabled={disabled || !!busy} onClick={() => run(HermesAPI.resumeInvestigation, "resume")} className="border-white/15 text-gray-200"><Play className="w-4 h-4 mr-1.5" />Resume</Button>
        <Button size="sm" variant="outline" disabled={disabled || !!busy} onClick={() => run(HermesAPI.cancelInvestigation, "cancel")} className="border-red-500/30 text-red-400"><Square className="w-4 h-4 mr-1.5" />Cancel</Button>
        <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => run(HermesAPI.getInvestigationStatus, "refresh")} className="text-cyan-400"><RefreshCw className={`w-4 h-4 mr-1.5 ${busy === "refresh" ? "animate-spin" : ""}`} />Refresh Status</Button>
      </div>
      {busy && <p className="text-xs text-gray-500 mt-2">{busy === "start" ? "Requesting Hermes to start investigation…" : "Contacting Hermes…"}</p>}
      {lastResult && lastResult.status !== "ok" && (
        <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/[0.04] p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300">
            {lastResult.status === "not_connected" && "Hermes is not connected. Set VITE_HERMES_API_URL and add the hermesProxy backend function."}
            {lastResult.status === "backend_unavailable" && "The hermesProxy backend function is not available on your current plan. Upgrade to enable real investigations."}
            {lastResult.status === "error" && `Error: ${lastResult.error}`}
          </p>
        </div>
      )}
      {lastResult && lastResult.status === "ok" && (
        <div className="mt-3 rounded-md border border-green-500/20 bg-green-500/[0.04] p-3">
          <p className="text-xs text-green-300">Hermes responded. Investigation status: {String(lastResult.data?.status || "acknowledged")}</p>
        </div>
      )}
    </div>
  );
}