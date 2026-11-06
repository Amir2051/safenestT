import React from "react";
import { UserPlus, Mail, ShieldCheck } from "lucide-react";
import { Panel, Pill, Bar, KV, TD, TH, StatusPill } from "@/os/ui/kit";
import { TEAM, INVESTIGATIONS } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const ROLE_TONE = {
  "Lead investigator": "cyan",
  "Financial crime analyst": "info",
  "Blockchain analyst": "violet",
  "Case manager": "info",
  "Forensics engineer": "neutral",
  "Read-only reviewer": "neutral",
};

export default function Team() {
  const demoAction = useDemoToast();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-semibold tracking-tight text-os-text">Team</h1>
          <p className="text-[11.5px] text-os-muted">Roster, workload and case assignment across the workspace</p>
        </div>
        <button
          onClick={() => demoAction("Inviting a team member")}
          className="flex items-center gap-1.5 rounded bg-os-cobalt px-2.5 py-1.5 text-[11.5px] font-medium text-white hover:bg-os-cobalt2"
        >
          <UserPlus className="h-3.5 w-3.5" /> Invite member
        </button>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Roster" subtitle={`${TEAM.length} members · 4 roles`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b border-os-line">
                  <TH>Member</TH><TH>Role</TH><TH>Active</TH><TH>Reviews</TH><TH>Capacity</TH><TH>Access</TH>
                </tr>
              </thead>
              <tbody>
                {TEAM.map((m) => (
                  <tr key={m.name} className="border-b border-os-line/60 last:border-b-0 hover:bg-os-raised">
                    <TD>
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-os-raised font-mono text-[9.5px] font-bold text-os-cyan">
                          {m.initials}
                        </span>
                        <span className="text-[12px] text-os-text">{m.name}</span>
                      </span>
                    </TD>
                    <TD><Pill tone={ROLE_TONE[m.role] || "neutral"}>{m.role}</Pill></TD>
                    <TD className="font-mono tabular-nums">{m.active}</TD>
                    <TD className="font-mono tabular-nums">{m.reviews}</TD>
                    <TD className="w-[130px]">
                      <div className="flex items-center gap-2">
                        <Bar
                          value={m.capacity}
                          tone={m.capacity >= 85 ? "bg-os-red" : m.capacity >= 65 ? "bg-os-amber" : "bg-os-cobalt"}
                          className="h-1"
                        />
                        <span className="w-7 font-mono text-[10px] tabular-nums text-os-muted">{m.capacity}%</span>
                      </div>
                    </TD>
                    <TD><StatusPill value={m.role === "Read-only reviewer" ? "neutral" : "operational"} label={m.role === "Read-only reviewer" ? "read only" : "standard"} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-2.5">
          <Panel title="Capacity alerts">
            <ul className="space-y-1.5">
              <li className="rounded border border-os-red/30 bg-os-red/10 px-2 py-1.5 text-[11px] text-os-text">
                <span className="font-medium">Priya Raman</span> is at 91% capacity with 3 reviews queued.
              </li>
              <li className="rounded border border-os-amber/30 bg-os-amber/10 px-2 py-1.5 text-[11px] text-os-text">
                <span className="font-medium">Dana Whitfield</span> carries both critical matters.
              </li>
              <li className="rounded border border-os-line bg-os-surface px-2 py-1.5 text-[11px] text-os-text">
                <span className="font-medium">Sara Kim</span> has spare capacity for intake work.
              </li>
            </ul>
          </Panel>

          <Panel title="Coverage">
            <div className="grid grid-cols-2 gap-3">
              <KV label="Investigators" value={<span className="font-mono">3</span>} />
              <KV label="Analysts" value={<span className="font-mono">2</span>} />
              <KV label="Unassigned cases" value={<span className="font-mono">1</span>} />
              <KV label="Avg. capacity" value={<span className="font-mono">{Math.round(TEAM.reduce((a, m) => a + m.capacity, 0) / TEAM.length)}%</span>} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Assignment board" subtitle="Unassigned and reassignment candidates" bodyClassName="p-0">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-b border-os-line">
              <TH>Case</TH><TH>Priority</TH><TH>Current owner</TH><TH>Suggested</TH><TH>Action</TH>
            </tr>
          </thead>
          <tbody>
            {INVESTIGATIONS.filter((i) => i.assignee === "Unassigned" || i.priority === "critical").map((i) => (
              <tr key={i.code} className="border-b border-os-line/60 last:border-b-0">
                <TD>
                  <span className="block max-w-[320px] truncate text-[12px] text-os-text">{i.title}</span>
                  <span className="font-mono text-[10px] text-os-muted">{i.code}</span>
                </TD>
                <TD><StatusPill value={i.priority} /></TD>
                <TD className="text-os-muted">{i.assignee}</TD>
                <TD className="text-os-muted">{i.priority === "critical" ? "Sara Kim" : "Eli Cortez"}</TD>
                <TD>
                  <button
                    onClick={() => demoAction("Assigning the case")}
                    className="flex items-center gap-1 rounded border border-os-line px-2 py-0.5 text-[10.5px] text-os-cyan hover:border-os-cobalt/40"
                  >
                    <ShieldCheck className="h-3 w-3" /> Assign
                  </button>
                </TD>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-1.5 border-t border-os-line px-3 py-2 text-[10.5px] text-os-muted">
          <Mail className="h-3 w-3" /> Invitations and assignments are demonstrations only — no email is sent.
        </div>
      </Panel>
    </div>
  );
}