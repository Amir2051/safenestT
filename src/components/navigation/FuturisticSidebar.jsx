import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Briefcase, FileSearch, ShieldAlert, FileText,
  Search, ScrollText, Upload, Radar, Activity, ShieldCheck, Bot, Lock,
  CreditCard, HelpCircle, Settings as SettingsIcon, ChevronLeft, Power,
  Command, Sparkles,
  UserCheck, UserPlus, FileBarChart, LifeBuoy, Users, TrendingUp,
  Server, Gavel, Home as HomeIcon, Cookie, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LiveClock from "@/components/shared/LiveClock";

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
      { id: "report-scam", label: "Report a Scam", icon: ShieldAlert, path: "/ReportScam", glow: "red" },
      { id: "vpn", label: "VPN Protection", icon: ShieldCheck, path: "/VPNPage", glow: "emerald", badge: "VPN" },
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

  const isAdmin = user?.role === "admin" || user?.is_admin;
  // Staff = admins + tenant investigators/owners — they get the full investigation OS.
  // Regular users get the minimal USER_SECTIONS navigation.
  const isStaff = isAdmin || ["owner", "admin", "investigator"].includes(user?.tenant_role);
  // Case-Workspace deep links (Evidence / Findings / Reports) only make sense
  // when a case is actually open — hide that section entirely otherwise.
  const hasCaseContext = new URLSearchParams(location.search).get("case_id");
  // Admins get a full multi-section administration sidebar covering all the
  // admin pages registered in pages.config.js, plus the Security/Operations
  // tools shared with investigators.
  const ADMIN_SECTIONS = [
    {
      label: "Administration",
      items: [
        { id: "admin-dashboard", label: "Admin Dashboard", icon: Command, path: "/AdminDashboard", glow: "cyan" },
        { id: "admin-approvals", label: "User Approvals", icon: UserCheck, path: "/AdminUserApprovals", glow: "cyan" },
        { id: "admin-invites", label: "User Invites", icon: UserPlus, path: "/AdminInvites", glow: "cyan" },
        { id: "admin-reports", label: "Admin Reports", icon: FileBarChart, path: "/AdminReports", glow: "cyan" },
        { id: "admin-support", label: "Admin Support", icon: LifeBuoy, path: "/AdminSupport", glow: "cyan" },
        { id: "admin-subscriptions", label: "Subscriptions", icon: CreditCard, path: "/AdminSubscriptions", glow: "purple" },
      ],
    },
    {
      label: "Growth & Referrals",
      items: [
        { id: "admin-referrals", label: "Referrals", icon: Users, path: "/AdminReferrals", glow: "purple" },
        { id: "admin-referral-dashboard", label: "Referral Dashboard", icon: TrendingUp, path: "/AdminReferralDashboard", glow: "purple" },
      ],
    },
    {
      label: "Monitoring & Infrastructure",
      items: [
        { id: "admin-monitoring", label: "Monitoring Dashboard", icon: Activity, path: "/AdminMonitoringDashboard", glow: "red" },
        { id: "admin-vpn-servers", label: "VPN Servers", icon: Server, path: "/AdminVPNServers", glow: "blue" },
      ],
    },
    {
      label: "Investigations",
      items: [
        { id: "admin-investigation", label: "Admin Investigation", icon: Gavel, path: "/AdminInvestigation", glow: "amber" },
        { id: "admin-deed-fraud", label: "Admin Deed Fraud", icon: HomeIcon, path: "/AdminDeedFraud", glow: "amber" },
      ],
    },
    {
      label: "Security & Operations",
      items: [
        { id: "ops-dashboard", label: "Operations", icon: LayoutDashboard, path: "/OperationsDashboard", glow: "cyan" },
        { id: "my-cases", label: "My Cases", icon: Briefcase, path: "/MyCases", glow: "cyan" },
        { id: "cases-mgmt", label: "Cases Management", icon: Briefcase, path: "/CasesManagement", glow: "cyan" },
        { id: "case-import", label: "Import Case", icon: Upload, path: "/CaseImport", glow: "cyan" },
        { id: "investigation-ws", label: "Investigation Workspace", icon: Sparkles, path: "/InvestigationWorkspace", glow: "purple", badge: "AI" },
        { id: "global-search", label: "Global Search", icon: Search, path: "/GlobalSearch", glow: "cyan" },
        { id: "reports-center", label: "Reports Center", icon: FileText, path: "/ReportsCenter", glow: "cyan" },
        { id: "audit-log", label: "Audit Log", icon: ScrollText, path: "/AuditLog", glow: "cyan" },
      ],
    },
  ];
  const navSections = isAdmin ? ADMIN_SECTIONS : isStaff ? SECTIONS : USER_SECTIONS;

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
      className={`${widthCls} h-full min-h-screen bg-black/95 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col relative transition-[width] duration-200`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/10 via-transparent to-purple-950/10 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full min-h-screen px-3 py-4">
        {/* Header / brand + collapse toggle */}
        <div className="flex items-center gap-2 px-1 mb-4">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shrink-0 border border-cyan-400/40 shadow-lg shadow-cyan-500/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="text-white font-bold text-sm tracking-wider leading-none">SafeNestT</p>
            <p className="text-cyan-400 text-[10px] font-mono mt-0.5">{isAdmin ? "// ADMIN //" : "// SECURED //"}</p>
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