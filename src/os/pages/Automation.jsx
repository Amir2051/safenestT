import React, { useState } from "react";
import { Workflow, Play, Bell } from "lucide-react";
import { Panel, StatusPill, Pill, TD, TH } from "@/os/ui/kit";
import { Switch } from "@/components/ui/switch";
import { AUTOMATIONS } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const HISTORY = [
  { t: "21:48", rule: "Auto-assign intake cases", target: "INV-2026-0463", result: "success", detail: "Assigned to intake queue (demo)" },
  { t: "21:45", rule: "Evidence hash re-verification", target: "10 items", result: "success", detail: "All hashes matched" },
  { t: "20:14", rule: "Escalate critical risk > 85", target: "INV-2026-0481", result: "success", detail: "Notified lead investigator" },
  { t: "09:00", rule: "Case inactivity nudge (7 days)", target: "3 cases", result: "warning", detail: "2 notifications suppressed in demo" },
  { t: "Nov 05", rule: "Approval reminder for pending reports", target: "—", result: "idle", detail: "Rule disabled" },
];

export default function Automation() {
  const demoAction = useDemoToast();
  const [enabled, setEnabled] = useState(() => Object.fromEntries(AUTOMATIONS.map((a) => [a.name, a.enabled])));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-os-text">
            <Workflow className="h-4 w-4 text-os-cyan" /> Automation
          </h1>
          <p className="text-[11.5px] text-os-muted">Rules that react to case, risk and schedule events</p>
        </div>
        <Pill tone="warn">toggles are local to this session</Pill>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          ["Active rules", Object.values(enabled).filter(Boolean).length],
          ["Runs today", 47],
          ["Failures", 1],
          ["Suppressed", 3],
        ].map(([label, value]) => (
          <div key={label} className="rounded border border-os-line bg-os-panel px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.12em] text-os-muted">{label}</div>
            <div className="mt-1 font-mono text-lg leading-none text-os-text">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Rules" subtitle="Enable or disable to preview the interaction" bodyClassName="p-0">
          <ul className="divide-y divide-os-line">
            {AUTOMATIONS.map((a) => (
              <li key={a.name} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <div className="min-w-[180px] flex-1">
                  <p className="text-[12px] font-medium text-os-text">{a.name}</p>
                  <p className="text-[10.5px] text-os-muted">
                    {a.trigger} · {a.schedule} · last {a.last}
                  </p>
                </div>
                <span className="font-mono text-[10.5px] text-os-muted">{a.runs} runs</span>
                <StatusPill value={a.status} />
                <Switch
                  checked={!!enabled[a.name]}
                  onCheckedChange={(v) => {
                    setEnabled((e) => ({ ...e, [a.name]: v }));
                    demoAction(`${v ? "Enabling" : "Disabling"} “${a.name}”`);
                  }}
                />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Recent executions" subtitle="Synthetic history" bodyClassName="p-0">
          <ul className="divide-y divide-os-line">
            {HISTORY.map((h) => (
              <li key={h.t + h.rule} className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-os-muted">{h.t}</span>
                  <span className="min-w-0 flex-1 truncate text-[11.5px] text-os-text">{h.rule}</span>
                  <StatusPill value={h.result} />
                </div>
                <p className="mt-0.5 text-[10.5px] text-os-muted">
                  {h.target} — {h.detail}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Notification routing" subtitle="Where automated output is delivered" bodyClassName="p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-os-line">
              <TH>Event</TH><TH>Channel</TH><TH>Audience</TH><TH>State</TH>
            </tr>
          </thead>
          <tbody>
            {[
              ["Critical risk escalation", "In-app + email", "Lead investigator", "warning"],
              ["Report awaiting approval", "In-app", "Reviewers", "success"],
              ["Run failure", "In-app + email", "Owner", "success"],
              ["Evidence custody gap", "In-app", "Assigned analyst", "success"],
            ].map(([ev, ch, aud, st]) => (
              <tr key={ev} className="border-b border-os-line/60 last:border-b-0">
                <TD><span className="flex items-center gap-1.5"><Bell className="h-3 w-3 text-os-muted" /> {ev}</span></TD>
                <TD className="text-os-muted">{ch}</TD>
                <TD className="text-os-muted">{aud}</TD>
                <TD><StatusPill value={st} /></TD>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-os-line px-3 py-2">
          <span className="text-[10.5px] text-os-muted">No messages are actually delivered by this prototype.</span>
          <button onClick={() => demoAction("Sending a test notification")} className="flex items-center gap-1 rounded border border-os-line px-2 py-0.5 text-[10.5px] text-os-cyan hover:border-os-cobalt/40">
            <Play className="h-3 w-3" /> Send test
          </button>
        </div>
      </Panel>
    </div>
  );
}