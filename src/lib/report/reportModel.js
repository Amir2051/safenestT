/**
 * SafeNestT case report model.
 *
 * One pure, deterministic function turns the raw investigation records
 * (case, findings, evidence, phase outputs) into a normalized report that the
 * in-app viewer and the PDF export both render. Rules:
 *   - Never throws on malformed data: every field is optional.
 *   - Same input -> same output (stable ordering, stable reference numbers),
 *     so an issued report can be re-rendered byte-for-byte from its snapshot.
 *   - Honest labels: evidence/finding status is shown exactly as stored;
 *     nothing is upgraded, and AI-written narrative is marked as such.
 *
 * No React / SDK imports so it can be unit-tested with `node --test`.
 */

export const REPORT_SCHEMA_VERSION = 1;

// ── Small safe helpers ─────────────────────────────────────────────────────
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const arr = (v) => (Array.isArray(v) ? v : []);
const str = (v) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

export function humanize(value) {
  const s = str(value);
  if (!s) return "";
  return s
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatMoney(amount, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

/** Dates: ISO in, "05 Nov 2026" (and optionally " 19:49 UTC") out. Invalid -> "". */
export function formatDate(value, { withTime = false } = {}) {
  const s = str(value);
  if (!s) return "";
  // Bare dates (2025-12-02) are calendar dates — don't shift them by timezone.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s}Z`);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const base = `${String(d.getUTCDate()).padStart(2, "0")} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (!withTime) return base;
  return `${base} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/** snake_case words inside prose -> plain words ("crypto_theft" -> "crypto theft"). */
export function plainWords(text) {
  return str(text).replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (m) => m.replace(/_/g, " "));
}

// Near-duplicate sentences (same idea, different wording) — keep the first.
const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "once", "after", "they", "their", "have", "been", "lack", "absence", "verified", "confirmed"]);
const tokens = (s) => new Set(str(s).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)));
export function dedupeSimilar(list, threshold = 0.75) {
  const kept = [];
  list.map(str).filter(Boolean).forEach((s) => {
    const t = tokens(s);
    const dup = kept.some((k) => {
      const u = tokens(k);
      if (!t.size || !u.size) return k.toLowerCase() === s.toLowerCase();
      let inter = 0; t.forEach((w) => { if (u.has(w)) inter++; });
      return inter / Math.min(t.size, u.size) >= threshold;
    });
    if (!dup) kept.push(s);
  });
  return kept;
}

// ── Indicator classification ───────────────────────────────────────────────
// Raw data sometimes mislabels indicators (e.g. an ETH wallet typed "domain"),
// so the value's own shape decides the type.
export function classifyIndicator(raw) {
  const v = str(raw);
  if (!v) return null;
  if (/^0x[a-fA-F0-9]{40}$/.test(v)) return { type: "wallet", subtype: "EVM (Ethereum-compatible)", value: v };
  if (/^0x[a-fA-F0-9]{64}$/.test(v)) return { type: "transaction", subtype: "EVM transaction hash", value: v };
  if (/^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(v)) return { type: "wallet", subtype: "Bitcoin", value: v };
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(v)) return { type: "wallet", subtype: "Tron", value: v };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { type: "email", subtype: "Email address", value: v.toLowerCase() };
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v)) return { type: "ip", subtype: "IPv4 address", value: v };
  if (/^\+?[\d\s().-]{7,20}$/.test(v) && (v.match(/\d/g) || []).length >= 7) return { type: "phone", subtype: "Phone number", value: v };
  const host = v.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  if (/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) return { type: "domain", subtype: "Domain / website", value: host };
  return { type: "other", subtype: "Other identifier", value: v };
}

const INDICATOR_TYPE_ORDER = ["wallet", "transaction", "domain", "email", "phone", "ip", "other"];
export const INDICATOR_TYPE_LABEL = {
  wallet: "Wallet address", transaction: "Transaction", domain: "Domain", email: "Email",
  phone: "Phone", ip: "IP address", other: "Other",
};

// ── Evidence labelling ─────────────────────────────────────────────────────
const TOOL_LABELS = {
  shodan_domain: "Shodan infrastructure lookup",
  dehashed_search: "DeHashed breach-data search",
  darkweb_paste: "Dark-web paste search",
  "dns.lookup": "DNS lookup",
  "dns.reverse": "Reverse DNS lookup",
  whois: "WHOIS registration lookup",
};
const SOURCE_LABELS = {
  manual_upload: "Uploaded by investigator",
  case_import: "Imported with case",
  hermes_extraction: "Automated OSINT (Hermes)",
};

function parseNotes(notes) {
  if (isObj(notes)) return notes;
  const s = str(notes);
  if (!s.startsWith("{")) return s ? { text: s } : {};
  try { return JSON.parse(s); } catch { return { text: s }; }
}

function toolKey(ev, notes) {
  const cap = str(notes.capability) || arr(ev.tags).find((t) => /\./.test(t)) || "";
  const last = cap.split(".").pop();
  return TOOL_LABELS[last] ? last : TOOL_LABELS[cap] ? cap : str(ev.filename);
}

export function describeEvidence(ev) {
  const e = isObj(ev) ? ev : {};
  const notes = parseNotes(e.processing_notes);
  const isTool = e.source === "hermes_extraction" || arr(e.tags).includes("tool");
  const key = toolKey(e, notes);
  const label = isTool
    ? TOOL_LABELS[key] || humanize(key) || "Automated lookup"
    : str(e.original_filename) || str(e.filename) || "Unnamed item";

  const targets = arr(e.detected_targets).map((t) => classifyIndicator(isObj(t) ? t.value : t)).filter(Boolean);
  const hash = str(e.file_hash);
  const isSha256 = /^[a-f0-9]{64}$/i.test(hash);

  let nature;
  if (isTool) {
    const ok = str(notes.status).toLowerCase() === "success";
    nature = ok
      ? "Automated query completed. Result content is not attached to this record."
      : `Automated query ${str(notes.status) || "status unknown"}.`;
  } else {
    nature = str(e.description) || "Uploaded material.";
  }

  return {
    id: e.id || "",
    label,
    kind: isTool ? "OSINT query" : humanize(e.evidence_type) || "Document",
    source: SOURCE_LABELS[e.source] || humanize(e.source) || "Unknown",
    collected_at: e.uploaded_at || e.created_date || "",
    collected_by: str(e.uploaded_by_name) || str(e.uploaded_by),
    target: targets[0] || null,
    integrity: isSha256 ? { kind: "SHA-256", value: hash.toLowerCase() } : hash ? { kind: "Reference ID", value: hash } : null,
    processing: humanize(e.processing_status) || "Unknown",
    nature,
    is_primary: !isTool, // primary = actual documents/records, not tool queries
  };
}

// ── Finding status ─────────────────────────────────────────────────────────
export const FINDING_STATUS = {
  verified: { label: "Verified", rank: 0, tone: "positive", included: true,
    meaning: "Supported by attached evidence and the independent reality check." },
  partially_supported: { label: "Partially supported", rank: 1, tone: "caution", included: true,
    meaning: "Some support in the record; requires corroboration before reliance." },
  under_review: { label: "Under review", rank: 2, tone: "neutral", included: true,
    meaning: "With an investigator for review." },
  proposed: { label: "Proposed (unreviewed)", rank: 3, tone: "neutral", included: true,
    meaning: "Generated by analysis; not yet reviewed." },
  unsupported: { label: "Not supported", rank: 4, tone: "negative", included: false,
    meaning: "The reality check found no support; excluded from conclusions." },
  rejected: { label: "Rejected", rank: 5, tone: "negative", included: false,
    meaning: "Rejected on review; excluded from conclusions." },
  superseded: { label: "Superseded", rank: 6, tone: "negative", included: false,
    meaning: "Replaced by a later finding." },
};
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 };

/** Finding titles: drop engine boilerplate ("Threat intel lookup for X" -> "OSINT: X"). */
export function cleanFindingTitle(title) {
  const t = cleanEngineText(title);
  const m = t.match(/^threat intel lookup for (.+)$/i);
  return m ? `OSINT: ${m[1]}` : t;
}

export function findingStatus(status) {
  return FINDING_STATUS[status] || FINDING_STATUS.proposed;
}

// Engine text like "cyber_intel.threat_intel.shodan_domain" -> "Shodan infrastructure lookup".
// Only touches engine identifiers (known tool names, or dotted names with an
// underscore — hostnames never contain "_"), so real domains stay intact.
export function cleanEngineText(text) {
  return str(text).replace(/\b[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\b/g, (m) => {
    if (TOOL_LABELS[m]) return TOOL_LABELS[m];
    if (!m.includes("_")) return m;
    const last = m.split(".").pop();
    return TOOL_LABELS[last] || humanize(last);
  });
}

/**
 * Hermes descriptions look like "EXTERNAL_INTELLIGENCE · capability: x · limitations: y".
 * Split into a readable description + an explicit limitation.
 */
export function parseEngineDescription(text) {
  const s = str(text);
  if (!/\s·\s/.test(s) && !/^[A-Z_]{6,}$/.test(s)) return { description: cleanEngineText(s), kind: "", limitation: "" };
  const parts = s.split(/\s·\s/).map((p) => p.trim()).filter(Boolean);
  let kind = "", limitation = "";
  const rest = [];
  parts.forEach((p) => {
    if (/^[A-Z][A-Z_]+$/.test(p)) kind = humanize(p.toLowerCase());
    else if (/^limitations?:/i.test(p)) limitation = p.replace(/^limitations?:\s*/i, "");
    else if (/^capability:/i.test(p)) { /* already named in the title */ }
    else rest.push(cleanEngineText(p));
  });
  return { description: rest.join(" "), kind, limitation };
}

// ── Stable hashing (FNV-1a, for report numbers; integrity uses SHA-256) ──────
export function shortHash(input) {
  let h = 0x811c9dc5;
  const s = typeof input === "string" ? input : JSON.stringify(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36).toUpperCase().padStart(6, "0").slice(-6);
}

/**
 * Deterministic JSON (sorted keys) so the integrity hash is reproducible.
 * Object keys whose value is null/undefined are omitted, so a snapshot that
 * a datastore returns without empty fields still hashes identically.
 */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((v) => (v == null ? "null" : canonicalJson(v))).join(",")}]`;
  if (isObj(value)) {
    return `{${Object.keys(value).filter((k) => value[k] != null).sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const byCreated = (a, b) =>
  String(a.created_date || a.uploaded_at || "").localeCompare(String(b.created_date || b.uploaded_at || "")) ||
  String(a.id || "").localeCompare(String(b.id || ""));

// ── The builder ────────────────────────────────────────────────────────────
/**
 * @param {object} input
 * @param {object} input.caseItem   InvestigationCase record
 * @param {object[]} input.findings InvestigationFinding records for the case
 * @param {object[]} input.evidence EvidenceItem records for the case
 * @param {object} [input.organization] { name } of the client organization
 * @param {string} [input.preparedBy]   person issuing the report
 * @param {string} [input.asOf]         ISO time the data was read (default: now)
 */
export function buildCaseReport(input = {}) {
  const c = isObj(input.caseItem) ? input.caseItem : {};
  const wf = isObj(c.workflow) ? c.workflow : {};
  const phases = isObj(wf.phases) ? wf.phases : {};
  const out = (p) => (isObj(phases[p]) && isObj(phases[p].output) ? phases[p].output : {});
  const asOf = str(input.asOf) || new Date().toISOString();

  // Evidence register: primary material first, then automated queries.
  const evidenceRaw = arr(input.evidence).filter(isObj).slice().sort(byCreated);
  const evidenceDescribed = evidenceRaw.map(describeEvidence);
  const evOrdered = [
    ...evidenceDescribed.filter((e) => e.is_primary),
    ...evidenceDescribed.filter((e) => !e.is_primary),
  ].map((e, i) => ({ ...e, ref: `E-${String(i + 1).padStart(2, "0")}` }));
  const evRef = new Map(evOrdered.map((e) => [e.id, e.ref]));

  // Reality-check reasoning, keyed by finding id (fallback when not on the record).
  const rcById = new Map();
  arr(out("reality_check").verifications).forEach((v) => {
    if (isObj(v) && v.finding_id) rcById.set(v.finding_id, str(v.reasoning));
  });

  // Re-running the analysis produces a fresh set of findings. Only the latest
  // MIA run's findings are current; older AI findings are superseded unless a
  // human has reviewed them (human review always survives).
  const latestIds = new Set(arr(out("analysis").persisted_finding_ids).map(str).filter(Boolean));
  const isHumanReviewed = (f) => !!(str(f.reviewer_name) || str(f.reviewer) || f.review_date);
  const isStale = (f) => latestIds.size > 0 && f.source === "ai_run" && !latestIds.has(f.id) && !isHumanReviewed(f);
  const allFindings = arr(input.findings).filter(isObj);
  const supersededCount = allFindings.filter(isStale).length;

  const findings = allFindings.filter((f) => !isStale(f)).slice()
    .sort((a, b) =>
      findingStatus(a.status).rank - findingStatus(b.status).rank ||
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      (CONFIDENCE_RANK[a.confidence] ?? 9) - (CONFIDENCE_RANK[b.confidence] ?? 9) ||
      byCreated(a, b))
    .map((f, i) => {
      const st = findingStatus(f.status);
      const refs = arr(f.evidence_refs);
      const resolved = refs.map((id) => evRef.get(id)).filter(Boolean).sort();
      const caseRefs = refs.filter((id) => !evRef.has(id));
      const parsed = parseEngineDescription(f.description);
      return {
        ref: `F-${String(i + 1).padStart(2, "0")}`,
        id: f.id || "",
        title: cleanFindingTitle(f.title) || "Untitled finding",
        description: parsed.description,
        finding_kind: parsed.kind,
        limitation: parsed.limitation,
        category: f.category === "other" ? "" : humanize(f.category),
        severity: str(f.severity) || "medium",
        confidence: str(f.confidence) || "medium",
        status: f.status || "proposed",
        status_label: st.label,
        // "Verified" by a person (no reality-check reasoning) says so explicitly.
        status_meaning: f.status === "verified" && isHumanReviewed(f) && !str(isObj(f.reality_check) ? f.reality_check.reasoning : "") && !rcById.get(f.id)
          ? "Verified on investigator review."
          : st.meaning,
        tone: st.tone,
        included: st.included,
        assessment: str(isObj(f.reality_check) ? f.reality_check.reasoning : "") || rcById.get(f.id) || "",
        evidence_refs: resolved,
        case_record_refs: caseRefs.length ? caseRefs.length : 0,
        source: f.source === "investigator" ? "Investigator" : f.source === "hermes" ? "Hermes engine" : "MIA analysis",
        reviewer: str(f.reviewer_name) || str(f.reviewer),
        review_date: f.review_date || "",
      };
    });

  // Drop near-empty junk (e.g. raw model "thinking" dumps) from the report body.
  const isJunk = (f) => /^here'?s a thinking process/i.test(f.title);
  const included = findings.filter((f) => f.included && !isJunk(f));
  const excluded = findings.filter((f) => !f.included || isJunk(f));

  // Subjects & indicators, de-duplicated across every place they're recorded.
  const s = isObj(c.scammer_info) ? c.scammer_info : {};
  const sd = isObj(c.suspect_details) ? c.suspect_details : {};
  const ps = isObj(sd.primary_suspect) ? sd.primary_suspect : {};
  const indicatorSources = [
    ...arr(s.wallet_addresses).map((v) => [v, "Case intake"]),
    [s.email, "Case intake"], [s.phone, "Case intake"], [s.website, "Case intake"],
    ...arr(sd.wallet_addresses).map((v) => [v, "Suspect profile"]),
    ...arr(sd.websites_domains).map((v) => [v, "Suspect profile"]),
    ...arr(sd.ip_addresses).map((v) => [v, "Suspect profile"]),
    [ps.email, "Suspect profile"], [ps.phone, "Suspect profile"],
    ...arr(c.transaction_hashes).map((v) => [v, "Case intake"]),
    ...arr(out("planning").priority_indicators).map((v) => [v, "Analysis"]),
    ...arr(out("evidence").key_indicators).map((v) => [v, "Analysis"]),
    ...evOrdered.filter((e) => e.target).map((e) => [e.target.value, "OSINT query target"]),
  ];
  const indMap = new Map();
  indicatorSources.forEach(([raw, where]) => {
    const ind = classifyIndicator(raw);
    if (!ind) return;
    const key = `${ind.type}:${ind.value.toLowerCase()}`;
    const cur = indMap.get(key) || { ...ind, sources: [] };
    if (!cur.sources.includes(where)) cur.sources.push(where);
    indMap.set(key, cur);
  });
  const indicators = [...indMap.values()].sort((a, b) =>
    INDICATOR_TYPE_ORDER.indexOf(a.type) - INDICATOR_TYPE_ORDER.indexOf(b.type) || a.value.localeCompare(b.value));

  const subjectNames = [...new Set([str(s.name), str(ps.name), ...arr(ps.aliases).map(str)].filter(Boolean))];

  // Risk.
  const riskScore = Number.isFinite(Number(wf.risk_score)) ? Number(wf.risk_score) : null;
  const riskLevel = str(wf.risk_level) || (riskScore == null ? "" :
    riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 40 ? "medium" : "low");
  const riskFactors = arr(wf.risk_factors).filter(isObj).map((f) => ({
    factor: plainWords(str(f.factor) || str(f.name) || str(f.description) || "Factor"),
    weight: Number(f.weight) || 0,
  }));

  // Methodology: phases actually completed, in engine order.
  const PHASE_LABELS = {
    planning: "Planning", evidence: "Evidence review", analysis: "Specialist analysis",
    reality_check: "Independent reality check", risk: "Risk scoring", dossier: "Dossier assembly",
  };
  const methodology = Object.keys(PHASE_LABELS).map((k) => ({
    phase: PHASE_LABELS[k],
    status: humanize(isObj(phases[k]) ? phases[k].status : "") || "Not run",
    completed_at: isObj(phases[k]) ? phases[k].completed_at || "" : "",
  }));

  // Gaps & next steps (deduplicated, order preserved).
  const uniq = (list) => [...new Set(list.map(str).filter(Boolean))];
  const gaps = dedupeSimilar(uniq([...arr(out("planning").gaps), ...arr(out("evidence").gaps)]));
  const nextSteps = dedupeSimilar(uniq([
    ...arr(out("evidence").needs_verification),
    ...arr(out("planning").steps).map((st) => (isObj(st) ? [str(st.step), str(st.detail)].filter(Boolean).join(": ") : st)),
  ]));

  // If every automated query hit the same target, state it once for the register.
  const autoTargets = [...new Set(evOrdered.filter((e) => !e.is_primary && e.target).map((e) => e.target.value))];
  const sharedQueryTarget = autoTargets.length === 1 && evOrdered.filter((e) => !e.is_primary).every((e) => e.target)
    ? evOrdered.find((e) => !e.is_primary).target : null;

  const counts = {
    total: findings.length,
    verified: findings.filter((f) => f.status === "verified").length,
    partially_supported: findings.filter((f) => f.status === "partially_supported").length,
    unreviewed: findings.filter((f) => f.status === "proposed" || f.status === "under_review").length,
    excluded: excluded.length,
    superseded: supersededCount,
    evidence: evOrdered.length,
    primary_evidence: evOrdered.filter((e) => e.is_primary).length,
  };

  const currency = "USD";
  const lossText = formatMoney(c.amount_stolen_usd, currency);
  const caseNumber = str(c.case_number) || (c.id ? `CASE-${String(c.id).slice(-6).toUpperCase()}` : "UNNUMBERED");

  // Executive summary — composed from facts only (no model text).
  const summary = [];
  const typeText = humanize(c.fraud_type) || "fraud";
  summary.push(
    `${caseNumber} concerns a reported ${typeText.toLowerCase()} incident` +
    (c.incident_date ? ` on ${formatDate(c.incident_date)}` : "") +
    (lossText ? ` with a reported loss of ${lossText}${c.cryptocurrency ? ` in ${str(c.cryptocurrency)}` : ""}` : "") + "."
  );
  if (riskScore != null) summary.push(`The case is assessed as ${riskLevel.toUpperCase()} risk (${riskScore}/100).`);
  summary.push(
    counts.total
      ? `${counts.total} current finding(s): ${counts.verified} verified, ${counts.partially_supported} partially supported, ` +
        `${counts.unreviewed} awaiting review and ${counts.excluded} excluded.` +
        (supersededCount ? ` ${supersededCount} finding(s) from earlier analysis runs were superseded and are not repeated.` : "")
      : "No findings have been produced yet."
  );
  summary.push(
    counts.primary_evidence
      ? `The evidence register holds ${counts.evidence} item(s), of which ${counts.primary_evidence} are primary records.`
      : counts.evidence
        ? `The evidence register holds ${counts.evidence} automated intelligence quer${counts.evidence === 1 ? "y" : "ies"}; no primary records (statements, transaction records, communications) are attached yet.`
        : "No evidence is attached to this case."
  );

  const model = {
    schema_version: REPORT_SCHEMA_VERSION,
    report_number: `${caseNumber}-R${asOf.slice(0, 10).replace(/-/g, "")}-${shortHash(`${c.id}|${asOf}`)}`,
    title: "Investigation Report",
    classification: "CONFIDENTIAL",
    distribution: input.organization?.name
      ? `Prepared for ${str(input.organization.name).replace(/\.+$/, "")}. Not for onward distribution.`
      : "Restricted to authorized recipients. Not for onward distribution.",
    as_of: asOf,
    prepared_by: str(input.preparedBy) || "SafeNestT Investigations",
    engine: str(wf.provider_label) || humanize(wf.provider) || "",
    case: {
      number: caseNumber,
      title: str(c.case_title),
      fraud_type: humanize(c.fraud_type),
      status: humanize(c.status),
      priority: humanize(c.priority || c.case_priority),
      incident_date: c.incident_date || "",
      reported_loss: lossText,
      asset: [str(c.cryptocurrency), str(c.blockchain)].filter(Boolean).join(" · "),
      reporting_party: str(c.victim_name),
      ic3_reference: str(c.ic3_complaint_number),
      federal_reference: str(c.federal_case_number),
      investigator: str(c.assigned_investigator),
    },
    executive_summary: summary,
    analyst_narrative: str(out("evidence").summary), // AI-written; rendered with a label
    scope: str(out("planning").scope),
    objectives: uniq(arr(out("planning").objectives)),
    hypotheses: uniq(arr(out("planning").hypotheses)),
    methodology,
    subjects: subjectNames,
    indicators,
    findings: included,
    excluded_findings: excluded,
    reality_check_note: str(out("reality_check").notes),
    risk: riskScore == null ? null : { score: riskScore, level: riskLevel, factors: riskFactors },
    evidence: evOrdered,
    shared_query_target: sharedQueryTarget,
    gaps,
    next_steps: nextSteps,
    counts,
    limitations: [
      "This report reflects the case record as of the date shown. Later evidence may change the assessment.",
      "Findings marked \"Partially supported\" or \"Proposed\" are not established facts and must be corroborated before reliance.",
      "Automated intelligence queries (OSINT) record that a lookup was performed; unless result content is attached, they do not by themselves prove a link.",
      "The analyst narrative and findings are produced with AI assistance and reviewed through an evidence gate. The risk score is computed deterministically, without AI.",
      "This report is an investigative work product. It is not legal advice and is not a determination of guilt or liability.",
    ],
  };
  return model;
}

/** SHA-256 of the canonical model (browser or Node 18+). */
export async function integrityHash(model) {
  const data = new TextEncoder().encode(canonicalJson(model));
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return "";
  const buf = await subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
