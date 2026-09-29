import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, User, ShieldCheck, Menu, ChevronDown, Settings as SettingsIcon, LogOut, Building2 } from "lucide-react";
import { StatusDot } from "./panelPrimitives";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { getEffectiveRole, ROLE_LABELS, getOrganizationName } from "@/lib/organizationRoles";
import { useAuth } from "@/lib/AuthContext";

/**
 * Command header for the authenticated investigator shell.
 * Brand + operational status + search/alerts/profile. Mobile menu button included.
 */
export default function CommandHeader({ user, onMenuOpen, onLogout }) {
  const navigate = useNavigate();
  const { navigateToLogin } = useAuth();
  const role = getEffectiveRole(user);
  const orgName = getOrganizationName(user);
  const roleLabel = ROLE_LABELS[role] || "Member";

  return (
    <header className="relative z-20 bg-[#06090d]/80 backdrop-blur-md border-b border-slate-700/60 px-3 sm:px-4 h-12 flex items-center justify-between gap-3"
      style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* left: brand + status */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuOpen}
          aria-label="Open navigation"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block min-w-0">
            <p className="text-[12px] font-bold tracking-wider text-slate-100 leading-none">SAFENESTT // MIA</p>
            <p className="text-[9px] font-mono text-cyan-500/80 tracking-wider mt-0.5">INVESTIGATION OPERATIONS</p>
          </div>
        </div>
      </div>

      {/* center: organization context + operational status (desktop) */}
      <div className="hidden md:flex items-center gap-3 text-[10px] font-mono">
        <span className="flex items-center gap-1.5 text-slate-400 tracking-wider uppercase">
          <Building2 className="w-3 h-3 text-cyan-400" />
          ORG: <span className="text-cyan-300 truncate max-w-[160px]">{orgName || "PERSONAL"}</span>
        </span>
        <span className="text-slate-700">│</span>
        <span className="flex items-center gap-1.5 text-slate-400 tracking-wider uppercase">
          ROLE: <span className="text-emerald-300">{roleLabel}</span>
        </span>
        <span className="text-slate-700">│</span>
        <span className="flex items-center gap-1.5 text-slate-400 tracking-wider uppercase">
          <StatusDot tone="green" /> SYSTEM: <span className="text-emerald-300">ONLINE</span>
        </span>
        <span className="text-slate-700">│</span>
        <span className="flex items-center gap-1.5 text-slate-400 tracking-wider uppercase">
          <StatusDot tone="amber" /> EVIDENCE: <span className="text-amber-300">READY</span>
        </span>
      </div>

      {/* right: search + alerts + profile */}
      <div className="flex items-center gap-2">
        <Link to="/GlobalSearch" className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-md border border-slate-700/60 bg-[#0a0e13] text-slate-500 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors min-w-[160px]">
          <Search className="w-3.5 h-3.5" />
          <span className="text-[11px] font-mono tracking-wider uppercase">Search</span>
        </Link>
        <Link to="/Alerts" aria-label="Alerts" className="relative w-9 h-9 flex items-center justify-center rounded-md border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        </Link>
        {/* Account menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 h-9 px-2 rounded-md border border-slate-700/60 bg-[#0a0e13] text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <span className="text-cyan-200 text-[10px] font-bold">{user?.full_name?.[0]?.toUpperCase() || "U"}</span>
              </div>
              <div className="hidden sm:block text-left leading-none">
                <p className="text-[11px] text-slate-100 font-medium truncate max-w-[120px]">{user?.full_name || "User"}</p>
                <p className="text-[9px] text-slate-500 truncate max-w-[120px] mt-0.5">{roleLabel}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-[#06090d] border-slate-700 text-slate-200">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-slate-500">
              {user?.email}
            </DropdownMenuLabel>
            <div className="px-2 py-2 space-y-1 text-[12px]">
              <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="text-slate-200 truncate ml-2">{user?.full_name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Organization</span><span className="text-slate-200 truncate ml-2">{orgName || "Personal"}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="text-cyan-300 truncate ml-2">{roleLabel}</span></div>
              {user?.last_login && (
                <div className="flex justify-between"><span className="text-slate-500">Last login</span><span className="text-slate-400 truncate ml-2">{new Date(user.last_login).toLocaleString()}</span></div>
              )}
            </div>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={() => navigate("/Settings")} className="cursor-pointer text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10">
              <SettingsIcon className="w-4 h-4 mr-2" /> Settings
            </DropdownMenuItem>
            {role === "ORG_ADMIN" || role === "PLATFORM_ADMIN" ? (
              <DropdownMenuItem onClick={() => navigate("/OrganizationSettings")} className="cursor-pointer text-slate-300 hover:text-cyan-300 hover:bg-cyan-500/10">
                <Building2 className="w-4 h-4 mr-2" /> Organization Settings
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-300 hover:text-red-200 hover:bg-red-500/10">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}