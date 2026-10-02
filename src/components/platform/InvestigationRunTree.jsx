/**
 * InvestigationRunTree — renders ONE case as a tree of its investigation runs.
 *
 * Why this exists
 * ---------------
 * A case is the long-lived container; each SENTRA investigation is a RUN. Before the
 * multi-run change, InvestigationCase.workflow.hermes_investigation_id was a scalar,
 * so the UI could only ever show a single "current" investigation and a completed run
 * looked like the end of the case.
 *
 * ID DISCIPLINE (goal 3) — the three identifiers are deliberately never conflated and
 * are always labelled distinctly:
 *     case_id                 the SafeNestT case container
 *     run.id                  the InvestigationRun record for one run
 *     run.hermes_investigation_id  the SENTRA-side investigation
 *
 * Runs are rendered newest-first but flagged so the investigator can see which is
 * current. Nothing here mutates or deletes a run; historical runs stay readable.
 */
import { useMemo } from "react";

const STATUS_TONE = {
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  completed_with_errors: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  running: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  queued: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  pending: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  active: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  failed: "bg-red-500/15 text-red-700 dark:text-red-300",
  cancelled: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
};

const ACTIVE = new Set(["running", "queued", "pending", "active"]);

/** Short, human label for a run's lifecycle state. */
export function runStatus(run) {
  const s = String(run?.status || "").toLowerCase();
  const sync = String(run?.sync_status || "").toLowerCase();
  if (ACTIVE.has(s) || ACTIVE.has(sync)) return sync === "pending" ? "queued" : (s || sync);
  if (s === "completed" || s === "done") {
    return sync === "failed" ? "completed (sync failed)" : "completed";
  }
  return s || sync || "unknown";
}

function Row({ label, value, mono = true }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono break-all" : "break-words"}>{value}</span>
    </div>
  );
}

function TargetsOf({ run }) {
  // target_snapshot is the normalised input set captured when the run started.
  const targets = Array.isArray(run?.target_snapshot) ? run.target_snapshot : [];
  if (!targets.length) {
    return <div className="text-xs text-muted-foreground">No target snapshot recorded</div>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {targets.map((t, i) => (
        <li
          key={`${t?.type}-${t?.value}-${i}`}
          className="rounded border px-1.5 py-0.5 text-[11px] font-mono"
          title={`${t?.type || "target"}: ${t?.value || ""}`}
        >
          <span className="text-muted-foreground">{t?.type || "target"}:</span> {t?.value}
        </li>
      ))}
    </ul>
  );
}

function RunCard({ run, index, isCurrent }) {
  const st = runStatus(run);
  const tone = STATUS_TONE[st] || STATUS_TONE.queued;
  return (
    <li className="rounded-lg border p-3" data-testid="investigation-run" data-run-id={run?.id}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-sm">
          Run {index + 1}
          {isCurrent ? (
            <span className="ml-2 rounded bg-blue-500/15 px-1.5 py-0.5 text-[11px] text-blue-700 dark:text-blue-300">
              current
            </span>
          ) : null}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[11px] ${tone}`}>{st}</span>
        {run?.started_at ? (
          <span className="text-[11px] text-muted-foreground">
            {String(run.started_at).slice(0, 19).replace("T", " ")}
          </span>
        ) : null}
      </div>

      {/* Identifier discipline: case / run / SENTRA are distinct and separately labelled. */}
      <div className="mb-2 space-y-0.5 rounded bg-muted/40 p-2">
        <Row label="Case ID" value={run?.case_id} />
        <Row label="Run ID (SafeNestT)" value={run?.id} />
        <Row label="SENTRA investigation" value={run?.hermes_investigation_id} />
        <Row label="Input fingerprint" value={run?.target_fingerprint} />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Targets at start</div>
        <TargetsOf run={run} />
      </div>
    </li>
  );
}

/**
 * @param runs   InvestigationRun[] (any order)
 * @param caseId the SafeNestT case id, shown once at the root for orientation
 */
export default function InvestigationRunTree({ runs = [], caseId }) {
  const ordered = useMemo(
    () => [...runs].sort((a, b) =>
      String(b.created_date || "").localeCompare(String(a.created_date || ""))),
    [runs],
  );
  const currentId = useMemo(() => {
    const active = ordered.find((r) =>
      ACTIVE.has(String(r?.status || "").toLowerCase()) ||
      ACTIVE.has(String(r?.sync_status || "").toLowerCase()));
    return (active || ordered[0])?.id || null;
  }, [ordered]);

  if (!ordered.length) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No investigation runs yet for case <span className="font-mono">{caseId || "—"}</span>.
        <div className="mt-1 text-xs">Launching an investigation creates Run 1.</div>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="investigation-run-tree">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span>Investigation runs</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
          case {caseId || "—"}
        </span>
        <span className="text-xs text-muted-foreground">{ordered.length} total</span>
      </div>
      <ul className="space-y-2">
        {/* newest first, so the newest is "Run N" */}
        {ordered.map((r, i) => (
          <RunCard key={r?.id || i} run={r} index={ordered.length - 1 - i} isCurrent={r?.id === currentId} />
        ))}
      </ul>
    </div>
  );
}