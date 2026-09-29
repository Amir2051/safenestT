import React from "react";
import { Clock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

/**
 * Shell-level banner shown to users whose organization membership is still
 * pending platform-admin / org-admin verification. Read-only access applies
 * (effective role is VIEWER while pending). Hidden for platform admins and
 * fully-verified members.
 */
export default function PendingVerificationBanner() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin" || user.is_admin) return null;
  if (user.account_status !== "pending" && user.membership_status !== "pending_verification" && user.membership_status !== "pending_role_assignment" && user.membership_status !== "invited") return null;

  const stage =
    user.membership_status === "pending_role_assignment"
      ? "Your organization was verified. An administrator is assigning your role — you have read-only access until then."
      : user.membership_status === "pending_verification"
        ? "Your request is awaiting company verification by a SafeNestT administrator. You have read-only access until approved."
        : "Your access is pending verification. You have read-only access until an administrator approves your organization.";

  return (
    <div className="relative z-10 flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-cyan-500/[0.06] border-b border-cyan-500/30 text-[11px] text-cyan-200 font-mono tracking-wider">
      <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse" />
      <span className="uppercase">Pending Verification — {stage}</span>
    </div>
  );
}