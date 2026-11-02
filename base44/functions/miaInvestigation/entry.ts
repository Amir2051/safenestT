import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { runMiaInvestigation } from "../../shared/miaEngine.ts";

/**
 * miaInvestigation — executes the real MIA multi-agent investigation provider
 * for one case and returns its actual results.
 *
 * Auth: the caller must be signed in, and the case is resolved with the
 * caller's own client so InvestigationCase RLS decides access (owner,
 * assigned investigator, same tenant, or platform admin). Nothing is read or
 * written for a case the caller cannot access.
 *
 * The engine persists InvestigationRun, InvestigationFinding,
 * InvestigationReport and the case workflow through the caller's client, so
 * tenant isolation is enforced on write as well.
 *
 * Contract: IN { case_id } OUT { ok, provider, status, phases, findings,
 *                              report_id, risk, persisted, agents_run, agents_failed, error? }
 */
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e: any) => (e?.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const caseIdInput = payload?.case_id;
    if (!caseIdInput) return Response.json({ ok: false, error: "case_id is required" }, { status: 400 });

    // Resolve canonical + legacy case ids under the caller's RLS.
    const resolved = await base44.functions.invoke("resolveInvestigationCase", { case_id: caseIdInput });
    const body: any = resolved?.data ?? resolved;
    const resolvedCaseId = body?.case_id;
    if (!resolvedCaseId) {
      return Response.json(
        { ok: false, status: body?.status || "not_found", error: body?.error || "Case not found or no access" },
        { status: 404 }
      );
    }

    const caseItem = body?.case || (await base44.entities.InvestigationCase.get(resolvedCaseId).catch((e: any) => (e?.status === 404 ? null : Promise.reject(e))));
    if (!caseItem) return Response.json({ ok: false, status: "not_found", error: "Case not found or no access" }, { status: 404 });

    const result = await runMiaInvestigation({
      base44,
      caseItem,
      user,
      tenantId: caseItem.tenant_id,
    });

    return Response.json({ ...result, case_id: caseItem.id }, { status: result.ok ? 200 : 502 });
  } catch (error: any) {
    return Response.json({ ok: false, status: "internal_error", error: error?.message || String(error) }, { status: 500 });
  }
}