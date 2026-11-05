import React from "react";
import { formatDate, INDICATOR_TYPE_LABEL } from "@/lib/report/reportModel";

/**
 * In-app rendering of the SafeNestT case report. Paper-style so it reads the
 * same as the exported PDF; renders ONLY from the normalized report model.
 */

const TONE = {
  positive: "text-emerald-700 border-emerald-600/40 bg-emerald-50",
  caution: "text-amber-700 border-amber-600/40 bg-amber-50",
  neutral: "text-slate-600 border-slate-400/50 bg-slate-50",
  negative: "text-red-700 border-red-600/40 bg-red-50",
};
const SEV = { critical: "text-red-700", high: "text-amber-700", medium: "text-cyan-700", low: "text-slate-500" };
const RISK_BAR = { critical: "bg-red-600", high: "bg-amber-500", medium: "bg-cyan-600", low: "bg-emerald-600" };
const RISK_TXT = { critical: "text-red-700", high: "text-amber-700", medium: "text-cyan-700", low: "text-emerald-700" };

function Section({ n, title, children }) {
  return (
    <section className="mt-8 break-inside-avoid-page">
      <h2 className="text-[15px] font-bold text-[#0A0E27] flex items-baseline gap-2">
        <span className="tabular-nums">{n}.</span>{title}
      </h2>
      <div className="mt-1.5 mb-3 h-px bg-slate-200 relative"><span className="absolute left-0 top-0 h-[2px] w-10 bg-cyan-600" /></div>
      {children}
    </section>
  );
}

function Table({ cols, rows, dense }) {
  if (!rows?.length) return null;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className={`w-full border-collapse ${dense ? "text-[11px]" : "text-[12.5px]"}`}>
        <thead>
          <tr className="bg-[#0A0E27] text-white">
            {cols.map((c) => (
              <th key={c.header} className="text-left font-semibold uppercase tracking-wider text-[10px] px-2.5 py-2" style={{ width: c.width }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.ref || r.id || r.value || i} className={`border-b border-slate-200 align-top ${i % 2 ? "bg-slate-50" : ""}`}>
              {cols.map((c) => (
                <td key={c.header} className={`px-2.5 py-2 text-slate-700 ${c.className || ""} ${c.cls ? c.cls(r) : ""}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const KV = ({ pairs }) => (
  <Table
    cols={[{ header: "Field", width: "30%", key: "k", className: "font-semibold text-slate-900" }, { header: "Detail", key: "v", className: "break-words" }]}
    rows={pairs.filter(([, v]) => v).map(([k, v]) => ({ k, v, id: k }))}
  />
);

const Bullets = ({ items }) => (
  <ul className="space-y-1.5 text-[13px] text-slate-700">
    {items.map((it, i) => (
      <li key={i} className="flex gap-2"><span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" /><span className="break-words min-w-0">{it}</span></li>
    ))}
  </ul>
);

export default function CaseReportDocument({ model, integrity = "", draft = true }) {
  if (!model) return null;
  const c = model.case || {};
  let n = 0;
  const next = () => ++n;

  return (
    <article className="bg-white text-slate-800 rounded-lg shadow-2xl shadow-black/40 overflow-hidden max-w-[900px] mx-auto font-sans">
      {/* Letterhead */}
      <header className="bg-[#0A0E27] text-white px-6 sm:px-10 pt-7 pb-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 -ml-2">
              <img src={BRAND_LOGO.dataUrl} alt="SafeNestT" className="h-14 sm:h-16 w-auto select-none" draggable={false} />
              <div className="border-l border-slate-500/60 pl-3 text-[10px] leading-snug tracking-[0.12em]">
                <p className="font-semibold text-slate-200">SECURITY OPERATIONS</p>
                <p className="text-slate-300/80">&amp; INVESTIGATION SERVICES</p>
              </div>
            </div>
            <h1 className="text-2xl sm:text-[28px] font-bold mt-5 leading-tight">{model.title}</h1>
            <p className="text-sm text-slate-300 mt-1">{c.title || c.number}</p>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="inline-block border border-[#FF1493] rounded px-3 py-1 text-xs font-bold tracking-wider">{model.classification}</span>
            {draft && <span className="inline-block ml-2 border border-amber-400 text-amber-300 rounded px-2 py-1 text-xs font-bold tracking-wider">DRAFT</span>}
            <p className="text-[11px] text-slate-300 mt-3">Report No. <span className="font-mono">{model.report_number}</span></p>
            <p className="text-[11px] text-slate-300">Data as of {formatDate(model.as_of, { withTime: true })}</p>
          </div>
        </div>
        <div className="absolute left-0 right-0 bottom-0 h-[3px] flex"><span className="w-[62%] bg-[#00D9FF]" /><span className="flex-1 bg-[#FF1493]" /></div>
      </header>

      <div className="px-6 sm:px-10 py-7">
        <KV pairs={[["Case number", c.number], ["Prepared by", model.prepared_by], ["Distribution", model.distribution], ["Analysis engine", model.engine]]} />

        {/* Key figures */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-5">
          {[
            ["Risk", model.risk ? `${model.risk.score}/100` : "Not scored", model.risk ? model.risk.level.toUpperCase() : "", model.risk ? RISK_TXT[model.risk.level] : "text-slate-500", model.risk ? RISK_BAR[model.risk.level] : "bg-slate-300"],
            ["Verified", model.counts.verified, "findings", "text-emerald-700", "bg-emerald-600"],
            ["Partial", model.counts.partially_supported, "need corroboration", "text-amber-700", "bg-amber-500"],
            ["Evidence", model.counts.evidence, `${model.counts.primary_evidence} primary`, "text-cyan-700", "bg-cyan-600"],
            ["Reported loss", c.reported_loss || "—", c.asset, "text-slate-900", "bg-slate-800"],
          ].map(([k, v, s, txt, bar]) => (
            <div key={k} className="relative border border-slate-200 rounded-md pl-3.5 pr-2 py-2.5">
              <span className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md ${bar}`} />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{k}</p>
              <p className={`text-lg font-bold tabular-nums ${txt}`}>{v}</p>
              <p className="text-[10.5px] text-slate-500 truncate">{s}</p>
            </div>
          ))}
        </div>

        <Section n={next()} title="Executive Summary">
          <div className="space-y-2 text-[14px] text-slate-900 leading-relaxed">{model.executive_summary.map((p, i) => <p key={i}>{p}</p>)}</div>
        </Section>

        <Section n={next()} title="Case Overview">
          <KV pairs={[
            ["Case title", c.title], ["Fraud type", c.fraud_type], ["Incident date", formatDate(c.incident_date)], ["Reported loss", c.reported_loss],
            ["Asset / network", c.asset], ["Reporting party", c.reporting_party], ["Case status", c.status], ["Priority", c.priority],
            ["IC3 reference", c.ic3_reference], ["Federal reference", c.federal_reference], ["Assigned investigator", c.investigator],
          ]} />
        </Section>

        {(model.scope || model.objectives.length > 0 || model.hypotheses.length > 0) && (
          <Section n={next()} title="Scope and Objectives">
            {model.scope && <p className="text-[13px] text-slate-700 mb-3 break-words">{model.scope}</p>}
            {model.objectives.length > 0 && <><h3 className="text-[13px] font-bold text-slate-900 mb-1.5">Objectives</h3><Bullets items={model.objectives} /></>}
            {model.hypotheses.length > 0 && <><h3 className="text-[13px] font-bold text-slate-900 mt-3 mb-1.5">Working hypotheses <span className="font-normal text-slate-500">(to be tested — not findings)</span></h3><Bullets items={model.hypotheses} /></>}
          </Section>
        )}

        {(model.subjects.length > 0 || model.indicators.length > 0) && (
          <Section n={next()} title="Subjects and Indicators">
            {model.subjects.length > 0 && <p className="text-[13px] font-semibold text-slate-900 mb-2">Named subject(s): {model.subjects.join("; ")}</p>}
            <Table cols={[
              { header: "Type", width: "20%", render: (r) => INDICATOR_TYPE_LABEL[r.type] || r.type, className: "font-semibold text-slate-900" },
              { header: "Indicator", render: (r) => <span className="font-mono text-[11.5px] break-all">{r.value}</span> },
              { header: "Recorded in", width: "28%", render: (r) => r.sources.join(", ") },
            ]} rows={model.indicators} />
          </Section>
        )}

        <Section n={next()} title="Findings">
          {!model.findings.length ? (
            <p className="text-[13px] text-slate-500">No findings have passed into this report.</p>
          ) : (
            <>
              <Table cols={[
                { header: "Ref", width: "8%", key: "ref", className: "font-bold text-slate-900" },
                { header: "Finding", key: "title" },
                { header: "Severity", width: "12%", render: (r) => r.severity.toUpperCase(), cls: (r) => `font-bold ${SEV[r.severity] || ""}` },
                { header: "Confidence", width: "12%", render: (r) => r.confidence.toUpperCase() },
                { header: "Status", width: "19%", render: (r) => <span className={`inline-block border rounded px-1.5 py-0.5 text-[10.5px] font-bold ${TONE[r.tone]}`}>{r.status_label}</span> },
              ]} rows={model.findings} />
              <div className="mt-5 space-y-5">
                {model.findings.map((f) => (
                  <div key={f.ref} className="border-t border-slate-200 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[14px] font-bold text-slate-900"><span className="text-slate-500 mr-2">{f.ref}</span>{f.title}</h3>
                      <span className={`shrink-0 border rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE[f.tone]}`}>{f.status_label}</span>
                    </div>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">{[f.finding_kind || f.category, `Severity ${f.severity}`, `Confidence ${f.confidence}`, f.source].filter(Boolean).join("  ·  ")}</p>
                    {f.description && <p className="text-[13px] text-slate-900 mt-2 break-words">{f.description}</p>}
                    {f.assessment && (<><p className="text-[12px] font-bold text-slate-900 mt-3">Evidence assessment</p><p className="text-[13px] text-slate-700 break-words">{f.assessment}</p></>)}
                    {f.limitation && <p className="text-[12px] text-amber-700 mt-2">Limitation: {f.limitation}</p>}
                    <p className="text-[12px] text-slate-500 mt-2">Supporting record: {[...f.evidence_refs, ...(f.case_record_refs ? ["case intake record"] : [])].join(", ") || "none attached"}</p>
                    <p className="text-[12px] text-slate-500">Status: {f.status_label} — {f.status_meaning}{f.reviewer ? ` Reviewed by ${f.reviewer}${f.review_date ? `, ${formatDate(f.review_date)}` : ""}.` : ""}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Section>

        {model.risk && (
          <Section n={next()} title="Risk Assessment">
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-bold tabular-nums ${RISK_TXT[model.risk.level]}`}>{model.risk.score}</span>
              <span className="text-slate-500">/100</span>
              <span className={`ml-2 border rounded px-2 py-0.5 text-[11px] font-bold ${RISK_TXT[model.risk.level]} border-current`}>{model.risk.level.toUpperCase()} RISK</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden"><div className={`h-full ${RISK_BAR[model.risk.level]}`} style={{ width: `${Math.max(2, model.risk.score)}%` }} /></div>
            <p className="text-[12px] text-slate-500 mt-3 mb-3">The score is computed deterministically from the evidence-checked findings, the reported loss and the fraud type. No AI model is involved in scoring.</p>
            <Table cols={[{ header: "Contributing factor", key: "factor" }, { header: "Points", width: "15%", render: (r) => `+${r.weight}`, className: "font-bold text-slate-900" }]} rows={model.risk.factors} />
          </Section>
        )}

        <Section n={next()} title="Evidence Register">
          {!model.evidence.length ? <p className="text-[13px] text-slate-500">No evidence items are attached to this case.</p> : (
            <>
              {!model.counts.primary_evidence && <p className="text-[12px] font-semibold text-amber-700 mb-2">Note: all items are automated intelligence queries. No primary records (statements, transaction records, communications) are attached yet.</p>}
              {model.shared_query_target && <p className="text-[12px] text-slate-700 mb-2 break-all">All automated queries targeted the {model.shared_query_target.subtype.toLowerCase()} <span className="font-mono">{model.shared_query_target.value}</span>.</p>}
              <Table dense cols={[
                { header: "Ref", width: "7%", key: "ref", className: "font-bold text-slate-900" },
                { header: "Item", render: (r) => (<>{r.label}{r.target && !(model.shared_query_target && !r.is_primary) && <span className="block font-mono text-[10.5px] text-slate-500 break-all">{r.target.value}</span>}</>) },
                { header: "Type", width: "12%", key: "kind" },
                { header: "Source", width: "17%", key: "source" },
                { header: "Collected", width: "16%", render: (r) => formatDate(r.collected_at, { withTime: true }) },
                { header: "Integrity", width: "24%", render: (r) => r.integrity ? <span className="font-mono text-[10px] break-all"><span className="text-slate-500 font-sans">{r.integrity.kind}: </span>{r.integrity.value}</span> : "—" },
              ]} rows={model.evidence} />
            </>
          )}
        </Section>

        {model.excluded_findings.length > 0 && (
          <Section n={next()} title="Excluded Claims">
            <p className="text-[12px] text-slate-500 mb-2">Generated during analysis but excluded from the conclusions of this report.</p>
            <Table cols={[
              { header: "Claim", render: (r) => (/^here'?s a thinking process/i.test(r.title) ? "Malformed analysis output (discarded)" : r.title) },
              { header: "Reason", width: "30%", key: "status_label", className: "text-red-700 font-semibold" },
            ]} rows={model.excluded_findings} />
          </Section>
        )}

        {(model.gaps.length > 0 || model.next_steps.length > 0) && (
          <Section n={next()} title="Intelligence Gaps and Recommended Next Steps">
            {model.gaps.length > 0 && <><h3 className="text-[13px] font-bold text-slate-900 mb-1.5">Open gaps</h3><Bullets items={model.gaps} /></>}
            {model.next_steps.length > 0 && <><h3 className="text-[13px] font-bold text-slate-900 mt-3 mb-1.5">Recommended next steps</h3><Bullets items={model.next_steps} /></>}
          </Section>
        )}

        <Section n={next()} title="Methodology">
          <Table cols={[
            { header: "Stage", key: "phase", className: "font-semibold text-slate-900" },
            { header: "Status", width: "20%", key: "status" },
            { header: "Completed", width: "32%", render: (r) => formatDate(r.completed_at, { withTime: true }) || "—" },
          ]} rows={model.methodology.map((m) => ({ ...m, id: m.phase }))} />
          {model.analyst_narrative && (<><h3 className="text-[13px] font-bold text-slate-900 mt-4">Analyst narrative <span className="font-normal text-slate-500">(AI-assisted)</span></h3><p className="text-[13px] italic text-slate-700 break-words">{model.analyst_narrative}</p></>)}
          {model.reality_check_note && (<><h3 className="text-[13px] font-bold text-slate-900 mt-3">Reality-check note <span className="font-normal text-slate-500">(AI-assisted)</span></h3><p className="text-[13px] italic text-slate-700 break-words">{model.reality_check_note}</p></>)}
        </Section>

        <Section n={next()} title="Limitations and Disclaimer">
          <Bullets items={model.limitations} />
        </Section>

        <div className="mt-8">
          <h3 className="text-[13px] font-bold text-slate-900 mb-1.5">Document control</h3>
          <KV pairs={[
            ["Report number", model.report_number],
            ["Data as of", formatDate(model.as_of, { withTime: true })],
            ["Report format", `SafeNestT case report v${model.schema_version}`],
            ["Integrity (SHA-256)", integrity || "Draft — not yet issued"],
          ]} />
        </div>
      </div>
      <footer className="border-t border-slate-200 px-6 sm:px-10 py-3 text-[10.5px] text-slate-500 flex flex-wrap justify-between gap-2">
        <span>{model.classification} · Report No. {model.report_number}</span>
        <span className="font-mono break-all">{integrity ? `SHA-256 ${integrity}` : "DRAFT — not issued"}</span>
      </footer>
    </article>
  );
}
