import React, { useMemo, useState } from "react";
import { ShieldCheck, ShieldAlert, Upload, FileSearch } from "lucide-react";
import { Panel, StatusPill, Pill, KV, TD, TH, EmptyNote } from "@/os/ui/kit";
import { EVIDENCE } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const SELECT = "h-8 rounded border border-os-line bg-os-panel px-2 text-[11.5px] text-os-text focus:border-os-cobalt focus:outline-none";

const CUSTODY_STEPS = [
  ["Collected", "Captured from the stated source and stored with a timestamp."],
  ["Hashed", "SHA-256 recorded at ingest; hash is re-verified on every sweep."],
  ["Reviewed", "An investigator confirmed the artefact matches the case scope."],
  ["Sealed", "Item is locked for evidentiary use and cannot be edited."],
];

export default function Evidence() {
  const demoAction = useDemoToast();
  const [q, setQ] = useState("");
  const [custody, setCustody] = useState("all");
  const [selected, setSelected] = useState(EVIDENCE[0].ref);

  const rows = useMemo(
    () => EVIDENCE.filter((e) => {
      const needle = q.trim().toLowerCase();
      return (!needle || `${e.ref} ${e.type} ${e.case} ${e.source}`.toLowerCase().includes(needle)) &&
        (custody === "all" || e.custody === custody);
    }),
    [q, custody]
  );

  const item = EVIDENCE.find((e) => e.ref === selected) || rows[0] || EVIDENCE[0];
  const stepIndex = item.custody === "verified" ? 4 : item.custody === "pending" ? 2 : 1;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Evidence</h1>
          <p className="text-[11.5px] text-os-muted">Inventory, source, custody and verification status</p>
        </div>
        <button
          onClick={() => demoAction("Uploading evidence")}
          className="flex items-center gap-1.5 rounded bg-os-cobalt px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-os-cobalt2"
        >
          <Upload className="h-3.5 w-3.5" /> Add evidence
        </button>
      </div>

      <Panel bodyClassName="p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <FileSearch className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-os-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by reference, type, case or source"
              className="h-8 w-full rounded border border-os-line bg-os-bg pl-7 pr-2 text-[11.5px] text-os-text placeholder:text-os-muted/70 focus:border-os-cobalt focus:outline-none"
            />
          </div>
          <select value={custody} onChange={(e) => setCustody(e.target.value)} className={SELECT}>
            <option value="all">All custody states</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="quarantined">Quarantined</option>
          </select>
          <span className="ml-auto text-[11px] text-os-muted">{rows.length} of {EVIDENCE.length} items</span>
        </div>
      </Panel>

      <div className="grid gap-2.5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Evidence inventory" bodyClassName="p-0">
          {rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[660px] border-collapse">
                <thead>
                  <tr className="border-b border-os-line">
                    <TH>Ref</TH><TH>Case</TH><TH>Type</TH><TH>Source</TH><TH>Collected</TH><TH>Custody</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr
                      key={e.ref}
                      onClick={() => setSelected(e.ref)}
                      className={`cursor-pointer border-b border-os-line/60 last:border-b-0 hover:bg-os-raised ${
                        selected === e.ref ? "bg-os-raised" : ""
                      }`}
                    >
                      <TD className="font-mono text-[10.5px] text-os-cyan">{e.ref}</TD>
                      <TD className="font-mono text-[10.5px] text-os-muted">{e.case}</TD>
                      <TD>{e.type}</TD>
                      <TD className="text-os-muted">{e.source}</TD>
                      <TD className="font-mono text-[10.5px] text-os-muted">{e.collected}</TD>
                      <TD><StatusPill value={e.custody} /></TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="p-4"><EmptyNote>No evidence matches these filters.</EmptyNote></div>}
        </Panel>

        <Panel title={`Evidence ${item.ref}`} subtitle="Chain-of-custody record" actions={<StatusPill value={item.custody} />}>
          <div className="grid grid-cols-2 gap-3">
            <KV label="Type" value={item.type} />
            <KV label="Case" value={item.case} mono />
            <KV label="Source" value={item.source} />
            <KV label="Collected" value={item.collected} mono />
            <KV label="Analyst" value={item.analyst} />
            <KV label="SHA-256" value={item.hash} mono />
          </div>

          <ol className="mt-3 space-y-2 border-t border-os-line pt-3">
            {CUSTODY_STEPS.map(([title, desc], i) => {
              const done = i < stepIndex;
              return (
                <li key={title} className="flex gap-2">
                  {done ? (
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-os-green" />
                  ) : (
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-os-muted" />
                  )}
                  <div>
                    <p className={`text-[11.5px] font-medium ${done ? "text-os-text" : "text-os-muted"}`}>{title}</p>
                    <p className="text-[10.5px] leading-snug text-os-muted">{desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-os-line pt-2.5">
            <button
              onClick={() => demoAction("Verifying evidence integrity")}
              className="rounded border border-os-line bg-os-surface px-2 py-1 text-[11px] text-os-text hover:border-os-line2"
            >
              Re-verify hash
            </button>
            <button
              onClick={() => demoAction("Sealing the evidence item")}
              className="rounded border border-os-line bg-os-surface px-2 py-1 text-[11px] text-os-text hover:border-os-line2"
            >
              Seal item
            </button>
            <Pill tone="neutral">download disabled in demo</Pill>
          </div>
        </Panel>
      </div>
    </div>
  );
}