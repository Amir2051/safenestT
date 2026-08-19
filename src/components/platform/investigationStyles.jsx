import { Badge } from "@/components/ui/badge";

/**
 * Shared UI constants for severity, confidence, status badges.
 * All class names are literal strings so Tailwind's JIT keeps them.
 */

export const SEVERITY_STYLES = {
  critical: "border-red-500/30 text-red-400 bg-red-500/10",
  high: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  medium: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
  low: "border-white/15 text-gray-400 bg-white/5",
};

export const CONFIDENCE_STYLES = {
  high: "border-green-500/30 text-green-400 bg-green-500/10",
  medium: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
  low: "border-white/15 text-gray-400 bg-white/5",
};

export const PROCESSING_STATUS_STYLES = {
  uploaded: "border-white/15 text-gray-400 bg-white/5",
  queued: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
  processing: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  processed: "border-green-500/30 text-green-400 bg-green-500/10",
  failed: "border-red-500/30 text-red-400 bg-red-500/10",
  review_required: "border-purple-500/30 text-purple-400 bg-purple-500/10",
};

export const TARGET_STATUS_STYLES = {
  pending: "border-white/15 text-gray-400 bg-white/5",
  queued: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
  processing: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  analyzed: "border-green-500/30 text-green-400 bg-green-500/10",
  failed: "border-red-500/30 text-red-400 bg-red-500/10",
};

export const FINDING_STATUS_STYLES = {
  proposed: "border-white/15 text-gray-400 bg-white/5",
  under_review: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  verified: "border-green-500/30 text-green-400 bg-green-500/10",
  rejected: "border-red-500/30 text-red-400 bg-red-500/10",
  superseded: "border-purple-500/30 text-purple-400 bg-purple-500/10",
};

export const RISK_LEVEL_STYLES = {
  critical: "border-red-500/30 text-red-400 bg-red-500/10",
  high: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  medium: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10",
  low: "border-green-500/30 text-green-400 bg-green-500/10",
};

export function SeverityBadge({ severity }) {
  const cls = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;
  return <Badge variant="outline" className={`capitalize ${cls}`}>{severity}</Badge>;
}

export function ConfidenceBadge({ confidence }) {
  const cls = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.medium;
  return <Badge variant="outline" className={`capitalize ${cls}`}>{confidence}</Badge>;
}

export function StatusBadge({ status, stylesMap }) {
  const cls = stylesMap[status] || "border-white/15 text-gray-400 bg-white/5";
  return <Badge variant="outline" className={`capitalize ${cls}`}>{(status || "").replace(/_/g, " ")}</Badge>;
}

export function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let val = bytes, i = 0;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}