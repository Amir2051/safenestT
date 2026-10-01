// targetFingerprint — deterministic fingerprint of a case's investigative INPUTS.
//
// Why this exists
// ---------------
// InvestigationCase.workflow.hermes_investigation_id is a SCALAR: one case could only
// hold one SENTRA investigation. syncCaseToHermes reused that id unconditionally and
// returned action:"existing" for any terminal run, so adding a genuinely new target to
// a completed case could never start a new run.
//
// The fix separates two things that were conflated:
//   - a COMPLETED RUN is immutable  (do not re-run it)
//   - a CASE is rerunnable          (new inputs => new run)
// The discriminator is the set of investigative INPUTS, not the results. The SENTRA
// investigation id is an OUTPUT and is deliberately not part of the fingerprint.
import { createHash } from "node:crypto";

/** Normalise one target value for its declared type. */
export function normalizeTarget(type, value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  switch (String(type || "").toLowerCase()) {
    case "email":
      return v.toLowerCase();
    case "domain":
      return v.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
    case "url": {
      try {
        const u = new URL(v.includes("://") ? v : `https://${v}`);
        return `${u.protocol}//${u.host}${u.pathname}`.replace(/\/$/, "").toLowerCase();
      } catch {
        return v.toLowerCase();
      }
    }
    case "phone":
      return v.replace(/[^\d+]/g, "");
    case "ip_address":
      return v.trim();
    case "wallet_address":
    case "transaction_hash":
    case "token_contract":
      return v.toLowerCase();
    case "username":
    case "social_identifier":
      return v.toLowerCase().replace(/^@/, "");
    default:
      return v.toLowerCase();
  }
}

/** Canonical, order-independent, duplicate-tolerant form of a target set. */
export function canonicalTargetSet(targets) {
  const rows = new Set();
  for (const t of targets || []) {
    const type = String(t?.type || "other").toLowerCase();
    const norm = normalizeTarget(type, t?.value || "");
    if (!norm) continue;
    rows.add(`${type}|${norm}|${String(t?.network || "").toLowerCase()}`);
  }
  return [...rows].sort().join("\n");
}

/** Deterministic fingerprint of the target set. Never derived from a run/result id. */
export function targetFingerprint(targets) {
  return createHash("sha256").update(canonicalTargetSet(targets), "utf8").digest("hex").slice(0, 32);
}

/** True when two target sets are equivalent after normalisation. */
export function sameInputSet(a, b) {
  return canonicalTargetSet(a) === canonicalTargetSet(b);
}

/**
 * decideRun -> "create_new_run" | "reuse_active" | "reuse_completed" | "allow_after_failure"
 * Pure, so it is testable without Base44.
 */
export function decideRun(input) {
  const latest = input.latest;
  if (!latest || !latest.hermes_investigation_id) return "create_new_run";

  const status = String(latest.status || "").toLowerCase();
  const sync = String(latest.sync_status || "").toLowerCase();
  const active = status === "queued" || status === "running"
    || sync === "pending" || sync === "active";
  if (active) return "reuse_active";                        // C: never double-start

  const failed = status === "failed" || sync === "failed";
  if (failed) return "allow_after_failure";                 // D: preserve, allow retry

  // terminal and not failed: reuse only if the inputs are unchanged
  if (latest.fingerprint && latest.fingerprint === input.fingerprint) {
    return "reuse_completed";                               // A: idempotent
  }
  return "create_new_run";                                   // E: completed + new inputs
}