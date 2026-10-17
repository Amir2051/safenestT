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
