import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, ShieldAlert, FileSearch, Activity, FileText,
  Wifi, Plus, Upload, Gauge,
} from "lucide-react";
import StatCard from "@/components/platform/StatCard";
import SectionHeader from "@/components/platform/SectionHeader";
import EmptyState from "@/components/platform/EmptyState";
import { getHermesStatus } from "@/lib/hermesClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Operations Dashboard — SOC-style operational overview.
 * Pulls REAL counts from existing entities. Never fabricates statistics.
 */
export default function OperationsDashboard() {
  const [user, setUser] = useState(null);
  const hermes = getHermesStatus();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["ops-cases"],
    queryFn: () => base44.entities.InvestigationCase.list("-created_date", 200),
  });

  const { data: evidence = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ["ops-evidence"],
    queryFn: () => base44.entities.CaseEvidenceFile.list("-created_date", 200),
  });

  const { data: timeline = [], isLoading: timelineLoading } = useQuery({
    queryKey: ["ops-timeline"],
    queryFn: () => base44.entities.CaseTimelineEvent.list("-created_date", 50),
  });

  const activeCases = cases.filter((c) =>
    ["new", "investigating", "documented", "submitted"].includes(c.status)
  ).length;
  const highRiskCases = cases.filter(
    (c) => c.priority === "high" || c.priority === "critical" || c.case_priority === "high" || c.case_priority === "critical"
  ).length;
  const evidencePending = evidence.filter((e) => e.parse_status === "PENDING").length;

  const stats = [
    { label: "Active Cases", value: activeCases, icon: Briefcase, tone: "cyan", hint: "Open investigations", loading: casesLoading },
    { label: "High-Risk Cases", value: highRiskCases, icon: ShieldAlert, tone: highRiskCases > 0 ? "red" : "slate", hint: "High / critical priority", loading: casesLoading },
    { label: "Evidence Items", value: evidence.length, icon: FileSearch, tone: "purple", hint: `${evidencePending} awaiting processing`, loading: evidenceLoading },
    { label: "Recent Activity", value: timeline.length, icon: Activity, tone: "green", hint: "Timeline events (50 recent)", loading: timelineLoading },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Operations Dashboard"
        description="Live operational overview of cases, evidence, and investigation activity."
        icon={Gauge}
        actions={
          <div className="flex gap-2">
            <Link to="/CaseImport"><Button variant="outline" size="sm" className="border-white/15 text-gray-200"><Upload className="w-4 h-4 mr-1.5" />Import Case</Button></Link>
            <Link to="/CasesManagement"><Button size="sm" className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-1.5" />New Case</Button></Link>
          </div>
        }
      />

      {/* Hermes connection status — honest, never hidden */}
      <HermesConnectionBanner state={hermes.state} baseUrl={hermes.baseUrl} />

      {/* Operational stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <SectionHeader title="Recent Investigation Activity" description="Latest timeline events across all cases." icon={Activity} />
        {timelineLoading ? (
          <EmptyState variant="loading" title="Loading activity…" />
        ) : timeline.length === 0 ? (
          <EmptyState
            variant="empty"
            icon={Activity}
            title="No investigation activity yet"
            description="Activity events appear here once investigations are run through Hermes."
          />
        ) : (
          <div className="rounded-lg border border-white/10 divide-y divide-white/5">
            {timeline.slice(0, 8).map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 p-3">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 capitalize">{ev.event_type?.replace(/_/g, " ") || "event"}</Badge>
                <p className="text-sm text-gray-200 truncate flex-1">{ev.event_title}</p>
                <span className="text-xs text-gray-500 shrink-0">{ev.created_date ? new Date(ev.created_date).toLocaleString() : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cases requiring attention */}
      <div>
        <SectionHeader
          title="Cases Requiring Attention"
          description="High-priority and active cases."
          icon={ShieldAlert}
          actions={<Link to="/CasesManagement"><Button variant="ghost" size="sm" className="text-cyan-400">View all</Button></Link>}
        />
        {casesLoading ? (
          <EmptyState variant="loading" title="Loading cases…" />
        ) : cases.length === 0 ? (
          <EmptyState
            variant="empty"
            icon={Briefcase}
            title="No cases yet"
            description="Create a case or import an existing SafeNestT case to begin an investigation."
            action={<Link to="/CasesManagement"><Button size="sm" className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-1.5" />Create first case</Button></Link>}
          />
        ) : (
          <div className="grid gap-3">
            {cases
              .filter((c) => ["high", "critical"].includes(c.priority || c.case_priority) || ["new", "investigating"].includes(c.status))
              .slice(0, 6)
              .map((c) => (
                <CaseRow key={c.id} caseItem={c} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PRIORITY_STYLES = {
  critical: "border-red-500/30 text-red-400",
  high: "border-amber-500/30 text-amber-400",
  medium: "border-cyan-500/30 text-cyan-400",
  low: "border-white/15 text-gray-400",
};

function CaseRow({ caseItem }) {
  const priority = caseItem.priority || caseItem.case_priority || "medium";
  const priClass = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  return (
    <Link
      to={`/InvestigationWorkspace?case_id=${caseItem.id}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
    >
      <Badge variant="outline" className={`capitalize ${priClass}`}>{priority}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{caseItem.case_title || `Case ${caseItem.case_number || caseItem.id.slice(-6)}`}</p>
        <p className="text-xs text-gray-500 truncate">{caseItem.fraud_type?.replace(/_/g, " ") || "investigation"} • {caseItem.status}</p>
      </div>
      <span className="text-xs text-gray-500 shrink-0">{caseItem.created_date ? new Date(caseItem.created_date).toLocaleDateString() : ""}</span>
    </Link>
  );
}

const BANNER_STYLES = {
  amber: "border-amber-500/20 bg-amber-500/[0.04] text-amber-400",
  cyan: "border-cyan-500/20 bg-cyan-500/[0.04] text-cyan-400",
  slate: "border-white/10 bg-white/[0.02] text-gray-400",
};

function HermesConnectionBanner({ state, baseUrl }) {
  const config = {
    not_connected: {
      tone: "amber",
      title: "Hermes not connected",
      desc: "Set VITE_HERMES_API_URL and add the hermesProxy backend function to enable real investigations. Until then, investigation surfaces show 'awaiting data' states.",
    },
    backend_unavailable: {
      tone: "amber",
      title: "Hermes backend function unavailable",
      desc: "Hermes URL is configured, but the hermesProxy backend function is not accessible on your current plan. Upgrade to enable real investigation execution.",
    },
    configured: {
      tone: "cyan",
      title: "Hermes configured — awaiting verification",
      desc: "Hermes URL is set. Investigation calls will be proxied server-side.",
    },
  }[state] || { tone: "slate", title: "Hermes status unknown", desc: "" };

  const cls = BANNER_STYLES[config.tone] || BANNER_STYLES.slate;
  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${cls}`}>
      <Wifi className={`w-5 h-5 shrink-0 mt-0.5`} />
      <div>
        <p className="text-sm font-medium text-white">{config.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{config.desc}</p>
        {baseUrl && <p className="text-[11px] text-gray-600 mt-1 font-mono">{baseUrl}</p>}
      </div>
    </div>
  );
}