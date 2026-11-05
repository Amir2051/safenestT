import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

/**
 * orgAccess — the ONLY place that grants or removes organization access.
 *
 * The User fields that data rules trust (tenant_id, tenant_role,
 * organization_role, account_status, is_admin, job_title) are locked in the
 * User schema, so browsers cannot set them. Every change goes through here,
 * runs as the service role, and checks the caller's permission first.
 *
 * Platform admin  = user.role === "admin" (set by the platform, not the user).
 * Org admin       = active TenantMembership with organization_role ORG_ADMIN
 *                   (or legacy owner/admin) in that tenant.
 */

const ORG_ROLES = ["ORG_ADMIN", "INVESTIGATOR", "ANALYST", "CASE_MANAGER", "VIEWER", "AUDITOR"];
const ORG_TYPES = [
  "bank_financial", "insurance", "pi_firm", "corporate_enterprise",
  "law_enforcement_gov", "security_investigation", "individual_investigator", "other",
];
const LEGACY_ROLE_FOR = {
  ORG_ADMIN: "admin", INVESTIGATOR: "investigator", ANALYST: "investigator",
  CASE_MANAGER: "investigator", VIEWER: "member", AUDITOR: "member",
};

const now = () => new Date().toISOString();
const ok = (data: Record<string, unknown> = {}) => Response.json({ ok: true, ...data });
const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });
const clean = (s: unknown, max = 200) => (typeof s === "string" ? s.trim().slice(0, max) : "");

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return fail(401, "Unauthorized");

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const sr = base44.asServiceRole.entities;
    const isPlatformAdmin = me.role === "admin";

    const audit = (event: string, details: Record<string, unknown>) =>
      sr.AuditLog.create({
        action_type: `org_access_${event}`,
        action_category: "security",
        description: `${event} by ${me.email}`,
        metadata: { actor_id: me.id, ...details },
        severity: "info",
        status: "success",
      }).catch((e: any) => console.error("orgAccess audit write failed:", e?.message));

    /** Is the caller an active org admin of this tenant (or platform admin)? */
    const canManageTenant = async (tenantId: string) => {
      if (isPlatformAdmin) return true;
      if (!tenantId) return false;
      const mems = await sr.TenantMembership.filter({ tenant_id: tenantId, user_id: me.id, status: "active" });
      return (mems || []).some((m: any) =>
        m.organization_role === "ORG_ADMIN" || m.role === "owner" || m.role === "admin");
    };

    /** Verified team/enterprise org (never a personal workspace). */
    const isVerifiedOrg = (t: any) =>
      !!t && t.plan !== "personal" && ["active", "verified"].includes(t.status);

    /** Write the trusted User fields to match a membership's state. */
    const syncUserFromMembership = async (m: any) => {
      if (!m?.user_id || m.user_id === "pending") return;
      if (m.status === "active") {
        const tenant = await sr.Tenant.get(m.tenant_id).catch(() => null);
        // Keep Tenant.members in step so members can read their org record.
        if (tenant && !(tenant.members || []).includes(m.user_id)) {
          await sr.Tenant.update(tenant.id, { members: [...(tenant.members || []), m.user_id] });
        }
        await sr.User.update(m.user_id, {
          tenant_id: m.tenant_id,
          organization_role: m.organization_role || "VIEWER",
          tenant_role: m.role === "owner" ? "owner" : LEGACY_ROLE_FOR[m.organization_role] || "member",
          account_status: "active",
          ...(tenant?.name ? { organization_name: tenant.name, organization_type: tenant.organization_type || null } : {}),
        });
      } else if (m.status === "revoked") {
        const tenant = await sr.Tenant.get(m.tenant_id).catch(() => null);
        if (tenant && (tenant.members || []).includes(m.user_id)) {
          await sr.Tenant.update(tenant.id, { members: (tenant.members || []).filter((x: string) => x !== m.user_id) });
        }
        // Only strip access if the user's active tenant is the one being revoked.
        const u = await sr.User.get(m.user_id).catch(() => null);
        if (u && u.tenant_id === m.tenant_id) {
          await sr.User.update(m.user_id, {
            tenant_id: null, tenant_role: null, organization_role: "VIEWER", account_status: "pending",
          });
        }
      }
    };

    switch (action) {
      // ── Signup ────────────────────────────────────────────────────────────
      case "listJoinable": {
        // Only verified team organizations — never personal workspaces.
        const tenants = await sr.Tenant.filter({ status: { $in: ["active", "verified"] } });
        const orgs = (tenants || [])
          .filter((t: any) => t?.name && t.plan !== "personal")
          .map((t: any) => ({ id: t.id, name: t.name, organization_type: t.organization_type || null }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        return ok({ organizations: orgs });
      }

      case "ensurePersonalTenant": {
        if (me.tenant_id) return ok({ tenant_id: me.tenant_id });
        const tenant = await sr.Tenant.create({
          name: `${me.full_name || me.email || "User"}'s Workspace`,
          slug: `personal-${String(me.id).slice(-8)}`,
          owner_user_id: me.id, owner_email: me.email,
          plan: "personal", status: "active", members: [me.id],
        });
        await sr.TenantMembership.create({
          tenant_id: tenant.id, user_id: me.id, user_email: me.email, user_name: me.full_name || "",
          role: "owner", status: "active", joined_at: now(),
        });
        await sr.User.update(me.id, { tenant_id: tenant.id, tenant_role: "owner" });
        await audit("personal_tenant_created", { tenant_id: tenant.id });
        return ok({ tenant_id: tenant.id });
      }

      case "requestNewOrg": {
        const orgName = clean(body.orgName);
        const orgType = ORG_TYPES.includes(body.orgType) ? body.orgType : "other";
        if (!orgName) return fail(400, "Organization name is required.");
        const tenant = await sr.Tenant.create({
          name: orgName, organization_type: orgType,
          owner_user_id: me.id, owner_email: me.email,
          plan: "team", status: "pending_verification", members: [me.id],
          requested_by_user_id: me.id, requested_at: now(),
        });
        await sr.TenantMembership.create({
          tenant_id: tenant.id, user_id: me.id, user_email: me.email,
          user_name: clean(body.fullName) || me.full_name || "",
          role: "owner", organization_role: "ORG_ADMIN", status: "pending_verification",
          requested_org_name: orgName, requested_org_type: orgType, requested_at: now(), joined_at: now(),
        });
        // Their own (empty, pending) tenant — safe to set; read-only until verified.
        await sr.User.update(me.id, {
          organization_name: orgName, organization_type: orgType,
          organization_role: "VIEWER", tenant_id: tenant.id, tenant_role: "owner", account_status: "pending",
        });
        await audit("org_requested", { tenant_id: tenant.id, org_name: orgName });
        return ok({ tenant_id: tenant.id });
      }

      case "requestJoinOrg": {
        const tenant = await sr.Tenant.get(body.tenantId).catch(() => null);
        if (!tenant || tenant.plan === "personal" || !["active", "verified"].includes(tenant.status)) {
          return fail(400, "That organization is not open for join requests.");
        }
        const existing = await sr.TenantMembership.filter({ tenant_id: tenant.id, user_id: me.id });
        if (!(existing || []).some((m: any) => m.status !== "revoked")) {
          await sr.TenantMembership.create({
            tenant_id: tenant.id, user_id: me.id, user_email: me.email,
            user_name: clean(body.fullName) || me.full_name || "",
            role: "member", organization_role: "VIEWER", status: "pending_verification",
            requested_at: now(), joined_at: now(),
          });
        }
        // Deliberately NOT setting tenant_id: no access to the org's data until approved.
        await sr.User.update(me.id, {
          organization_name: tenant.name, organization_type: tenant.organization_type || null,
          organization_role: "VIEWER", account_status: "pending",
        });
        await audit("join_requested", { tenant_id: tenant.id });
        return ok({ pending: true });
      }

      // ── Platform admin: verification queue ────────────────────────────────
      case "verifyOrg": {
        if (!isPlatformAdmin) return fail(403, "Platform administrators only.");
        const tenant = await sr.Tenant.get(body.tenantId).catch(() => null);
        if (!tenant) return fail(404, "Organization not found.");
        const approve = body.approve === true;
        await sr.Tenant.update(tenant.id, approve
          ? { status: "active", verified_by: me.id, verified_by_email: me.email, verified_at: now() }
          : { status: "suspended", rejected_by: me.id, rejected_at: now() });
        const requester = tenant.requested_by_user_id || tenant.owner_user_id;
        const mems = await sr.TenantMembership.filter({ tenant_id: tenant.id, user_id: requester });
        for (const m of mems || []) {
          const patch = approve
            ? { status: "active", organization_role: "ORG_ADMIN", verified_by: me.id, verified_at: now() }
            : { status: "revoked", rejected_by: me.id, rejected_at: now() };
          await sr.TenantMembership.update(m.id, patch);
          await syncUserFromMembership({ ...m, ...patch });
        }
        await audit(approve ? "org_verified" : "org_rejected", { tenant_id: tenant.id });
        return ok();
      }

      case "verifyMember": {
        if (!isPlatformAdmin) return fail(403, "Platform administrators only.");
        const m = await sr.TenantMembership.get(body.membershipId).catch(() => null);
        if (!m) return fail(404, "Membership not found.");
        const approve = body.approve === true;
        const patch = approve
          ? { status: "pending_role_assignment", verified_by: me.id, verified_at: now() }
          : { status: "revoked", rejected_by: me.id, rejected_at: now() };
        await sr.TenantMembership.update(m.id, patch);
        await syncUserFromMembership({ ...m, ...patch });
        await audit(approve ? "member_verified" : "member_rejected", { membership_id: m.id, tenant_id: m.tenant_id });
        return ok();
      }

      // ── Org admin: roster ─────────────────────────────────────────────────
      case "assignRole": {
        const m = await sr.TenantMembership.get(body.membershipId).catch(() => null);
        if (!m) return fail(404, "Membership not found.");
        if (!(await canManageTenant(m.tenant_id))) return fail(403, "Only this organization's admins can assign roles.");
        if (!ORG_ROLES.includes(body.organizationRole)) return fail(400, "Invalid role.");
        if (m.status === "pending_verification" && !isPlatformAdmin) {
          return fail(409, "This member is still awaiting SafeNestT company verification.");
        }
        if (m.status === "revoked") return fail(409, "This membership was revoked.");
        if (m.user_id === me.id && !isPlatformAdmin && body.organizationRole !== "ORG_ADMIN") {
          return fail(409, "You can't remove your own admin role. Ask another org admin.");
        }
        const patch: Record<string, unknown> = { organization_role: body.organizationRole };
        if (m.status !== "active" && m.status !== "invited") {
          Object.assign(patch, { status: "active", assigned_by: me.id, assigned_at: now() });
        }
        await sr.TenantMembership.update(m.id, patch);
        await syncUserFromMembership({ ...m, ...patch });
        await audit("role_assigned", { membership_id: m.id, tenant_id: m.tenant_id, role: body.organizationRole });
        return ok();
      }

      case "revokeMember": {
        const m = await sr.TenantMembership.get(body.membershipId).catch(() => null);
        if (!m) return fail(404, "Membership not found.");
        if (!(await canManageTenant(m.tenant_id))) return fail(403, "Only this organization's admins can remove members.");
        if (m.user_id === me.id && !isPlatformAdmin) return fail(409, "You can't remove yourself.");
        const patch = { status: "revoked", rejected_by: me.id, rejected_at: now() };
        await sr.TenantMembership.update(m.id, patch);
        await syncUserFromMembership({ ...m, ...patch });
        await audit("member_revoked", { membership_id: m.id, tenant_id: m.tenant_id });
        return ok();
      }

      case "inviteMember": {
        const tenantId = me.tenant_id;
        if (!(await canManageTenant(tenantId))) return fail(403, "Only organization admins can invite members.");
        // Invites auto-join the invitee on sign-in, so only SafeNestT-verified
        // organizations may send them (never personal workspaces).
        const inviterOrg = await sr.Tenant.get(tenantId).catch(() => null);
        if (!isVerifiedOrg(inviterOrg)) return fail(403, "Only verified organizations can invite members.");
        const email = clean(body.email, 320).toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Enter a valid email address.");
        if (!ORG_ROLES.includes(body.organizationRole)) return fail(400, "Invalid role.");
        try { await base44.users.inviteUser(email, "user"); } catch (_) { /* may already exist */ }
        await sr.TenantMembership.create({
          tenant_id: tenantId, user_id: "pending", user_email: email, user_name: "",
          role: "member", organization_role: body.organizationRole, status: "invited", invited_by: me.email,
        });
        await audit("member_invited", { tenant_id: tenantId, email, role: body.organizationRole });
        return ok();
      }

      case "acceptInvite": {
        // Called on login: link any invite addressed to this email, then
        // the org admin activates it with assignRole (company already known).
        if (me.tenant_id) return ok({ accepted: 0 }); // never move an existing member
        const invites = await sr.TenantMembership.filter({ user_email: String(me.email).toLowerCase(), status: "invited" });
        let accepted = 0;
        for (const inv of invites || []) {
          if (accepted > 0) break; // one organization at a time
          const org = await sr.Tenant.get(inv.tenant_id).catch(() => null);
          if (!isVerifiedOrg(org)) continue; // ignore invites from unverified/personal tenants
          accepted++;
          await sr.TenantMembership.update(inv.id, {
            user_id: me.id, user_name: me.full_name || "", status: "active", joined_at: now(),
          });
          await syncUserFromMembership({ ...inv, user_id: me.id, status: "active" });
          await audit("invite_accepted", { membership_id: inv.id, tenant_id: inv.tenant_id });
        }
        return ok({ accepted });
      }

      case "renameOrg": {
        if (!(await canManageTenant(me.tenant_id))) return fail(403, "Only organization admins can rename the organization.");
        const name = clean(body.name);
        if (!name) return fail(400, "Name is required.");
        await sr.Tenant.update(me.tenant_id, { name });
        await audit("org_renamed", { tenant_id: me.tenant_id, name });
        return ok();
      }

      default:
        return fail(400, `Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error("orgAccess error:", error?.message || error);
    return fail(500, error?.message || "Server error");
  }
});
