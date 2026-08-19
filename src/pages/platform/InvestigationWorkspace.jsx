import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import {
  Play, Pause, Square, RefreshCw, Cpu, Clock, Target,
  FileSearch, Network, GitBranch, ShieldAlert, FlaskConical, FileText,
  AlertCircle, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";
import SectionHeader from "@/components/platform/SectionHeader";
import { HermesAPI, getHermesStatus } from "@/lib/hermesClient";

/**
 * Investigation Workspace — the per-case investigation control surface.
 * Hermes is authoritative for ALL investigation output (entities,
 * relationships, timeline, findings, risk, agent activity). The frontend
 * only displays what Hermes returns. No fabricated data.
 */
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
        <EmptyState variant="empty" icon={Target} title="No case selected" description="Select a case to view its investigation workspace." action={<Link to="/CasesManagement"><Button size="sm" className="bg-cyan-600 hover:bg-cyan-700">Go to Cases</Button></Link>} />
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8"><EmptyState variant="loading" title="Loading case…" /></div>;
  }

  if (!caseItem) {
    return <div className="p-8"><EmptyState variant="error" title="Case not found" description="This case may have been deleted or you may not have access." /></div>;
  }

  const TABS = [
    { key: "overview", label: "Overview", icon: Target },
    { key: "progress", label: "Progress", icon: Clock },
    { key: "agents", label: "Agent Activity", icon: Cpu },
    { key: "entities", label: "Entities", icon: FileSearch },
    { key: "relationships", label: "Relationships", icon: Network },
    { key: "timeline", label: "Timeline", icon: GitBranch },
    { key: "findings", label: "Findings", icon: FlaskConical },
    { key: "risk", label: "Risk", icon: ShieldAlert },
    { key: "reports", label: "Reports", icon: FileText },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <Link to="/CasesManagement" className="inline-flex items-center text-sm text-gray-400 hover:text-cyan-400"><ArrowLeft className="w-4 h-4 mr-1" />Back to cases</Link>

      <CaseHeader caseItem={caseItem} hermesState={hermes.state} />

      <InvestigationControls caseId={caseId} hermesState={hermes.state} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-white/10 pb-px">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${activeTab === t.key ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/[0.04]" : "text-gray-400 hover:text-gray-200"}`}
          >
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      <HermesDependentPanel caseId={caseId} tab={activeTab} hermesState={hermes.state} />
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
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const run = async (fn, label) => {
    setBusy(label);
    setLastResult(null);
    try {
      const res = await fn(caseId);
      setLastResult(res);
    } catch (e) {
      setLastResult({ status: "error", error: e?.message || String(e) });
    } finally {
      setBusy(null);
    }
  };

  const disabled = hermesState !== "ok";

  return (
    <div className="rounded-lg border border-white/10 p-4">
      <SectionHeader title="Investigation Control" description="Start, pause, resume, or cancel the Hermes investigation for this case." icon={Cpu} />
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

/**
 * Renders a Hermes-dependent panel. Until Hermes is connected and returns
 * real data, every panel shows an honest "awaiting data" state — never
 * fabricated results.
 */
function HermesDependentPanel({ caseId, tab, hermesState }) {
  if (hermesState !== "ok") {
    return (
      <EmptyState
        variant="not_connected"
        icon={Cpu}
        title="Awaiting investigation data"
        description="This panel displays real data returned by Hermes. Connect Hermes (VITE_HERMES_API_URL + hermesProxy backend function) and start an investigation to populate it."
      />
    );
  }

  // When Hermes is connected, fetch the relevant artifact.
  return <LiveHermesPanel caseId={caseId} tab={tab} />;
}

function LiveHermesPanel({ caseId, tab }) {
  const fetcher = {
    overview: HermesAPI.getInvestigation,
    progress: HermesAPI.getInvestigationStatus,
    agents: HermesAPI.getAgentActivity,
    entities: HermesAPI.getEntities,
    relationships: HermesAPI.getRelationships,
    timeline: HermesAPI.getTimeline,
    findings: HermesAPI.getFindings,
    risk: HermesAPI.getRisk,
    reports: HermesAPI.getReports,
  }[tab];

  const { data, isLoading } = useQuery({
    queryKey: ["hermes", tab, caseId],
    queryFn: () => fetcher(caseId),
    enabled: !!caseId,
  });

  if (isLoading) return <EmptyState variant="loading" title="Querying Hermes…" />;
  if (data?.status !== "ok") {
    return <EmptyState variant="error" title="Hermes request failed" description={data?.error || "No response from Hermes."} />;
  }
  if (!data?.data || (Array.isArray(data.data) && data.data.length === 0)) {
    return <EmptyState variant="empty" title="No data yet" description="Hermes has not produced data for this section. Start or continue the investigation." />;
  }

  return (
    <div className="rounded-lg border border-white/10 p-4">
      <pre className="text-xs text-gray-300 overflow-auto max-h-[500px] font-mono">{JSON.stringify(data.data, null, 2)}</pre>
    </div>
  );
}