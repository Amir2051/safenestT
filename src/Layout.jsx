import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import NotificationCenter from "./components/shared/NotificationCenter.jsx";
import ReferralCodeHandler from "./components/shared/ReferralCodeHandler.jsx";
import InviteGate from "./components/shared/InviteGate.jsx";
import FuturisticSidebar from "./components/navigation/FuturisticSidebar.jsx";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMenuButton, setShowMenuButton] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show menu button briefly on load (mobile only)
  useEffect(() => {
    if (isMobile) {
      setShowMenuButton(true);
      const timer = setTimeout(() => {
        setShowMenuButton(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  // Close menu on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
      setShowMenuButton(false);
    }
  }, [location.pathname, isMobile]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobileMenuOpen && !e.target.closest('.mobile-sidebar') && !e.target.closest('.menu-button')) {
        setIsMobileMenuOpen(false);
        setShowMenuButton(false);
      }
    };

    if (isMobile && isMobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isMobileMenuOpen, isMobile]);

  // Swipe gestures for mobile
  useEffect(() => {
    if (!isMobile) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeDistance = touchEndX - touchStartX;
      
      // Swipe right to open (from left edge)
      if (swipeDistance > 100 && touchStartX < 50 && !isMobileMenuOpen) {
        setIsMobileMenuOpen(true);
        setShowMenuButton(false);
      }
      
      // Swipe left to close
      if (swipeDistance < -100 && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        setShowMenuButton(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isMobileMenuOpen]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const toggleMobileMenu = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
      setShowMenuButton(false);
    }
  };

  return (
    <>
      <ReferralCodeHandler />
      <InviteGate>
        <div className="min-h-screen flex bg-[#000000]">
          {/* Desktop Sidebar - Always Visible */}
          {!isMobile && (
            <FuturisticSidebar user={user} onLogout={handleLogout} onNavigate={() => {}} />
          )}

          {/* Mobile Menu Button */}
          <AnimatePresence>
            {isMobile && showMenuButton && !isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="fixed top-4 left-4 z-50 menu-button"
              >
                <Button
                  onClick={toggleMobileMenu}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all p-0"
                >
                  <Menu className="w-6 h-6 text-white" />
                  <div className="absolute inset-0 rounded-full bg-cyan-400/30 animate-ping" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isMobile && isMobileMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowMenuButton(false);
                  }}
                />

                {/* Sidebar */}
                <motion.div
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="fixed left-0 top-0 bottom-0 z-50 mobile-sidebar"
                >
                  <FuturisticSidebar 
                    user={user} 
                    onLogout={handleLogout}
                    onNavigate={() => {
                      setIsMobileMenuOpen(false);
                      setShowMenuButton(false);
                    }}
                  />
                  
                  {/* Close Button */}
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowMenuButton(false);
                    }}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center hover:bg-red-500/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>

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
                {/* Mobile Menu Trigger - Tap Area */}
                {isMobile && !isMobileMenuOpen && (
                  <button
                    onClick={() => setShowMenuButton(true)}
                    className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg border border-cyan-500/20 bg-gray-900/30 hover:bg-gray-800/50 transition-colors"
                  >
                    <Menu className="w-5 h-5 text-cyan-400" />
                  </button>
                )}

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