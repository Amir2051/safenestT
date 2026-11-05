/**
 * Report model tests. Run: node --test src/lib/report/reportModel.test.js
 * Synthetic data only — never put real client details in tests.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCaseReport, classifyIndicator, describeEvidence, formatDate, formatMoney,
  humanize, canonicalJson, integrityHash, shortHash, cleanEngineText, parseEngineDescription,
} from "./reportModel.js";

const WALLET = "0x1111111111111111111111111111111111111111";
const caseItem = {
  id: "case1", case_number: "SN-TEST-00001", case_title: "Case — Test Client", victim_name: "Test Client",
  fraud_type: "crypto_theft", status: "documented", priority: "critical",
  amount_stolen_usd: 48315.57, cryptocurrency: "ETH", blockchain: "Ethereum", incident_date: "2025-12-02",
  scammer_info: { name: "Actor X", wallet_addresses: [WALLET] },
  suspect_details: { websites_domains: ["https://example-scam.io"], primary_suspect: { aliases: ["X1"] } },
  workflow: {
    provider_label: "MIA Multi-Agent", risk_score: 79, risk_level: "high",
    risk_factors: [{ factor: "Loss amount", weight: 12 }, { factor: "Fraud type", weight: 10 }],
    phases: {
      planning: { status: "completed", completed_at: "2026-11-05T19:48:58Z", output: {
        scope: "Funds movement for the suspect wallet.", objectives: ["Trace funds"], gaps: ["No KYC data", "No KYC data"],
        steps: [{ step: "Trace", detail: "Hop analysis" }], priority_indicators: [WALLET, "https://example-scam.io"] } },
      evidence: { status: "completed", output: { summary: "AI narrative text.", needs_verification: ["Corroborate OSINT"] } },
      reality_check: { status: "completed", output: { verifications: [{ finding_id: "f3", reasoning: "Case file states the loss." }] } },
      risk: { status: "completed" },
    },
  },
};
const evidence = [
  { id: "e2", created_date: "2026-10-06T12:56:30.842000", uploaded_at: "2026-10-06T12:54:57.933228",
    source: "hermes_extraction", filename: "shodan_domain", tags: ["tool", "cyber_intel.threat_intel.shodan_domain"],
    file_hash: "986784a2-0ce3-41a3-aa34-054d623fb7a8", processing_status: "processed",
    processing_notes: '{"capability":"cyber_intel.threat_intel.shodan_domain","status":"success"}',
    detected_targets: [{ type: "domain", value: WALLET }] },
  { id: "e1", created_date: "2026-10-07T10:00:00Z", source: "manual_upload", filename: "bank_statement.pdf",
    evidence_type: "document", file_hash: "a".repeat(64), processing_status: "processed" },
];
const findings = [
  { id: "f1", status: "rejected", title: "Here's a thinking process: 1. Analyze", severity: "low" },
  { id: "f2", status: "verified", title: "Wallet linked", severity: "high", confidence: "high", evidence_refs: ["e2", "e1"],
    reality_check: { reasoning: "Supported by OSINT and statement." }, created_date: "2026-11-05T00:00:00Z" },
  { id: "f3", status: "partially_supported", title: "Loss documented", severity: "critical", confidence: "high",
    evidence_refs: ["SN-TEST-00001"], created_date: "2026-11-05T00:00:01Z" },
  { id: "f4", status: "unsupported", title: "Mixer used", severity: "medium" },
];
const ASOF = "2026-11-05T20:00:00.000Z";

describe("helpers", () => {
  it("humanizes engine identifiers", () => {
    assert.equal(humanize("crypto_theft"), "Crypto Theft");
    assert.equal(humanize(null), "");
  });
  it("formats money and dates without throwing", () => {
    assert.equal(formatMoney(48315.57), "$48,315.57");
    assert.equal(formatMoney("abc"), "");
    assert.equal(formatDate("2025-12-02"), "02 Dec 2025");
    assert.equal(formatDate("2026-10-06T12:54:57.933228", { withTime: true }), "06 Oct 2026 12:54 UTC");
    assert.equal(formatDate("not a date"), "");
  });
  it("classifies indicators by their shape, not their label", () => {
    assert.equal(classifyIndicator(WALLET).type, "wallet");
    assert.equal(classifyIndicator("https://Example-Scam.io/path").value, "example-scam.io");
    assert.equal(classifyIndicator("A@B.com").value, "a@b.com");
    assert.equal(classifyIndicator("8.8.8.8").type, "ip");
    assert.equal(classifyIndicator("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh").subtype, "Bitcoin");
    assert.equal(classifyIndicator(""), null);
  });
  it("canonical JSON is key-order independent", () => {
    assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] }), canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
    assert.equal(shortHash("x"), shortHash("x"));
  });
});

describe("describeEvidence", () => {
  it("labels automated queries honestly and never calls a UUID a hash", () => {
    const d = describeEvidence(evidence[0]);
    assert.equal(d.label, "Shodan infrastructure lookup");
    assert.equal(d.kind, "OSINT query");
    assert.equal(d.source, "Automated OSINT (Hermes)");
    assert.equal(d.integrity.kind, "Reference ID");
    assert.equal(d.target.type, "wallet"); // mislabelled "domain" in raw data
    assert.match(d.nature, /not attached/);
    assert.equal(d.is_primary, false);
  });
  it("recognises a real SHA-256", () => {
    assert.equal(describeEvidence(evidence[1]).integrity.kind, "SHA-256");
  });
  it("survives garbage", () => {
    assert.doesNotThrow(() => describeEvidence(null));
    assert.doesNotThrow(() => describeEvidence({ processing_notes: "{not json" }));
  });
});

describe("buildCaseReport", () => {
  const m = buildCaseReport({ caseItem, findings, evidence, asOf: ASOF, organization: { name: "Acme Bank" } });

  it("is deterministic for the same input", () => {
    const again = buildCaseReport({ caseItem, findings, evidence, asOf: ASOF, organization: { name: "Acme Bank" } });
    assert.equal(canonicalJson(m), canonicalJson(again));
    assert.match(m.report_number, /^SN-TEST-00001-R20261105-[0-9A-Z]{6}$/);
  });

  it("orders evidence primary-first with stable refs", () => {
    assert.deepEqual(m.evidence.map((e) => [e.ref, e.id]), [["E-01", "e1"], ["E-02", "e2"]]);
  });

  it("orders findings by status then severity and resolves evidence refs", () => {
    assert.deepEqual(m.findings.map((f) => f.id), ["f2", "f3"]);
    assert.deepEqual(m.findings[0].evidence_refs.sort(), ["E-01", "E-02"]);
    assert.equal(m.findings[1].case_record_refs, 1); // "SN-TEST-00001" is a case-file ref, not an evidence item
    assert.equal(m.findings[1].assessment, "Case file states the loss."); // from reality-check phase output
  });

  it("keeps excluded and junk findings out of the conclusions", () => {
    assert.deepEqual(m.excluded_findings.map((f) => f.id).sort(), ["f1", "f4"]);
    assert.equal(m.counts.excluded, 2);
  });

  it("de-duplicates indicators across sources", () => {
    const wallets = m.indicators.filter((i) => i.type === "wallet");
    assert.equal(wallets.length, 1);
    assert.ok(wallets[0].sources.includes("Case intake") && wallets[0].sources.includes("OSINT query target"));
    assert.ok(m.indicators.some((i) => i.type === "domain" && i.value === "example-scam.io"));
    assert.deepEqual(m.subjects, ["Actor X", "X1"]);
  });

  it("writes a fact-only executive summary and deduplicated gaps", () => {
    assert.match(m.executive_summary[0], /\$48,315\.57 in ETH/);
    assert.match(m.executive_summary[1], /HIGH risk \(79\/100\)/);
    assert.deepEqual(m.gaps, ["No KYC data"]);
    assert.deepEqual(m.next_steps, ["Corroborate OSINT", "Trace: Hop analysis"]);
    assert.match(m.distribution, /Acme Bank/);
  });

  it("never throws on an empty or malformed case", () => {
    const empty = buildCaseReport({});
    assert.equal(empty.findings.length, 0);
    assert.equal(empty.risk, null);
    assert.match(empty.executive_summary.join(" "), /No findings/);
    assert.doesNotThrow(() => buildCaseReport({ caseItem: { workflow: "oops", scammer_info: [] }, findings: [null, 3], evidence: "x" }));
  });

  it("supersedes older AI runs but keeps anything a human reviewed", () => {
    const c2 = JSON.parse(JSON.stringify(caseItem));
    c2.workflow.phases.analysis = { status: "completed", output: { persisted_finding_ids: ["new1"] } };
    const fs = [
      { id: "new1", source: "ai_run", status: "partially_supported", title: "Loss documented" },
      { id: "old1", source: "ai_run", status: "partially_supported", title: "Loss documented" },
      { id: "old2", source: "ai_run", status: "verified", title: "Reviewed old", reviewer_name: "Analyst" },
      { id: "h1", source: "hermes", status: "proposed", title: "Threat intel lookup for cyber_intel.threat_intel.dehashed_search",
        description: "EXTERNAL_INTELLIGENCE · capability: cyber_intel.threat_intel.dehashed_search · limitations: Requires corroboration." },
    ];
    const r = buildCaseReport({ caseItem: c2, findings: fs, evidence, asOf: ASOF });
    assert.deepEqual(r.findings.map((f) => f.id).sort(), ["h1", "new1", "old2"]);
    assert.equal(r.counts.superseded, 1);
    const h = r.findings.find((f) => f.id === "h1");
    assert.equal(h.title, "OSINT: DeHashed breach-data search");
    assert.equal(h.finding_kind, "External Intelligence");
    assert.equal(h.limitation, "Requires corroboration.");
    assert.equal(h.description, "");
    assert.match(r.executive_summary[2], /1 finding\(s\) from earlier analysis runs were superseded/);
  });

  it("cleans engine identifiers out of prose", () => {
    assert.equal(cleanEngineText("via cyber_intel.threat_intel.shodan_domain today"), "via Shodan infrastructure lookup today");
    assert.equal(cleanEngineText("Visit dmenergy.io and www.example.co.uk"), "Visit dmenergy.io and www.example.co.uk"); // real domains untouched
    assert.equal(cleanEngineText("dns.lookup ran"), "DNS lookup ran");
    assert.deepEqual(parseEngineDescription("Plain sentence."), { description: "Plain sentence.", kind: "", limitation: "" });
  });

  it("produces a stable SHA-256 integrity hash", async () => {
    const h1 = await integrityHash(m);
    const h2 = await integrityHash(JSON.parse(JSON.stringify(m)));
    assert.match(h1, /^[a-f0-9]{64}$/);
    assert.equal(h1, h2);
  });
});
