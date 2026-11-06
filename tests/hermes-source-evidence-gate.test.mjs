import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../base44/functions/syncHermesInvestigation/entry.ts", import.meta.url),
  "utf8",
);
const start = source.indexOf("function hasSourceBackedEvidence(reportData) {");
const end = source.indexOf("\nfunction extractStatus(data)", start);
assert.notEqual(start, -1, "source-backed gate must exist in sync function");
assert.notEqual(end, -1, "source-backed gate must have a clear end boundary");
const gateSource = source.slice(start, end);
const hasSourceBackedEvidence = vm.runInNewContext(
  `(() => { ${gateSource}; return hasSourceBackedEvidence; })()`,
);

const persistenceStart = source.indexOf("function hasPersistedResults(persisted) {");
const persistenceEnd = source.indexOf("\nfunction extractStatus(data)", persistenceStart);
assert.notEqual(persistenceStart, -1, "persistence-success gate must exist in sync function");
assert.notEqual(persistenceEnd, -1, "persistence-success gate must have a clear end boundary");
const persistenceGateSource = source.slice(persistenceStart, persistenceEnd);
const { hasPersistedResults, persistedRunStatus } = vm.runInNewContext(
  `(() => { ${persistenceGateSource}; return { hasPersistedResults, persistedRunStatus }; })()`,
);

const statusStart = source.indexOf("function isFailedStatus(status) {");
const statusEnd = source.indexOf("\n// A successful HTTP/tool invocation", statusStart);
assert.notEqual(statusStart, -1, "Hermes status classification helpers must exist");
assert.notEqual(statusEnd, -1, "Hermes status helpers must have a clear end boundary");
const statusHelpers = source.slice(statusStart, statusEnd);
const { isFailedStatus, isPartialStatus } = vm.runInNewContext(
  `(() => { ${statusHelpers}; return { isFailedStatus, isPartialStatus }; })()`,
);

test("classifies completed_with_errors as partial, not a hard failure", () => {
  assert.equal(isFailedStatus("COMPLETED_WITH_ERRORS"), false);
  assert.equal(isPartialStatus("COMPLETED_WITH_ERRORS"), true);
});

test("classifies partial_success and failed_with_results as result-bearing partial states", () => {
  for (const status of ["partial_success", "failed_with_results", "partially_completed"]) {
    assert.equal(isFailedStatus(status), false, status);
    assert.equal(isPartialStatus(status), true, status);
  }
});

test("keeps hard failures distinct from partial results", () => {
  for (const status of ["failed", "error", "cancelled", "timeout"]) {
    assert.equal(isFailedStatus(status), true, status);
    assert.equal(isPartialStatus(status), false, status);
  }
});

const evidence = (status, payload) => ({
  evidence_id: "ev-1",
  data: { tool_call: { status, result: { data: payload } } },
});

test("rejects missing report", () => {
  assert.equal(hasSourceBackedEvidence(null), false);
});

test("rejects empty evidence list", () => {
  assert.equal(hasSourceBackedEvidence({ evidence: [] }), false);
});

test("rejects unsuccessful tool call even when payload has data", () => {
  assert.equal(
    hasSourceBackedEvidence({ evidence: [evidence("failed", { records: ["x"] })] }),
    false,
  );
});

test("rejects payload containing only empty nested values and metadata", () => {
  assert.equal(
    hasSourceBackedEvidence({
      evidence: [
        evidence("success", {
          domain: "dmenergy.io",
          target: "dmenergy.io",
          records: [],
          dns: {},
          whois: { registrar: "", nameservers: [] },
        }),
      ],
    }),
    false,
  );
});

test("accepts a successful tool call with substantive returned data", () => {
  assert.equal(
    hasSourceBackedEvidence({
      evidence: [
        evidence("success", {
          domain: "dmenergy.io",
          records: [{ type: "A", value: "192.0.2.10" }],
        }),
      ],
    }),
    true,
  );
});

test("blocks closure when report persistence failed", () => {
  assert.equal(hasPersistedResults({ evidence: 1, report_id: null }), false);
});

test("blocks closure when evidence persistence failed", () => {
  assert.equal(hasPersistedResults({ evidence: 0, report_id: "report-1" }), false);
});

test("allows closure when report and evidence were persisted", () => {
  assert.equal(hasPersistedResults({ evidence: 1, report_id: "report-1" }), true);
});

test("marks result-bearing partial execution completed only when source-backed results persisted", () => {
  assert.equal(persistedRunStatus(true, { evidence: 3, report_id: "report-1" }), "completed");
  assert.equal(persistedRunStatus(true, { evidence: 0, report_id: "report-1" }), "failed");
  assert.equal(persistedRunStatus(true, { evidence: 3, report_id: null }), "failed");
  assert.equal(persistedRunStatus(false, { evidence: 3, report_id: "report-1" }), "failed");
});
