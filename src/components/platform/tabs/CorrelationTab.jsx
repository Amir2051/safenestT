import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Network, RefreshCw, Link2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/platform/EmptyState";

export default function CorrelationTab({ caseId }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const { data: graph = { nodes: [], edges: [] }, isLoading: graphLoading } = useQuery({
    queryKey: ["case-correlation-graph", caseId],
    queryFn: async () => {
      const [nodes, edges] = await Promise.all([
        base44.entities.GraphNode.filter({ case_id: caseId }, "-created_date", 500).catch(() => []),
        base44.entities.GraphEdge.filter({ case_id: caseId }, "-created_date", 500).catch(() => []),
      ]);
      return { nodes, edges };
    },
    enabled: !!caseId,
  });

  const { data: suggestions = [], refetch, isFetching } = useQuery({
    queryKey: ["case-correlation-suggestions", caseId],
    queryFn: () => base44.entities.CaseLinkSuggestion.filter({ source_case_id: caseId }, "-confidence_score", 50).catch(() => []),
    enabled: !!caseId,
  });

  const runCorrelation = async () => {
    setRunning(true);
    setError("");
    try {
      await base44.functions.invoke("correlateInvestigation", { caseId, limit: 20 });
      await refetch();
    } catch (e) {
      setError(e?.message || "Correlation failed.");
    } finally {
      setRunning(false);
    }
  };

  const confirmLink = async (suggestion) => {
    try {
      const source = await base44.entities.InvestigationCase.get(caseId);
      const linked = Array.isArray(source.linked_case_ids) ? source.linked_case_ids : [];
      if (!linked.includes(suggestion.target_case_id)) linked.push(suggestion.target_case_id);
      await base44.entities.InvestigationCase.update(caseId, { linked_case_ids: linked, last_activity: new Date().toISOString() });
      await base44.entities.CaseLinkSuggestion.update(suggestion.id, { status: "confirmed" });
      await refetch();
    } catch (e) {
      setError(e?.message || "Unable to confirm case link.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-semibold text-white">Correlation Engine</h3>
            <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-[10px]">deterministic v1</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Cross-case correlation using shared wallets, transactions, identity indicators, domains, IPs, and fraud classification.
          </p>
        </div>
        <Button size="sm" onClick={runCorrelation} disabled={running} className="bg-purple-600 hover:bg-purple-700 shrink-0">
          <RefreshCw className={`w-4 h-4 mr-1.5 ${running ? "animate-spin" : ""}`} />
          {running ? "Correlating…" : "Run correlation"}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Metric label="Entities" value={graph.nodes.length} />
        <Metric label="Relationships" value={graph.edges.length} />
        <Metric label="Case links" value={suggestions.length} />
      </div>

      {graphLoading ? (
        <EmptyState variant="loading" title="Loading correlation data…" />
      ) : graph.nodes.length === 0 ? (
        <EmptyState
          variant="empty"
          icon={Network}
          title="No entities extracted yet"
          description="Run the investigation first. Hermes-generated entities and relationships will appear here."
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Case graph</h4>
          <div className="flex flex-wrap gap-2">
            {graph.nodes.slice(0, 30).map((node) => (
              <Badge key={node.id} variant="outline" className="border-white/10 text-gray-300">
                {node.node_type}: {node.label || node.value}
              </Badge>
            ))}
          </div>
          {graph.nodes.length > 30 && <p className="text-[11px] text-gray-600 mt-2">Showing 30 of {graph.nodes.length} entities.</p>}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">Potential related cases</h4>
          {isFetching && <RefreshCw className="w-3.5 h-3.5 text-gray-500 animate-spin" />}
        </div>
        {suggestions.length === 0 ? (
          <EmptyState
            variant="empty"
            icon={Link2}
            title="No case links yet"
            description="Run correlation to look for explainable cross-case indicators."
          />
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div key={s.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-start gap-3">
                  <Link2 className="w-4 h-4 text-purple-300 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/InvestigationWorkspace?case_id=${s.target_case_id}&tab=correlation`} className="text-sm font-medium text-white hover:text-cyan-300">
                        Case {s.target_case_id?.slice(-8)}
                      </Link>
                      <Badge variant="outline" className={s.confidence_score >= 70 ? "border-amber-500/30 text-amber-300" : "border-white/10 text-gray-400"}>
                        {Math.round(Number(s.confidence_score) || 0)}%
                      </Badge>
                      <Badge variant="outline" className="capitalize border-white/10 text-gray-400">{String(s.match_type || "pattern").replace(/_/g, " ")}</Badge>
                      {s.status === "confirmed" && <Badge variant="outline" className="border-green-500/30 text-green-400"><ShieldCheck className="w-3 h-3 mr-1" />Confirmed</Badge>}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{s.match_details || "Indicator overlap detected."}</p>
                    {s.status === "pending" && (
                      <Button size="sm" variant="outline" className="mt-3 border-green-500/20 text-green-300 hover:bg-green-500/10" onClick={() => confirmLink(s)}>
                        Confirm relationship
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-white mt-0.5">{value}</p>
    </div>
  );
}
