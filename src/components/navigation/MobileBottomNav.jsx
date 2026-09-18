import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

/**
 * Investigation-focused mobile bottom nav — four primary destinations.
 */
export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/OperationsDashboard" },
    { name: "Cases", icon: Briefcase, path: "/CasesManagement" },
    { name: "AI", icon: Sparkles, path: "/InvestigationWorkspace" },
    { name: "Security", icon: ShieldCheck, path: "/SecurityDashboard" },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-cyan-500/20 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", userSelect: "none" }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.name} to={item.path} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center gap-1 py-1.5 px-2 rounded-lg transition-colors ${
                  isActive ? "text-cyan-300" : "text-gray-400 active:text-cyan-300"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-cyan-400" : ""}`} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}