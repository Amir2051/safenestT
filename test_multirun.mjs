/**
 * Multi-run lifecycle tests (A-J) — pure logic, no Base44 runtime required.
 * Run:  node --experimental-strip-types test_multirun.mjs
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const M = await import("./base44/shared/targetFingerprint.js");
const { normalizeTarget, canonicalTargetSet, targetFingerprint, decideRun } = M;

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { fn(); console.log("  PASS  " + name); pass++; }
  catch (e) { console.log("  FAIL  " + name + "\n        " + e.message); fail++; }
};

const T = (o) => o;

console.log("=== normalization (req 4) ===");
t("email lowercased", () => assert.equal(normalizeTarget("email", " Victim@Example.COM "), "victim@example.com"));
t("domain strips scheme/trailing dot", () => assert.equal(normalizeTarget("domain", "https://Example.com./path"), "example.com"));
t("url normalized", () => assert.equal(normalizeTarget("url", "HTTPS://Ex.com/a/"), "https://ex.com/a"));
t("phone strips punctuation", () => assert.equal(normalizeTarget("phone", "+1 (555) 010-9999"), "+15550109999"));
t("wallet lowercased", () => assert.equal(normalizeTarget("wallet_address", "0xAbC"), "0xabc"));
t("txhash lowercased", () => assert.equal(normalizeTarget("transaction_hash", "0xDEF"), "0xdef"));
t("username strips @", () => assert.equal(normalizeTarget("username", "@Alice"), "alice"));
t("ip trimmed", () => assert.equal(normalizeTarget("ip_address", " 1.2.3.4 "), "1.2.3.4"));

console.log("\n=== fingerprint determinism (E) ===");
const setA = T([{ type: "email", value: "a@x.com" }, { type: "domain", value: "x.com" }]);
const setA2 = T([{ type: "domain", value: "X.COM" }, { type: "email", value: "A@x.com" }]);
t("E: order-independent", () => assert.equal(targetFingerprint(setA), targetFingerprint(setA2)));
t("E: duplicate rows collapse", () => assert.equal(
  targetFingerprint(setA), targetFingerprint([...setA, { type: "email", value: "a@x.com" }])));
t("fingerprint derives from INPUTS only, not from any run id",
  () => {
    // The same inputs must hash identically no matter which run/investigation is
    // associated -- that is what makes reuse-vs-rerun decidable.
    const withRunA = targetFingerprint(setA.map((t, i) => ({ ...t, run: "inv-run1" })));
    const withRunB = targetFingerprint(setA.map((t, i) => ({ ...t, run: "inv-run2" })));
    assert.equal(withRunA, withRunB);
    assert.equal(withRunA, targetFingerprint(setA), "ignores unrelated run fields");
  });
t("different inputs -> different fingerprint", () => assert.notEqual(
  targetFingerprint(setA), targetFingerprint([...setA, { type: "phone", value: "+15550109999" }])));
t("empty set is stable", () => assert.equal(targetFingerprint([]), targetFingerprint([])));

console.log("\n=== run decision matrix (A-E, J) ===");
const COMPLETED = { hermes_investigation_id: "inv1", status: "completed", sync_status: "synced" };
t("A: identical inputs + completed -> reuse_completed (no duplicate run)",
  () => assert.equal(decideRun({ fingerprint: "F1", latest: { ...COMPLETED, fingerprint: "F1" } }), "reuse_completed"));
t("E: completed + NEW inputs -> create_new_run",
  () => assert.equal(decideRun({ fingerprint: "F2", latest: { ...COMPLETED, fingerprint: "F1" } }), "create_new_run"));
t("C: queued/running same inputs -> reuse_active (no concurrent dup)",
  () => assert.equal(decideRun({ fingerprint: "F1", latest: { fingerprint: "F1", hermes_investigation_id: "i", status: "running", sync_status: "active" } }), "reuse_active"));
t("C: pending sync_status also blocks dup",
  () => assert.equal(decideRun({ fingerprint: "F1", latest: { fingerprint: "F1", hermes_investigation_id: "i", status: "completed", sync_status: "pending" } }), "reuse_active"));
t("D: failed run -> allow_after_failure (history preserved)",
  () => assert.equal(decideRun({ fingerprint: "F1", latest: { fingerprint: "F1", hermes_investigation_id: "i", status: "failed", sync_status: "failed" } }), "allow_after_failure"));
t("no prior run -> create_new_run",
  () => assert.equal(decideRun({ fingerprint: "F1", latest: null }), "create_new_run"));
t("prior run lacking fingerprint + new inputs -> create_new_run",
  () => assert.equal(decideRun({ fingerprint: "F1", latest: COMPLETED }), "create_new_run"));
t("J: repeated identical requests never create a second run",
  () => {
    let latest = null;
    const runs = [];
    for (let i = 0; i < 5; i++) {
      const d = decideRun({ fingerprint: "F1", latest });
      if (d === "create_new_run" || d === "allow_after_failure") {
        runs.push("inv" + runs.length);
        latest = { fingerprint: "F1", hermes_investigation_id: runs[runs.length - 1], status: "completed", sync_status: "synced" };
      }
    }
    assert.equal(runs.length, 1, "expected exactly 1 run, got " + runs.length);
  });

console.log("\n=== multi-run scenario: A then B (req 2) ===");
t("adding target B creates run 2 and preserves run 1", () => {
  let latest = null; const runs = [];
  const r1 = targetFingerprint([{ type: "email", value: "victim@example.com" }]);
  let d = decideRun({ fingerprint: r1, latest });
  assert.equal(d, "create_new_run");
  runs.push({ fp: r1, inv: "inv-run1", status: "completed", sync_status: "synced" });
  latest = { ...runs[0] };

  const r2 = targetFingerprint([{ type: "email", value: "victim@example.com" }, { type: "phone", value: "+1 555 010 9999" }]);
  d = decideRun({ fingerprint: r2, latest });
  assert.equal(d, "create_new_run", "new target must start a new run");
  runs.push({ fp: r2, inv: "inv-run2" });
  assert.equal(runs.length, 2);
  assert.notEqual(runs[0].inv, runs[1].inv);
  assert.equal(runs[0].fp, r1, "run 1 fingerprint untouched");
});

console.log("\n=== schema contract ===");
t("InvestigationRun declares hermes_investigation_id + fingerprint", async () => {
  const fs = await import("node:fs/promises");
  const raw = await fs.readFile("./base44/entities/InvestigationRun.jsonc", "utf8");
  assert.ok(raw.includes("hermes_investigation_id"));
  assert.ok(raw.includes("target_fingerprint"));
  assert.ok(raw.includes("target_snapshot"));
  assert.ok(raw.includes("sync_status"));
});

console.log("\n" + "=".repeat(46));
console.log(`RESULT: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);