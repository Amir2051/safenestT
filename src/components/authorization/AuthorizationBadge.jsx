import React from "react";
import { BadgeCheck, ShieldX, Clock, ShieldQuestion } from "lucide-react";

const STATUS_STYLES = {
  ACTIVE: { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: BadgeCheck, label: "ACTIVE" },
  PENDING: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: Clock, label: "PENDING" },
  EXPIRED: { color: "text-gray-400", bg: "bg-gray-500/10", border: "border-gray-500/30", icon: ShieldX, label: "EXPIRED" },
  REVOKED: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: ShieldX, label: "REVOKED" },
};

export default function AuthorizationBadge({ authorization, checkResult, compact = false }) {
  // If a check result is provided (from `check` action), show authorized/not.
  if (checkResult) {
    const ok = checkResult.authorized;
    const Icon = ok ? BadgeCheck : ShieldQuestion;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ok ? "text-green-400 bg-green-500/10 border-green-500/30" : "text-gray-400 bg-gray-500/10 border-gray-500/30"}`}>
        <Icon className="w-3 h-3" />
        {ok ? "Authorized to act on behalf of client" : "No active authorization"}
      </span>
    );
  }

  if (!authorization) return null;
  const style = STATUS_STYLES[authorization.status] || STATUS_STYLES.PENDING;
  const Icon = style.icon;
  const expired = authorization.expires_at && new Date(authorization.expires_at).getTime() < Date.now();
  const effectiveStatus = authorization.status === "ACTIVE" && expired ? "EXPIRED" : authorization.status;
  const effectiveStyle = STATUS_STYLES[effectiveStatus] || style;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${effectiveStyle.color} ${effectiveStyle.bg} ${effectiveStyle.border}`}>
        <effectiveStyle.icon className="w-3 h-3" />
        {effectiveStyle.label}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${effectiveStyle.color} ${effectiveStyle.bg} ${effectiveStyle.border}`}>
      <Icon className="w-4 h-4" />
      <span>{effectiveStatus === "ACTIVE" ? "Authorized to act on behalf of client" : `Authorization ${effectiveStyle.label}`}</span>
      {authorization.scopes?.length > 0 && (
        <span className="text-gray-400 font-normal">· {(authorization.scopes || []).join(", ")}</span>
      )}
    </div>
  );
}