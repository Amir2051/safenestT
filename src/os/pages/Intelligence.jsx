import React, { useState } from "react";
import { Radar, Sparkles, ShieldCheck, Search } from "lucide-react";
import OsGraph from "@/os/ui/OsGraph";
import { Panel, StatusPill, Pill, RiskBar, KV, TD, TH, EmptyNote } from "@/os/ui/kit";
import { ENTITY_GRAPH } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const INDICATORS = [
  { value: "0x41be…9a77", type: "Wallet", label: "Consolidation wallet", risk: 88, source: "Chain extract", first: "2026-10-13" },
  { value: "mule-payout[.]site", type: "Domain", label: "Solicitation site", risk: 77, source: "Victim submission", first: "2026-10-14" },
  { value: "185.xx.xx.42", type: "IP address", label: "Hosting node", risk: 64, source: "Passive DNS (demo)", first: "2026-10-14" },
  { value: "@operator_hk", type: "Handle", label: "Telegram operator", risk: 69, source: "Chat transcript", first: "2026-10-15" },
  { value: "pay-verify@mail-demo[.]test", type: "Email", label: "Payment instruction", risk: 58, source: "Mail header", first: "2026-10-16" },
  { value: "EX-14", type: "Exchange tag", label: "Cash-out venue", risk: 64, source: "Chain extract", first: "2026-10-18" },
];

const CORRELATIONS = [
  { a: "INV-2026-0481", b: "INV-2026-0447", shared: "Consolidation wallet hop 2", strength: 82, kind: "observed" },
  { a: "INV-2026-0481", b: "INV-2026-0472", shared: "Payment-request template", strength: 61, kind: "inference" },
  { a: "INV-2026-0469", b: "INV-2026-0447", shared: "Kiosk deposit venue EX-14", strength: 74, kind: "observed" },
  { a: "INV-2026-0478", b: "INV-2026-0439", shared: "Lookalike domain registrar", strength: 55, kind: "inference" },
];

const OSINT_RESULTS = {
  wallet: {
    title: "Wallet exposure (simulated)",
    rows: [
      ["First activity", "2026-03-02"],
      ["Counterparties", "148 addresses"],
      ["Exchange exposure", "2 tagged venues"],
      ["Sanctions screening", "No match in demo list"],
    ],
  },
  domain: {
    title: "Domain profile (simulated)",
    rows: [
      ["Registered", "2026-09-28"],
      ["Registrar", "Demo Registrar Inc."],
      ["Hosting ASN", "AS-DEMO-4512"],
      ["Certificate age", "38 days"],
    ],
  },
  email: {
    title: "Email reputation (simulated)",
    rows: [
      ["Domain age", "24 days"],
      ["Breach appearances", "0 in demo corpus"],
      ["SPF / DMARC", "missing / missing"],
      ["Prior reports", "3 synthetic reports"],
    ],
  },
};

export default function Intelligence() {
  const demoAction = useDemoToast();
  const [activeNode, setActiveNode] = useState(null);
  const [mode, setMode] = useState("wallet");
  const [query, setQuery] = useState("0x41be…9a77");
  const [ran, setRan] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Intelligence</h1>
          <p className="text-[11.5px] text-os-muted">Entities, correlations and enrichment across the workspace</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Pill tone="cyan"><ShieldCheck className="h-3 w-3" /> observed</Pill>
          <Pill tone="violet"><Sparkles className="h-3 w-3" /> inference</Pill>
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Entity network" subtitle="Cross-case relationship view · synthetic" actions={<Pill tone="neutral">{ENTITY_GRAPH.nodes.length} nodes · {ENTITY_GRAPH.edges.length} edges</Pill>}>
          <OsGraph nodes={ENTITY_GRAPH.nodes} edges={ENTITY_GRAPH.edges} activeId={activeNode} onSelect={(id) => setActiveNode(id === activeNode ? null : id)} height={330} />
        </Panel>

        <div className="space-y-2.5">
          <Panel title="Enrichment lookup" subtitle="Demonstration — no external calls" actions={<Pill tone="info"><Radar className="h-3 w-3" /> mock</Pill>}>
            <div className="flex gap-1.5">
              {["wallet", "domain", "email"].map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setRan(false); }}
                  className={`rounded border px-2 py-0.5 text-[10.5px] capitalize ${
                    mode === m ? "border-os-cyan/40 bg-os-cyan/10 text-os-cyan" : "border-os-line text-os-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setRan(false); }}
                placeholder="Indicator value"
                className="h-8 min-w-0 flex-1 rounded border border-os-line bg-os-bg px-2 text-[11.5px] text-os-text placeholder:text-os-muted/70 focus:border-os-cobalt focus:outline-none"
              />
              <button
                onClick={() => { setRan(true); demoAction("Running an enrichment lookup"); }}
                className="flex items-center gap-1 rounded bg-os-cobalt px-2 text-[11px] font-medium text-white hover:bg-os-cobalt2"
              >
                <Search className="h-3 w-3" /> Run
              </button>
            </div>
            {ran ? (
              <div className="mt-2.5 rounded border border-os-line bg-os-surface p-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-os-muted">{OSINT_RESULTS[mode].title}</p>
                <dl className="mt-1.5 space-y-1">
                  {OSINT_RESULTS[mode].rows.map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-2 text-[11.5px]">
                      <dt className="text-os-muted">{k}</dt>
                      <dd className="font-mono text-os-text">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[10px] leading-snug text-os-muted">
                  Returned from a local mock corpus. Nothing was queried externally.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-os-muted">
                Run a lookup to see the demonstration response for the selected indicator type.
              </p>
            )}
          </Panel>

          <Panel title="Signals worth attention">
            <ul className="space-y-2">
              <li className="rounded border border-os-amber/25 bg-os-amber/5 px-2 py-1.5 text-[11.5px] text-os-text">
                Consolidation wallet appears in two unrelated matters — treat as shared infrastructure.
              </li>
              <li className="rounded border border-os-line bg-os-surface px-2 py-1.5 text-[11.5px] text-os-text">
                Exchange tag EX-14 cash-out pattern repeats across 3 cases.
              </li>
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title="Indicator inventory" subtitle="6 of 214 synthetic indicators" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse">
              <thead>
                <tr className="border-b border-os-line">
                  <TH>Indicator</TH><TH>Type</TH><TH>Label</TH><TH>Risk</TH><TH>First seen</TH>
                </tr>
              </thead>
              <tbody>
                {INDICATORS.map((i) => (
                  <tr key={i.value} className="border-b border-os-line/60 last:border-b-0 hover:bg-os-raised">
                    <TD className="font-mono text-[11px] text-os-cyan">{i.value}</TD>
                    <TD className="text-os-muted">{i.type}</TD>
                    <TD>{i.label}</TD>
                    <TD><RiskBar value={i.risk} width="w-14" /></TD>
                    <TD className="font-mono text-[10.5px] text-os-muted">{i.first}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Correlation candidates" subtitle="Observed matches vs. model-suggested links">
          <ul className="space-y-2">
            {CORRELATIONS.map((c) => (
              <li key={c.a + c.b} className="rounded border border-os-line bg-os-surface px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] text-os-text">{c.a}</span>
                  <span className="text-os-muted">↔</span>
                  <span className="font-mono text-[10.5px] text-os-text">{c.b}</span>
                  <StatusPill value={c.kind} />
                  <span className="ml-auto font-mono text-[10.5px] text-os-muted">{c.strength}%</span>
                </div>
                <p className="mt-1 text-[11.5px] text-os-muted">Shared artefact: {c.shared}</p>
                <div className="mt-1.5"><RiskBar value={c.strength} width="w-full" /></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {!INDICATORS.length && <EmptyNote>No indicators in the demo corpus.</EmptyNote>}
    </div>
  );
}