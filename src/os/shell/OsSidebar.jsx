import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, FolderSearch, FolderOpen, Radar, Archive, ListChecks, FileText,
  Activity, Cpu, Workflow, Users, Plug, BarChart3, Settings as SettingsIcon, ChevronLeft,
  ChevronsUpDown, ShieldHalf, X,
} from "lucide-react";

export const NAV_GROUPS = [
  {
    label: "Mission",
    items: [
      { to: "/os", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/os/investigations", label: "Investigations", icon: FolderSearch },
      { to: "/os/my-cases", label: "My Cases", icon: FolderOpen },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/os/intelligence", label: "Intelligence", icon: Radar },
      { to: "/os/evidence", label: "Evidence", icon: Archive },
      { to: "/os/findings", label: "Findings", icon: ListChecks },
    ],
  },
  {
    label: "Output",
    items: [{ to: "/os/reports", label: "Reports", icon: FileText }],
  },
  {
    label: "Platform",
    items: [
      { to: "/os/operations", label: "Operations", icon: Activity },
      { to: "/os/hermes", label: "Hermes AI", icon: Cpu },
      { to: "/os/automation", label: "Automation", icon: Workflow },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/os/team", label: "Team", icon: Users },
      { to: "/os/integrations", label: "Integrations", icon: Plug },
      { to: "/os/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/os/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export default function OsSidebar({ collapsed, onToggle, workspace, onWorkspaceClick, onNavigate, mobile = false, onClose }) {
  return (
    <aside
      className={`flex h-full flex-col border-r border-os-line bg-os-bg ${collapsed && !mobile ? "w-[62px]" : "w-[238px]"}`}
    >
      <div className="flex h-12 items-center gap-2 border-b border-os-line px-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-os-cobalt/15 text-os-cyan">
          <ShieldHalf className="h-4 w-4" strokeWidth={1.9} />
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-os-text">
              SafeNestT <span className="text-os-cyan">OS</span>
            </div>
            <div className="truncate text-[10px] text-os-muted">Mission control · demo</div>
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="rounded p-1 text-os-muted hover:bg-os-raised hover:text-os-text" aria-label="Close navigation">
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="rounded p-1 text-os-muted hover:bg-os-raised hover:text-os-text"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      <button
        onClick={onWorkspaceClick}
        className="mx-2 mt-2 flex items-center gap-2 rounded border border-os-line bg-os-panel px-2 py-1.5 text-left hover:border-os-line2"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-os-cyan/15 font-mono text-[10px] font-bold text-os-cyan">
          {workspace.name.slice(0, 1)}
        </span>
        {(!collapsed || mobile) && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-medium text-os-text">{workspace.name}</span>
              <span className="block truncate text-[10px] text-os-muted">{workspace.plan} workspace</span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-os-muted" />
          </>
        )}
      </button>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            {(!collapsed || mobile) && (
              <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-os-muted/70">
                {group.label}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    title={collapsed && !mobile ? label : undefined}
                    className={({ isActive }) =>
                      `group flex items-center gap-2 rounded px-2 py-1.5 text-[12px] transition-colors ${
                        isActive
                          ? "bg-os-cobalt/15 text-os-text shadow-[inset_2px_0_0_0_#22D3EE]"
                          : "text-os-muted hover:bg-os-raised hover:text-os-text"
                      } ${collapsed && !mobile ? "justify-center" : ""}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-os-cyan" : ""}`} strokeWidth={1.75} />
                        {(!collapsed || mobile) && <span className="truncate">{label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {(!collapsed || mobile) && (
        <div className="border-t border-os-line px-3 py-2 text-[10px] leading-relaxed text-os-muted">
          Prototype build · all data synthetic
        </div>
      )}
    </aside>
  );
}