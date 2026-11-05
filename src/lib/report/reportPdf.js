/**
 * Branded PDF for a SafeNestT case report. Renders ONLY from the normalized
 * report model (reportModel.js), so the PDF and the in-app view always agree.
 *
 * Layout: A4 portrait, letterhead on page 1, running header + footer with
 * classification, report number, page X of Y and integrity fingerprint.
 */
import { jsPDF } from "jspdf";
import { formatDate, INDICATOR_TYPE_LABEL } from "./reportModel.js";
import { BRAND_LOGO } from "./brandLogo.js";

const LOGO_RATIO = BRAND_LOGO.width / BRAND_LOGO.height;

// Brand palette (print-safe: navy + cyan, magenta only as a thin accent).
const C = {
  navy: [10, 14, 39], ink: [22, 27, 45], body: [52, 58, 74], muted: [110, 118, 135],
  rule: [214, 219, 228], zebra: [246, 248, 251], cyan: [0, 150, 190], cyanBright: [0, 217, 255],
  magenta: [255, 20, 147], red: [176, 32, 48], amber: [176, 112, 0], green: [20, 128, 74], white: [255, 255, 255],
};
const TONE = { positive: C.green, caution: C.amber, neutral: C.muted, negative: C.red };
const SEV = { critical: C.red, high: C.amber, medium: C.cyan, low: C.muted };
const RISK = { critical: C.red, high: C.amber, medium: C.cyan, low: C.green };

const PAGE = { w: 595.28, h: 841.89, m: 48, top: 70, bottom: 64 };

export function renderReportPdf(model, { integrity = "" } = {}) {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  doc.setProperties({
    title: `${model.title} — ${model.case?.number || ""}`,
    subject: model.classification,
    author: model.prepared_by,
    creator: "SafeNestT",
  });
  const W = PAGE.w - PAGE.m * 2;
  let y = PAGE.top;

  // ── primitives ───────────────────────────────────────────────────────────
  const font = (style = "normal", size = 9.5, color = C.body) => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
  };
  const ensure = (h) => { if (y + h > PAGE.h - PAGE.bottom) { doc.addPage(); y = PAGE.top; } };

  // Wraps text, also breaking long unbroken tokens (wallet addresses, hashes).
  // Explicit "\n" starts a new line.
  const wrap = (text, width) => String(text ?? "").split("\n").flatMap((part) => wrapLine(part, width));
  const wrapLine = (text, width) => {
    const words = String(text ?? "").split(/(\s+)/);
    const lines = [];
    let line = "";
    const push = () => { lines.push(line.trimEnd()); line = ""; };
    words.forEach((w) => {
      if (/^\s+$/.test(w)) { if (line) line += " "; return; }
      if (doc.getTextWidth(line + w) <= width) { line += w; return; }
      if (line.trim()) push();
      let chunk = "";
      for (const ch of w) {
        if (doc.getTextWidth(chunk + ch) > width) { lines.push(chunk); chunk = ""; }
        chunk += ch;
      }
      line = chunk;
    });
    if (line.trim() || !lines.length) push();
    return lines;
  };

  const para = (text, { size = 9.5, style = "normal", color = C.body, indent = 0, gap = 6, lh = 1.45 } = {}) => {
    if (!text) return;
    font(style, size, color);
    wrap(text, W - indent).forEach((ln) => { ensure(size * lh); doc.text(ln, PAGE.m + indent, y); y += size * lh; });
    y += gap;
  };

  const bullets = (items, opts = {}) => {
    (items || []).filter(Boolean).forEach((it) => {
      font("normal", 9.5, C.body);
      const lines = wrap(it, W - 14);
      ensure(14);
      doc.setFillColor(...C.cyan); doc.circle(PAGE.m + 3, y - 3, 1.4, "F");
      lines.forEach((ln) => { ensure(13.8); doc.text(ln, PAGE.m + 12, y); y += 13.8; });
      y += 2;
    });
    y += opts.gap ?? 4;
  };

  let sectionNo = 0;
  const section = (title) => {
    sectionNo += 1;
    ensure(48);
    y += 8;
    font("bold", 12.5, C.navy);
    doc.text(`${sectionNo}. ${title}`, PAGE.m, y);
    y += 6;
    doc.setDrawColor(...C.cyan); doc.setLineWidth(1.2); doc.line(PAGE.m, y, PAGE.m + 34, y);
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.5); doc.line(PAGE.m + 34, y, PAGE.m + W, y);
    y += 14;
  };
  const sub = (title) => { ensure(28); font("bold", 10, C.ink); doc.text(title, PAGE.m, y); y += 13; };

  const pill = (text, x, yy, color) => {
    font("bold", 7, color);
    const tw = doc.getTextWidth(text) + 8;
    doc.setDrawColor(...color); doc.setLineWidth(0.6);
    doc.roundedRect(x, yy - 8, tw, 11, 2.5, 2.5, "S");
    doc.text(text, x + 4, yy);
    return tw;
  };

  /**
   * Table with wrapped cells, zebra rows, and the header repeated on page break.
   * cols: [{ header, width (fraction), render?(row)->string, color?(row)->rgb, bold? }]
   */
  const table = (cols, rows, { size = 8.5 } = {}) => {
    if (!rows?.length) return;
    const widths = cols.map((c) => c.width * W);
    const pad = 5, lh = size * 1.35;
    const drawHeader = () => {
      ensure(22);
      doc.setFillColor(...C.navy); doc.rect(PAGE.m, y - 11, W, 17, "F");
      font("bold", 7.5, C.white);
      let x = PAGE.m;
      cols.forEach((c, i) => { doc.text(c.header.toUpperCase(), x + pad, y); x += widths[i]; });
      y += 10;
    };
    drawHeader();
    rows.forEach((row, ri) => {
      const cells = cols.map((c, i) => {
        font(c.bold ? "bold" : "normal", size, C.body);
        return wrap(c.render ? c.render(row) : row[c.key] ?? "", widths[i] - pad * 2);
      });
      const h = Math.max(...cells.map((l) => l.length)) * lh + pad * 1.4;
      if (y + h > PAGE.h - PAGE.bottom) { doc.addPage(); y = PAGE.top; drawHeader(); }
      if (ri % 2 === 1) { doc.setFillColor(...C.zebra); doc.rect(PAGE.m, y - 2, W, h, "F"); }
      let x = PAGE.m;
      cells.forEach((lines, i) => {
        const c = cols[i];
        font(c.bold ? "bold" : "normal", size, c.color ? c.color(row) : C.body);
        lines.forEach((ln, li) => doc.text(ln, x + pad, y + pad + li * lh + size * 0.55));
        x += widths[i];
      });
      y += h;
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.4); doc.line(PAGE.m, y - 2, PAGE.m + W, y - 2);
    });
    y += 12;
  };

  const kv = (pairs) => table(
    [{ header: "Field", width: 0.3, key: "k", bold: true, color: () => C.ink }, { header: "Detail", width: 0.7, key: "v" }],
    pairs.filter(([, v]) => v).map(([k, v]) => ({ k, v })),
  );

  // ── Letterhead (page 1) ──────────────────────────────────────────────────
  doc.setFillColor(...C.navy); doc.rect(0, 0, PAGE.w, 118, "F");
  doc.setFillColor(...C.cyanBright); doc.rect(0, 118, PAGE.w * 0.62, 3, "F");
  doc.setFillColor(...C.magenta); doc.rect(PAGE.w * 0.62, 118, PAGE.w * 0.38, 3, "F");
  // Logo sits on its own navy background, which matches the letterhead band.
  const logoH = 50, logoW = logoH * LOGO_RATIO;
  doc.addImage(BRAND_LOGO.dataUrl, "JPEG", PAGE.m - 6, 10, logoW, logoH, "sn-logo", "FAST");
  doc.setDrawColor(70, 90, 125); doc.setLineWidth(0.6); doc.line(PAGE.m - 6 + logoW + 6, 22, PAGE.m - 6 + logoW + 6, 50);
  font("bold", 7.5, [200, 215, 235]); doc.text("SECURITY OPERATIONS", PAGE.m - 6 + logoW + 14, 33);
  font("normal", 7.5, [170, 190, 215]); doc.text("& INVESTIGATION SERVICES", PAGE.m - 6 + logoW + 14, 44);
  font("bold", 20, C.white); doc.text(model.title, PAGE.m, 92);
  font("normal", 9, [190, 205, 225]); doc.text(model.case?.title || model.case?.number || "", PAGE.m, 107);
  // Classification block (right)
  font("bold", 9, C.white);
  const cls = model.classification;
  const cw = doc.getTextWidth(cls) + 18;
  doc.setDrawColor(...C.magenta); doc.setLineWidth(1); doc.roundedRect(PAGE.w - PAGE.m - cw, 30, cw, 18, 3, 3, "S");
  doc.text(cls, PAGE.w - PAGE.m - cw + 9, 42.5);
  font("normal", 8, [190, 205, 225]);
  doc.text(`Report No. ${model.report_number}`, PAGE.w - PAGE.m, 70, { align: "right" });
  doc.text(`Data as of ${formatDate(model.as_of, { withTime: true })}`, PAGE.w - PAGE.m, 82, { align: "right" });
  y = 150;

  kv([
    ["Case number", model.case.number],
    ["Prepared by", model.prepared_by],
    ["Distribution", model.distribution],
    ["Analysis engine", model.engine],
  ]);

  // Key figures strip
  const figs = [
    ["RISK", model.risk ? `${model.risk.score}/100` : "Not scored", model.risk ? (model.risk.level || "").toUpperCase() : "", model.risk ? RISK[model.risk.level] || C.ink : C.muted],
    ["VERIFIED", String(model.counts.verified), "findings", C.green],
    ["PARTIAL", String(model.counts.partially_supported), "need corroboration", C.amber],
    ["EVIDENCE", String(model.counts.evidence), `${model.counts.primary_evidence} primary`, C.cyan],
    ["REPORTED LOSS", model.case.reported_loss || "—", model.case.asset || "", C.ink],
  ];
  ensure(60);
  const fw = W / figs.length;
  figs.forEach(([k, v, s, col], i) => {
    const x = PAGE.m + i * fw;
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.6); doc.roundedRect(x + 2, y, fw - 4, 50, 3, 3, "S");
    doc.setFillColor(...col); doc.rect(x + 2, y, 3, 50, "F");
    font("bold", 6.8, C.muted); doc.text(k, x + 11, y + 13);
    font("bold", 13, col); doc.text(v, x + 11, y + 31);
    font("normal", 7, C.muted); doc.text(wrap(s, fw - 18)[0] || "", x + 11, y + 43);
  });
  y += 66;

  // ── 1. Executive summary ────────────────────────────────────────────────
  section("Executive Summary");
  model.executive_summary.forEach((p) => para(p, { size: 10, color: C.ink, gap: 4 }));

  // ── 2. Case overview ───────────────────────────────────────────────────
  section("Case Overview");
  kv([
    ["Case title", model.case.title], ["Fraud type", model.case.fraud_type], ["Incident date", formatDate(model.case.incident_date)],
    ["Reported loss", model.case.reported_loss], ["Asset / network", model.case.asset], ["Reporting party", model.case.reporting_party],
    ["Case status", model.case.status], ["Priority", model.case.priority], ["IC3 reference", model.case.ic3_reference],
    ["Federal reference", model.case.federal_reference], ["Assigned investigator", model.case.investigator],
  ]);

  // ── 3. Scope & objectives ──────────────────────────────────────────────
  if (model.scope || model.objectives.length || model.hypotheses.length) {
    section("Scope and Objectives");
    para(model.scope);
    if (model.objectives.length) { sub("Objectives"); bullets(model.objectives); }
    if (model.hypotheses.length) { sub("Working hypotheses (to be tested — not findings)"); bullets(model.hypotheses); }
  }

  // ── 4. Subjects & indicators ───────────────────────────────────────────
  if (model.subjects.length || model.indicators.length) {
    section("Subjects and Indicators");
    if (model.subjects.length) para(`Named subject(s): ${model.subjects.join("; ")}`, { style: "bold", color: C.ink });
    table([
      { header: "Type", width: 0.2, render: (r) => INDICATOR_TYPE_LABEL[r.type] || r.type, bold: true, color: () => C.ink },
      { header: "Indicator", width: 0.5, key: "value" },
      { header: "Recorded in", width: 0.3, render: (r) => r.sources.join(", ") },
    ], model.indicators);
  }

  // ── 5. Findings ────────────────────────────────────────────────────────
  section("Findings");
  if (!model.findings.length) {
    para("No findings have passed into this report. See the Excluded Claims and Recommended Next Steps sections.", { color: C.muted });
  } else {
    table([
      { header: "Ref", width: 0.08, key: "ref", bold: true, color: () => C.ink },
      { header: "Finding", width: 0.44, key: "title" },
      { header: "Severity", width: 0.14, render: (r) => r.severity.toUpperCase(), color: (r) => SEV[r.severity] || C.body, bold: true },
      { header: "Confidence", width: 0.14, render: (r) => r.confidence.toUpperCase() },
      { header: "Status", width: 0.2, key: "status_label", color: (r) => TONE[r.tone], bold: true },
    ], model.findings);

    model.findings.forEach((f) => {
      ensure(70);
      const pillText = f.status_label.toUpperCase();
      font("bold", 7);
      const pillW = doc.getTextWidth(pillText) + 8;
      font("bold", 10.5, C.ink);
      const head = wrap(`${f.ref}  ${f.title}`, W - pillW - 14);
      head.forEach((ln, i) => { doc.text(ln, PAGE.m, y + i * 14); });
      pill(pillText, PAGE.m + W - pillW, y, TONE[f.tone]);
      y += head.length * 14 + 2;
      font("normal", 8, C.muted);
      doc.text([f.finding_kind || f.category, `Severity ${f.severity}`, `Confidence ${f.confidence}`, f.source].filter(Boolean).join("  ·  "), PAGE.m, y);
      y += 13;
      para(f.description, { color: C.ink });
      if (f.assessment) { sub("Evidence assessment"); para(f.assessment); }
      if (f.limitation) para(`Limitation: ${f.limitation}`, { size: 8.5, color: C.amber, gap: 2 });
      const ev = [...f.evidence_refs, ...(f.case_record_refs ? ["case intake record"] : [])];
      para(`Supporting record: ${ev.length ? ev.join(", ") : "none attached"}`, { size: 8.5, color: C.muted, gap: 2 });
      para(`Status: ${f.status_label} — ${f.status_meaning}` + (f.reviewer ? ` Reviewed by ${f.reviewer}${f.review_date ? `, ${formatDate(f.review_date)}` : ""}.` : ""), { size: 8.5, color: C.muted });
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.4); doc.line(PAGE.m, y - 2, PAGE.m + W, y - 2); y += 8;
    });
  }

  // ── 6. Risk ────────────────────────────────────────────────────────────
  if (model.risk) {
    section("Risk Assessment");
    const col = RISK[model.risk.level] || C.ink;
    ensure(40);
    font("bold", 22, col); doc.text(`${model.risk.score}`, PAGE.m, y + 8);
    const sw = doc.getTextWidth(`${model.risk.score}`);
    font("normal", 10, C.muted); doc.text("/100", PAGE.m + sw + 3, y + 8);
    pill(`${(model.risk.level || "").toUpperCase()} RISK`, PAGE.m + sw + 36, y + 5, col);
    y += 22;
    // Score bar
    doc.setFillColor(...C.zebra); doc.roundedRect(PAGE.m, y, W, 6, 3, 3, "F");
    doc.setFillColor(...col); doc.roundedRect(PAGE.m, y, Math.max(6, (W * model.risk.score) / 100), 6, 3, 3, "F");
    y += 20;
    para("The score is computed deterministically from the evidence-checked findings, the reported loss and the fraud type. No AI model is involved in scoring.", { size: 8.5, color: C.muted });
    table([
      { header: "Contributing factor", width: 0.8, key: "factor" },
      { header: "Points", width: 0.2, render: (r) => `+${r.weight}`, bold: true, color: () => C.ink },
    ], model.risk.factors);
  }

  // ── 7. Evidence register ───────────────────────────────────────────────
  section("Evidence Register");
  if (!model.evidence.length) para("No evidence items are attached to this case.", { color: C.muted });
  else {
    if (!model.counts.primary_evidence) {
      para("Note: all items below are automated intelligence queries. No primary records (statements, transaction records, communications) are attached yet.", { size: 8.5, color: C.amber, style: "bold" });
    }
    const shared = model.shared_query_target;
    if (shared) para(`All automated queries targeted the ${shared.subtype.toLowerCase()} ${shared.value}.`, { size: 8.5, color: C.body });
    table([
      { header: "Ref", width: 0.07, key: "ref", bold: true, color: () => C.ink },
      { header: "Item", width: 0.24, render: (r) => `${r.label}\n${r.kind}` + (r.target && !(shared && !r.is_primary) ? `\n${r.target.value}` : "") },
      { header: "Result", width: 0.2, bold: true, color: (r) => TONE[r.result?.tone] || C.body,
        render: (r) => (r.is_primary ? "Primary record" : `${r.result?.label || "—"}${r.result?.state === "not_applicable" ? "\n(wrong lookup type)" : r.result?.record_count ? `\n${r.result.record_count} record(s)` : ""}`) },
      { header: "Source", width: 0.14, key: "source" },
      { header: "Collected", width: 0.13, render: (r) => formatDate(r.collected_at, { withTime: true }) },
      { header: "Integrity", width: 0.22, render: (r) => (r.integrity ? `${r.integrity.kind}: ${r.integrity.value}` : "—") },
    ], model.evidence.map((e) => ({ ...e, label: e.label })), { size: 7.5 });
  }

  // ── 8. Excluded claims ─────────────────────────────────────────────────
  if (model.excluded_findings.length) {
    section("Excluded Claims");
    para("These items were generated during analysis but are excluded from the conclusions of this report.", { size: 8.5, color: C.muted });
    table([
      { header: "Claim", width: 0.62, render: (r) => (/^here'?s a thinking process/i.test(r.title) ? "Malformed analysis output (discarded)" : r.title) },
      { header: "Reason", width: 0.38, key: "status_label", color: () => C.red },
    ], model.excluded_findings);
  }

  // ── 9. Gaps & next steps ───────────────────────────────────────────────
  if (model.gaps.length || model.next_steps.length) {
    section("Intelligence Gaps and Recommended Next Steps");
    if (model.gaps.length) { sub("Open gaps"); bullets(model.gaps); }
    if (model.next_steps.length) { sub("Recommended next steps"); bullets(model.next_steps); }
  }

  // ── 10. Methodology ────────────────────────────────────────────────────
  section("Methodology");
  table([
    { header: "Stage", width: 0.45, key: "phase", bold: true, color: () => C.ink },
    { header: "Status", width: 0.2, key: "status" },
    { header: "Completed", width: 0.35, render: (r) => formatDate(r.completed_at, { withTime: true }) || "—" },
  ], model.methodology);
  if (model.analyst_narrative) {
    sub("Analyst narrative (AI-assisted)");
    para(model.analyst_narrative, { style: "italic" });
  }
  if (model.reality_check_note) {
    sub("Reality-check note (AI-assisted)");
    para(model.reality_check_note, { style: "italic" });
  }

  // ── 11. Limitations ────────────────────────────────────────────────────
  section("Limitations and Disclaimer");
  bullets(model.limitations);

  // Document control
  ensure(70);
  sub("Document control");
  kv([
    ["Report number", model.report_number],
    ["Data as of", formatDate(model.as_of, { withTime: true })],
    ["Report format", `SafeNestT case report v${model.schema_version}`],
    ["Integrity (SHA-256)", integrity || "Draft — not yet issued"],
  ]);

  // ── Running header/footer on every page ────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) {
      const hH = 22, hW = hH * LOGO_RATIO;
      doc.setFillColor(...C.navy); doc.roundedRect(PAGE.m, 18, hW, hH, 2, 2, "F");
      doc.addImage(BRAND_LOGO.dataUrl, "JPEG", PAGE.m, 18, hW, hH, "sn-logo", "FAST");
      font("normal", 7.5, C.muted); doc.text(`${model.title} · ${model.case.number}`, PAGE.m + hW + 8, 33);
      font("bold", 7.5, C.magenta); doc.text(model.classification, PAGE.w - PAGE.m, 34, { align: "right" });
      doc.setDrawColor(...C.rule); doc.setLineWidth(0.5); doc.line(PAGE.m, 42, PAGE.w - PAGE.m, 42);
    }
    doc.setDrawColor(...C.rule); doc.setLineWidth(0.5); doc.line(PAGE.m, PAGE.h - 44, PAGE.w - PAGE.m, PAGE.h - 44);
    font("normal", 7, C.muted);
    doc.text(`${model.classification} · Report No. ${model.report_number}`, PAGE.m, PAGE.h - 32);
    doc.text(`Page ${i} of ${pages}`, PAGE.w - PAGE.m, PAGE.h - 32, { align: "right" });
    font("normal", 6.5, [150, 156, 170]);
    doc.text(integrity ? `Integrity (SHA-256) ${integrity}` : "DRAFT — not issued; no integrity fingerprint", PAGE.m, PAGE.h - 22);
  }
  return doc;
}

export function reportFileName(model) {
  return `${model.report_number}.pdf`.replace(/[^A-Za-z0-9._-]+/g, "_");
}
