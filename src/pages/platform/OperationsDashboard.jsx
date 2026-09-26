import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, ShieldAlert, FileSearch, Activity, FileText,
  Plus, Upload, Gauge, FlaskConical, ScrollText, Search, Cpu, Zap,
} from "lucide-react";
import StatCard from "@/components/platform/StatCard";
import SectionHeader from "@/components/platform/SectionHeader";
import EmptyState from "@/components/platform/EmptyState";
import { getProvider } from "@/lib/investigationAI";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PRIORITY_STYLES = {
  critical: "border-red-500/30 text-red-400",
  high: "border-amber-500/30 text-amber-400",
  medium: "border-cyan-500/30 text-cyan-400",
  low: "border-white/15 text-gray-400",
};

export default function OperationsDashboard() {
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ["ops-cases"], queryFn: () => base44.entities.InvestigationCase.list("-created_date", 200),
  });
  const { data: evidenceItems = [], isLoading: evidenceLoading } = useQuery({
    queryKey: ["ops-evidence-items"], queryFn: () => base44.entities.EvidenceItem.list("-created_date", 200),
  });
  const { data: findings = [], isLoading: findingsLoading } = useQuery({
    queryKey: ["ops-findings"], queryFn: () => base44.entities.InvestigationFinding.list("-created_date", 100),
  });
  const { data: auditEvents = [], isLoading: auditLoading } = useQuery({
    queryKey: ["ops-audit"], queryFn: () => base44.entities.AuditEvent.list("-created_date", 50),
  });

  const activeCases = cases.filter((c) => ["new", "investigating", "documented", "submitted"].includes(c.status)).length;
  const highRiskCases = cases.filter((c) => {
    const lvl = c.workflow?.risk_level;
    return lvl === "high" || lvl === "critical" || ["high", "critical"].includes(c.priority || c.case_priority);
  }).length;
  const evidenceReviewRequired = evidenceItems.filter((e) => e.processing_status === "review_required").length;
  const openFindings = findings.filter((f) => f.status === "proposed" || f.status === "under_review").length;

  const stats = [
    { label: "Active Cases", value: activeCases, icon: Briefcase, tone: "cyan", hint: "Open investigations", loading: casesLoading },
    { label: "High-Risk Cases", value: highRiskCases, icon: ShieldAlert, tone: highRiskCases > 0 ? "red" : "slate", hint: "High / critical risk or priority", loading: casesLoading },
    { label: "Evidence Review", value: evidenceReviewRequired, icon: FileSearch, tone: evidenceReviewRequired > 0 ? "amber" : "slate", hint: `${evidenceItems.length} total items`, loading: evidenceLoading },
    { label: "Open Findings", value: openFindings, icon: FlaskConical, tone: openFindings > 0 ? "amber" : "slate", hint: "Proposed or under review", loading: findingsLoading },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Operations Dashboard"
        description="Live overview of cases, evidence, and investigation activity — tenant-scoped, real data only."
        icon={Gauge}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Link to="/GlobalSearch"><Button variant="outline" size="sm" className="border-white/15 text-gray-200"><Search className="w-4 h-4 mr-1.5" />Search</Button></Link>
            <Link to="/CaseImport"><Button variant="outline" size="sm" className="border-white/15 text-gray-200"><Upload className="w-4 h-4 mr-1.5" />Import</Button></Link>
            <Link to="/CasesManagement"><Button size="sm" className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-1.5" />New Case</Button></Link>
          </div>
        }
      />

      <EngineStatusBanner />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader title="Recent Activity" description="Latest audit events across all cases." icon={Activity}
            actions={<Link to="/AuditLog"><Button variant="ghost" size="sm" className="text-cyan-400">View all</Button></Link>} />
          {auditLoading ? <EmptyState variant="loading" title="Loading activity…" /> : auditEvents.length === 0 ? (
            <EmptyState variant="empty" icon={ScrollText} title="No investigation activity yet" description="Investigator actions and AI run events appear here once investigations are performed." />
          ) : (
            <div className="rounded-lg border border-white/10 divide-y divide-white/5">
              {auditEvents.slice(0, 7).map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3">
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">{ev.action?.replace(/_/g, " ")}</Badge>
                  <p className="text-sm text-gray-200 truncate flex-1">{ev.description}</p>
                  <span className="text-xs text-gray-500 shrink-0 hidden sm:inline">{ev.actor_name || ev.actor}</span>
                  <span className="text-xs text-gray-600 shrink-0">{ev.created_date ? new Date(ev.created_date).toLocaleDateString() : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <SectionHeader title="Cases Requiring Attention" description="High-risk and active cases." icon={ShieldAlert}
            actions={<Link to="/CasesManagement"><Button variant="ghost" size="sm" className="text-cyan-400">View all</Button></Link>} />
          {casesLoading ? <EmptyState variant="loading" title="Loading cases…" /> : cases.length === 0 ? (
            <EmptyState variant="empty" icon={Briefcase} title="No cases yet" description="Create a case or import an existing SafeNestT case to begin an investigation."
              action={<Link to="/CasesManagement"><Button size="sm" className="bg-cyan-600 hover:bg-cyan-700"><Plus className="w-4 h-4 mr-1.5" />Create first case</Button></Link>} />
          ) : (
            <div className="grid gap-2.5">
              {cases.filter((c) => {
                const lvl = c.workflow?.risk_level;
                return ["high", "critical"].includes(lvl) || ["high", "critical"].includes(c.priority || c.case_priority) || ["new", "investigating"].includes(c.status);
              }).slice(0, 6).map((c) => <CaseRow key={c.id} caseItem={c} />)}
            </div>
          )}
        </div>
      </div>

      <div>
        <SectionHeader title="Recent Evidence" description="Latest uploaded evidence across all cases." icon={FileSearch} />
        {evidenceLoading ? <EmptyState variant="loading" title="Loading evidence…" /> : evidenceItems.length === 0 ? (
          <EmptyState variant="empty" icon={FileSearch} title="No evidence uploaded yet" description="Evidence files will appear here once investigators upload them." />
        ) : (
          <div className="rounded-lg border border-white/10 divide-y divide-white/5">
            {evidenceItems.slice(0, 6).map((e) => (
              <Link key={e.id} to={`/InvestigationWorkspace?case_id=${e.case_id}`} className="flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors">
                <FileText className="w-4 h-4 text-gray-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white truncate">{e.filename}</p>
                  <p className="text-xs text-gray-500 truncate">{e.evidence_type} • {e.uploaded_by_name || e.uploaded_by || "—"}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] ${e.processing_status === "review_required" ? "border-amber-500/30 text-amber-400" : e.processing_status === "processed" ? "border-green-500/30 text-green-400" : "border-white/10 text-gray-400"}`}>{(e.processing_status || "uploaded").replace(/_/g, " ")}</Badge>
                <span className="text-xs text-gray-600 shrink-0 hidden sm:inline">{e.created_date ? new Date(e.created_date).toLocaleDateString() : ""}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CaseRow({ caseItem }) {
  const priority = caseItem.priority || caseItem.case_priority || "medium";
  const priClass = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium;
  const risk = caseItem.workflow?.risk_score;
  return (
    <Link to={`/InvestigationWorkspace?case_id=${caseItem.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-cyan-500/20 transition-colors">
      <Badge variant="outline" className={`capitalize ${priClass}`}>{priority}</Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{caseItem.case_title || `Case ${caseItem.case_number || caseItem.id.slice(-6)}`}</p>
        <p className="text-xs text-gray-500 truncate capitalize">{caseItem.fraud_type?.replace(/_/g, " ") || "investigation"} • {caseItem.status?.replace(/_/g, " ")}</p>
      </div>
      {risk != null && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">Risk {risk}</Badge>}
      <span className="text-xs text-gray-600 shrink-0 hidden sm:inline">{caseItem.created_date ? new Date(caseItem.created_date).toLocaleDateString() : ""}</span>
    </Link>
  );
}

function EngineStatusBanner() {
  const provider = getProvider("hermes");
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-r from-cyan-500/[0.04] to-transparent p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center shrink-0">
        <Cpu className="w-4 h-4 text-cyan-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white">Investigation Engine</p>
          <Badge variant="outline" className={`text-[10px] ${provider.available ? "border-green-500/30 text-green-400" : "border-amber-500/30 text-amber-400"}`}>
            {provider.available ? "live" : "upgrade required"}
          </Badge>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{provider.description}</p>
      </div>
      <Link to="/CasesManagement" className="hidden sm:block">
        <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-400"><Zap className="w-3.5 h-3.5 mr-1.5" />Run investigation</Button>
      </Link>
    </div>
  );
}