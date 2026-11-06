import React from "react";

const RISK_COLOR = (risk) =>
  risk >= 80 ? "#E5484D" : risk >= 60 ? "#F0A73A" : risk >= 40 ? "#3B82F6" : "#34C77B";

/**
 * Lightweight relationship visualisation for the prototype. Deterministic
 * circular layout — no external graph library, no live data.
 */
export default function OsGraph({ nodes, edges, activeId, onSelect, height = 360 }) {
  const cx = 200;
  const cy = 190;
  const r = 126;
  const pos = {};
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    pos[n.id] = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  return (
    <svg viewBox="0 0 400 380" style={{ height }} className="w-full">
      <defs>
        <pattern id="osgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 L0 0 0 20" fill="none" stroke="#1c242e" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="400" height="380" fill="url(#osgrid)" opacity="0.6" />

      {edges.map((e, i) => {
        const a = pos[e.from];
        const b = pos[e.to];
        if (!a || !b) return null;
        const active = activeId && (e.from === activeId || e.to === activeId);
        return (
          <g key={i}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={active ? "#22D3EE" : "#2E3A48"}
              strokeWidth={active ? 1.4 : 1}
              strokeDasharray={e.label === "controls" ? "3 3" : "0"}
            />
            <text
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2 - 3}
              textAnchor="middle"
              fontSize="7"
              fill="#6b7787"
              className="font-mono uppercase"
            >
              {e.label}
            </text>
          </g>
        );
      })}

      {nodes.map((n) => {
        const p = pos[n.id];
        const active = activeId === n.id;
        const color = RISK_COLOR(n.risk);
        return (
          <g key={n.id} onClick={() => onSelect?.(n.id)} className={onSelect ? "cursor-pointer" : ""}>
            <circle cx={p.x} cy={p.y} r={active ? 15 : 12} fill="#141A22" stroke={color} strokeWidth={active ? 2 : 1.4} />
            <circle cx={p.x} cy={p.y} r={3} fill={color} />
            <text x={p.x} y={p.y + 25} textAnchor="middle" fontSize="8.5" fill={active ? "#E7ECF3" : "#8A96A7"}>
              {n.label.length > 20 ? `${n.label.slice(0, 19)}…` : n.label}
            </text>
            <text x={p.x} y={p.y + 35} textAnchor="middle" fontSize="7" fill="#5d6877" className="font-mono uppercase">
              {n.type}
            </text>
          </g>
        );
      })}
    </svg>
  );
}