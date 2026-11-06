import React, { useMemo, useState } from "react";
import { FileText, Download, Eye, CheckCircle2, Clock } from "lucide-react";
import { Panel, StatusPill, Pill, KV, TD, TH, EmptyNote } from "@/os/ui/kit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { REPORTS, REPORT_TEMPLATES } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const TABS = [
  ["all", "All"],
  ["draft", "Drafts"],
  ["pending_approval", "Pending approval"],
  ["approved", "Approved"],
  ["completed", "Completed"],
];

export default function Reports() {
  const demoAction = useDemoToast();
  const [tab, setTab] = useState("all");
  const [preview, setPreview] = useState(null);

  const rows = useMemo(() => (tab === "all" ? REPORTS : REPORTS.filter((r) => r.status === tab)), [tab]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Reports</h1>
          <p className="text-[11.5px] text-os-muted">Drafts, approvals and exportable dossiers</p>
        </div>
        <button
          onClick={() => demoAction("Generating a report from a template")}
          className="flex items-center gap-1.5 rounded bg-os-cobalt px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-os-cobalt2"
        >
          <FileText className="h-3.5 w-3.5" /> New report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Drafts", REPORTS.filter((r) => r.status === "draft").length, Clock],
          ["Pending approval", REPORTS.filter((r) => r.status === "pending_approval").length, Clock],
          ["Approved", REPORTS.filter((r) => r.status === "approved").length, CheckCircle2],
          ["Completed", REPORTS.filter((r) => r.status === "completed").length, CheckCircle2],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded border border-os-line bg-os-panel px-3 py-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-os-muted">
              {label} <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="mt-1 font-mono text-lg leading-none text-os-text">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 rounded border border-os-line bg-os-panel p-1">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded px-2 py-1 text-[11px] ${
              tab === key ? "bg-os-cobalt/20 text-os-text" : "text-os-muted hover:text-os-text"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto self-center pr-1 text-[10.5px] text-os-muted">{rows.length} reports</span>
      </div>

      <Panel bodyClassName="p-0">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-os-line">
                  <TH>Ref</TH><TH>Title</TH><TH>Case</TH><TH>Template</TH><TH>Author</TH><TH>Updated</TH><TH>Status</TH><TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ref} className="border-b border-os-line/60 last:border-b-0 hover:bg-os-raised">
                    <TD className="font-mono text-[10.5px] text-os-cyan">{r.ref}</TD>
                    <TD className="max-w-[280px] truncate font-medium">{r.title}</TD>
                    <TD className="font-mono text-[10.5px] text-os-muted">{r.case}</TD>
                    <TD className="text-os-muted">{r.template}</TD>
                    <TD className="text-os-muted">{r.author}</TD>
                    <TD className="font-mono text-[10.5px] text-os-muted">{r.updated}</TD>
                    <TD><StatusPill value={r.status} /></TD>
                    <TD>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPreview(r)} className="rounded border border-os-line p-1 text-os-muted hover:text-os-text" aria-label="Preview report">
                          <Eye className="h-3 w-3" />
                        </button>
                        <button onClick={() => demoAction("Exporting a report")} className="rounded border border-os-line p-1 text-os-muted hover:text-os-text" aria-label="Export report">
                          <Download className="h-3 w-3" />
                        </button>
                      </div>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-4"><EmptyNote>No reports in this state.</EmptyNote></div>}
      </Panel>

      <Panel title="Report templates" subtitle="Structure only — populated from supported findings" bodyClassName="p-3">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TEMPLATES.map((t) => (
            <div key={t.name} className="rounded border border-os-line bg-os-surface px-2.5 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-os-text">{t.name}</span>
                <Pill tone="neutral">{t.sections} sections</Pill>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-os-muted">{t.desc}</p>
              <button
                onClick={() => demoAction(`Generating from “${t.name}”`)}
                className="mt-2 w-full rounded border border-os-line bg-os-panel py-1 text-[10.5px] text-os-cyan hover:border-os-cobalt/40"
              >
                Use template (demo)
              </button>
            </div>
          ))}
        </div>
      </Panel>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{preview?.title}</DialogTitle>
            <DialogDescription className="text-[12px]">
              {preview?.ref} · {preview?.template} · {preview?.pages} pages · synthetic preview
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[52vh] space-y-2.5 overflow-y-auto rounded border border-os-line bg-os-surface p-3">
            <div className="grid grid-cols-3 gap-3 border-b border-os-line pb-2">
              <KV label="Case" value={preview?.case} mono />
              <KV label="Author" value={preview?.author} />
              <KV label="Status" value={<StatusPill value={preview?.status} />} />
            </div>
            {["Executive summary", "Scope and methodology", "Supported findings", "Evidence index", "Risk posture", "Recommendations"].map((s) => (
              <div key={s}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-os-muted">{s}</p>
                <div className="mt-1 space-y-1">
                  <div className="h-1.5 w-full rounded bg-os-line" />
                  <div className="h-1.5 w-[92%] rounded bg-os-line" />
                  <div className="h-1.5 w-[74%] rounded bg-os-line" />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[10.5px] text-os-muted">
              Body content is intentionally omitted in the prototype. Exports are not connected to storage.
            </p>
          </div>
          <DialogFooter className="gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Close</Button>
            <Button size="sm" className="bg-os-cobalt text-white hover:bg-os-cobalt2" onClick={() => { setPreview(null); demoAction("Exporting a report"); }}>
              Export PDF (demo)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}