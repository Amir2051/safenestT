/**
 * Organization role model for SafeNestT — Security Operations & Investigation Services.
 *
 * THE single source of truth for roles in the UI. Use these helpers instead of
 * checking user.role / is_admin / tenant_role / job_title directly.
 *
 * Security: the fields read here (role, organization_role, tenant_role,
 * is_admin) are locked in the User schema and only set server-side by the
 * orgAccess function. Data rules (RLS) enforce the same roles on the server;
 * this module only decides what the UI shows.
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

/** Roles that can open and run investigations (matches RoleGate allowInvestigator). */
export const INVESTIGATION_ROLES = ["PLATFORM_ADMIN", "ORG_ADMIN", "INVESTIGATOR", "ANALYST", "CASE_MANAGER"];
export const canInvestigate = (user) => INVESTIGATION_ROLES.includes(getEffectiveRole(user));

/** Org staff: anyone working inside an organization (not an individual client). */
export const isStaff = (user) => isOrgMember(user) || isPlatformAdmin(user);

/**
 * Where each role lands after signing in. Pending/unverified members land on
 * Dashboard (read-only) until their organization access is approved.
 */
export function getHomePath(user) {
  if (!user) return "/";
  const r = getEffectiveRole(user);
  if (r === "PLATFORM_ADMIN") return "/OperationsDashboard";
  if (user.account_status === "pending" || user.membership_status && user.membership_status !== "active") return "/Dashboard";
  switch (r) {
    case "ORG_ADMIN":
    case "CASE_MANAGER":
      return "/OperationsDashboard";
    case "INVESTIGATOR":
    case "ANALYST":
      return "/InvestigationWorkspace";
    case "AUDITOR":
      return "/AuditLog";
    case "VIEWER":
      return "/CasesManagement";
    default:
      return "/Dashboard";
  }
}

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