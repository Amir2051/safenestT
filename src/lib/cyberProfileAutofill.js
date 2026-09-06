import { base44 } from "@/api/base44Client";

/**
 * Client-side reimplementation of the `generateCyberProfileDraft` backend function.
 *
 * Why: backend functions return HTTP 402 on the current plan, so the
 * "Auto-Fill from Case" feature was dead. This module runs the same
 * extraction pipeline client-side using the working Core.InvokeLLM
 * integration (real AI — not a mock), the entity SDK for case + correlation
 * reads, and deterministic field mapping.
 *
 * Returns { profile, extracted } where `extracted` is false when no
 * source text was available for AI extraction (caller shows the
 * "No extractable case information was found" message).
 */

const EMPTY = (v) =>
  v === undefined || v === null || v === "" ||
  (typeof v === "number" && v === 0);

/**
 * Merge a single field: keep the current value if it holds real user input,
 * otherwise adopt the extracted value. `defaults` lists placeholder values
 * (e.g. "Unknown", "Medium") that are safe to overwrite.
 */
function pick(current, extracted, defaults = []) {
  if (!EMPTY(current) && !defaults.includes(current)) return current;
  if (!EMPTY(extracted)) return extracted;
  return current;
}

/**
 * Produce a merged profile that preserves existing user-entered values and
 * only fills empty/placeholder fields from the extracted draft.
 */
export function mergeProfiles(current, draft) {
  if (!current) return draft;
  const D = ["Unknown", "Medium", "Low", "USD", "Draft"];
  const mergeSection = (cur, ext) => {
    if (!cur) return ext || {};
    if (!ext) return cur;
    const out = { ...cur };
    for (const k of Object.keys(ext)) {
      out[k] = pick(cur[k], ext[k], D);
    }
    return out;
  };

  return {
    ...draft,
    case_id: current.case_id || draft.case_id,
    status: current.status || draft.status,
    victim_profile: mergeSection(current.victim_profile, draft.victim_profile),
    suspect_profile: mergeSection(current.suspect_profile, draft.suspect_profile),
    modus_operandi: mergeSection(current.modus_operandi, draft.modus_operandi),
    // Linked intelligence + transaction analysis are deterministic (not user
    // editable per-field), so adopt the extracted values.
    linked_intelligence: draft.linked_intelligence,
    transaction_analysis: mergeSection(current.transaction_analysis, draft.transaction_analysis),
    evidence_summary: pick(current.evidence_summary, draft.evidence_summary, D),
    investigator_analysis: mergeSection(current.investigator_analysis, draft.investigator_analysis),
    investigator_notes: pick(current.investigator_notes, draft.investigator_notes),
    edit_log: [...(current.edit_log || []), ...(draft.edit_log || [])],
  };
}

export async function generateCyberProfileDraftClient(caseId) {
  if (!caseId) throw new Error("Case ID required");

  // 1. Fetch the case
  const caseData = await base44.entities.MyCase.get(caseId);
  if (!caseData) throw new Error("Case not found");

  // 2. Intelligence Correlation Engine — scan recent cases for shared
  //    wallets / emails / phones / socials (best-effort; failures degrade
  //    gracefully to no linked cases).
  const identifiers = {
    wallets: [
      caseData.scammer_wallet,
      ...(caseData.monitored_wallets || []),
      ...(caseData.scammer_info?.wallet_addresses || []),
    ].filter(Boolean),
    emails: [
      caseData.scammer_info?.email,
      ...(caseData.scammer_info?.known_emails || []),
    ].filter(Boolean),
    phones: [caseData.scammer_info?.phone].filter(Boolean),
    socials: (caseData.scammer_info?.social_media || [])
      .map((s) => (typeof s === "string" ? s : s.url || s.profile))
      .filter(Boolean),
  };

  const scanResults = new Map();
  const addMatch = (c, type, value, confidence) => {
    if (c.id === caseId) return;
    if (!scanResults.has(c.id)) {
      scanResults.set(c.id, {
        case_id: c.id,
        case_number: c.case_number,
        loss_amount: c.amount_lost || 0,
        status: c.status,
        created_date: c.created_date,
        matches: [],
      });
    }
    const rec = scanResults.get(c.id);
    if (!rec.matches.some((m) => m.type === type && m.value === value)) {
      rec.matches.push({ type, value, confidence });
    }
  };

  let recentCases = [];
  try {
    if (
      identifiers.wallets.length ||
      identifiers.emails.length ||
      identifiers.phones.length ||
      identifiers.socials.length
    ) {
      recentCases = await base44.entities.MyCase.list("-created_date", 500);
    }
  } catch (e) {
    // correlation is best-effort
  }

  recentCases.forEach((c) => {
    if (c.id === caseId) return;
    if (c.scammer_wallet && identifiers.wallets.includes(c.scammer_wallet))
      addMatch(c, "Wallet", c.scammer_wallet, "High");
    const cEmails = [c.scammer_info?.email, ...(c.scammer_info?.known_emails || [])].filter(Boolean);
    const commonEmail = identifiers.emails.find((e) => cEmails.includes(e));
    if (commonEmail) addMatch(c, "Email", commonEmail, "High");
    const cPhone = c.scammer_info?.phone;
    if (cPhone && identifiers.phones.includes(cPhone))
      addMatch(c, "Phone", cPhone, "High");
    const cSocials = (c.scammer_info?.social_media || []).map((s) =>
      typeof s === "string" ? s : s.url || s.profile
    );
    const commonSocial = identifiers.socials.find((s) => cSocials.includes(s));
    if (commonSocial) addMatch(c, "Social Handle", commonSocial, "Medium");
  });

  let totalLinkedLoss = 0;
  let earliestDate = caseData.created_date;
  let latestDate = caseData.created_date;
  const linkedCasesList = Array.from(scanResults.values()).map((r) => {
    const isHigh = r.matches.some((m) => m.confidence === "High");
    const isMedium = r.matches.some((m) => m.confidence === "Medium");
    const confidence = isHigh ? "High" : isMedium ? "Medium" : "Low";
    totalLinkedLoss += r.loss_amount || 0;
    if (new Date(r.created_date) < new Date(earliestDate)) earliestDate = r.created_date;
    if (new Date(r.created_date) > new Date(latestDate)) latestDate = r.created_date;
    return {
      case_id: r.case_id,
      case_number: r.case_number,
      loss_amount: r.loss_amount,
      match_type: r.matches.map((m) => m.type).join(", "),
      match_value: r.matches.map((m) => m.value).join(", "),
      confidence,
      status: r.status,
    };
  });

  const linkedIntelligence = {
    summary: {
      total_linked: linkedCasesList.length,
      total_loss: totalLinkedLoss,
      earliest_activity: earliestDate,
      latest_activity: latestDate,
      campaign_assessment:
        linkedCasesList.length > 2
          ? "Organized Campaign Likely"
          : linkedCasesList.length > 0
          ? "Repeat Offender"
          : "Isolated Incident",
    },
    linked_cases: linkedCasesList,
  };

  // 3. Deterministic evidence summary
  const evidenceList = (caseData.evidence_files || [])
    .map((f) => `- ${f.name} (${f.type})`)
    .join("\n");
  const walletList = [
    caseData.scammer_wallet,
    ...(caseData.monitored_wallets || []),
    ...(caseData.scammer_info?.wallet_addresses || []),
  ]
    .filter(Boolean)
    .join(", ");
  const evidenceSummary = [
    "**Uploaded Evidence:**",
    evidenceList || "None",
    "",
    "**Identified Wallets:**",
    walletList || "None",
    "",
    "**Linked Cases:**",
    linkedCasesList.map((c) => `- ${c.case_number} (${c.match_type})`).join("\n") ||
      "None found",
  ].join("\n");

  // 4. Decide whether AI extraction has any source text to work with.
  //    A bare `issue_type` classification is not enough — we need narrative,
  //    suspect, timeline, or note content to actually extract from.
  const hasSource = !!(
    (caseData.description && caseData.description.trim()) ||
    caseData.scammer_info ||
    (caseData.timeline && caseData.timeline.length) ||
    (caseData.case_notes && caseData.case_notes.length)
  );

  // 5. AI extraction (real InvokeLLM call — identical prompt + schema to the
  //    original backend function so behavior is preserved).
  let aiData = {};
  if (hasSource) {
    const aiContext = {
      description: caseData.description,
      scammer_info: caseData.scammer_info,
      timeline: caseData.timeline,
      notes: (caseData.case_notes || []).map((n) => n.note).join("\n"),
      issue_type: caseData.issue_type,
      linked_intelligence: linkedIntelligence,
    };

    const prompt = `
You are a Cyber Fraud Intelligence Analyst using advanced profiling techniques.
Extract a structured intelligence profile from the provided case data, incorporating Behavioral and Psychological Profiling.

CASE DATA:
${JSON.stringify(aiContext, null, 2)}

REQUIREMENTS:
- Be objective and professional.
- Mark uncertain info as "Unknown".
- Psychological Profiling: Infer the suspect's psychological traits based on communication style and manipulation tactics.
- Threat Attribution: Compare the observed MO and technical indicators with known global threat actor patterns (e.g., Pig Butchering/Sha Zhu Pan, Tech Support syndicates, Ponzi schemes). Suggest a likely threat group category.
- Linked Intelligence: Use the provided linked cases to assess the scale of the operation.

Generate a JSON object with these keys:
- victim_platform
- victim_contact
- victim_dates
- victim_statement
- suspect_aliases
- suspect_location
- suspect_socials
- suspect_comms
- suspect_behavior: Include psychological assessment here.
- suspect_scam_type
- suspect_confidence
- mo_contact
- mo_escalation
- mo_manipulation
- mo_extraction
- mo_timeline
- analysis_pattern
- analysis_organized
- analysis_similarities: Explicitly reference linked cases and shared indicators found.
- analysis_risk
- analysis_attribution: Suggest specific threat campaign types.
`;

    aiData = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          victim_platform: { type: "string" },
          victim_contact: { type: "string" },
          victim_dates: { type: "string" },
          victim_statement: { type: "string" },
          suspect_aliases: { type: "string" },
          suspect_location: { type: "string" },
          suspect_socials: { type: "string" },
          suspect_comms: { type: "string" },
          suspect_behavior: { type: "string" },
          suspect_scam_type: { type: "string" },
          suspect_confidence: { type: "string", enum: ["Low", "Medium", "High"] },
          mo_contact: { type: "string" },
          mo_escalation: { type: "string" },
          mo_manipulation: { type: "string" },
          mo_extraction: { type: "string" },
          mo_timeline: { type: "string" },
          analysis_pattern: { type: "string" },
          analysis_organized: { type: "string" },
          analysis_similarities: { type: "string" },
          analysis_risk: { type: "string" },
          analysis_attribution: { type: "string" },
        },
      },
    });
  }

  // 6. Build the profile object (same shape as the backend function)
  const user = await base44.auth.me().catch(() => null);
  const profile = {
    case_id: caseData.id,
    status: "Draft",
    victim_profile: {
      identifier: caseData.client_name || "Unknown",
      contact_method: aiData.victim_contact || "Unknown",
      platforms: aiData.victim_platform || "",
      loss_amount: caseData.amount_lost || 0,
      currency: caseData.cryptocurrency || "USD",
      date_range: aiData.victim_dates || "",
      statement: aiData.victim_statement || caseData.description || "",
    },
    suspect_profile: {
      aliases: aiData.suspect_aliases || caseData.scammer_info?.name || "",
      location: aiData.suspect_location || caseData.scammer_info?.location || "",
      social_media: aiData.suspect_socials || "",
      communication_methods: aiData.suspect_comms || "",
      behavioral_indicators: aiData.suspect_behavior || "",
      scam_type: aiData.suspect_scam_type || caseData.issue_type || "",
      confidence_level: aiData.suspect_confidence || "Medium",
      wallets: walletList,
    },
    modus_operandi: {
      initial_contact: aiData.mo_contact || "",
      escalation: aiData.mo_escalation || "",
      manipulation: aiData.mo_manipulation || "",
      financial_extraction: aiData.mo_extraction || "",
      timeline_summary: aiData.mo_timeline || "",
    },
    linked_intelligence: linkedIntelligence,
    transaction_analysis: {
      flow_summary:
        caseData.description && caseData.description.includes("transaction")
          ? caseData.description
          : "",
      risk_score:
        caseData.amount_lost > 10000 ? 75 : caseData.amount_lost > 5000 ? 50 : 25,
      risk_level:
        caseData.amount_lost > 10000
          ? "High"
          : caseData.amount_lost > 5000
          ? "Medium"
          : "Low",
      total_hops: (caseData.transaction_hashes || []).length,
      exchanges: [],
      mixers_detected: false,
    },
    evidence_summary: evidenceSummary,
    investigator_analysis: {
      pattern_assessment: aiData.analysis_pattern || "",
      organized_fraud_indicators: aiData.analysis_organized || "",
      similarities: aiData.analysis_similarities || "",
      repeat_risk: aiData.analysis_risk || "",
      attribution_notes: aiData.analysis_attribution || "",
    },
    investigator_notes: "",
    edit_log: [
      {
        timestamp: new Date().toISOString(),
        user_email: user?.email || "system",
        action: "Auto-Generated Profile (client-side extraction)",
      },
    ],
  };

  return { profile, extracted: hasSource };
}