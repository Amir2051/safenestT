import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search, Bell, Plus, Menu, ChevronRight, ShieldAlert, FolderSearch, Archive,
  ListChecks, FileText, CircleDot,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { WORKSPACES, DEMO_USER, NOTIFICATIONS, INVESTIGATIONS, EVIDENCE, FINDINGS, REPORTS } from "@/os/lib/demoData";

const CRUMBS = {
  "/os": ["Overview"],
  "/os/investigations": ["Investigations"],
  "/os/my-cases": ["My Cases"],
  "/os/intelligence": ["Intelligence"],
  "/os/evidence": ["Evidence"],
  "/os/findings": ["Findings"],
  "/os/reports": ["Reports"],
  "/os/operations": ["Operations"],
  "/os/hermes": ["Hermes AI"],
  "/os/automation": ["Automation"],
  "/os/team": ["Team"],
  "/os/integrations": ["Integrations"],
  "/os/analytics": ["Analytics"],
  "/os/settings": ["Settings"],
};

export default function OsTopbar({ workspace, onWorkspaceChange, onMenuOpen, onQuickAction, pathname }) {
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const crumbs = pathname.startsWith("/os/investigations/")
    ? ["Investigations", pathname.split("/").pop()]
    : CRUMBS[pathname] || ["Overview"];

  const q = query.trim().toLowerCase();
  const results = q
    ? [
        ...INVESTIGATIONS.filter((i) => (i.title + i.code).toLowerCase().includes(q)).slice(0, 4).map((i) => ({
          key: i.code, kind: "Investigation", label: i.title, meta: i.code, to: `/os/investigations/${i.code}`, icon: FolderSearch,
        })),
        ...EVIDENCE.filter((e) => (e.ref + e.type).toLowerCase().includes(q)).slice(0, 3).map((e) => ({
          key: e.ref, kind: "Evidence", label: e.type, meta: e.ref, to: "/os/evidence", icon: Archive,
        })),
        ...FINDINGS.filter((f) => f.title.toLowerCase().includes(q)).slice(0, 3).map((f) => ({
          key: f.ref, kind: "Finding", label: f.title, meta: f.ref, to: "/os/findings", icon: ListChecks,
        })),
        ...REPORTS.filter((r) => (r.title + r.ref).toLowerCase().includes(q)).slice(0, 3).map((r) => ({
          key: r.ref, kind: "Report", label: r.title, meta: r.ref, to: "/os/reports", icon: FileText,
        })),
      ].slice(0, 8)
    : [];

  return (
    <header className="sticky top-0 z-30 border-b border-os-line bg-os-bg/95 backdrop-blur">
      <div className="flex h-12 items-center gap-2 px-3">
        <button
          onClick={onMenuOpen}
          className="rounded p-1.5 text-os-muted hover:bg-os-raised hover:text-os-text lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </button>

        <nav className="hidden items-center gap-1 text-[11px] text-os-muted md:flex">
          <Link to="/os" className="hover:text-os-text">SafeNestT OS</Link>
          {crumbs.map((c) => (
            <span key={c} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-os-line2" />
              <span className={c === crumbs[crumbs.length - 1] ? "text-os-text" : ""}>{c}</span>
            </span>
          ))}
        </nav>

        <div className="relative ml-auto w-full max-w-[360px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-os-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, evidence, findings…"
            className="h-8 w-full rounded border border-os-line bg-os-panel pl-7 pr-2 text-[12px] text-os-text placeholder:text-os-muted/70 focus:border-os-cobalt focus:outline-none"
          />
          {!!results.length && (
            <div className="absolute left-0 right-0 top-9 z-40 overflow-hidden rounded border border-os-line2 bg-os-panel shadow-xl">
              {results.map((r) => (
                <Link
                  key={`${r.kind}-${r.key}`}
                  to={r.to}
                  onClick={() => setQuery("")}
                  className="flex items-center gap-2 border-b border-os-line px-2.5 py-2 last:border-b-0 hover:bg-os-raised"
                >
                  <r.icon className="h-3.5 w-3.5 shrink-0 text-os-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] text-os-text">{r.label}</span>
                    <span className="block font-mono text-[10px] text-os-muted">{r.meta}</span>
                  </span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-os-muted">{r.kind}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="hidden items-center gap-1.5 rounded border border-os-line bg-os-panel px-2 py-1 text-[11px] text-os-muted hover:text-os-text sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-os-cyan" />
              {workspace.name}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Switch workspace</DropdownMenuLabel>
            {WORKSPACES.map((w) => (
              <DropdownMenuItem key={w.id} onClick={() => onWorkspaceChange(w)}>
                <span className="flex-1 truncate">{w.name}</span>
                <span className="text-[10px] text-muted-foreground">{w.plan}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Manage workspaces (demo)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative rounded border border-os-line bg-os-panel p-1.5 text-os-muted hover:text-os-text" aria-label="Notifications">
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-os-amber font-mono text-[8px] font-bold text-os-bg">
                {NOTIFICATIONS.length}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              Notifications <span>demo</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NOTIFICATIONS.map((n) => (
              <div key={n.title} className="border-b border-border px-2.5 py-2 last:border-b-0">
                <div className="flex items-center gap-1.5">
                  <CircleDot className={`h-3 w-3 ${n.level === "error" ? "text-os-red" : n.level === "warn" ? "text-os-amber" : "text-os-cobalt"}`} />
                  <span className="flex-1 text-[11.5px] font-medium text-foreground">{n.title}</span>
                  <span className="font-mono text-[9.5px] text-muted-foreground">{n.t}</span>
                </div>
                <p className="pl-4 pt-0.5 text-[11px] leading-snug text-muted-foreground">{n.body}</p>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="h-8 gap-1 bg-os-cobalt px-2.5 text-[11.5px] font-medium text-white hover:bg-os-cobalt2"
        >
          <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Quick create</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded border border-os-line bg-os-panel p-1 pr-2 hover:border-os-line2">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-os-cobalt/20 font-mono text-[10px] font-bold text-os-cyan">
                {DEMO_USER.initials}
              </span>
              <span className="hidden text-left lg:block">
                <span className="block text-[11px] leading-tight text-os-text">{DEMO_USER.name}</span>
                <span className="block text-[9.5px] leading-tight text-os-muted">{DEMO_USER.role}</span>
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[10px] normal-case tracking-normal text-muted-foreground">
              {DEMO_USER.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onQuickAction("Profile settings")}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onQuickAction("Preferences")}>Preferences</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Sign out (demo)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-os-amber" /> Quick create
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              Prototype only — choosing an option demonstrates the flow. No record is created.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-1">
            {[
              ["New investigation", "Open an intake form with scope and targets"],
              ["Upload evidence", "Attach files and start chain-of-custody"],
              ["Log a finding", "Record an observation against a case"],
              ["Generate a report", "Pick a template and assemble a draft"],
            ].map(([title, desc]) => (
              <button
                key={title}
                onClick={() => {
                  setCreateOpen(false);
                  onQuickAction(title);
                }}
                className="rounded border border-os-line bg-os-panel px-3 py-2 text-left hover:border-os-cobalt/50 hover:bg-os-raised"
              >
                <div className="text-[12.5px] font-medium text-os-text">{title}</div>
                <div className="text-[11px] text-os-muted">{desc}</div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}