import { base44 } from "@/api/base44Client";

/**
 * Tenant Context — the client-side companion to the server-side RLS that
 * enforces multi-tenant isolation. RLS is authoritative (it runs on every
 * request); this module ensures the current user actually HAS a tenant
 * before any investigation record is created, so the create rule
 * `data.tenant_id === {{user.data.tenant_id}}` can match.
 *
 * On first use, a user with no tenant_id is auto-onboarded into a personal
 * tenant they own (role: owner). Shared/team tenants can be created later.
 */

let _cachedUser = null;
let _cachePromise = null;

export async function getCurrentUser({ force = false } = {}) {
  if (_cachedUser && !force) return _cachedUser;
  if (_cachePromise && !force) return _cachePromise;
  _cachePromise = base44
    .auth.me()
    .then((u) => {
      _cachedUser = u;
      return u;
    })
    .catch((e) => {
      _cachePromise = null;
      throw e;
    });
  return _cachePromise;
}

export function invalidateCurrentUser() {
  _cachedUser = null;
  _cachePromise = null;
}

export async function getCurrentTenantId() {
  const u = await getCurrentUser();
  return u?.tenant_id || null;
}

export async function getCurrentTenantRole() {
  const u = await getCurrentUser();
  return u?.tenant_role || null;
}

/**
 * Ensure the current user has an active tenant. If they don't, create a
 * personal tenant owned by them, add an owner TenantMembership, and persist
 * tenant_id + tenant_role onto the User via auth.updateMe. Returns tenant_id.
 */
export async function ensureTenant() {
  const u = await getCurrentUser();
  if (u?.tenant_id) return u.tenant_id;

  const ownerName = u?.full_name || u?.email || "User";
  const tenant = await base44.entities.Tenant.create({
    name: `${ownerName}'s Workspace`,
    slug: `personal-${(u.id || "").slice(-8)}`,
    owner_user_id: u.id,
    owner_email: u.email,
    plan: "personal",
    status: "active",
    members: [u.id],
  });

  await base44.entities.TenantMembership.create({
    tenant_id: tenant.id,
    user_id: u.id,
    user_email: u.email,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  await base44.auth.updateMe({ tenant_id: tenant.id, tenant_role: "owner" });

  invalidateCurrentUser();
  const refreshed = await getCurrentUser({ force: true });
  return refreshed?.tenant_id || tenant.id;
}

// ── App-layer role helpers (advisory; RLS enforces isolation server-side) ──
const MANAGE_ROLES = ["owner", "admin"];
const INVESTIGATE_ROLES = ["owner", "admin", "investigator"];

export function canManageTenant(role) {
  return MANAGE_ROLES.includes(role);
}
export function canInvestigate(role) {
  return INVESTIGATE_ROLES.includes(role);
}
export function isTenantMember(role) {
  return ["owner", "admin", "investigator", "member"].includes(role);
}