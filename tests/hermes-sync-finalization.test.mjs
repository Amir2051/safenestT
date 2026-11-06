// Regression tests for Hermes sync finalization (2026-11-06).
//  1. A re-sync of an already-finalized case must not rewrite its workflow
//     (bug: case 6aed5530 was reset to planning=running / investigating).
//  2. Risk factors are de-duplicated, markdown-free, length-capped, and skip
//     empty "for None" crypto traces.
// Run: node --test tests/hermes-sync-finalization.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(
  new URL("../base44/functions/syncHermesInvestigation/entry.ts", import.meta.url),
  "utf8",
);

const start = source.indexOf("function buildRiskFactors(findings, titleOf) {");
const end = source.indexOf("\nfunction extractStatus(data)", start);
assert.notEqual(start, -1, "buildRiskFactors must exist");
assert.notEqual(end, -1, "buildRiskFactors must have a clear end boundary");
const buildRiskFactors = vm.runInNewContext(
  `(() => { ${source.slice(start, end)}; return buildRiskFactors; })()`,
);
const title = (f) => f.title;

test("risk factors drop empty 'for None' crypto traces", () => {
  const out = buildRiskFactors([
    { title: "Crypto trace failed or returned no data for None.", risk_score: 0 },
    { title: "Threat intel returned observations for shodan_domain", risk_score: 0.65 },
  ], title);
  assert.equal(out.length, 1);
  assert.equal(out[0].weight, 65);
});

test("risk factors are de-duplicated", () => {
  const f = { title: "Threat intel returned observations for shodan_domain", risk_score: 0.65 };
  assert.equal(buildRiskFactors([f, f, { ...f }], title).length, 1);
});

test("risk factors strip markdown and cap length", () => {
  const long = "# Investigation Synthesis\n\n## Bottom line\n" + "word ".repeat(200);
  const [out] = buildRiskFactors([{ title: long, risk_score: 0.5 }], title);
  assert.ok(out.factor.length <= 160, "factor capped at 160 chars");
  assert.ok(!out.factor.includes("#"), "markdown headings removed");
});

test("sync has an idempotency guard for finalized cases", () => {
  assert.match(source, /const alreadyFinalized = !!wf\.phases\?\.dossier\?\.output\?\.results_persisted/);
  assert.match(source, /wf\.hermes_investigation_id === investigationId/);
  const guardIdx = source.indexOf("if (alreadyFinalized) {");
  const updateIdx = source.indexOf("await base44.entities.InvestigationCase.update(caseId, updatePatch)");
  assert.ok(guardIdx > -1 && guardIdx < updateIdx, "guard must return before the workflow is rewritten");
});

test("terminal runs without phase detail don't fabricate planning=running", () => {
  assert.match(source, /phases\[p\] = p === "planning" \? "completed" : "pending"/);
});
