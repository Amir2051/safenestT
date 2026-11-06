import React, { useState } from "react";
import { FlaskConical, Info, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function DemoBanner() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex h-[30px] shrink-0 items-center gap-2 border-b border-os-amber/30 bg-os-amber/10 px-3 text-os-amber">
        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]">
          Demo preview — synthetic data — not connected to live services
        </span>
        <button
          onClick={() => setOpen(true)}
          className="ml-auto flex shrink-0 items-center gap-1 rounded border border-os-amber/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider hover:bg-os-amber/15"
        >
          <Info className="h-3 w-3" /> Isolation
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-os-green" /> Prototype isolation
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              SafeNestT OS is rendered as an isolated interface prototype inside this app.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5 py-1 text-[12px] text-os-muted">
            {[
              "Every case, wallet, finding and metric on these screens is invented sample data held in the browser.",
              "No backend function, entity, integration, webhook, authentication setting or secret was created or changed.",
              "The prototype makes no network calls to Hermes or any other investigation provider.",
              "Actions that would normally write data only show a confirmation notice — nothing is stored.",
              "The existing SafeNestT application, including My Cases, is untouched and still reachable outside /os.",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-os-cyan" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-1 w-fit bg-os-cobalt text-white hover:bg-os-cobalt2" onClick={() => setOpen(false)}>
            Understood
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}