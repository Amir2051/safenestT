import React from "react";
import { Lock } from "lucide-react";
import { useIsReadOnly } from "@/components/shared/MutateGuard";

/**
 * Shell-level banner that clearly communicates read-only status for VIEWER and
 * AUDITOR roles (spec §10 / §11). Hidden for all other roles.
 */
export default function ReadOnlyBanner() {
  const readOnly = useIsReadOnly();
  if (!readOnly) return null;
  return (
    <div className="relative z-10 flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-amber-500/[0.08] border-b border-amber-500/30 text-[11px] text-amber-200 font-mono tracking-wider">
      <Lock className="w-3.5 h-3.5 shrink-0" />
      <span className="uppercase">Read-Only Mode — you can view cases, evidence, findings, and reports. Create, edit, delete, and run actions are disabled for your role.</span>
    </div>
  );
}