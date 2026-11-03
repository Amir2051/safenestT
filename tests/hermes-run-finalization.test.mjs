// Regression test: Hermes polling loops must finalize the InvestigationRun on
// EVERY exit path (success, timeout, cancel, sync failure) — not only on a
// successful terminal break. Previously the finalization sat after the loop
// and was skipped when the loop threw, leaving a perpetual "running" run that
// made the AI Run History spinner spin forever.
//
// Run: node --test tests/hermes-run-finalization.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../src/lib/hermesInvestigation.js", import.meta.url),
  "utf8",
);

// ── 1. Structural: both polling loops are wrapped in try/catch with a
//    pollingError variable, and the run finalization is reachable on all
//    paths (not only inside the success branch). ──────────────────────────

test("runHermesInvestigation wraps its polling loop in try/catch and finalizes on all paths", () => {
  // The function starts at "export async function runHermesInvestigation"
  const fnStart = source.indexOf("export async function runHermesInvestigation(");
  assert.notEqual(fnStart, -1, "runHermesInvestigation must exist");
  // Extract through the end of the function (next export or end of file).
  const afterFn = source.indexOf("\nexport ", fnStart + 1);
  const fnBody = source.slice(fnStart, afterFn === -1 ? undefined : afterFn);

  // The try/catch must wrap the while loop.
  assert.ok(fnBody.includes("let pollingError = null;"),
    "pollingError flag must be declared before the loop");
  assert.ok(/try\s*\{[\s\S]*while\s*\(true\)/.test(fnBody),
    "the while loop must be inside a try block");
  assert.ok(/}\s*catch\s*\(e\)\s*\{[\s\S]*pollingError\s*=\s*e/.test(fnBody),
    "a catch block must capture the error into pollingError");

  // Finalization must happen AFTER the catch (reachable on all paths), and
  // must use the pollingError to decide status — not be gated on a successful
  // break.
  const catchEnd = fnBody.indexOf("pollingError = e;");
  const afterCatch = fnBody.slice(catchEnd);
  assert.ok(afterCatch.includes("if (run)"),
    "run finalization must appear after the catch block");
  assert.ok(afterCatch.includes("pollingError ?"),
    "finalization must branch on pollingError (timeout/cancel → failed/cancelled)");
  assert.ok(afterCatch.includes("if (pollingError) throw pollingError;"),
    "the error must be re-thrown AFTER finalization so the caller sees it");
  // The run update must set a terminal status (completed/failed/cancelled),
  // never leave it implicit.
  assert.ok(afterCatch.includes('status: finalStatus'),
    "run update must set an explicit terminal status");
});

test("resumeHermesInvestigation wraps its polling loop in try/catch and finalizes the active run", () => {
  const fnStart = source.indexOf("export async function resumeHermesInvestigation(");
  assert.notEqual(fnStart, -1, "resumeHermesInvestigation must exist");
  const afterFn = source.indexOf("\nexport ", fnStart + 1);
  const fnBody = source.slice(fnStart, afterFn === -1 ? undefined : afterFn);

  assert.ok(fnBody.includes("let pollingError = null;"),
    "pollingError flag must be declared before the loop");
  assert.ok(/try\s*\{[\s\S]*while\s*\(true\)/.test(fnBody),
    "the while loop must be inside a try block");
  assert.ok(/}\s*catch\s*\(e\)\s*\{[\s\S]*pollingError\s*=\s*e/.test(fnBody),
    "a catch block must capture the error into pollingError");
  // resume does not create its own run, so it must call finalizeActiveRun.
  assert.ok(fnBody.includes("await finalizeActiveRun(caseId,"),
    "resume must call finalizeActiveRun to clean up any orphaned running run");
  assert.ok(fnBody.includes("if (pollingError) throw pollingError;"),
    "the error must be re-thrown AFTER finalization");
});

// ── 2. Executed: finalizeActiveRun correctly updates a "running" run to the
//    given terminal status, and is a no-op when no running run exists. ─────

function extractHelper(src) {
  const start = src.indexOf("async function finalizeActiveRun(");
  assert.notEqual(start, -1, "finalizeActiveRun helper must exist");
  // The helper ends at the next top-level function or export.
  const end = src.indexOf("\nasync function ", start + 1);
  const end2 = src.indexOf("\nexport ", start + 1);
  const ends = [end, end2].filter((i) => i !== -1);
  const realEnd = ends.length ? Math.min(...ends) : src.length;
  return src.slice(start, realEnd);
}

function makeMockBase44(runs) {
  const updates = [];
  const base44 = {
    entities: {
      InvestigationRun: {
        filter: async () => runs.slice(),
        update: async (id, patch) => {
          updates.push({ id, patch });
          const r = runs.find((x) => x.id === id);
          if (r) Object.assign(r, patch);
          return { id, ...patch };
        },
      },
    },
  };
  return { base44, updates };
}

test("finalizeActiveRun marks a running run as failed on timeout", async () => {
  const helperSrc = extractHelper(source);
  const runs = [{ id: "run-1", status: "running", case_id: "c1" }];
  const { base44, updates } = makeMockBase44(runs);
  const finalizeActiveRun = vm.runInNewContext(
    `(() => { ${helperSrc}; return finalizeActiveRun; })()`,
    { base44, console, Date },
  );
  await finalizeActiveRun("c1", {
    status: "failed",
    error: "Hermes resume polling timed out after 1800s",
    output: { error: "timeout", last_status: "running" },
    startedAt: Date.now() - 1800000,
    persisted: {},
  });
  assert.equal(updates.length, 1, "exactly one update must be issued");
  assert.equal(updates[0].patch.status, "failed");
  assert.ok(updates[0].patch.error.includes("timed out"),
    "the timeout error message must be persisted on the run");
  assert.ok(updates[0].patch.completed_at, "completed_at must be set");
  assert.equal(runs[0].status, "failed", "the in-memory run must now be terminal");
});

test("finalizeActiveRun marks a running run as cancelled on shouldStop", async () => {
  const helperSrc = extractHelper(source);
  const runs = [{ id: "run-2", status: "running", case_id: "c2" }];
  const { base44, updates } = makeMockBase44(runs);
  const finalizeActiveRun = vm.runInNewContext(
    `(() => { ${helperSrc}; return finalizeActiveRun; })()`,
    { base44, console, Date },
  );
  await finalizeActiveRun("c2", {
    status: "cancelled",
    error: "Hermes polling was stopped before the investigation reached a terminal state.",
    startedAt: Date.now() - 5000,
    persisted: {},
  });
  assert.equal(updates.length, 1);
  assert.equal(updates[0].patch.status, "cancelled");
  assert.equal(runs[0].status, "cancelled");
});

test("finalizeActiveRun is a no-op when no running run exists", async () => {
  const helperSrc = extractHelper(source);
  const runs = [{ id: "run-3", status: "completed", case_id: "c3" }];
  const { base44, updates } = makeMockBase44(runs);
  const finalizeActiveRun = vm.runInNewContext(
    `(() => { ${helperSrc}; return finalizeActiveRun; })()`,
    { base44, console, Date },
  );
  await finalizeActiveRun("c3", { status: "failed", error: "timeout", startedAt: Date.now() });
  assert.equal(updates.length, 0, "no update must be issued for a non-running run");
});

test("finalizeActiveRun never throws even if the filter call fails", async () => {
  const helperSrc = extractHelper(source);
  const base44 = {
    entities: {
      InvestigationRun: {
        filter: async () => { throw new Error("network down"); },
        update: async () => { throw new Error("should not reach"); },
      },
    },
  };
  const finalizeActiveRun = vm.runInNewContext(
    `(() => { ${helperSrc}; return finalizeActiveRun; })()`,
    { base44, console, Date },
  );
  // Must not throw — cleanup is best-effort.
  await assert.doesNotReject(() => finalizeActiveRun("c4", { status: "failed", error: "x" }));
});