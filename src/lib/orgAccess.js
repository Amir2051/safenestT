import { base44 } from "@/api/base44Client";

/**
 * Client for the orgAccess server function — the only way to grant, change
 * or remove organization access. The trusted User fields (tenant_id,
 * organization_role, tenant_role, account_status) are locked in the schema,
 * so the browser can't write them directly.
 */
export async function orgAccess(action, payload = {}) {
  let res;
  try {
    res = await base44.functions.invoke("orgAccess", { action, ...payload });
  } catch (e) {
    const msg = e?.response?.data?.error || e?.data?.error || e?.message || "Request failed";
    throw new Error(msg);
  }
  const data = res?.data;
  if (!data?.ok) throw new Error(data?.error || "Request failed");
  return data;
}
