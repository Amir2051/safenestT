import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import DemoBanner from "./DemoBanner";
import OsSidebar from "./OsSidebar";
import OsTopbar from "./OsTopbar";
import { WORKSPACES } from "@/os/lib/demoData";
import { useDemoToast } from "@/os/lib/useDemoToast";

export default function OsLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspace, setWorkspace] = useState(WORKSPACES[0]);
  const { pathname } = useLocation();
  const demoAction = useDemoToast();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-os-bg text-os-text">
      <DemoBanner />

      <div className="flex min-h-0 flex-1">
        <div className="hidden shrink-0 lg:block">
          <OsSidebar
            collapsed={collapsed}
            onToggle={() => setCollapsed((c) => !c)}
            workspace={workspace}
            onWorkspaceClick={() => demoAction("Workspace switching")}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <OsTopbar
            workspace={workspace}
            onWorkspaceChange={(w) => {
              setWorkspace(w);
              demoAction(`Switching to ${w.name}`);
            }}
            onMenuOpen={() => setMobileOpen(true)}
            onQuickAction={(label) => demoAction(label)}
            pathname={pathname}
          />

          <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">
            <Outlet />
          </main>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed bottom-0 left-0 top-0 z-50 lg:hidden"
            >
              <OsSidebar
                mobile
                workspace={workspace}
                onWorkspaceClick={() => demoAction("Workspace switching")}
                onNavigate={() => setMobileOpen(false)}
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}