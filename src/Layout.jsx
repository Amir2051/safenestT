import React from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, Bell } from "lucide-react";
import NotificationCenter from "./components/shared/NotificationCenter.jsx";
import ReferralCodeHandler from "./components/shared/ReferralCodeHandler.jsx";
import InviteGate from "./components/shared/InviteGate.jsx";
import FuturisticSidebar from "./components/navigation/FuturisticSidebar.jsx";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <>
      <ReferralCodeHandler />
      <InviteGate>
        <div className="min-h-screen flex bg-[#000000]">
          {/* Futuristic Sidebar */}
          <FuturisticSidebar user={user} onLogout={handleLogout} />

          {/* Main Content Area */}
          <main className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* Header */}
            <header className="relative z-10 bg-black/40 backdrop-blur-xl border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/30">
                  <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <div>
                    <h1 className="text-white font-bold text-sm tracking-wider">SAFENEST</h1>
                    <p className="text-cyan-400 text-[10px] font-mono">// SECURED //</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Live Protection Indicator */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                  <span className="text-xs font-bold text-green-400 tracking-wide">LIVE</span>
                </div>

                {/* Score Display */}
                {user?.risk_score !== undefined && (
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-lg border border-gray-700/50">
                    <span className="text-xs text-gray-400">SCORE</span>
                    <span className={`text-sm font-bold ${
                      user.risk_score >= 80 ? 'text-green-400' : 
                      user.risk_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {user.risk_score}
                    </span>
                  </div>
                )}

                <NotificationCenter />
              </div>
            </header>

            {/* Page Content */}
            <div className="relative z-10 flex-1 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </InviteGate>
    </>
  );
}