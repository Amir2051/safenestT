import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, Briefcase, FileSearch, Crosshair, FlaskConical, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import EmptyState from "@/components/platform/EmptyState";
import SectionHeader from "@/components/platform/SectionHeader";

const SEARCHABLE_ENTITIES = [
  { name: "InvestigationCase", label: "Cases", icon: Briefcase, searchFields: ["case_title", "case_number", "victim_name", "victim_email", "fraud_type"] },
  { name: "EvidenceItem", label: "Evidence", icon: FileSearch, searchFields: ["filename", "description"] },
  { name: "InvestigationTarget", label: "Targets", icon: Crosshair, searchFields: ["value", "label", "description"] },
  { name: "InvestigationFinding", label: "Findings", icon: FlaskConical, searchFields: ["title", "description"] },
  { name: "InvestigationReport", label: "Reports", icon: FileText, searchFields: ["title"] },
];

export default function GlobalSearchPage() {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const results = useQuery({
    queryKey: ["global-search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const results = [];
      for (const entity of SEARCHABLE_ENTITIES) {
        try {
          const records = await base44.entities[entity.name].list("-created_date", 200);
          const q = query.toLowerCase();
          const matches = records.filter((r) =>
            entity.searchFields.some((f) => r[f]?.toString().toLowerCase().includes(q))
          );
          if (matches.length > 0) {
            results.push({ entity, items: matches });
          }
        } catch (e) { /* entity may not be accessible */ }
      }
      return results;
    },
    enabled: query.trim().length > 0 && searched,
  });

  const totalResults = results.data?.reduce((sum, r) => sum + r.items.length, 0) || 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <SectionHeader title="Global Search" description="Search across all investigation data: cases, evidence, targets, findings, and reports." icon={Search} />

      <form onSubmit={(e) => { e.preventDefault(); setSearched(true); }} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search wallets, domains, IPs, case titles, emails, names…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 bg-[#0f1419] border-white/10 text-white h-11 text-base" />
        </div>
      </form>

      {results.isLoading ? (
        <EmptyState variant="loading" title="Searching…" />
      ) : searched && !results.data?.length ? (
        <EmptyState variant="empty" icon={Search} title="No results found" description={`No matches for "${query}". Try a different search term.`} />
      ) : results.data?.length > 0 ? (
        <div className="space-y-6">
          <p className="text-sm text-gray-400">{totalResults} result(s) across {results.data.length} categor{results.data.length === 1 ? "y" : "ies"}</p>
          {results.data.map(({ entity, items }) => (
            <div key={entity.name}>
              <div className="flex items-center gap-2 mb-2">
                <entity.icon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-medium text-white">{entity.label}</h3>
                <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{items.length}</Badge>
              </div>
              <div className="rounded-lg border border-white/10 divide-y divide-white/5">
                {items.map((item) => (
                  <SearchResultRow key={item.id} item={item} entity={entity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState variant="empty" icon={Search} title="Start searching" description="Enter a search term to find cases, evidence, targets, findings, and reports across all investigations." />
      )}
    </div>
  );
}

function SearchResultRow({ item, entity }) {
  const primary = item.case_title || item.filename || item.value || item.title || "—";
  const secondary = [item.case_number, item.victim_name, item.fraud_type, item.evidence_type, item.type, item.status, item.report_type].filter(Boolean).join(" • ");
  const link = item.case_id ? `/InvestigationWorkspace?case_id=${item.case_id}` : `/InvestigationWorkspace`;

  return (
    <Link to={link} className="flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors group">
      <entity.icon className="w-4 h-4 text-gray-500 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate group-hover:text-cyan-400">{primary}</p>
        {secondary && <p className="text-xs text-gray-500 truncate">{secondary}</p>}
      </div>
      {item.status && <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px] capitalize">{item.status.replace(/_/g, " ")}</Badge>}
    </Link>
  );
}