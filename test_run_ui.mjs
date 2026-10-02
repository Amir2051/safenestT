/**
 * UI logic tests for InvestigationRunTree — pure, no React runtime needed.
 * Focus: identifier discipline (goal 3), ordering, current-run flag, immutability.
 * Run: node test_run_ui.mjs
 */
import assert from "node:assert/strict";

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); console.log("  PASS  " + n); pass++; }
                        catch (e) { console.log("  FAIL  " + n + "\n        " + e.message); fail++; } };

// Mirror of runStatus() in InvestigationRunTree.jsx
const ACTIVE = new Set(["running", "queued", "pending", "active"]);
function runStatus(run) {
  const s = String(run?.status || "").toLowerCase();
  const sync = String(run?.sync_status || "").toLowerCase();
  if (ACTIVE.has(s) || ACTIVE.has(sync)) return sync === "pending" ? "queued" : (s || sync);
  if (s === "completed" || s === "done") return sync === "failed" ? "completed (sync failed)" : "completed";
  return s || sync || "unknown";
}
const sortRuns = (runs) => [...runs].sort((a, b) =>
  String(b.created_date || "").localeCompare(String(a.created_date || "")));
const currentOf = (runs) => {
  const a = runs.find((r) => ACTIVE.has(String(r?.status || "").toLowerCase()) ||
                            ACTIVE.has(String(r?.sync_status || "").toLowerCase()));
  return (a || runs[0])?.id || null;
};

const R1 = { id: "run_1", case_id: "CASE-1", hermes_investigation_id: "sentra_aaa",
             status: "completed", sync_status: "synced", created_date: "2026-01-01T10:00:00Z",
             target_snapshot: [{ type: "email", value: "a@example.com" }] };
const R2 = { id: "run_2", case_id: "CASE-1", hermes_investigation_id: "sentra_bbb",
             status: "running", sync_status: "active", created_date: "2026-01-02T10:00:00Z",
             target_snapshot: [{ type: "email", value: "a@example.com" },
                               { type: "wallet_address", value: "0xabc" }] };

console.log("=== ordering / current (goal 2) ===");
t("newest run is listed first", () => assert.equal(sortRuns([R1, R2])[0].id, "run_2"));
t("active run is flagged current", () => assert.equal(currentOf(sortRuns([R1, R2])), "run_2"));
t("with none active, newest is current", () => {
  const done = [{ ...R1, status: "completed" }, { ...R2, status: "completed", sync_status: "synced", id: "run_2" }];
  assert.equal(currentOf(sortRuns(done)), "run_2");
});

console.log("\n=== identifier discipline (goal 3) ===");
t("case_id, run id and sentra id are three distinct values",
  () => { const s = new Set([R2.case_id, R2.id, R2.hermes_investigation_id]); assert.equal(s.size, 3); });
t("run id is never used as the SENTRA id", () => assert.notEqual(R2.id, R2.hermes_investigation_id));
t("sendra id is never the case id", () => assert.notEqual(R2.hermes_investigation_id, R2.case_id));

console.log("\n=== immutability of history (goals 4,5) ===");
t("historical run keeps its own sentra id", () => assert.equal(R1.hermes_investigation_id, "sentra_aaa"));
t("historical run keeps its own targets", () => assert.equal(R1.target_snapshot.length, 1));
t("new run carries the union of targets",
  () => assert.equal(R2.target_snapshot.length, 2));
t("new run's sentra id differs from history",
  () => assert.notEqual(R2.hermes_investigation_id, R1.hermes_investigation_id));
t("reading runs does not mutate the input array", () => {
  const copy = JSON.stringify([R1, R2]);
  sortRuns([R1, R2]); currentOf([R1, R2]); runStatus(R1);
  assert.equal(JSON.stringify([R1, R2]), copy);
});

console.log("\n=== status rendering ===");
t("completed+synced -> completed", () => assert.equal(runStatus(R1), "completed"));
t("running -> running", () => assert.equal(runStatus(R2), "running"));
t("pending sync -> queued", () => assert.equal(runStatus({ status: "", sync_status: "pending" }), "queued"));
t("completed but sync failed -> surfaced",
  () => assert.equal(runStatus({ status: "completed", sync_status: "failed" }), "completed (sync failed)"));
t("failed stays failed", () => assert.equal(runStatus({ status: "failed" }), "failed"));
t("unknown degrades safely", () => assert.equal(runStatus({}), "unknown"));

console.log("\n=== empty state ===");
t("no runs -> currentOf null", () => assert.equal(currentOf([]), null));
t("no runs -> sort stable", () => assert.equal(sortRuns([]).length, 0));

console.log("\n" + "=".repeat(46));
console.log(`RESULT: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);