import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileSearch, Network as NetworkIcon, ZoomIn, ZoomOut, Search, Sparkles, Loader2, RotateCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/platform/EmptyState";
import { extractGraph } from "@/lib/graphExtraction";
import { toast } from "sonner";

const SUB_TABS = [
  { key: "list", label: "Entity List", icon: FileSearch },
  { key: "graph", label: "Entity Graph", icon: NetworkIcon },
];

const NODE_COLORS = {
  wallet: "#06b6d4", person: "#a78bfa", exchange: "#f59e0b", domain: "#34d399",
  ip: "#60a5fa", email: "#f472b6", phone: "#fb7185", transaction: "#22d3ee",
  token_contract: "#2dd4bf", service: "#94a3b8", organization: "#c084fc", other: "#64748b",
};

export default function EntitiesTab({ caseId }) {
  const [sub, setSub] = useState("list");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-white/10 pb-px">
        {SUB_TABS.map((t) => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${sub === t.key ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/[0.04]" : "text-gray-400 hover:text-gray-200"}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>
      {sub === "list" && <EntityList caseId={caseId} />}
      {sub === "graph" && <EntityGraph caseId={caseId} />}
    </div>
  );
}

function useGraphData(caseId) {
  const nodes = useQuery({
    queryKey: ["graph-nodes", caseId],
    queryFn: () => base44.entities.GraphNode.filter({ case_id: caseId }, "-created_date", 500),
    enabled: !!caseId,
  });
  const edges = useQuery({
    queryKey: ["graph-edges", caseId],
    queryFn: () => base44.entities.GraphEdge.filter({ case_id: caseId }, "-created_date", 500),
    enabled: !!caseId,
  });
  return { nodes: nodes.data || [], edges: edges.data || [], isLoading: nodes.isLoading || edges.isLoading, refetch: () => { nodes.refetch(); edges.refetch(); } };
}

function EntityList({ caseId }) {
  const [search, setSearch] = useState("");
  const { nodes, isLoading } = useGraphData(caseId);

  if (isLoading) return <EmptyState variant="loading" title="Loading entities…" />;
  const filtered = search ? nodes.filter((n) => String(n.label + n.value + n.node_type).toLowerCase().includes(search.toLowerCase())) : nodes;
  if (nodes.length === 0) {
    return (
      <EmptyState variant="empty" icon={FileSearch} title="No entities discovered yet"
        description="Entities are extracted by Hermes from the case's real evidence and targets, then persisted. Run the graph extraction to populate this list."
        action={<ExtractButton caseId={caseId} onDone={() => {}} />} />
    );
  }
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input placeholder="Search entities…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#0f1419] border-white/10 text-white" />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-8 text-center"><p className="text-sm text-gray-500">No entities match your search.</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((n) => (
            <div key={n.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] capitalize">{n.node_type}</Badge>
                {n.confidence && <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{n.confidence}</Badge>}
                <Badge variant="outline" className="border-white/10 text-gray-500 text-[10px] capitalize ml-auto">{(n.source || "hermes").replace(/_/g, " ")}</Badge>
              </div>
              <p className="text-sm font-mono text-white truncate">{n.value || n.label}</p>
              {n.label && n.label !== n.value && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.label}</p>}
              {n.evidence_refs?.length > 0 && <p className="text-xs text-gray-500 mt-1">{n.evidence_refs.length} evidence ref(s)</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntityGraph({ caseId }) {
  const qc = useQueryClient();
  const { nodes, edges, isLoading, refetch } = useGraphData(caseId);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const svgRef = useRef(null);

  const onExtract = async () => {
    setExtracting(true); setError(null);
    try {
      const res = await extractGraph({ caseId });
      if (res.persisted.nodes === 0) toast.info(res.note || "Hermes returned no entities for this case.");
      else toast.success(`Extracted ${res.persisted.nodes} nodes / ${res.persisted.edges} edges`);
      qc.invalidateQueries({ queryKey: ["graph-nodes", caseId] });
      qc.invalidateQueries({ queryKey: ["graph-edges", caseId] });
      refetch();
    } catch (e) {
      setError(e?.message || String(e));
      toast.error("Graph extraction failed: " + (e?.message || e));
    } finally { setExtracting(false); }
  };

  const onClear = async () => {
    if (!confirm("Clear all persisted graph nodes/edges for this case?")) return;
    try {
      await base44.entities.GraphNode.deleteMany({ case_id: caseId });
      await base44.entities.GraphEdge.deleteMany({ case_id: caseId });
      qc.invalidateQueries({ queryKey: ["graph-nodes", caseId] });
      qc.invalidateQueries({ queryKey: ["graph-edges", caseId] });
      toast.success("Graph cleared");
    } catch (e) { toast.error("Clear failed: " + (e?.message || e)); }
  };

  if (isLoading) return <EmptyState variant="loading" title="Loading graph…" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={onExtract} disabled={extracting} className="bg-purple-600 hover:bg-purple-700 h-8">
          {extracting ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
          Extract graph via Hermes
        </Button>
        {nodes.length > 0 && (
          <Button size="sm" variant="outline" onClick={refetch} className="border-white/15 text-gray-300 h-8">
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />Refresh
          </Button>
        )}
        {nodes.length > 0 && (
          <Button size="sm" variant="outline" onClick={onClear} className="border-red-500/30 text-red-400 h-8">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear
          </Button>
        )}
        <span className="text-xs text-gray-500 ml-auto">{nodes.length} nodes • {edges.length} edges</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/[0.04] p-3 text-xs text-red-300 flex items-center gap-2">
          <RotateCw className="w-3.5 h-3.5" />Extraction failed: {error}
        </div>
      )}

      {nodes.length === 0 ? (
        <EmptyState variant="empty" icon={NetworkIcon} title="No graph relationships yet"
          description="The entity graph is extracted by Hermes from the case's real evidence and targets, then persisted here. No edges are invented. Click “Extract graph via Hermes” to populate it."
          action={<ExtractButton caseId={caseId} onDone={refetch} />} />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="p-2 rounded-md border border-white/10 text-gray-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={() => setZoom((z) => Math.min(2, z + 0.2))} className="p-2 rounded-md border border-white/10 text-gray-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
          </div>
          <GraphView nodes={nodes} edges={edges} zoom={zoom} setZoom={setZoom} selectedNode={selectedNode} setSelectedNode={setSelectedNode} svgRef={svgRef} />
        </>
      )}
    </div>
  );
}

function ExtractButton({ caseId, onDone }) {
  const [extracting, setExtracting] = useState(false);
  const run = async () => {
    setExtracting(true);
    try {
      const res = await extractGraph({ caseId });
      if (res.persisted.nodes === 0) toast.info(res.note || "Hermes returned no entities.");
      else toast.success(`Extracted ${res.persisted.nodes} nodes / ${res.persisted.edges} edges`);
      onDone();
    } catch (e) { toast.error("Extraction failed: " + (e?.message || e)); }
    finally { setExtracting(false); }
  };
  return (
    <Button size="sm" onClick={run} disabled={extracting} className="bg-purple-600 hover:bg-purple-700">
      {extracting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
      Extract graph via Hermes
    </Button>
  );
}

function GraphView({ nodes, edges, zoom, setZoom, selectedNode, setSelectedNode, svgRef }) {
  const radius = 200 * zoom;
  const cx = 350, cy = 250;
  const positions = nodes.map((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    return { ...node, id: node.value, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  const posMap = Object.fromEntries(positions.map((p) => [p.id, p]));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-white/10 bg-black/30 overflow-auto">
        <svg ref={svgRef} width="700" height="500" className="w-full" style={{ minHeight: 400 }}>
          {edges.map((edge, i) => {
            const from = posMap[edge.source_node];
            const to = posMap[edge.target_node];
            if (!from || !to) return null;
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" />;
          })}
          {positions.map((node) => (
            <g key={node.id} onClick={() => setSelectedNode(node)} className="cursor-pointer">
              <circle cx={node.x} cy={node.y} r={20 * zoom}
                fill={selectedNode?.id === node.id ? "rgba(6,182,212,0.35)" : `${NODE_COLORS[node.node_type] || "#64748b"}33`}
                stroke={NODE_COLORS[node.node_type] || "rgba(6,182,212,0.6)"} strokeWidth="1.5" />
              <text x={node.x} y={node.y + 35 * zoom} fill="#94a3b8" fontSize={10 * zoom} textAnchor="middle" className="pointer-events-none">
                {String(node.label || node.id || "").slice(0, 16)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(NODE_COLORS).map(([t, c]) => (
          <span key={t} className="inline-flex items-center gap-1 text-[10px] text-gray-500 capitalize">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{t}
          </span>
        ))}
      </div>
      {selectedNode && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] capitalize">{selectedNode.node_type}</Badge>
            <p className="text-sm font-medium text-white font-mono">{selectedNode.value}</p>
            {selectedNode.confidence && <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{selectedNode.confidence} confidence</Badge>}
          </div>
          {selectedNode.label && <p className="text-xs text-gray-400 mb-2">{selectedNode.label}</p>}
          <div className="mt-2 space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">Relationships</p>
            {edges.filter((r) => r.source_node === selectedNode.id || r.target_node === selectedNode.id).map((rel, i) => (
              <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 text-gray-300 text-[10px] capitalize">{rel.relationship_type.replace(/_/g, " ")}</Badge>
                <span className="font-mono">{rel.source_node} → {rel.target_node}</span>
                {rel.transaction_hash && <span className="text-gray-600">tx: {String(rel.transaction_hash).slice(0, 16)}…</span>}
              </div>
            ))}
            {edges.filter((r) => r.source_node === selectedNode.id || r.target_node === selectedNode.id).length === 0 && <p className="text-xs text-gray-500">No relationship details available.</p>}
          </div>
        </div>
      )}
    </div>
  );
}