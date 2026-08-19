import React from "react";
import { Loader2, Inbox, AlertCircle, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Honest empty / loading / error / not-connected states.
 * Never used to fake data — only to represent real absence.
 */
export default function EmptyState({
  icon: Icon = Inbox,
  title = "No data available",
  description = "",
  variant = "empty", // 'empty' | 'loading' | 'error' | 'not_connected'
  action,
  className,
}) {
  const config = {
    empty: {
      Icon: Icon === Inbox ? Inbox : Icon,
      tone: "text-gray-500",
      ring: "border-white/10 bg-white/[0.02]",
      spinner: false,
      fallbackTitle: "No data available yet",
    },
    loading: {
      Icon: Loader2,
      tone: "text-cyan-400",
      ring: "border-cyan-500/20 bg-cyan-500/[0.03]",
      spinner: true,
      fallbackTitle: "Loading…",
    },
    error: {
      Icon: AlertCircle,
      tone: "text-red-400",
      ring: "border-red-500/20 bg-red-500/[0.03]",
      spinner: false,
      fallbackTitle: "Failed to load",
    },
    not_connected: {
      Icon: PlugZap,
      tone: "text-amber-400",
      ring: "border-amber-500/20 bg-amber-500/[0.03]",
      spinner: false,
      fallbackTitle: "Hermes not connected",
    },
  }[variant];

  const FinalIcon = config.Icon;
  const finalTitle = title || config.fallbackTitle;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border p-8 min-h-[180px]",
        config.ring,
        className
      )}
    >
      <FinalIcon className={cn("w-8 h-8 mb-3", config.tone, config.spinner && "animate-spin")} />
      <p className="text-sm font-medium text-gray-200">{finalTitle}</p>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}