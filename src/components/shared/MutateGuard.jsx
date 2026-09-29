import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { canMutate as canMutateFn, getEffectiveRole } from "@/lib/organizationRoles";

/**
 * UI-only role guard utilities. NOT a security boundary — the backend / Hermes
 * enforces actual permissions. These helpers only hide mutation affordances from
 * read-only roles (VIEWER, AUDITOR) and regular users so the interface
 * communicates read-only intent.
 */

export function useCanMutate() {
  const { user } = useAuth();
  return canMutateFn(user);
}

export function useIsReadOnly() {
  const { user } = useAuth();
  const r = getEffectiveRole(user);
  return r === "VIEWER" || r === "AUDITOR";
}

export function useEffectiveRole() {
  const { user } = useAuth();
  return getEffectiveRole(user);
}

/**
 * Render children only when the current user can mutate. Otherwise render the
 * fallback (or a default read-only notice when `notice` is true).
 */
export function MutateGuard({ children, fallback = null, notice = false }) {
  const allowed = useCanMutate();
  if (allowed) return <>{children}</>;
  if (notice) {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-[12px] text-amber-200 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Read-only access — this action is not available for your role.
      </div>
    );
  }
  return <>{fallback}</>;
}