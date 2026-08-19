import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Briefcase, Plus, Search, Trash2, Loader2, FileText, ChevronRight,
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
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases-management"],
    queryFn: () => base44.entities.InvestigationCase.list("-created_date", 200),
  });

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
        actions={<Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1.5" />New Case</Button>}
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
              <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1.5" />New Case</Button>
              <Link to="/CaseImport"><Button size="sm" variant="outline" className="border-white/15 text-gray-200">Import Case</Button></Link>
            </div>
          ) : null}
        />
      ) : (
        <div className="rounded-lg border border-white/10 divide-y divide-white/5">
          {filtered.map((c) => (
            <CaseListItem key={c.id} caseItem={c} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showNew && <NewInvestigationCaseModal open={showNew} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); queryClient.invalidateQueries({ queryKey: ["cases-management"] }); }} />}
    </div>
  );
}

function CaseListItem({ caseItem, onDelete }) {
  const priority = caseItem.priority || caseItem.case_priority || "medium";
  const priTone = priority === "critical" ? "text-red-400 border-red-500/30" : priority === "high" ? "text-amber-400 border-amber-500/30" : priority === "medium" ? "text-cyan-400 border-cyan-500/30" : "text-gray-400 border-white/15";
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
        <p className="text-xs text-gray-500 truncate">
          {caseItem.fraud_type?.replace(/_/g, " ") || "investigation"} • {caseItem.victim_name || "—"} • {new Date(caseItem.created_date).toLocaleDateString()}
        </p>
      </div>
      <Badge variant="outline" className={`capitalize ${priTone}`}>{priority}</Badge>
      <Badge variant="outline" className="capitalize border-white/10 text-gray-400">{(caseItem.status || "new").replace(/_/g, " ")}</Badge>
      <button
        onClick={(e) => { e.preventDefault(); onDelete(caseItem.id); }}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
        title="Delete case"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
    </Link>
  );
}