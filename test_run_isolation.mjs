/**
 * Run-isolation regression tests (Phase 3).
 * A user selecting Run 1 must NEVER see Run 2's findings/evidence/report.
 */
import assert from "node:assert/strict";

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log("  PASS  " + n); pass++; }
                        catch (e) { console.log("  FAIL  " + n + "\n        " + e.message); fail++; } };

// Mirror of runScope() in hermesInvestigation.js
const NO_RUN = Symbol("no-run");
const runScope = (caseId, runId) =>
  (runId ? { case_id: caseId, investigation_run_id: runId } : { case_id: caseId, investigation_run_id: NO_RUN });

// Fake entity store: artifacts tagged to their owning run.
const DB = {
  findings: [
    { id: "f1", case_id: "C1", investigation_run_id: "run_1", title: "Run1 finding" },
    { id: "f2", case_id: "C1", investigation_run_id: "run_2", title: "Run2 finding" },
    { id: "f3", case_id: "C2", investigation_run_id: "run_9", title: "Other case" },
    { id: "f4", case_id: "C1", investigation_run_id: null, title: "Legacy case-level" },
  ],
  reports: [
    { id: "r1", case_id: "C1", investigation_run_id: "run_1", title: "Run1 dossier" },
    { id: "r2", case_id: "C1", investigation_run_id: "run_2", title: "Run2 dossier" },
  ],
  evidence: [
    { id: "e1", case_id: "C1", investigation_run_id: "run_1" },
    { id: "e2", case_id: "C1", investigation_run_id: "run_2" },
  ],
};
const filter = (rows, scope) => rows.filter((r) =>
  Object.entries(scope).every(([k, v]) => r[k] === v));

console.log("=== run scoping ===");
t("Run 1 findings exclude Run 2", () => {
  const r = filter(DB.findings, runScope("C1", "run_1"));
  assert.deepEqual(r.map((x) => x.id), ["f1"]);
});
t("Run 2 findings exclude Run 1", () => {
  const r = filter(DB.findings, runScope("C1", "run_2"));
  assert.deepEqual(r.map((x) => x.id), ["f2"]);
});
t("another case is never included", () => {
  const r = filter(DB.findings, runScope("C1", "run_1"));
  assert.ok(!r.some((x) => x.case_id === "C2"));
});
t("legacy case-level rows are NOT shown for a run", () => {
  const r = filter(DB.findings, runScope("C1", "run_1"));
  assert.ok(!r.some((x) => x.id === "f4"));
});

console.log("\n=== no silent fallback (critical) ===");
t("missing run_id yields NO artifacts, never latest-run fallback", () => {
  assert.equal(filter(DB.findings, runScope("C1", null)).length, 0);
});
t("empty run_id is treated as no run", () => {
  assert.equal(filter(DB.findings, runScope("C1", "")).length, 0);
});
t("undefined case_id returns nothing", () => {
  assert.equal(filter(DB.findings, runScope(undefined, "run_1")).length, 0);
});

console.log("\n=== reports / evidence ===");
t("Run 1 report excludes Run 2 report", () =>
  assert.deepEqual(filter(DB.reports, runScope("C1", "run_1")).map((x) => x.id), ["r1"]));
t("Run 2 report excludes Run 1 report", () =>
  assert.deepEqual(filter(DB.reports, runScope("C1", "run_2")).map((x) => x.id), ["r2"]));
t("Run 1 evidence excludes Run 2 evidence", () =>
  assert.deepEqual(filter(DB.evidence, runScope("C1", "run_1")).map((x) => x.id), ["e1"]));

console.log("\n=== historical runs remain accessible ===");
t("Run 1 still readable after Run 2 exists", () =>
  assert.equal(filter(DB.findings, runScope("C1", "run_1")).length, 1));
t("both runs independently addressable", () => {
  assert.equal(filter(DB.findings, runScope("C1", "run_1")).length, 1);
  assert.equal(filter(DB.findings, runScope("C1", "run_2")).length, 1);
});

console.log("\n" + "=".repeat(46));
console.log(`RESULT: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
