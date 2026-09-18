import React from "react";
import { useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * Lightweight route-aware breadcrumb derived from the current URL.
 * Maps investigation-focused routes to a Section › Page chain.
 */
const ROUTE_MAP = {
  "/OperationsDashboard": { section: null, label: "Dashboard" },
  "/InvestigationHub": { section: "Investigations", label: "Investigations" },
  "/CasesManagement": { section: "Investigations", label: "Cases" },
  "/CaseImport": { section: "Investigations", label: "Import Case" },
  "/GlobalSearch": { section: "Investigations", label: "Global Search" },
  "/InvestigationWorkspace": { section: "Investigations", label: "Case Workspace" },
  "/AuditLog": { section: "Case Workspace", label: "Audit Log" },
  "/ReportsCenter": { section: "Case Workspace", label: "Reports Center" },
  "/ReportedScams": { section: "Intelligence", label: "Intelligence" },
  "/Alerts": { section: "Intelligence", label: "Monitoring" },
  "/SecurityDashboard": { section: "Intelligence", label: "Security" },
  "/MiaAssistant": { section: "Account", label: "AI Assistant" },
  "/PasswordVault": { section: "Account", label: "Password Vault" },
  "/Subscription": { section: "Account", label: "Subscription" },
  "/HelpCenter": { section: "Account", label: "Help & Support" },
  "/Settings": { section: "Account", label: "Settings" },
  "/Referrals": { section: "Account", label: "Referrals" },
  "/AdminDashboard": { section: "Admin", label: "Admin Dashboard" },
  "/AdminUserApprovals": { section: "Admin", label: "User Approvals" },
  "/AdminInvites": { section: "Admin", label: "Invite Manager" },
  "/AdminReports": { section: "Admin", label: "Reports & KPIs" },
  "/AdminSubscriptions": { section: "Admin", label: "Subscriptions" },
  "/AdminDeedFraud": { section: "Admin", label: "Deed Fraud Cases" },
  "/UserExport": { section: "Admin", label: "Export Users" },
};

const TAB_LABELS = {
  overview: "Overview",
  evidence: "Evidence",
  targets: "Targets",
  findings: "Findings",
  risk: "Risk",
  reports: "Reports",
  activity: "Activity",
  blockchain: "Blockchain",
  entities: "Entities",
  timeline: "Timeline",
};

export default function Breadcrumb() {
  const location = useLocation();
  const entry = ROUTE_MAP[location.pathname];
  if (!entry) return null;

  const crumbs = [];
  if (entry.section) crumbs.push({ label: entry.section });
  crumbs.push({ label: entry.label });

  // Workspace: append case id + active tab for precise context.
  if (location.pathname === "/InvestigationWorkspace") {
    const sp = new URLSearchParams(location.search);
    const caseId = sp.get("case_id");
    const tab = sp.get("tab");
    if (caseId) crumbs.push({ label: `#${caseId.slice(-6)}` });
    if (tab && TAB_LABELS[tab]) crumbs.push({ label: TAB_LABELS[tab] });
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />}
          <span className={i === crumbs.length - 1 ? "text-cyan-300 font-medium truncate" : "truncate"}>{c.label}</span>
        </React.Fragment>
      ))}
    </nav>
  );
}