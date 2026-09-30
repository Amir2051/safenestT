import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * Resolve any SafeNestT legacy/client case into the canonical InvestigationCase
 * used by the Hermes investigation pipeline.
 *
 * SafeNestT has historically stored cases in MyCase, ClientCase, MasterCase and
 * InvestigationCase. Hermes must never assume that the URL id belongs to
 * InvestigationCase. This resolver preserves the source record and creates an
 * idempotent canonical InvestigationCase when needed.
 *
 * IN:  { case_id }
 * OUT: { ok, case_id, source_case_id, source_case_type, case }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const requestedId = String(payload?.case_id || "").trim();
    if (!requestedId) return Response.json({ ok: false, status: "bad_request", error: "case_id is required" });

    // First, treat the supplied id as a canonical InvestigationCase id.
    const direct = await base44.entities.InvestigationCase.get(requestedId).catch(() => null);
    if (direct) {
      return Response.json({
        ok: true,
        action: "canonical",
        case_id: direct.id,
        source_case_id: direct.source_case_id || null,
        source_case_type: direct.source_case_type || "InvestigationCase",
        case: direct,
      });
    }

    // Then look for an existing canonical projection created from a legacy case.
    const mapped = await base44.entities.InvestigationCase
      .filter({ source_case_id: requestedId }, "-created_date", 10)
      .catch(() => []);
    if (mapped?.length) {
      return Response.json({
        ok: true,
        action: "mapped",
        case_id: mapped[0].id,
        source_case_id: requestedId,
        source_case_type: mapped[0].source_case_type || null,
        case: mapped[0],
      });
    }

    // Locate the legacy record. RLS remains authoritative: inaccessible records
    // simply do not resolve and are never copied.
    const candidates: Array<{ type: string; record: any }> = [];
    const [myCase, clientCase, masterCase] = await Promise.all([
      base44.entities.MyCase.get(requestedId).catch(() => null),
      base44.entities.ClientCase.get(requestedId).catch(() => null),
      base44.entities.MasterCase.get(requestedId).catch(() => null),
    ]);
    if (myCase) candidates.push({ type: "MyCase", record: myCase });
    if (clientCase) candidates.push({ type: "ClientCase", record: clientCase });
    if (masterCase) candidates.push({ type: "MasterCase", record: masterCase });

    const found = candidates[0];
    if (!found) {
      return Response.json({ ok: false, status: "not_found", error: "Case not found or no access", case_id: requestedId });
    }

    const source = found.record;
    const sourceType = found.type;

    // Resolve the tenant from the source owner when possible. This prevents a
    // platform admin from accidentally projecting an old record into their own
    // tenant. If the source has no owner, fall back to the current user's tenant.
    let ownerUser: any = null;
    const ownerId = source.user_id || source.created_by_id || null;
    if (ownerId) ownerUser = await base44.entities.User.get(ownerId).catch(() => null);

    const tenantId =
      source.tenant_id ||
      ownerUser?.tenant_id ||
      user.tenant_id ||
      user.data?.tenant_id ||
      null;

    if (!tenantId) {
      return Response.json({
        ok: false,
        status: "tenant_unresolved",
        error: "Case is accessible but has no resolvable tenant; refusing to create a cross-tenant investigation record.",
        case_id: requestedId,
      });
    }

    const scammer = source.scammer_info || source.alleged_actor_information || {};
    const wallets = [
      ...(scammer.wallet_addresses || scammer.crypto_wallet_addresses || []),
      ...(source.monitored_wallets || []),
      ...(source.scammer_wallet ? [source.scammer_wallet] : []),
    ].filter(Boolean);

    const fraudType =
      source.fraud_type ||
      source.issue_type ||
      source.incident_classification ||
      "other";

    const title =
      source.case_title ||
      source.title ||
      source.client_name && `Case — ${source.client_name}` ||
      source.victim_name && `Case — ${source.victim_name}` ||
      source.case_number && `Case ${source.case_number}` ||
      `Imported case ${requestedId}`;

    const victimName =
      source.victim_name ||
      source.client_name ||
      ownerUser?.full_name ||
      "Unknown";

    const victimEmail =
      source.victim_email ||
      source.client_email ||
      source.created_by_email ||
      ownerUser?.email ||
      "";

    const amount =
      Number(source.amount_stolen_usd ?? source.amount_lost ?? source.financial_loss?.total_amount_usd ?? 0) || 0;

    const contact = source.victim_contact_info || {
      primary_email: victimEmail || undefined,
      phone: source.phone_number || undefined,
      address: source.address_information?.street_address || undefined,
      city: source.address_information?.city || undefined,
      state: source.address_information?.state_province || undefined,
      zip: source.address_information?.zip_postal_code || undefined,
      country: source.address_information?.country || undefined,
    };

    const canonicalPayload: any = {
      tenant_id: tenantId,
      source_case_id: requestedId,
      source_case_type: sourceType,
      case_number: source.case_number || undefined,
      case_title: title,
      victim_name: victimName,
      victim_email: victimEmail || undefined,
      victim_phone: source.victim_phone || source.phone_number || undefined,
      victim_contact_info: contact,
      fraud_type: fraudType,
      scammer_info: source.scammer_info || (source.alleged_actor_information ? {
        name: source.alleged_actor_information.name,
        email: (source.alleged_actor_information.email_addresses || [])[0],
        phone: (source.alleged_actor_information.phone_numbers || [])[0],
        wallet_addresses: wallets,
        social_media: source.alleged_actor_information.social_media_accounts
          ? String(source.alleged_actor_information.social_media_accounts).split("\\n").filter(Boolean)
          : [],
        website: (source.alleged_actor_information.websites_platforms || [])[0],
      } : undefined),
      suspect_details: source.suspect_details,
      amount_stolen: amount,
      amount_stolen_usd: amount,
      cryptocurrency: source.cryptocurrency,
      blockchain: source.blockchain,
      incident_date: source.incident_date || source.transaction_date || source.incident_timeline?.incident_began_date,
      description: source.description || source.merged_summary || source.notes || "",
      timeline: source.timeline || (source.incident_timeline ? [source.incident_timeline] : []),
      evidence_files: source.evidence_files || source.supporting_documentation || [],
      evidence_log: source.evidence_log || [],
      transaction_hashes: source.transaction_hashes || (source.transaction_hash ? [source.transaction_hash] : []),
      monitored_wallets: wallets,
      linked_case_ids: source.linked_case_ids || [],
      status: ["closed", "resolved", "recovered"].includes(String(source.status || "").toLowerCase()) ? "closed" :
        String(source.status || "").toLowerCase().includes("investig") ? "investigating" : "new",
      priority: String(source.priority || source.urgency || "medium").toLowerCase(),
      case_priority: String(source.case_priority || source.priority || source.urgency || "medium").toLowerCase(),
      investigation_progress: Number(source.investigation_progress || 0),
      assigned_investigator: source.assigned_investigator || source.assigned_to || undefined,
      case_notes: source.case_notes || [],
      last_activity: source.last_activity || source.updated_date || source.created_date || new Date().toISOString(),
      workflow: {
        current_phase: "planning",
        provider: "hermes",
        model: "hermes-agent",
        phases: {
          planning: { status: "pending" },
          evidence: { status: "pending" },
          analysis: { status: "pending" },
          reality_check: { status: "pending" },
          risk: { status: "pending" },
          dossier: { status: "pending" },
        },
      },
      sync_status: "pending",
    };

    // Preserve immutable ownership where available. InvestigationCase RLS still
    // applies to the current caller; created_by_id is used only as a reference.
    if (ownerId) canonicalPayload.created_by_id = ownerId;

    const created = await base44.entities.InvestigationCase.create(canonicalPayload);

    return Response.json({
      ok: true,
      action: "created",
      case_id: created.id,
      source_case_id: requestedId,
      source_case_type: sourceType,
      case: created,
    });
  } catch (error: any) {
    return Response.json({
      ok: false,
      status: "internal_error",
      error: error?.message || String(error),
    }, { status: 500 });
  }
}
