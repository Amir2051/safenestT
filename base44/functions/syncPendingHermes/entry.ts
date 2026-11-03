import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * Scheduled dispatcher for asynchronous SENTRA/Hermes investigations.
 *
 * Finds canonical InvestigationCase records whose Hermes investigation is
 * already created and still needs synchronization, then invokes the existing
 * single-case sync function. It NEVER starts a new investigation.
 *
 * The frontend's 8-second polling remains the fast UX path; this dispatcher
 * is the browser-independent recovery/completion path.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Scheduled/background execution uses service-role data access so this
    // dispatcher does not depend on a browser user's tenant/session.
    const cases = await base44.asServiceRole.entities.InvestigationCase.list();

    const candidates = (cases || []).filter((c) => {
      const investigationId = c?.workflow?.hermes_investigation_id;
      const syncStatus = c?.sync_status;
      const hermesStatus = String(c?.workflow?.hermes_status || "").toLowerCase();

      if (!investigationId) return false;
      if (syncStatus !== "pending" && syncStatus !== "active") return false;

      // Do not keep dispatching investigations that are already terminal.
      if (["completed", "failed", "error", "cancelled"].includes(hermesStatus)) {
        return false;
      }

      return true;
    }).slice(0, 25);

    const results = [];

    for (const caseItem of candidates) {
      try {
        // Use the normal function invocation path so Base44 can propagate the
        // scheduled execution context to the existing sync function.
        const response = await base44.functions.invoke("syncHermesInvestigation", {
          case_id: caseItem.id,
        });

        const body = response?.data ?? response;
        results.push({
          case_id: caseItem.id,
          hermes_investigation_id: caseItem.workflow?.hermes_investigation_id,
          ok: body?.ok !== false,
          status: body?.status || "unknown",
          hermes_status: body?.hermes_status || null,
        });
      } catch (error) {
        console.error("syncPendingHermes case failed", {
          case_id: caseItem.id,
          error: error?.message || String(error),
        });
        results.push({
          case_id: caseItem.id,
          hermes_investigation_id: caseItem.workflow?.hermes_investigation_id,
          ok: false,
          status: "invoke_error",
          error: error?.message || String(error),
        });
      }
    }

    return Response.json({
      ok: true,
      dispatched: results.length,
      candidates_seen: candidates.length,
      skipped: Math.max(0, (cases || []).length - candidates.length),
      results,
    });
  } catch (error) {
    console.error("syncPendingHermes dispatcher failed", error);
    return Response.json({
      ok: false,
      status: "internal_error",
      error: error?.message || String(error),
    }, { status: 500 });
  }
});
