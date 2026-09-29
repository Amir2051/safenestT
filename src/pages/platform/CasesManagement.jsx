import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, Plus, Search, Trash2, Loader2, FileText, ChevronRight, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import EmptyState from "@/components/platform/EmptyState";
import SectionHeader from "@/components/platform/SectionHeader";
import NewInvestigationCaseModal from "@/components/platform/NewInvestigationCaseModal";
import { useCanMutate } from "@/components/shared/MutateGuard";

const CASE_STATUSES = ["new", "investigating", "documented", "submitted", "law_enforcement", "recovering", "recovered", "closed"];
const PRIORITIES = ["low", "medium", "high", "critical"];

/**
 * Case Management — full CRUD on the InvestigationCase entity.
 * Real data only. The investigation engine (Hermes) is authoritative
 * for investigation status, findings, and risk — this page manages the
 * case record itself.
 */
export default function CasesManagement() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [groupByUser, setGroupByUser] = useState(false);
  const queryClient = useQueryClient();
  const canMutate = useCanMutate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases-management"],
    queryFn: () => base44.entities.InvestigationCase.list("-created_date", 200),
  });

  // Resolve each case's creator (investigator/user) so cases can be shown
  // and organized by user name/email. User.list is admin-only; for non-admins
  // this silently falls back to an empty map and the page still works.
  const { data: users = [] } = useQuery({
    queryKey: ["cases-users"],
    queryFn: async () => { try { return await base44.entities.User.list(); } catch { return []; } },
  });
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const filtered = cases.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    const pri = c.priority || c.case_priority;
    if (priorityFilter !== "all" && pri !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [c.case_title, c.case_number, c.victim_name, c.fraud_type, c.id].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const grouped = useMemo(() => {
    const m = new Map();
    for (const c of filtered) {
      const k = c.created_by_id || "(unassigned)";
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(c);
    }
    return [...m.entries()].map(([id, list]) => ({
      id,
      user: userMap.get(id),
      cases: list,
    }));
  }, [filtered, userMap]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this case? This cannot be undone.")) return;
    try {
      await base44.entities.InvestigationCase.delete(id);
      queryClient.invalidateQueries({ queryKey: ["cases-management"] });
    } catch (e) {
      alert("Failed to delete case: " + (e.message || e));
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <SectionHeader
        title="Cases"
        description="Create and manage fraud investigation cases. Each case can be submitted to Hermes for real investigation."
        icon={Briefcase}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className={`border-white/15 text-gray-200 ${groupByUser ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/40" : ""}`} onClick={() => setGroupByUser((v) => !v)}>
              <Users className="w-4 h-4 mr-1.5" />{groupByUser ? "Grouped by user" : "Group by user"}
            </Button>
            {canMutate && <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1.5" />New Case</Button>}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search by title, case number, victim, or fraud type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#0f1419] border-white/10 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CASE_STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Case list */}
      {isLoading ? (
        <EmptyState variant="loading" title="Loading cases…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="empty"
          icon={Briefcase}
          title={cases.length === 0 ? "No cases yet" : "No cases match your filters"}
          description={cases.length === 0 ? "Create a new case or import an existing SafeNestT case to begin." : "Try adjusting your search or filters."}
          action={cases.length === 0 ? (
            <div className="flex gap-2">
              {canMutate && <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1.5" />New Case</Button>}
              {canMutate && <Link to="/CaseImport"><Button size="sm" variant="outline" className="border-white/15 text-gray-200">Import Case</Button></Link>}
            </div>
          ) : null}
        />
      ) : groupByUser ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-7 h-7 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {group.user?.full_name || "Unassigned user"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {group.user?.email || group.id} • {group.cases.length} case{group.cases.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 divide-y divide-white/5">
                {group.cases.map((c) => (
                  <CaseListItem key={c.id} caseItem={c} creator={group.user} onDelete={handleDelete} canDelete={canMutate} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 divide-y divide-white/5">
          {filtered.map((c) => (
            <CaseListItem key={c.id} caseItem={c} creator={userMap.get(c.created_by_id)} onDelete={handleDelete} canDelete={canMutate} />
          ))}
        </div>
      )}

      {showNew && <NewInvestigationCaseModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); queryClient.invalidateQueries({ queryKey: ["cases-management"] }); }} />}
    </div>
  );
}

function CaseListItem({ caseItem, creator, onDelete, canDelete }) {
  const priority = caseItem.priority || caseItem.case_priority || "medium";
  const priTone = priority === "critical" ? "text-red-400 border-red-500/30" : priority === "high" ? "text-amber-400 border-amber-500/30" : priority === "medium" ? "text-cyan-400 border-cyan-500/30" : "text-gray-400 border-white/15";
  const risk = caseItem.workflow?.risk_score;
  const riskLevel = caseItem.workflow?.risk_level;
  const riskTone = riskLevel === "critical" ? "border-red-500/30 text-red-400" : riskLevel === "high" ? "border-amber-500/30 text-amber-400" : riskLevel === "medium" ? "border-cyan-500/30 text-cyan-400" : "border-white/15 text-gray-400";
  const progress = Math.min(100, Math.max(0, Number(caseItem.investigation_progress) || 0));
  const amount = Number(caseItem.amount_stolen_usd) || 0;
  const creatorLabel = creator ? `${creator.full_name || ""}${creator.email ? ` · ${creator.email}` : ""}`.trim() : (caseItem.created_by_id || null);
  return (
    <Link to={`/InvestigationWorkspace?case_id=${caseItem.id}`} className="flex items-center gap-3 p-4 hover:bg-white/[0.03] transition-colors group">
      <div className="w-9 h-9 rounded-md border border-white/10 bg-white/[0.02] flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white truncate">{caseItem.case_title || "Untitled case"}</p>
          {caseItem.case_number && <span className="text-xs text-gray-600 font-mono">#{caseItem.case_number}</span>}
        </div>
        <p className="text-xs text-gray-500 truncate capitalize">
          {caseItem.fraud_type?.replace(/_/g, " ") || "investigation"} • {caseItem.victim_name || "—"} • {new Date(caseItem.created_date).toLocaleDateString()}{amount > 0 ? ` • $${amount.toLocaleString()}` : ""}
        </p>
        {creatorLabel && (
          <p className="text-[11px] text-cyan-400/70 truncate mt-1">
            <Users className="w-3 h-3 inline mr-1 -translate-y-px" />{creatorLabel}
          </p>
        )}
        <div className="h-1 rounded-full bg-white/5 mt-2 overflow-hidden max-w-xs">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {risk != null && <Badge variant="outline" className={`text-[10px] ${riskTone}`}>Risk {risk}</Badge>}
      <Badge variant="outline" className={`capitalize ${priTone}`}>{priority}</Badge>
      <Badge variant="outline" className="capitalize border-white/10 text-gray-400 hidden sm:inline-flex">{(caseItem.status || "new").replace(/_/g, " ")}</Badge>
      {canDelete && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(caseItem.id); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
          title="Delete case"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
    </Link>
  );
}