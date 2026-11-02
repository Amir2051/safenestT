import React from "react";
import { Loader2, Zap, RotateCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { getProvider } from "@/lib/investigationAI";

/**
 * Confirmation gate for launching the investigation pipeline.
 *
 * The pipeline does not start until the administrator confirms the provider
 * shown here. The whole run — and only that run — uses this provider.
 */
export default function ConfirmProviderLaunchDialog({ open, onOpenChange, provider, resume, busy, onConfirm }) {
  const p = getProvider(provider);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md border-cyan-500/20 bg-[#0a0f1a]">
        <DialogHeader>
          <DialogTitle className="text-white text-base">
            {resume ? "Resume investigation" : "Start investigation pipeline"}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-xs">
            Confirm the provider for this run. The entire pipeline runs on it, and it is not switched to
            another provider if it fails.
          </DialogDescription>
        </DialogHeader>

        {p ? (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.06] p-3">
            <p className="text-[10px] uppercase tracking-wider text-cyan-200/70">Provider</p>
            <p className="text-sm font-semibold text-white mt-0.5">{p.label}</p>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{p.description}</p>
            <p className="text-[10px] font-mono text-cyan-200/60 mt-1.5">{p.model}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-red-500/30 bg-red-500/[0.06] p-3 flex items-center gap-2 text-xs text-red-300">
            <ShieldAlert className="w-4 h-4 shrink-0" /> Select a provider before launching.
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="border-white/15">
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy || !p} className="bg-cyan-600 hover:bg-cyan-700">
            {busy
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : resume ? <RotateCw className="w-3.5 h-3.5 mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
            {resume ? `Confirm & resume on ${p?.label || "provider"}` : `Confirm & start on ${p?.label || "provider"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}