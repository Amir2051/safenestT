import React, { useState, useRef } from "react";
import { FileSearch, Network as NetworkIcon, ZoomIn, ZoomOut, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import HermesPanel from "@/components/platform/HermesPanel";
import { HermesAPI } from "@/lib/hermesClient";

const SUB_TABS = [
  { key: "list", label: "Entity List", icon: FileSearch },
  { key: "graph", label: "Entity Graph", icon: NetworkIcon },
];

export default function EntitiesTab({ caseId, hermesState }) {
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
      {sub === "list" && <EntityList caseId={caseId} hermesState={hermesState} />}
      {sub === "graph" && <EntityGraph caseId={caseId} hermesState={hermesState} />}
    </div>
  );
}

function EntityList({ caseId, hermesState }) {
  const [search, setSearch] = useState("");
  return (
    <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="entities" fetcher={HermesAPI.getEntities}
      emptyTitle="No entities discovered yet" emptyDescription="Entities are extracted by Hermes during investigation. When available, they will appear here."
      render={(data) => {
        const entities = Array.isArray(data) ? data : data?.entities || [];
        const filtered = search ? entities.filter((e) => JSON.stringify(e).toLowerCase().includes(search.toLowerCase())) : entities;
        if (filtered.length === 0) return <div className="rounded-lg border border-white/10 p-8 text-center"><p className="text-sm text-gray-500">No entities match your search.</p></div>;
        return (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input placeholder="Search entities…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#0f1419] border-white/10 text-white" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((entity, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px] capitalize">{entity.type || entity.entity_type || "entity"}</Badge>
                    {entity.confidence && <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{entity.confidence}</Badge>}
                  </div>
                  <p className="text-sm font-mono text-white truncate">{entity.value || entity.address || entity.name || JSON.stringify(entity).slice(0, 60)}</p>
                  {entity.source && <p className="text-xs text-gray-500 mt-1">Source: {entity.source}</p>}
                  {entity.first_seen && <p className="text-xs text-gray-500">First seen: {new Date(entity.first_seen).toLocaleDateString()}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      }} />
  );
}

function EntityGraph({ caseId, hermesState }) {
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const svgRef = useRef(null);

  return (
    <HermesPanel caseId={caseId} hermesState={hermesState} queryKey="relationships" fetcher={HermesAPI.getRelationships}
      emptyTitle="No relationships discovered yet" emptyDescription="Relationships are analyzed by Hermes. When available, an interactive entity graph will render here. The graph is data-driven — no edges are invented."
      render={(data) => {
        const relationships = Array.isArray(data) ? data : data?.relationships || [];
        const nodes = data?.nodes || extractNodes(relationships);
        if (nodes.length === 0) return <div className="rounded-lg border border-white/10 p-8 text-center"><p className="text-sm text-gray-500">No relationships discovered yet.</p></div>;
        return <GraphView nodes={nodes} relationships={relationships} zoom={zoom} setZoom={setZoom} selectedNode={selectedNode} setSelectedNode={setSelectedNode} svgRef={svgRef} />;
      }} />
  );
}

function extractNodes(rels) {
  const nodeMap = {};
  rels.forEach((r) => {
    if (r.source || r.from) { const id = r.source || r.from; nodeMap[id] = nodeMap[id] || { id, label: id }; }
    if (r.target || r.to) { const id = r.target || r.to; nodeMap[id] = nodeMap[id] || { id, label: id }; }
  });
  return Object.values(nodeMap);
}

function GraphView({ nodes, relationships, zoom, setZoom, selectedNode, setSelectedNode, svgRef }) {
  const radius = 200 * zoom;
  const cx = 350, cy = 250;
  const positions = nodes.map((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    return { ...node, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  const posMap = Object.fromEntries(positions.map((p) => [p.id || p.label, p]));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="p-2 rounded-md border border-white/10 text-gray-400 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.2))} className="p-2 rounded-md border border-white/10 text-gray-400 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
        <span className="text-xs text-gray-500">{nodes.length} nodes • {relationships.length} edges</span>
      </div>
      <div className="rounded-lg border border-white/10 bg-black/30 overflow-auto">
        <svg ref={svgRef} width="700" height="500" className="w-full" style={{ minHeight: 400 }}>
          {/* Edges */}
          {relationships.map((rel, i) => {
            const from = posMap[rel.source || rel.from];
            const to = posMap[rel.target || rel.to];
            if (!from || !to) return null;
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" />;
          })}
          {/* Nodes */}
          {positions.map((node) => (
            <g key={node.id || node.label} onClick={() => setSelectedNode(node)} className="cursor-pointer">
              <circle cx={node.x} cy={node.y} r={20 * zoom} fill={selectedNode?.id === node.id ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.05)"} stroke="rgba(6,182,212,0.4)" strokeWidth="1.5" />
              <text x={node.x} y={node.y + 35 * zoom} fill="#94a3b8" fontSize={10 * zoom} textAnchor="middle" className="pointer-events-none">{(node.label || node.id || "").slice(0, 16)}</text>
            </g>
          ))}
        </svg>
      </div>
      {selectedNode && (
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.04] p-4">
          <p className="text-sm font-medium text-white">{selectedNode.label || selectedNode.id}</p>
          <div className="mt-2 space-y-1">
            {relationships.filter((r) => (r.source || r.from) === selectedNode.id || (r.target || r.to) === selectedNode.id).map((rel, i) => (
              <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{rel.type || rel.relationship_type || "related"}</Badge>
                <span className="font-mono">{rel.source || rel.from} → {rel.target || rel.to}</span>
                {rel.transaction_hash && <span className="text-gray-600">tx: {rel.transaction_hash.slice(0, 16)}…</span>}
              </div>
            ))}
            {relationships.filter((r) => (r.source || r.from) === selectedNode.id || (r.target || r.to) === selectedNode.id).length === 0 && <p className="text-xs text-gray-500">No relationship details available.</p>}
          </div>
        </div>
      )}
    </div>
  );
}