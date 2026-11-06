import React, { useMemo, useState } from "react";
import { ShieldCheck, Sparkles, CheckCircle2, XCircle, Search } from "lucide-react";
import { Panel, StatusPill, Pill, RiskBar, KV, EmptyNote } from "@/os/ui/kit";
import { FINDINGS } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const SELECT = "h-8 rounded border border-os-line bg-os-panel px-2 text-[11.5px] text-os-text focus:border-os-cobalt focus:outline-none";

export default function Findings() {
  const demoAction = useDemoToast();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [selected, setSelected] = useState(FINDINGS[0].ref);
  const [decisions, setDecisions] = useState({});

  const rows = useMemo(
    () => FINDINGS.filter((f) => {
      const needle = q.trim().toLowerCase();
      return (!needle || `${f.ref} ${f.title} ${f.case}`.toLowerCase().includes(needle)) &&
        (kind === "all" || f.kind === kind) && (severity === "all" || f.severity === severity);
    }),
    [q, kind, severity]
  );

  const item = rows.find((f) => f.ref === selected) || rows[0] || FINDINGS[0];
  const decision = decisions[item.ref];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Findings</h1>
          <p className="max-w-2xl text-[11.5px] leading-relaxed text-os-muted">
            Observed findings are derived from evidence. Inferences are model output and stay visually and structurally separate
            until an investigator verifies them.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Pill tone="cyan"><ShieldCheck className="h-3 w-3" /> {FINDINGS.filter((f) => f.kind === "observed").length} observed</Pill>
          <Pill tone="violet"><Sparkles className="h-3 w-3" /> {FINDINGS.filter((f) => f.kind === "inference").length} inference</Pill>
        </div>
      </div>

      <Panel bodyClassName="p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-os-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search findings"
              className="h-8 w-full rounded border border-os-line bg-os-bg pl-7 pr-2 text-[11.5px] text-os-text placeholder:text-os-muted/70 focus:border-os-cobalt focus:outline-none"
            />
          </div>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={SELECT}>
            <option value="all">All sources</option>
            <option value="observed">Observed</option>
            <option value="inference">Inference</option>
          </select>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={SELECT}>
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
          </select>
          <span className="ml-auto text-[11px] text-os-muted">{rows.length} findings</span>
        </div>
      </Panel>

      <div className="grid gap-2.5 xl:grid-cols-5">
        <div className="space-y-1.5 xl:col-span-2">
          {rows.length ? rows.map((f) => (
            <button
              key={f.ref}
              onClick={() => setSelected(f.ref)}
              className={`w-full rounded border px-2.5 py-2 text-left transition-colors ${
                item.ref === f.ref ? "border-os-cobalt/50 bg-os-raised" : "border-os-line bg-os-panel hover:border-os-line2"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-os-muted">{f.ref}</span>
                <StatusPill value={f.kind} />
                <span className="ml-auto"><StatusPill value={f.severity} /></span>
              </div>
              <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-snug text-os-text">{f.title}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-[10px] text-os-muted">{f.case}</span>
                <span className="ml-auto font-mono text-[10px] text-os-muted">{f.confidence}% confidence</span>
              </div>
            </button>
          )) : <EmptyNote>No findings match these filters.</EmptyNote>}
        </div>

        <div className="xl:col-span-3">
          <Panel
            title={`${item.ref} · ${item.case}`}
            subtitle={item.kind === "observed" ? "Observed — traced to attached evidence" : "Model inference — requires corroboration"}
            actions={<StatusPill value={decision || item.status} />}
          >
            <h3 className="text-[13.5px] font-medium leading-snug text-os-text">{item.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-os-muted">{item.summary}</p>

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-os-line pt-3 sm:grid-cols-4">
              <KV label="Source" value={<StatusPill value={item.kind} />} />
              <KV label="Severity" value={<StatusPill value={item.severity} />} />
              <KV label="Confidence" value={<span className="font-mono">{item.confidence}%</span>} />
              <KV label="Evidence refs" value={<span className="font-mono text-[11px]">{item.evidence.join(", ")}</span>} />
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-os-muted">
                <span>Confidence</span><span className="font-mono">{item.confidence}%</span>
              </div>
              <div className="mt-1"><RiskBar value={item.confidence} width="w-full" /></div>
            </div>

            {item.kind === "inference" && (
              <p className="mt-3 rounded border border-os-violet/25 bg-os-violet/5 px-2.5 py-1.5 text-[11px] leading-snug text-os-violet">
                This is AI-generated inference. It is not evidence and cannot be cited in a dossier until an investigator attaches
                supporting evidence and verifies it.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-os-line pt-2.5">
              <button
                onClick={() => { setDecisions((d) => ({ ...d, [item.ref]: "verified" })); demoAction("Verifying the finding"); }}
                className="flex items-center gap-1 rounded bg-os-green/15 px-2 py-1 text-[11px] text-os-green hover:bg-os-green/25"
              >
                <CheckCircle2 className="h-3 w-3" /> Verify
              </button>
              <button
                onClick={() => { setDecisions((d) => ({ ...d, [item.ref]: "proposed" })); demoAction("Returning the finding for review"); }}
                className="flex items-center gap-1 rounded border border-os-line bg-os-surface px-2 py-1 text-[11px] text-os-text hover:border-os-line2"
              >
                Return for review
              </button>
              <button
                onClick={() => { setDecisions((d) => ({ ...d, [item.ref]: "unsupported" })); demoAction("Rejecting the finding"); }}
                className="flex items-center gap-1 rounded bg-os-red/10 px-2 py-1 text-[11px] text-os-red hover:bg-os-red/20"
              >
                <XCircle className="h-3 w-3" /> Reject
              </button>
              <span className="ml-auto self-center text-[10px] text-os-muted">Reviews are local to this prototype session.</span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}