import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * Unified investigation inventory.
 *
 * The platform historically has four case stores. This endpoint exposes one
 * investigation-facing inventory without deleting or silently merging source
 * records. Canonical InvestigationCase records are preferred; legacy records
 * remain visible and carry source_case_type/source_case_id so the workspace can
 * resolve them into a canonical investigation case when opened.
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, status: "unauthorized", error: "Unauthorized" }, { status: 401 });

    const [investigationCases, myCases, clientCases, masterCases] = await Promise.all([
      base44.entities.InvestigationCase.list("-created_date", 5000).catch(() => []),
      base44.entities.MyCase.list("-created_date", 5000).catch(() => []),
      base44.entities.ClientCase.list("-created_date", 5000).catch(() => []),
      base44.entities.MasterCase.list("-created_date", 5000).catch(() => []),
    ]);

    const canonicalBySource = new Map<string, any>();
    for (const c of investigationCases || []) {
      if (c?.source_case_id) canonicalBySource.set(
        (c.source_case_type || "legacy") + ":" + c.source_case_id,
        c
      );
    }

    const normalizeLegacy = (record: any, sourceType: string) => {
      const mapped = canonicalBySource.get(sourceType + ":" + record.id);
      const scammer = record.scammer_info || record.alleged_actor_information || {};
      const wallets = [
        ...(scammer.wallet_addresses || scammer.crypto_wallet_addresses || []),
        ...(record.monitored_wallets || []),
        ...(record.scammer_wallet ? [record.scammer_wallet] : []),
      ].filter(Boolean);

      const victimName = record.victim_name || record.client_name || record.user_id || "Unknown";
      const title =
        record.case_title ||
        record.title ||
        (record.client_name ? "Case — " + record.client_name : null) ||
        (record.case_number ? "Case " + record.case_number : null) ||
        "Case " + record.id;

      return {
        ...record,
        id: record.id,
        source_case_id: record.id,
        source_case_type: sourceType,
        canonical_case_id: mapped?.id || null,
        case_title: title,
        victim_name: victimName,
        victim_email: record.victim_email || record.client_email || record.created_by_email || "",
        fraud_type: record.fraud_type || record.issue_type || record.incident_classification || "other",
        amount_stolen_usd: Number(record.amount_stolen_usd ?? record.amount_lost ?? record.financial_loss?.total_amount_usd ?? 0) || 0,
        monitored_wallets: wallets,
        sync_status: mapped?.sync_status || "pending",
        workflow: mapped?.workflow || record.workflow || null,
        _legacy_source: true,
      };
    };

    const legacy = [
      ...(myCases || []).map((c) => normalizeLegacy(c, "MyCase")),
      ...(clientCases || []).map((c) => normalizeLegacy(c, "ClientCase")),
      ...(masterCases || []).map((c) => normalizeLegacy(c, "MasterCase")),
    ];

    // Keep canonical cases authoritative. If a legacy source already has a
    // canonical projection, do not display the duplicate source copy.
    const legacyWithNoCanonical = legacy.filter((c) => !c.canonical_case_id);
    const merged = [...(investigationCases || []), ...legacyWithNoCanonical]
      .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

    return Response.json({
      ok: true,
      cases: merged,
      count: merged.length,
      counts: {
        investigation_cases: (investigationCases || []).length,
        my_cases: (myCases || []).length,
        client_cases: (clientCases || []).length,
        master_cases: (masterCases || []).length,
        legacy_unprojected: legacyWithNoCanonical.length,
      },
    });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error) }, { status: 500 });
  }
}
