import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Sparkles, ShieldCheck, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Mobile command console bottom navigation — large touch targets.
 */
export default function MobileCommandNav({ user }) {
  const location = useLocation();
  const isStaff = user?.role === "admin" || user?.is_admin || ["owner", "admin", "investigator"].includes(user?.tenant_role);

  const navItems = isStaff
    ? [
        { name: "COMMAND", icon: LayoutDashboard, path: "/OperationsDashboard" },
        { name: "CASES", icon: Briefcase, path: "/CasesManagement" },
        { name: "AI", icon: Sparkles, path: "/InvestigationWorkspace" },
        { name: "THREAT", icon: ShieldCheck, path: "/SecurityDashboard" },
      ]
    : [
        { name: "HOME", icon: LayoutDashboard, path: "/" },
        { name: "CASES", icon: Briefcase, path: "/MyCases" },
        { name: "REPORT", icon: ShieldAlert, path: "/ReportScam" },
        { name: "AI", icon: Sparkles, path: "/MiaAssistant" },
      ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#06090d]/95 backdrop-blur-md border-t border-slate-700/60 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", userSelect: "none" }}
    >
      <div className="flex items-stretch justify-around px-1 py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.name} to={item.path} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.92 }}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-colors ${
                  isActive ? "text-cyan-300 bg-cyan-500/5" : "text-slate-500 active:text-cyan-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-cyan-400" : ""}`} />
                <span className="text-[9px] font-mono tracking-wider">{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}