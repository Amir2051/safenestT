import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * correlateInvestigation
 *
 * Deterministic cross-case correlation for the InvestigationCase entity.
 * This is additive to the existing Hermes investigation pipeline:
 * it never changes Hermes findings or case status.
 *
 * Signals:
 * - scammer/monitored wallets
 * - transaction hashes
 * - suspect/scammer email and phone
 * - suspect domains/IPs
 * - shared fraud type + strong indicator overlap
 *
 * Returns explainable candidates with evidence-like reasons and a
 * deterministic score. Persistence is limited to CaseLinkSuggestion.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);

    if (!user?.email) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { caseId, limit = 20 } = await req.json();
    if (!caseId) {
      return Response.json({ error: "caseId is required" }, { status: 400 });
    }

    const source = await base44.asServiceRole.entities.InvestigationCase.get(caseId);
    if (!source) {
      return Response.json({ error: "Case not found" }, { status: 404 });
    }

    const tenantId = source.tenant_id || user?.data?.tenant_id;
    if (!tenantId || (user.role !== "admin" && !user.is_admin &&
        source.assigned_investigator !== user.email &&
        source.created_by_id !== user.id)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const allCases = await base44.asServiceRole.entities.InvestigationCase.filter(
      { tenant_id: tenantId },
      "-last_activity",
      500
    );

    const normalize = (value) => String(value || "").trim().toLowerCase();
    const unique = (values) => [...new Set((values || []).map(normalize).filter(Boolean))];

    const sourceSuspect = source.suspect_details?.primary_suspect || {};
    const sourceScammer = source.scammer_info || {};
    const sourceDomains = unique([
      ...(source.suspect_details?.websites_domains || []),
      sourceScammer.website,
    ]);
    const sourceIps = unique(source.suspect_details?.ip_addresses || []);
    const sourceWallets = unique([
      ...(source.monitored_wallets || []),
      ...(sourceScammer.wallet_addresses || []),
    ]);
    const sourceTx = unique(source.transaction_hashes || []);
    const sourceEmails = unique([source.victim_email, sourceScammer.email, sourceSuspect.email]);
    const sourcePhones = unique([source.victim_phone, sourceScammer.phone, sourceSuspect.phone]);

    const intersect = (a, b) => a.filter((v) => b.includes(v));

    const candidates = [];

    for (const target of allCases) {
      if (!target?.id || target.id === caseId) continue;

      const suspect = target.suspect_details?.primary_suspect || {};
      const scammer = target.scammer_info || {};
      const targetDomains = unique([...(target.suspect_details?.websites_domains || []), scammer.website]);
      const targetIps = unique(target.suspect_details?.ip_addresses || []);
      const targetWallets = unique([
        ...(target.monitored_wallets || []),
        ...(scammer.wallet_addresses || []),
      ]);
      const targetTx = unique(target.transaction_hashes || []);
      const targetEmails = unique([target.victim_email, scammer.email, suspect.email]);
      const targetPhones = unique([target.victim_phone, scammer.phone, suspect.phone]);

      const reasons = [];
      let score = 0;

      const wallets = intersect(sourceWallets, targetWallets);
      if (wallets.length) {
        score += Math.min(50, wallets.length * 50);
        reasons.push({ type: "wallet", weight: 50, value: wallets.slice(0, 5), explanation: "Shared wallet address" });
      }

      const txs = intersect(sourceTx, targetTx);
      if (txs.length) {
        score += Math.min(40, txs.length * 40);
        reasons.push({ type: "transaction", weight: 40, value: txs.slice(0, 5), explanation: "Shared transaction hash" });
      }

      const emails = intersect(sourceEmails, targetEmails);
      if (emails.length) {
        score += Math.min(30, emails.length * 30);
        reasons.push({ type: "identity", weight: 30, value: emails.slice(0, 3), explanation: "Shared email indicator" });
      }

      const phones = intersect(sourcePhones, targetPhones);
      if (phones.length) {
        score += Math.min(30, phones.length * 30);
        reasons.push({ type: "identity", weight: 30, value: phones.slice(0, 3), explanation: "Shared phone indicator" });
      }

      const domains = intersect(sourceDomains, targetDomains);
      if (domains.length) {
        score += Math.min(25, domains.length * 25);
        reasons.push({ type: "pattern", weight: 25, value: domains.slice(0, 5), explanation: "Shared domain indicator" });
      }

      const ips = intersect(sourceIps, targetIps);
      if (ips.length) {
        score += Math.min(20, ips.length * 20);
        reasons.push({ type: "pattern", weight: 20, value: ips.slice(0, 5), explanation: "Shared IP indicator" });
      }

      if (source.fraud_type && target.fraud_type && source.fraud_type === target.fraud_type) {
        score += 5;
        reasons.push({ type: "pattern", weight: 5, value: source.fraud_type, explanation: "Same fraud classification" });
      }

      if (!reasons.length) continue;

      const confidence = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
      candidates.push({
        case: {
          id: target.id,
          title: target.case_title || target.case_number || "Untitled case",
          case_number: target.case_number,
          status: target.status,
          fraud_type: target.fraud_type,
          priority: target.priority || target.case_priority,
        },
        score: Math.min(100, score),
        confidence,
        reasons,
      });
    }

    candidates.sort((a, b) => b.score - a.score || String(a.case.id).localeCompare(String(b.case.id)));
    const top = candidates.slice(0, Math.max(1, Math.min(Number(limit) || 20, 50)));

    for (const match of top) {
      const existing = await base44.asServiceRole.entities.CaseLinkSuggestion.filter({
        source_case_id: caseId,
        target_case_id: match.case.id,
      });

      const payload = {
        source_case_id: caseId,
        target_case_id: match.case.id,
        match_type: match.reasons.some((r) => r.type === "wallet") ? "wallet"
          : match.reasons.some((r) => r.type === "identity") ? "identity"
          : "pattern",
        confidence_score: match.score,
        match_details: match.reasons
          .map((r) => `${r.explanation}: ${r.value.join(", ")}`)
          .join(" | "),
        status: "pending",
      };

      if (!existing?.length) {
        await base44.asServiceRole.entities.CaseLinkSuggestion.create(payload);
      }
    }

    return Response.json({
      case_id: caseId,
      algorithm: "deterministic-indicator-correlation-v1",
      candidates: top,
      total_candidates: candidates.length,
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
