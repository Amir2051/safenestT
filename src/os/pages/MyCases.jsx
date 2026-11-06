import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MessageSquare, FileUp, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { Panel, Pill, StatusPill, Bar, KV } from "@/os/ui/kit";
import { INVESTIGATIONS } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

const CLIENT_STEPS = {
  intake: ["We have received your report", "An investigator will be assigned", "Evidence collection begins"],
  active: ["Evidence collection", "Analysis and tracing", "Case dossier preparation", "Submission to authorities"],
  review: ["Quality review", "Your approval of the summary", "Final documentation"],
  completed: ["Case closed", "Final report delivered"],
};

export default function MyCases() {
  const demoAction = useDemoToast();
  const [open, setOpen] = useState(INVESTIGATIONS[0].code);
  const matters = INVESTIGATIONS.slice(0, 5);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-[17px] font-semibold tracking-tight text-os-text">My Cases</h1>
        <p className="max-w-2xl text-[11.5px] leading-relaxed text-os-muted">
          The client-facing view of a matter. This experience is preserved from the existing SafeNestT application — plain language,
          clear next steps, and no internal jargon. Staff still reach the full operational workspace from Investigations.
        </p>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <div className="space-y-2.5 lg:col-span-2">
          {matters.map((m) => {
            const isOpen = open === m.code;
            const steps = CLIENT_STEPS[m.status] || CLIENT_STEPS.active;
            return (
              <div key={m.code} className="rounded-md border border-os-line bg-os-panel">
                <button
                  onClick={() => setOpen(isOpen ? null : m.code)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-os-cyan">{m.code}</span>
                      <StatusPill value={m.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] font-medium text-os-text">{m.title}</p>
                    <p className="text-[11px] text-os-muted">
                      Reported {m.createdAt} · updated {m.lastActivity}
                    </p>
                  </div>
                  <div className="hidden w-28 shrink-0 sm:block">
                    <div className="text-right text-[10px] uppercase tracking-wider text-os-muted">Progress</div>
                    <div className="mt-1"><Bar value={m.progress} tone={m.progress >= 100 ? "bg-os-green" : "bg-os-cyan"} /></div>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 text-os-muted transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>

                {isOpen && (
                  <div className="grid gap-3 border-t border-os-line px-3 py-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-os-muted">What happens next</p>
                      <ol className="mt-1.5 space-y-1.5">
                        {steps.map((s, i) => {
                          const done = (i / steps.length) * 100 < m.progress;
                          return (
                            <li key={s} className="flex items-center gap-2 text-[11.5px]">
                              {done ? (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-os-green" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 shrink-0 text-os-muted" />
                              )}
                              <span className={done ? "text-os-text" : "text-os-muted"}>{s}</span>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <KV label="Your investigator" value={m.assignee === "Unassigned" ? "Being assigned" : m.assignee} />
                        <KV label="Reported loss" value={`$${m.lossUsd.toLocaleString()}`} />
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          onClick={() => demoAction("Sending a message to your investigator")}
                          className="flex items-center gap-1 rounded border border-os-line bg-os-surface px-2 py-1 text-[11px] text-os-text hover:border-os-line2"
                        >
                          <MessageSquare className="h-3 w-3" /> Message investigator
                        </button>
                        <button
                          onClick={() => demoAction("Uploading additional documents")}
                          className="flex items-center gap-1 rounded border border-os-line bg-os-surface px-2 py-1 text-[11px] text-os-text hover:border-os-line2"
                        >
                          <FileUp className="h-3 w-3" /> Add documents
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2.5">
          <Panel title="Your status at a glance">
            <div className="grid grid-cols-2 gap-3">
              <KV label="Open matters" value={<span className="font-mono">{matters.filter((m) => m.status !== "completed").length}</span>} />
              <KV label="Closed" value={<span className="font-mono">{matters.filter((m) => m.status === "completed").length}</span>} />
              <KV label="Documents requested" value={<span className="font-mono">2</span>} />
              <KV label="Unread updates" value={<span className="font-mono">4</span>} />
            </div>
          </Panel>
          <Panel title="Need to speak to someone?">
            <p className="text-[11.5px] leading-relaxed text-os-muted">
              Your investigator responds within one business day. In this prototype, messages are not delivered anywhere.
            </p>
            <button
              onClick={() => demoAction("Opening the support thread")}
              className="mt-2 w-full rounded border border-os-line bg-os-surface py-1.5 text-[11.5px] text-os-cyan hover:border-os-line2"
            >
              Open message thread (demo)
            </button>
          </Panel>
          <Panel title="Looking for the staff workspace?">
            <p className="text-[11.5px] leading-relaxed text-os-muted">
              Investigators work inside the operational shell — evidence, findings, Hermes runs and reports.
            </p>
            <Link to="/os/investigations" className="mt-2 flex items-center justify-between rounded border border-os-line bg-os-surface px-2 py-1.5 text-[11.5px] text-os-text hover:border-os-line2">
              Open Investigations <ChevronRight className="h-3.5 w-3.5 text-os-muted" />
            </Link>
          </Panel>
          <Pill tone="warn">synthetic client matters</Pill>
        </div>
      </div>
    </div>
  );
}