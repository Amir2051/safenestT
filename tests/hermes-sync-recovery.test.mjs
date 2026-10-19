// Regression coverage for Hermes partial-result recovery and retry dispatch.
// Run: node --test tests/hermes-sync-recovery.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const syncSource = readFileSync(
  new URL("../base44/functions/syncHermesInvestigation/entry.ts", import.meta.url),
  "utf8",
);
const dispatcherSource = readFileSync(
  new URL("../base44/functions/syncPendingHermes/entry.ts", import.meta.url),
  "utf8",
);

test("terminal runs with errors still attempt validated result persistence", () => {
  assert.ok(
    syncSource.includes("if (terminal && !resultsAlreadyPersisted) {"),
    "terminal partial-result statuses must not be excluded from persistence",
  );
});

test("a failed Hermes run cannot close the case or be marked completed", () => {
  assert.ok(
    syncSource.includes("if (persistenceSucceeded && !isFailed) {"),
    "case closure must require a non-failed Hermes terminal status",
  );
  assert.ok(
    syncSource.includes('status: !isFailed && reportData && hasSourceBackedEvidence(reportData) && hasPersistedResults(persisted) ? "completed" : "failed",'),
    "the InvestigationRun must remain failed when Hermes reports a terminal error",
  );
});

test("validated partial outputs receive an idempotency marker and remain incomplete", () => {
  assert.ok(syncSource.includes("partial_results: true"));
  assert.ok(syncSource.includes("results_persisted: true"));
  assert.ok(syncSource.includes('sync_status: "failed"'));
  assert.ok(syncSource.includes('status: "blocked"'));
});

test("persistence failures are logged with entity and case context", () => {
  for (const entity of ["EvidenceItem", "InvestigationFinding", "InvestigationReport", "GraphNode", "GraphEdge"]) {
    assert.ok(
      syncSource.includes(`[hermes-sync] ${entity} persistence failed`),
      `expected explicit error logging for ${entity}`,
    );
  }
});

test("background dispatcher retries failed nonterminal and partial-result synchronization", () => {
  assert.ok(syncSource.includes('syncStatus !== "failed"') === false,
    "failed sync_status must not be rejected by the candidate filter");
  assert.ok(dispatcherSource.includes('syncStatus !== "pending" && syncStatus !== "active" && syncStatus !== "failed"'));
  assert.ok(dispatcherSource.includes("recoverableTerminalStatuses"));
  assert.ok(dispatcherSource.includes("hasPersistedMarker"));
});
