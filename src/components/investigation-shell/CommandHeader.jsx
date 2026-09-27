import React from "react";
import { Link } from "react-router-dom";
import { Search, Bell, User, ShieldCheck, Menu } from "lucide-react";
import { StatusDot } from "./panelPrimitives";

/**
 * Command header for the authenticated investigator shell.
 * Brand + operational status + search/alerts/profile. Mobile menu button included.
 */
export default function CommandHeader({ user, onMenuOpen, onLogout }) {
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

      {/* center: operational status (desktop) */}
      <div className="hidden md:flex items-center gap-3 text-[10px] font-mono">
        <span className="flex items-center gap-1.5 text-slate-400 tracking-wider uppercase">
          <StatusDot tone="green" /> TENANT: <span className="text-emerald-300">ACTIVE</span>
        </span>
        <span className="text-slate-700">│</span>
        <span className="flex items-center gap-1.5 text-slate-400 tracking-wider uppercase">
          <StatusDot tone="green" /> SYSTEM: <span className="text-emerald-300">ONLINE</span>
        </span>
        <span className="text-slate-700">│</span>
        <span className="flex items-center gap-1.5 text-slate-400 tracking-wider uppercase">
          <StatusDot tone="cyan" /> AGENTS: <span className="text-cyan-300">6 ONLINE</span>
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
        <Link to="/Settings" aria-label="Profile" className="w-9 h-9 flex items-center justify-center rounded-md border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors">
          <User className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}