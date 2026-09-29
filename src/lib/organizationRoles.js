/**
 * Organization role model for SafeNestT — Security Operations & Investigation Services.
 *
 * IMPORTANT: This module is UI-only. It drives role-based navigation and the
 * organization-aware shell. It is NOT a security boundary. The backend / Hermes
 * enforces authentication, authorization, tenant isolation, and investigation
 * permissions separately. Never treat frontend role hiding as the actual
 * security boundary.
 */

export const ORGANIZATION_TYPES = [
  { value: "bank_financial", label: "Bank / Financial Institution" },
  { value: "insurance", label: "Insurance Company" },
  { value: "pi_firm", label: "Private Investigator (PI) Firm" },
  { value: "corporate_enterprise", label: "Corporate / Enterprise" },
  { value: "law_enforcement_gov", label: "Law Enforcement / Government" },
  { value: "security_investigation", label: "Security / Investigation Company" },
  { value: "individual_investigator", label: "Individual Investigator" },
  { value: "other", label: "Other" },
];

export const ORG_TYPE_LABELS = Object.fromEntries(
  ORGANIZATION_TYPES.map((t) => [t.value, t.label])
);

export const ROLE_LABELS = {
  PLATFORM_ADMIN: "Platform Administrator",
  ORG_ADMIN: "Organization Administrator",
  INVESTIGATOR: "Investigator",
  ANALYST: "Analyst",
  CASE_MANAGER: "Case Manager",
  VIEWER: "Viewer (Read-Only)",
  AUDITOR: "Auditor",
  REGULAR_USER: "Member",
};

export const ROLE_SHORT = {
  PLATFORM_ADMIN: "PLATFORM ADMIN",
  ORG_ADMIN: "ORG ADMIN",
  INVESTIGATOR: "INVESTIGATOR",
  ANALYST: "ANALYST",
  CASE_MANAGER: "CASE MANAGER",
  VIEWER: "VIEWER",
  AUDITOR: "AUDITOR",
  REGULAR_USER: "MEMBER",
};

/** Roles assignable to an organization member (PLATFORM_ADMIN excluded). */
export const ORGANIZATION_ROLES = [
  "ORG_ADMIN",
  "INVESTIGATOR",
  "ANALYST",
  "CASE_MANAGER",
  "VIEWER",
  "AUDITOR",
];

export const ORG_ROLE_OPTIONS = ORGANIZATION_ROLES.map((r) => ({
  value: r,
  label: ROLE_LABELS[r],
}));

/**
 * Compute the effective UI role for the authenticated user.
 * Falls back to legacy tenant_role mapping for users onboarded before the
 * organization_role field existed.
 */
export function getEffectiveRole(user) {
  if (!user) return "VIEWER";
  if (user.role === "admin" || user.is_admin) return "PLATFORM_ADMIN";
  if (user.organization_role) return user.organization_role;
  if (user.tenant_role === "owner" || user.tenant_role === "admin") return "ORG_ADMIN";
  if (user.tenant_role === "investigator") return "INVESTIGATOR";
  return "REGULAR_USER";
}

export const isPlatformAdmin = (user) => getEffectiveRole(user) === "PLATFORM_ADMIN";
export const isOrgAdmin = (user) => getEffectiveRole(user) === "ORG_ADMIN";

export function isOrgMember(user) {
  const r = getEffectiveRole(user);
  return [
    "ORG_ADMIN",
    "INVESTIGATOR",
    "ANALYST",
    "CASE_MANAGER",
    "VIEWER",
    "AUDITOR",
  ].includes(r);
}

/** Can manage organization membership and settings. */
export function canManageOrg(user) {
  const r = getEffectiveRole(user);
  return r === "PLATFORM_ADMIN" || r === "ORG_ADMIN";
}

/** Can perform mutation actions (create/edit/delete/run). VIEWER and AUDITOR are read-only. */
export function canMutate(user) {
  const r = getEffectiveRole(user);
  return r !== "VIEWER" && r !== "AUDITOR" && r !== "REGULAR_USER";
}

export function getOrganizationName(user) {
  return user?.organization_name || null;
}

export function getRoleLabel(user) {
  return ROLE_LABELS[getEffectiveRole(user)] || "Member";
}