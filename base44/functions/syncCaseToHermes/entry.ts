import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import {
  loadHermesCredentials, normalizeRoot, buildInvestigationsUrl, investigationFetch, extractInvestigationId,
} from "../../shared/hermesHttp.ts";

/**
 * syncCaseToHermes — idempotently synchronizes a SafeNestT InvestigationCase to
 * the Hermes investigation engine.
 *
 * SafeNestT is the CANONICAL case-management system; Hermes is the
 * investigation engine. This function creates (or re-links) the Hermes
 * investigation for a SafeNestT case and stores the mapping on the case record:
 *
 *   safenestt case_id  ↔  hermes_investigation_id   (case.workflow.hermes_investigation_id)
 *   sync_status        →  pending | active | synced | failed
 *   last_synced_at     →  ISO timestamp
 *
 * Idempotent:
 *   - If the case already has a hermes_investigation_id that Hermes still
 *     recognizes (GET ok), the existing mapping is kept (no duplicate).
 *   - If the stored id is stale (Hermes 404), it is cleared and a new
 *     investigation is created.
 *   - If no id exists, a new investigation is created from the ACTUAL case data.
 *
 * Narrative-tolerant (no minimum target required):
 *   Hermes is sent every real target embedded in the case (explicit targets,
 *   suspect/scammer wallets, domains, IPs, emails, phones, tx hashes, evidence
 *   auto-detection). When NO external indicator exists, the case narrative /
 *   description is submitted as the investigation subject (type "narrative") so
 *   Hermes can analyze what was actually submitted — no targets are invented,
 *   no placeholder wallets/domains are substituted.
 *
 * This does NOT start the investigation (that is the Run action). It only
 * creates the Hermes investigation record and stores the mapping so the case is
 * available to Hermes. RLS is preserved: the case read + update run as the
 * calling user (createClientFromRequest + auth.me).
 *
 * Contract:
 *   IN  { case_id }
 *   OUT { ok, action: "created"|"existing"|"recreated"|"needs_creation",
 *         case_id, hermes_investigation_id, sync_status, last_synced_at, target_count }
 */

const TARGET_TYPE_RANK = {
  wallet_address: 1, transaction_hash: 2, domain: 3, url: 4, ip_address: 5,
  email: 6, phone: 7, username: 8, social_identifier: 9, token_contract: 10,
  blockchain_network: 11, narrative: 13, other: 12,
};

function makeTarget(type: any, value: any, extra: any = {}) {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return { type: type || "other", value: v, ...extra };
}

function pushUnique(map: Map<string, any>, t: any) {
  if (!t || !t.value) return;
  const key = `${(t.type || "other")}|${t.value.toLowerCase()}`;
  if (map.has(key)) return;
  map.set(key, t);
}

// Aggregate EVERY real target embedded in the case. Mirrors the client-side
// aggregateCaseTargets but runs server-side (this is the authoritative version
// used at sync time). Returns [] when no external indicator exists.
async function aggregateCaseTargets(base44: any, caseItem: any): Promise<any[]> {
  const caseId = caseItem?.id;
  const [explicitTargets, evidence] = await Promise.all([
    base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
    base44.entities.EvidenceItem.filter({ case_id: caseId }, "-created_date", 200).catch(() => []),
  ]);
  const map = new Map<string, any>();

  for (const t of explicitTargets || []) {
    pushUnique(map, makeTarget(t.type, t.value, { network: t.network, label: t.label, source: t.source || "manual" }));
  }
  const sd = caseItem?.suspect_details || {};
  for (const w of sd.wallet_addresses || []) pushUnique(map, makeTarget("wallet_address", w, { source: "suspect_details" }));
  for (const d of sd.websites_domains || []) pushUnique(map, makeTarget(/^(https?:)?\/\//i.test(d) ? "url" : "domain", d, { source: "suspect_details" }));
  for (const ip of sd.ip_addresses || []) pushUnique(map, makeTarget("ip_address", ip, { source: "suspect_details" }));
  if (sd.primary_suspect?.email) pushUnique(map, makeTarget("email", sd.primary_suspect.email, { source: "suspect_details" }));
  if (sd.primary_suspect?.phone) pushUnique(map, makeTarget("phone", sd.primary_suspect.phone, { source: "suspect_details" }));
  for (const s of sd.social_profiles || []) pushUnique(map, makeTarget("social_identifier", s.url || s.platform, { source: "suspect_details", platform: s.platform }));

  const si = caseItem?.scammer_info || {};
  for (const w of si.wallet_addresses || []) pushUnique(map, makeTarget("wallet_address", w, { source: "scammer_info" }));
  if (si.email) pushUnique(map, makeTarget("email", si.email, { source: "scammer_info" }));
  if (si.phone) pushUnique(map, makeTarget("phone", si.phone, { source: "scammer_info" }));
  if (si.website) pushUnique(map, makeTarget(/^(https?:)?\/\//i.test(si.website) ? "url" : "domain", si.website, { source: "scammer_info" }));

  for (const w of caseItem?.monitored_wallets || []) pushUnique(map, makeTarget("wallet_address", w, { source: "monitored_wallets" }));
  for (const h of caseItem?.transaction_hashes || []) pushUnique(map, makeTarget("transaction_hash", h, { source: "transaction_hashes" }));

  for (const ev of evidence || []) {
    for (const d of ev?.detected_targets || []) {
      const val = d?.value || d?.address || d?.hash || d?.domain || d?.url || d?.email || d?.ip;
      pushUnique(map, makeTarget(d?.type || "other", val, { source: "evidence_extraction", evidence_id: ev?.id }));
    }
  }

  const all = Array.from(map.values());
  all.sort((a, b) => (TARGET_TYPE_RANK[a.type as keyof typeof TARGET_TYPE_RANK] ?? 99) - (TARGET_TYPE_RANK[b.type as keyof typeof TARGET_TYPE_RANK] ?? 99));
  return all;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    let caseId = payload?.case_id;
    if (!caseId) return Response.json({ ok: false, status: "bad_request", error: "case_id is required" });

    // Resolve both canonical InvestigationCase ids and legacy/client case ids.
    // Cases created before the InvestigationCase inventory was introduced may
    // still live in MyCase/ClientCase/MasterCase. The resolver creates an
    // idempotent canonical projection and returns the canonical id, preserving
    // tenant isolation and source provenance.
    let sourceCaseId = caseId;
    let resolveRes = await base44.functions.invoke("resolveInvestigationCase", { case_id: caseId });
    let resolveBody = resolveRes?.data ?? resolveRes;
    if (!resolveBody || resolveBody.ok === false) {
      return Response.json({
        ok: false,
        status: resolveBody?.status || "not_found",
        error: resolveBody?.error || "Case not found or no access",
        case_id: caseId,
      });
    }
    caseId = resolveBody.case_id;
    let caseItem = resolveBody.case;
    if (!caseItem) {
      caseItem = await base44.entities.InvestigationCase.get(caseId).catch(() => null);
    }
    if (!caseItem) return Response.json({ ok: false, status: "not_found", error: "Case not found or no access", case_id: sourceCaseId });

    const { apiKey, configuredBase, keySanitized } = loadHermesCredentials(secrets);
    if (!apiKey) return Response.json({ ok: false, status: "not_configured", error: "hermes-api_key secret is not configured" });
    if (!configuredBase) return Response.json({ ok: false, status: "not_configured", error: "HERMES_BASE_URL secret is not configured" });

    const root = normalizeRoot(configuredBase);
    const investigationsUrl = buildInvestigationsUrl(root);
    const now = new Date().toISOString();

    // ── Idempotency: if a mapping already exists, verify it against Hermes.
    const existingId = caseItem.workflow?.hermes_investigation_id;
    if (existingId) {
      const verify = await investigationFetch(`${investigationsUrl}/${encodeURIComponent(String(existingId))}`, { method: "GET", apiKey });
      if (verify.ok) {
        const vStatus = String(verify.data?.status || "").toLowerCase();
        const isFailed = ["failed", "error", "errored", "aborted", "cancelled", "canceled"].includes(vStatus);
        if (!isFailed) {
          // Existing mapping is live and not failed — keep it (no duplicate).
          await base44.entities.InvestigationCase.update(caseId, {
            sync_status: "synced",
            last_synced_at: now,
            workflow: { ...(caseItem.workflow || {}), hermes_investigation_id: existingId, hermes_status: vStatus, provider: "hermes" },
          }).catch(() => null);
          return Response.json({
            ok: true, action: "existing", case_id: caseId, hermes_investigation_id: existingId,
            sync_status: "synced", last_synced_at: now, hermes_status: vStatus,
          });
        }
        // Existing investigation is in a FAILED terminal state — clear the
        // mapping and fall through to recreate so the case can be re-investigated.
        await base44.entities.InvestigationCase.update(caseId, {
          workflow: { ...(caseItem.workflow || {}), hermes_investigation_id: null, hermes_status: null, hermes_error: `prior investigation ${existingId} failed; cleared for re-sync` },
        }).catch(() => null);
      } else if (verify.status === "not_found") {
        // Stale mapping (Hermes no longer has it) — clear and recreate below.
        await base44.entities.InvestigationCase.update(caseId, {
          workflow: { ...(caseItem.workflow || {}), hermes_investigation_id: null, hermes_status: null, hermes_error: "stale mapping cleared" },
        }).catch(() => null);
      } else {
        // Transient Hermes error — mark pending/retry, do not recreate.
        await base44.entities.InvestigationCase.update(caseId, { sync_status: "pending", last_synced_at: now }).catch(() => null);
        return Response.json({ ok: false, status: verify.status, error: verify.error, action: "retry", case_id: caseId });
      }
    }

    // When recreating (prior mapping was stale/failed), clear any old
    // Hermes-derived results so the sync dedup guard allows fresh persistence
    // instead of treating leftover evidence as "already persisted".
    if (existingId) {
      await Promise.all([
        base44.entities.EvidenceItem.deleteMany({ case_id: caseId, source: "hermes_extraction" }).catch(() => null),
        base44.entities.InvestigationFinding.deleteMany({ case_id: caseId, source: "hermes" }).catch(() => null),
        base44.entities.InvestigationReport.deleteMany({ case_id: caseId, generated_by: "hermes" }).catch(() => null),
        base44.entities.GraphNode.deleteMany({ case_id: caseId, source: "hermes_extraction" }).catch(() => null),
        base44.entities.GraphEdge.deleteMany({ case_id: caseId }).catch(() => null),
      ]);
    }

    // ── Build the investigation input from the ACTUAL case data.
    const allTargets = await aggregateCaseTargets(base44, caseItem);
    const hasExternalIndicator = allTargets.length > 0;
    const targetObjs = allTargets.map((t: any) => ({ type: t.type, value: t.value, network: t.network, label: t.label, source: t.source }));

    // Hermes requires a singular `target` + `investigation_type`. When real
    // indicators exist, the primary is the highest-priority one. When NONE
    // exist, submit the case narrative as the subject (type "narrative") so
    // Hermes analyzes what was actually submitted — never a placeholder
    // wallet/domain/example.com.
    let primaryTarget;
    if (hasExternalIndicator) {
      primaryTarget = targetObjs[0];
    } else {
      const narrative = (caseItem.description || caseItem.case_title || "").trim();
      primaryTarget = { type: "narrative", value: (caseItem.case_title || "narrative").slice(0, 200), description: narrative };
      targetObjs.push(primaryTarget);
    }

    const body = {
      case_id: caseItem.id,
      case_title: caseItem.case_title || caseItem.victim_name || "Investigation",
      investigation_type: caseItem.fraud_type || "other",
      fraud_type: caseItem.fraud_type,
      target: primaryTarget,
      targets: targetObjs,
      narrative: caseItem.description || null,
      victim_name: caseItem.victim_name,
      amount_stolen_usd: caseItem.amount_stolen_usd,
      incident_date: caseItem.incident_date,
      suspect_details: caseItem.suspect_details,
      scammer_info: caseItem.scammer_info,
      evidence: [], // evidence is processed by Hermes during the run, not at create
      has_external_indicators: hasExternalIndicator,
      tenant_id: caseItem.tenant_id,
      created_by: caseItem.created_by_id,
    };

    // Mark sync pending while the create is in flight.
    await base44.entities.InvestigationCase.update(caseId, { sync_status: "pending", last_synced_at: now }).catch(() => null);

    const createRes = await investigationFetch(investigationsUrl, { method: "POST", body, apiKey });
    if (!createRes.ok) {
      const hint = keySanitized ? " (hermes-api_key had whitespace/quotes — cleaned before sending; re-save the secret if this persists)" : "";
      await base44.entities.InvestigationCase.update(caseId, {
        sync_status: "failed", last_synced_at: now,
        workflow: { ...(caseItem.workflow || {}), hermes_error: createRes.error },
      }).catch(() => null);
      return Response.json({ ok: false, status: createRes.status, upstream_status: createRes.upstream_status, error: createRes.error + hint, action: "create_failed", case_id: caseId });
    }

    const investigationId = extractInvestigationId(createRes.data) || extractInvestigationId(createRes);
    if (!investigationId) {
      await base44.entities.InvestigationCase.update(caseId, { sync_status: "failed", last_synced_at: now }).catch(() => null);
      return Response.json({ ok: false, status: "no_investigation_id", error: "Hermes accepted the request but did not return an investigation_id", action: "create_failed", case_id: caseId });
    }

    // ── Store the canonical mapping on the SafeNestT case.
    await base44.entities.InvestigationCase.update(caseId, {
      sync_status: "active",
      last_synced_at: now,
      status: caseItem.status === "new" ? "queued" : caseItem.status,
      workflow: {
        ...(caseItem.workflow || { current_phase: "planning", phases: {} }),
        hermes_investigation_id: investigationId,
        hermes_status: createRes.data?.status || "queued",
        hermes_error: null,
        provider: "hermes",
        has_external_indicators: hasExternalIndicator,
      },
    }).catch(() => null);

    await base44.entities.AuditEvent.create({
      tenant_id: caseItem.tenant_id, actor: user.email, actor_name: user.full_name || user.email,
      timestamp: now, action: "hermes_case_synced", object_type: "case", object_id: caseId, case_id: caseId,
      description: `SafeNestT case synced to Hermes: investigation ${investigationId} created (${hasExternalIndicator ? `${targetObjs.length} targets` : "narrative-only"})`,
      metadata: { investigation_id: investigationId, target_count: targetObjs.length, has_external_indicators: hasExternalIndicator }, source: "user",
    }).catch(() => null);

    return Response.json({
      ok: true, action: existingId ? "recreated" : "created", case_id: caseId,
      hermes_investigation_id: investigationId, sync_status: "active", last_synced_at: now,
      target_count: targetObjs.length, has_external_indicators: hasExternalIndicator,
    });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error) }, { status: 500 });
  }
}