import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Briefcase, FileSearch, ShieldAlert, FileText,
  Search, ScrollText, Upload, Radar, Activity, ShieldCheck, Bot, Lock,
  CreditCard, HelpCircle, Settings as SettingsIcon, ChevronLeft, Power, Wallet,
  Command, Sparkles,
  UserCheck, UserPlus, FileBarChart, LifeBuoy, Users, TrendingUp,
  Server, Gavel, Home as HomeIcon, Cookie, Scale, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LiveClock from "@/components/shared/LiveClock";
import { getEffectiveRole, ROLE_LABELS, ROLE_SHORT } from "@/lib/organizationRoles";

/**
 * Investigation-focused sidebar.
 * Clean section hierarchy, role-gated admin zone, desktop collapse-to-rail,
 * and case-aware workspace deep links (Evidence / Findings & Risk / Reports).
 */

const SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/OperationsDashboard", glow: "cyan" },
    ],
  },
  {
    label: "Investigations",
    items: [
      { id: "ai-investigations", label: "AI Investigations", icon: Sparkles, path: "/InvestigationWorkspace", glow: "purple", badge: "AI", prominent: true },
      { id: "cases", label: "Cases", icon: Briefcase, path: "/CasesManagement", glow: "cyan" },
      { id: "import", label: "Import Case", icon: Upload, path: "/CaseImport", glow: "cyan" },
      { id: "global-search", label: "Global Search", icon: Search, path: "/GlobalSearch", glow: "cyan" },
    ],
  },
  {
    label: "Case Workspace",
    items: [
      { id: "ws-evidence", label: "Evidence", icon: FileSearch, path: "/InvestigationWorkspace", tab: "evidence", glow: "cyan" },
      { id: "ws-findings", label: "Findings & Risk", icon: ShieldAlert, path: "/InvestigationWorkspace", tab: "findings", glow: "amber" },
      { id: "ws-reports", label: "Reports & Dossiers", icon: FileText, path: "/InvestigationWorkspace", tab: "reports", glow: "cyan" },
      { id: "audit", label: "Audit Log", icon: ScrollText, path: "/AuditLog", glow: "cyan" },
      { id: "client-auth", label: "Client Authorizations", icon: ShieldCheck, path: "/ClientAuthorizations", glow: "emerald" },
    ],
  },
  {
    label: "Intelligence & Security",
    items: [
      { id: "intelligence", label: "Intelligence", icon: Radar, path: "/ReportedScams", glow: "red" },
      { id: "monitoring", label: "Monitoring", icon: Activity, path: "/Alerts", glow: "red", badge: "LIVE" },
      { id: "security", label: "Security", icon: ShieldCheck, path: "/SecurityDashboard", glow: "emerald" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "assistant", label: "AI Assistant", icon: Bot, path: "/MiaAssistant", glow: "purple", badge: "AI" },
      { id: "vault", label: "Password Vault", icon: Lock, path: "/PasswordVault", glow: "blue" },
      { id: "subscription", label: "Subscription", icon: CreditCard, path: "/Subscription", glow: "purple" },
      { id: "settings", label: "Settings", icon: SettingsIcon, path: "/Settings", glow: "gray" },
    ],
  },
  {
    label: "Legal & Privacy",
    items: [
      { id: "privacy-policy", label: "Privacy Policy", icon: ShieldCheck, path: "/PrivacyPolicy", glow: "cyan" },
      { id: "terms", label: "Terms & Conditions", icon: Scale, path: "/TermsAndConditions", glow: "cyan" },
      { id: "aup", label: "Acceptable Use", icon: ShieldAlert, path: "/AcceptableUsePolicy", glow: "cyan" },
      { id: "refund", label: "Refund Policy", icon: CreditCard, path: "/RefundPolicy", glow: "cyan" },
      { id: "cookie-policy", label: "Cookie Policy", icon: Cookie, path: "/CookiePolicy", glow: "cyan" },
      { id: "data-rights", label: "Data Rights & Deletion", icon: FileText, path: "/DataRightsDeletion", glow: "cyan" },
      { id: "rights-center", label: "Rights Center", icon: FileSearch, path: "/RightsCenter", glow: "emerald" },
      { id: "cookie-intel", label: "Cookie Intel", icon: Cookie, path: "/CookieIntel", glow: "amber" },
      { id: "help", label: "Help & Support", icon: HelpCircle, path: "/HelpCenter", glow: "blue" },
    ],
  },
];

// Minimal navigation for regular (non-staff) users.
const USER_SECTIONS = [
  {
    label: "Home",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", glow: "cyan" },
    ],
  },
  {
    label: "My Activity",
    items: [
      { id: "my-cases", label: "My Cases", icon: Briefcase, path: "/MyCases", glow: "cyan" },
      { id: "report-scam", label: "Report a Scam", icon: ShieldAlert, path: "/ReportScam", glow: "red" },
      { id: "my-auth", label: "My Authorizations", icon: ShieldCheck, path: "/ClientAuthorizations", glow: "emerald" },
    ],
  },
  {
    label: "Account",
    items: [
      { id: "assistant", label: "AI Assistant", icon: Bot, path: "/MiaAssistant", glow: "purple", badge: "AI" },
      { id: "subscription", label: "Subscription", icon: CreditCard, path: "/Subscription", glow: "purple" },
      { id: "settings", label: "Settings", icon: SettingsIcon, path: "/Settings", glow: "gray" },
    ],
  },
  {
    label: "Legal & Privacy",
    items: [
      { id: "privacy-policy", label: "Privacy Policy", icon: ShieldCheck, path: "/PrivacyPolicy", glow: "cyan" },
      { id: "terms", label: "Terms & Conditions", icon: Scale, path: "/TermsAndConditions", glow: "cyan" },
      { id: "aup", label: "Acceptable Use", icon: ShieldAlert, path: "/AcceptableUsePolicy", glow: "cyan" },
      { id: "refund", label: "Refund Policy", icon: CreditCard, path: "/RefundPolicy", glow: "cyan" },
      { id: "cookie-policy", label: "Cookie Policy", icon: Cookie, path: "/CookiePolicy", glow: "cyan" },
      { id: "data-rights", label: "Data Rights & Deletion", icon: FileText, path: "/DataRightsDeletion", glow: "cyan" },
      { id: "rights-center", label: "Rights Center", icon: FileSearch, path: "/RightsCenter", glow: "emerald" },
      { id: "cookie-intel", label: "Cookie Intel", icon: Cookie, path: "/CookieIntel", glow: "amber" },
      { id: "help", label: "Help & Support", icon: HelpCircle, path: "/HelpCenter", glow: "blue" },
    ],
  },
];

// Shared nav items reused across organization roles.
const ORG_ITEMS = {
  dashboard: { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/OperationsDashboard", glow: "cyan" },
  investigations: { id: "investigations", label: "Investigations", icon: Sparkles, path: "/InvestigationWorkspace", glow: "purple", badge: "AI", prominent: true },
  cases: { id: "cases", label: "Cases", icon: Briefcase, path: "/CasesManagement", glow: "cyan" },
  caseImport: { id: "case-import", label: "Import Case", icon: Upload, path: "/CaseImport", glow: "cyan" },
  globalSearch: { id: "global-search", label: "Global Search", icon: Search, path: "/GlobalSearch", glow: "cyan" },
  evidence: { id: "ws-evidence", label: "Evidence", icon: FileSearch, path: "/InvestigationWorkspace", tab: "evidence", glow: "cyan" },
  findings: { id: "ws-findings", label: "Findings & Risk", icon: ShieldAlert, path: "/InvestigationWorkspace", tab: "findings", glow: "amber" },
  reports: { id: "reports", label: "Reports", icon: FileText, path: "/ReportsCenter", glow: "cyan" },
  audit: { id: "audit", label: "Audit Log", icon: ScrollText, path: "/AuditLog", glow: "cyan" },
  clientAuth: { id: "client-auth", label: "Client Authorizations", icon: ShieldCheck, path: "/ClientAuthorizations", glow: "emerald" },
  team: { id: "team", label: "Team", icon: Users, path: "/Team", glow: "cyan" },
  orgSettings: { id: "org-settings", label: "Organization", icon: Building2, path: "/OrganizationSettings", glow: "cyan" },
  assistant: { id: "assistant", label: "AI Assistant", icon: Bot, path: "/MiaAssistant", glow: "purple", badge: "AI" },
  settings: { id: "settings", label: "Settings", icon: SettingsIcon, path: "/Settings", glow: "gray" },
};

const LEGAL_ITEMS = [
  { id: "privacy-policy", label: "Privacy Policy", icon: ShieldCheck, path: "/PrivacyPolicy", glow: "cyan" },
  { id: "terms", label: "Terms & Conditions", icon: Scale, path: "/TermsAndConditions", glow: "cyan" },
  { id: "aup", label: "Acceptable Use", icon: ShieldAlert, path: "/AcceptableUsePolicy", glow: "cyan" },
  { id: "refund", label: "Refund Policy", icon: CreditCard, path: "/RefundPolicy", glow: "cyan" },
  { id: "cookie-policy", label: "Cookie Policy", icon: Cookie, path: "/CookiePolicy", glow: "cyan" },
  { id: "data-rights", label: "Data Rights & Deletion", icon: FileText, path: "/DataRightsDeletion", glow: "cyan" },
  { id: "rights-center", label: "Rights Center", icon: FileSearch, path: "/RightsCenter", glow: "emerald" },
  { id: "cookie-intel", label: "Cookie Intel", icon: Cookie, path: "/CookieIntel", glow: "amber" },
  { id: "help", label: "Help & Support", icon: HelpCircle, path: "/HelpCenter", glow: "blue" },
];
const LEGAL_SECTION = { label: "Legal & Privacy", items: LEGAL_ITEMS };

// Role-specific navigation for organization members. PLATFORM_ADMIN keeps
// the ADMIN_SECTIONS defined inside the component (platform admin experience);
// REGULAR_USER keeps USER_SECTIONS (victim/individual experience).
const ORG_SECTIONS = {
  ORG_ADMIN: [
    { label: "Overview", items: [ORG_ITEMS.dashboard] },
    { label: "Investigations", items: [ORG_ITEMS.investigations, ORG_ITEMS.cases, ORG_ITEMS.caseImport, ORG_ITEMS.globalSearch] },
    { label: "Case Workspace", items: [ORG_ITEMS.evidence, ORG_ITEMS.findings, ORG_ITEMS.reports, ORG_ITEMS.audit, ORG_ITEMS.clientAuth] },
    { label: "Organization", items: [ORG_ITEMS.team, ORG_ITEMS.orgSettings] },
    { label: "Account", items: [ORG_ITEMS.assistant, ORG_ITEMS.settings] },
    LEGAL_SECTION,
  ],
  INVESTIGATOR: [
    { label: "Overview", items: [ORG_ITEMS.dashboard] },
    { label: "Investigations", items: [ORG_ITEMS.investigations, ORG_ITEMS.cases, ORG_ITEMS.globalSearch] },
    { label: "Case Workspace", items: [ORG_ITEMS.evidence, ORG_ITEMS.findings, ORG_ITEMS.reports, ORG_ITEMS.clientAuth] },
    { label: "Account", items: [ORG_ITEMS.assistant, ORG_ITEMS.settings] },
    LEGAL_SECTION,
  ],
  ANALYST: [
    { label: "Overview", items: [ORG_ITEMS.dashboard] },
    { label: "Investigations", items: [ORG_ITEMS.investigations, ORG_ITEMS.cases, ORG_ITEMS.globalSearch] },
    { label: "Case Workspace", items: [ORG_ITEMS.evidence, ORG_ITEMS.findings, ORG_ITEMS.reports] },
    { label: "Account", items: [ORG_ITEMS.assistant, ORG_ITEMS.settings] },
    LEGAL_SECTION,
  ],
  CASE_MANAGER: [
    { label: "Overview", items: [ORG_ITEMS.dashboard] },
    { label: "Investigations", items: [ORG_ITEMS.investigations, ORG_ITEMS.cases, ORG_ITEMS.caseImport, ORG_ITEMS.globalSearch] },
    { label: "Case Workspace", items: [ORG_ITEMS.evidence, ORG_ITEMS.findings, ORG_ITEMS.reports, ORG_ITEMS.clientAuth] },
    { label: "Account", items: [ORG_ITEMS.assistant, ORG_ITEMS.settings] },
    LEGAL_SECTION,
  ],
  VIEWER: [
    { label: "Overview", items: [ORG_ITEMS.dashboard] },
    { label: "Investigations", items: [ORG_ITEMS.cases, ORG_ITEMS.investigations, ORG_ITEMS.globalSearch] },
    { label: "Case Workspace", items: [ORG_ITEMS.evidence, ORG_ITEMS.findings, ORG_ITEMS.reports] },
    { label: "Account", items: [ORG_ITEMS.settings] },
    LEGAL_SECTION,
  ],
  AUDITOR: [
    { label: "Overview", items: [ORG_ITEMS.dashboard] },
    { label: "Review", items: [ORG_ITEMS.audit, ORG_ITEMS.cases, ORG_ITEMS.investigations, ORG_ITEMS.evidence, ORG_ITEMS.reports] },
    { label: "Account", items: [ORG_ITEMS.settings] },
    LEGAL_SECTION,
  ],
};

const glowBar = {
  cyan: "from-cyan-500 to-cyan-400",
  purple: "from-purple-500 to-fuchsia-500",
  amber: "from-amber-500 to-orange-500",
  red: "from-red-500 to-rose-500",
  emerald: "from-emerald-500 to-green-500",
  blue: "from-blue-500 to-sky-500",
  gray: "from-gray-500 to-slate-500",
};

function isActiveItem(item, location) {
  const sp = new URLSearchParams(location.search);
  if (item.tab) {
    return location.pathname === item.path && sp.get("tab") === item.tab;
  }
  // The AI Investigations entry shares /InvestigationWorkspace with the
  // case-tab deep links — only mark it active when no tab is selected.
  if (item.path === "/InvestigationWorkspace") {
    return location.pathname === item.path && !sp.get("tab");
  }
  return location.pathname === item.path;
}

export default function FuturisticSidebar({ user, onLogout, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sn-sidebar-collapsed") === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sn-sidebar-collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  const effectiveRole = getEffectiveRole(user);
  const isAdmin = effectiveRole === "PLATFORM_ADMIN";
  // Case-Workspace deep links (Evidence / Findings / Reports) only make sense
  // when a case is actually open — hide that section entirely otherwise.
  const hasCaseContext = new URLSearchParams(location.search).get("case_id");
  // PLATFORM_ADMIN (SafeNestT internal) gets the platform administration sidebar.
  // Organization members get role-specific navigation from ORG_SECTIONS.
  // REGULAR_USER (no organization) keeps the minimal USER_SECTIONS navigation.
  const ADMIN_SECTIONS = [
    {
      label: "Overview",
      items: [
        { id: "ops-dashboard", label: "Operations", icon: LayoutDashboard, path: "/OperationsDashboard", glow: "cyan" },
      ],
    },
    {
      label: "Investigations",
      items: [
        { id: "investigation-ws", label: "Investigations", icon: Sparkles, path: "/InvestigationWorkspace", glow: "purple", badge: "AI" },
        { id: "cases-mgmt", label: "Cases", icon: Briefcase, path: "/CasesManagement", glow: "cyan" },
        { id: "case-import", label: "Import Case", icon: Upload, path: "/CaseImport", glow: "cyan" },
        { id: "global-search", label: "Global Search", icon: Search, path: "/GlobalSearch", glow: "cyan" },
      ],
    },
    {
      label: "Reports & Audit",
      items: [
        { id: "reports-center", label: "Reports", icon: FileText, path: "/ReportsCenter", glow: "cyan" },
        { id: "audit-log", label: "Audit Trail", icon: ScrollText, path: "/AuditLog", glow: "cyan" },
      ],
    },
    {
      label: "Intelligence",
      items: [
        { id: "wallet-tracker", label: "Wallet Tracker", icon: Wallet, path: "/WalletTrackerAdmin", glow: "cyan" },
        { id: "flow-map", label: "Flow Map", icon: Activity, path: "/FlowMapAdmin", glow: "purple" },
        { id: "threat-intel", label: "Threat Intel", icon: ShieldAlert, path: "/ReportedScams", glow: "red" },
      ],
    },
    {
      label: "Platform",
      items: [
        { id: "users", label: "Users", icon: Users, path: "/AdminUserApprovals", glow: "cyan" },
        { id: "invites", label: "Invitations", icon: UserPlus, path: "/AdminInvites", glow: "cyan" },
        { id: "analytics", label: "Analytics", icon: TrendingUp, path: "/AdminReports", glow: "blue" },
        { id: "subscriptions", label: "Subscriptions", icon: CreditCard, path: "/AdminSubscriptions", glow: "purple" },
        { id: "user-export", label: "User Export", icon: FileBarChart, path: "/UserExport", glow: "cyan" },
        { id: "admin-support", label: "Support Queue", icon: LifeBuoy, path: "/AdminSupport", glow: "cyan" },
      ],
    },
    {
      label: "Growth",
      items: [
        { id: "admin-referrals", label: "Referrals", icon: UserCheck, path: "/AdminReferrals", glow: "purple" },
        { id: "admin-referral-dashboard", label: "Referral Analytics", icon: TrendingUp, path: "/AdminReferralDashboard", glow: "purple" },
      ],
    },
  ];
  const navSections = isAdmin
    ? ADMIN_SECTIONS
    : ORG_SECTIONS[effectiveRole]
      ? ORG_SECTIONS[effectiveRole]
      : USER_SECTIONS;

  const go = (item) => {
    let url = item.path;
    if (item.tab) {
      // Preserve the current case context when switching workspace tabs.
      const sp = new URLSearchParams(location.search);
      const caseId = sp.get("case_id");
      const next = new URLSearchParams();
      next.set("tab", item.tab);
      if (caseId) next.set("case_id", caseId);
      url = `${item.path}?${next.toString()}`;
    }
    navigate(url);
    if (onNavigate) onNavigate();
  };

  const NavButton = ({ item }) => {
    const active = isActiveItem(item, location);
    const Icon = item.icon;
    const grad = glowBar[item.glow] || glowBar.cyan;
    return (
      <button
        onClick={() => go(item)}
        title={collapsed ? item.label : undefined}
        className={`relative w-full flex items-center gap-3 rounded-lg transition-all duration-200 group touch-manipulation
          ${collapsed ? "lg:justify-center lg:px-0 px-3" : "px-3"}
          py-2.5
          ${active
            ? "bg-cyan-500/10 border border-cyan-500/40"
            : item.prominent
              ? "border border-purple-500/30 bg-purple-500/[0.06] hover:bg-purple-500/10 hover:border-purple-500/50"
              : "border border-transparent hover:bg-white/[0.04] hover:border-white/10"}`}
      >
        {active && (
          <span className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b ${grad}`} />
        )}
        <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-cyan-300" : item.prominent ? "text-purple-300 group-hover:text-purple-200" : "text-gray-400 group-hover:text-cyan-300"}`} />
        <span className={`flex-1 text-left text-sm font-medium truncate transition-colors ${active ? "text-white" : "text-gray-300 group-hover:text-white"} ${collapsed ? "lg:hidden" : ""}`}>
          {item.label}
        </span>
        {item.badge && !collapsed && (
          <Badge className={`text-[9px] px-1.5 py-0.5 border ${
            item.badge === "AI" ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
            : item.badge === "LIVE" ? "bg-red-500/20 text-red-300 border-red-500/40"
            : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"}`}>
            {item.badge}
          </Badge>
        )}
      </button>
    );
  };

  const widthCls = collapsed ? "w-72 lg:w-[78px]" : "w-72";

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className={`${widthCls} h-full min-h-screen bg-[#06090d] border-r border-slate-700/60 flex flex-col relative transition-[width] duration-200`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full min-h-screen px-3 py-4">
        {/* Header / brand + collapse toggle */}
        <div className="flex items-center gap-2 px-1 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 border border-cyan-500/40">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="text-white font-bold text-sm tracking-wider leading-none">SafeNestT</p>
            <p className="text-cyan-400 text-[10px] font-mono mt-0.5">{isAdmin ? "// ADMIN //" : `// ${ROLE_SHORT[effectiveRole] || "SECURED"} //`}</p>
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex ml-auto w-7 h-7 items-center justify-center rounded-md border border-white/10 text-gray-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
            title={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* User chip */}
        <div className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-2 mb-3 ${collapsed ? "lg:justify-center" : ""}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <span className="text-cyan-200 text-xs font-bold">{user?.full_name?.[0]?.toUpperCase() || "U"}</span>
          </div>
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="text-xs font-medium text-white truncate leading-none">{user?.full_name || "User"}</p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{user?.email || ""}</p>
          </div>
        </div>
        {effectiveRole !== "REGULAR_USER" && !collapsed && (
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Role</span>
            <Badge className="text-[9px] px-1.5 py-0.5 border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">{ROLE_LABELS[effectiveRole]}</Badge>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto pr-1 -mr-1 scrollbar-custom space-y-4">
          {navSections.map((section) => {
            if (section.label === "Case Workspace" && !hasCaseContext) return null;
            return (
              <div key={section.label}>
                <p className={`px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-cyan-500/70 ${collapsed ? "lg:hidden" : ""}`}>{section.label}</p>
                <div className="space-y-1">
                  {section.items.map((item) => <NavButton key={item.id} item={item} />)}
                </div>
              </div>
            );
          })}

        </nav>

        {/* Footer */}
        <div className="pt-3 mt-2 border-t border-white/5 space-y-2">
          <div className={`flex items-center justify-between px-2 py-1.5 rounded-md bg-white/[0.02] border border-white/10 ${collapsed ? "lg:hidden" : ""}`}>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Engine
            </span>
            <span className="text-[10px] text-gray-400 font-mono"><LiveClock /></span>
          </div>
          <Button
            variant="outline"
            onClick={() => { onLogout?.(); onNavigate?.(); }}
            className={`w-full bg-red-950/30 border-red-500/40 text-red-300 hover:bg-red-950/50 hover:border-red-500/60 transition-all ${collapsed ? "lg:px-0" : ""}`}
            title={collapsed ? "Sign Out" : undefined}
          >
            <Power className="w-4 h-4 shrink-0" />
            <span className={`ml-2 ${collapsed ? "lg:hidden" : ""}`}>Sign Out</span>
          </Button>
        </div>
      </div>

      <style>{`
        .scrollbar-custom::-webkit-scrollbar { width: 6px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.25); border-radius: 10px; }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.45); }
        .scrollbar-custom { scrollbar-width: thin; scrollbar-color: rgba(6,182,212,0.25) transparent; }
      `}</style>
    </motion.aside>
  );
}