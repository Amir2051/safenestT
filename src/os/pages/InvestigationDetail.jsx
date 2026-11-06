import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, ShieldCheck, Sparkles, UserPlus, Play, Download, Plus, Network,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import OsGraph from "@/os/ui/OsGraph";
import { Panel, StatusPill, RiskBar, Bar, KV, Pill, TD, TH, EmptyNote } from "@/os/ui/kit";
import { INVESTIGATIONS, EVIDENCE, FINDINGS, REPORTS, ENTITY_GRAPH } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const PHASES = ["planning", "evidence", "analysis", "reality_check", "risk", "dossier"];
const PHASE_LABEL = {
  planning: "Planning", evidence: "Evidence", analysis: "Analysis",
  reality_check: "Reality check", risk: "Risk", dossier: "Dossier",
};

export default function InvestigationDetail() {
  const { code } = useParams();
  const demoAction = useDemoToast();
  const item = INVESTIGATIONS.find((i) => i.code === code);
  const [activeNode, setActiveNode] = useState(null);
  const [notes, setNotes] = useState([
    { t: "2026-11-05 16:20", by: "D. Whitfield", body: "Escalated to critical after second consolidation wallet matched. Holding dossier submission until counterparty tag confirmed." },
    { t: "2026-11-04 10:02", by: "P. Raman", body: "Chain extract re-run against the updated indexer — hop 2 label changed from unlabelled to exchange tag EX-14." },
  ]);
  const [draft, setDraft] = useState("");

  const evidence = useMemo(() => EVIDENCE.filter((e) => e.case === code), [code]);
  const findings = useMemo(() => FINDINGS.filter((f) => f.case === code), [code]);
  const reports = useMemo(() => REPORTS.filter((r) => r.case === code), [code]);

  if (!item) {
    return (
      <div className="rounded border border-os-line bg-os-panel p-8 text-center">
        <p className="text-[13px] text-os-text">Investigation {code} is not in the demo dataset.</p>
        <Link to="/os/investigations" className="mt-3 inline-block text-[11.5px] text-os-cyan hover:underline">
          Back to investigations
        </Link>
      </div>
    );
  }

  const phaseIndex = PHASES.indexOf(item.phase);
  const timeline = [
    { t: item.createdAt, title: "Case opened", detail: `${item.type} · reported loss $${item.lossUsd.toLocaleString()}`, level: "info" },
    { t: item.createdAt, title: "Assigned", detail: `${item.assignee} accepted ownership`, level: "info" },
    { t: "phase", title: "Evidence collection", detail: `${item.evidence} items indexed · chain-of-custody verified`, level: "success" },
    { t: "phase", title: "Analysis", detail: `${item.findings} findings produced by ${item.provider}`, level: "info" },
    { t: "phase", title: "Reality check", detail: "Findings gated against attached evidence before review", level: "warn" },
    { t: "now", title: "Current state", detail: `${PHASE_LABEL[item.phase]} phase · ${item.progress}% complete`, level: "info" },
  ];

  const activity = [
    { t: "22 min ago", who: "System", act: "Polled investigation status", meta: "simulated adapter" },
    { t: "48 min ago", who: item.assignee, act: "Updated risk assessment", meta: `risk ${item.risk}` },
    { t: "2 hrs ago", who: "P. Raman", act: "Attached evidence", meta: `${item.evidence} items total` },
    { t: "5 hrs ago", who: item.assignee, act: "Marked finding under review", meta: `${item.findings} findings` },
    { t: "1 day ago", who: "System", act: "Reality-check pass completed", meta: "evidence gate applied" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/os/investigations" className="mb-1 inline-flex items-center gap-1 text-[10.5px] text-os-muted hover:text-os-text">
            <ArrowLeft className="h-3 w-3" /> Investigations
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-os-cyan">{item.code}</span>
            <StatusPill value={item.status} />
            <StatusPill value={item.priority} />
            <Pill tone="violet">{item.provider}</Pill>
          </div>
          <h1 className="mt-1 max-w-3xl text-[17px] font-semibold leading-snug tracking-tight text-os-text">{item.title}</h1>
          <p className="mt-0.5 text-[11.5px] text-os-muted">
            Opened {item.createdAt} · {item.assignee} · last activity {item.lastActivity}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => demoAction("Assigning an investigator")} className="flex items-center gap-1 rounded border border-os-line bg-os-panel px-2 py-1.5 text-[11px] text-os-muted hover:text-os-text">
            <UserPlus className="h-3 w-3" /> Assign
          </button>
          <button onClick={() => demoAction("Starting an investigation run")} className="flex items-center gap-1 rounded bg-os-cobalt px-2 py-1.5 text-[11px] font-medium text-white hover:bg-os-cobalt2">
            <Play className="h-3 w-3" /> Start run
          </button>
          <button onClick={() => demoAction("Exporting the case dossier")} className="flex items-center gap-1 rounded border border-os-line bg-os-panel px-2 py-1.5 text-[11px] text-os-muted hover:text-os-text">
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-4">
        <Panel className="lg:col-span-3" bodyClassName="p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-os-muted">Workflow progress</span>
            <span className="font-mono text-[10.5px] text-os-cyan">{item.progress}%</span>
          </div>
          <Bar value={item.progress} tone="bg-os-cyan" />
          <ol className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
            {PHASES.map((p, i) => {
              const state = i < phaseIndex ? "done" : i === phaseIndex ? "current" : "todo";
              return (
                <li
                  key={p}
                  className={`rounded border px-2 py-1.5 ${
                    state === "done"
                      ? "border-os-green/30 bg-os-green/5"
                      : state === "current"
                      ? "border-os-cyan/40 bg-os-cyan/10"
                      : "border-os-line bg-os-surface"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        state === "done" ? "bg-os-green" : state === "current" ? "bg-os-cyan animate-pulse" : "bg-os-line2"
                      }`}
                    />
                    <span className={`text-[10.5px] ${state === "todo" ? "text-os-muted" : "text-os-text"}`}>
                      {PHASE_LABEL[p]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>

        <Panel bodyClassName="p-3">
          <div className="grid grid-cols-2 gap-3">
            <KV label="Risk score" value={<span className="font-mono">{item.risk}</span>} />
            <KV label="Findings" value={<span className="font-mono">{item.findings}</span>} />
            <KV label="Evidence" value={<span className="font-mono">{item.evidence}</span>} />
            <KV label="Loss" value={<span className="font-mono">${(item.lossUsd / 1000).toFixed(0)}k</span>} />
          </div>
          <div className="mt-2 border-t border-os-line pt-2">
            <RiskBar value={item.risk} width="w-full" />
          </div>
        </Panel>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded border border-os-line bg-os-panel p-1">
          {["summary", "timeline", "evidence", "findings", "entities", "notes", "reports", "activity"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="rounded px-2 py-1 text-[11px] capitalize text-os-muted data-[state=active]:bg-os-cobalt/20 data-[state=active]:text-os-text"
            >
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="mt-2.5 space-y-2.5">
          <Panel title="Executive summary">
            <p className="text-[12.5px] leading-relaxed text-os-text/90">
              Reported loss of <span className="font-mono">${item.lossUsd.toLocaleString()}</span> across{" "}
              {item.chains.length ? item.chains.join(" and ") : "non-chain channels"}. {item.evidence} evidence items are indexed
              and {item.findings} findings are recorded, of which the evidence-backed subset supports the current risk posture of{" "}
              <span className="font-mono">{item.risk}/100</span>. The matter is in the {PHASE_LABEL[item.phase].toLowerCase()} phase
              with {item.progress}% of the workflow complete.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-os-line pt-3 sm:grid-cols-4">
              <KV label="Fraud type" value={item.type} />
              <KV label="Provider" value={item.provider} />
              <KV label="Chains" value={item.chains.length ? item.chains.join(", ") : "—"} />
              <KV label="Current phase" value={PHASE_LABEL[item.phase]} />
            </div>
          </Panel>

          <div className="grid gap-2.5 lg:grid-cols-2">
            <Panel title="Supported findings" subtitle="Evidence-backed only">
              {findings.filter((f) => f.status === "verified").length ? (
                <ul className="space-y-2">
                  {findings.filter((f) => f.status === "verified").map((f) => (
                    <li key={f.ref} className="rounded border border-os-line bg-os-surface px-2.5 py-2">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-os-green" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-os-text">{f.title}</p>
                          <p className="mt-0.5 text-[11px] text-os-muted">{f.summary}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <EmptyNote>No verified findings recorded for this matter yet.</EmptyNote>}
            </Panel>

            <Panel title="Open questions" subtitle="AI inference — requires corroboration">
              {findings.filter((f) => f.kind === "inference").length ? (
                <ul className="space-y-2">
                  {findings.filter((f) => f.kind === "inference").map((f) => (
                    <li key={f.ref} className="rounded border border-os-violet/25 bg-os-violet/5 px-2.5 py-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-os-violet" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-os-text">{f.title}</p>
                          <p className="mt-0.5 text-[11px] text-os-muted">{f.summary}</p>
                          <p className="mt-1 font-mono text-[10px] text-os-violet">confidence {f.confidence}%</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <EmptyNote>No open inferences recorded.</EmptyNote>}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-2.5">
          <Panel title="Investigation timeline" subtitle="Derived from the prototype workflow state">
            <ol className="relative space-y-3 border-l border-os-line pl-4">
              {timeline.map((e, i) => (
                <li key={i} className="relative">
                  <span
                    className={`absolute -left-[21px] top-1 h-2 w-2 rounded-full ${
                      e.level === "success" ? "bg-os-green" : e.level === "warn" ? "bg-os-amber" : "bg-os-cobalt"
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[12px] font-medium text-os-text">{e.title}</span>
                    <span className="font-mono text-[10px] text-os-muted">{e.t}</span>
                  </div>
                  <p className="text-[11.5px] text-os-muted">{e.detail}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </TabsContent>

        <TabsContent value="evidence" className="mt-2.5">
          <Panel title="Evidence attached" subtitle={`${evidence.length} items in this demo set`} bodyClassName="p-0">
            {evidence.length ? (
              <table className="w-full min-w-[620px] border-collapse">
                <thead>
                  <tr className="border-b border-os-line">
                    <TH>Ref</TH><TH>Type</TH><TH>Source</TH><TH>Collected</TH><TH>Custody</TH><TH>Hash</TH>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map((e) => (
                    <tr key={e.ref} className="border-b border-os-line/60 last:border-b-0">
                      <TD className="font-mono text-[10.5px] text-os-cyan">{e.ref}</TD>
                      <TD>{e.type}</TD>
                      <TD className="text-os-muted">{e.source}</TD>
                      <TD className="font-mono text-[10.5px] text-os-muted">{e.collected}</TD>
                      <TD><StatusPill value={e.custody} /></TD>
                      <TD className="font-mono text-[10.5px] text-os-muted">{e.hash}</TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="p-4"><EmptyNote>No evidence rows in the demo set for this matter.</EmptyNote></div>}
          </Panel>
        </TabsContent>

        <TabsContent value="findings" className="mt-2.5">
          <div className="grid gap-2.5 lg:grid-cols-2">
            {findings.length ? findings.map((f) => (
              <Panel key={f.ref} title={f.ref} subtitle={f.title} actions={<StatusPill value={f.kind} />}>
                <p className="text-[12px] leading-relaxed text-os-muted">{f.summary}</p>
                <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-os-line pt-2">
                  <KV label="Severity" value={<StatusPill value={f.severity} />} />
                  <KV label="Status" value={<StatusPill value={f.status} />} />
                  <KV label="Confidence" value={<span className="font-mono">{f.confidence}%</span>} />
                </div>
                <p className="mt-2 font-mono text-[10px] text-os-muted">evidence: {f.evidence.join(", ")}</p>
              </Panel>
            )) : <EmptyNote>No findings recorded for this matter in the demo set.</EmptyNote>}
          </div>
        </TabsContent>

        <TabsContent value="entities" className="mt-2.5">
          <div className="grid gap-2.5 lg:grid-cols-3">
            <Panel className="lg:col-span-2" title="Entity relationships" subtitle="Click a node to isolate its connections" actions={<Pill tone="neutral"><Network className="h-3 w-3" /> {ENTITY_GRAPH.nodes.length} nodes</Pill>}>
              <OsGraph nodes={ENTITY_GRAPH.nodes} edges={ENTITY_GRAPH.edges} activeId={activeNode} onSelect={(id) => setActiveNode(id === activeNode ? null : id)} height={330} />
            </Panel>
            <Panel title="Connections" subtitle={activeNode ? "Filtered to selection" : "All relationships"}>
              <ul className="divide-y divide-os-line">
                {ENTITY_GRAPH.edges
                  .filter((e) => !activeNode || e.from === activeNode || e.to === activeNode)
                  .map((e, i) => {
                    const label = (id) => ENTITY_GRAPH.nodes.find((n) => n.id === id)?.label;
                    return (
                      <li key={i} className="flex items-center gap-1.5 py-1.5 text-[11.5px]">
                        <span className="truncate text-os-text">{label(e.from)}</span>
                        <span className="shrink-0 font-mono text-[9.5px] uppercase text-os-muted">→ {e.label} →</span>
                        <span className="truncate text-os-text">{label(e.to)}</span>
                      </li>
                    );
                  })}
              </ul>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-2.5">
          <Panel title="Investigator notes" subtitle="Local to this prototype session">
            <div className="space-y-2">
              {notes.map((n, i) => (
                <div key={i} className="rounded border border-os-line bg-os-surface px-2.5 py-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11.5px] font-medium text-os-text">{n.by}</span>
                    <span className="font-mono text-[10px] text-os-muted">{n.t}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-os-muted">{n.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-os-line pt-2.5">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder="Add a note (kept in this browser session only)"
                className="w-full rounded border border-os-line bg-os-bg px-2 py-1.5 text-[11.5px] text-os-text placeholder:text-os-muted/70 focus:border-os-cobalt focus:outline-none"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] text-os-muted">Demo only — notes are not saved anywhere.</span>
                <button
                  disabled={!draft.trim()}
                  onClick={() => {
                    setNotes([{ t: "just now", by: "You (demo)", body: draft.trim() }, ...notes]);
                    setDraft("");
                    demoAction("Saving a note");
                  }}
                  className="flex items-center gap-1 rounded bg-os-cobalt px-2 py-1 text-[11px] font-medium text-white disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" /> Add note
                </button>
              </div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="reports" className="mt-2.5">
          <Panel title="Reports for this matter" bodyClassName="p-0">
            {reports.length ? (
              <ul className="divide-y divide-os-line">
                {reports.map((r) => (
                  <li key={r.ref} className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <span className="font-mono text-[10.5px] text-os-cyan">{r.ref}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-os-text">{r.title}</span>
                    <span className="text-[11px] text-os-muted">{r.template}</span>
                    <StatusPill value={r.status} />
                    <button onClick={() => demoAction("Downloading a report")} className="rounded border border-os-line px-2 py-0.5 text-[10.5px] text-os-muted hover:text-os-text">
                      Export
                    </button>
                  </li>
                ))}
              </ul>
            ) : <div className="p-4"><EmptyNote>No reports generated for this matter yet.</EmptyNote></div>}
          </Panel>
        </TabsContent>

        <TabsContent value="activity" className="mt-2.5">
          <Panel title="Activity history" bodyClassName="p-0">
            <ul className="divide-y divide-os-line">
              {activity.map((a, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 px-3 py-2 text-[11.5px]">
                  <span className="w-20 shrink-0 font-mono text-[10px] text-os-muted">{a.t}</span>
                  <span className="w-32 shrink-0 truncate text-os-text">{a.who}</span>
                  <span className="min-w-0 flex-1 text-os-muted">{a.act}</span>
                  <span className="font-mono text-[10px] text-os-muted">{a.meta}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}