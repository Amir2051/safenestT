import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, Bell, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationCenter from "./components/shared/NotificationCenter.jsx";
import ReferralCodeHandler from "./components/shared/ReferralCodeHandler.jsx";
import RealTimeReferralUpdates from "./components/shared/RealTimeReferralUpdates.jsx";
import FuturisticSidebar from "./components/navigation/FuturisticSidebar.jsx";
import ProfileCompletionPopup from "./components/popups/ProfileCompletionPopup.jsx";
import PaymentMethodPopup from "./components/popups/PaymentMethodPopup.jsx";


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMenuButton, setShowMenuButton] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  React.useEffect(() => {
    base44.auth.me()
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }



  // Mobile menu button auto-hide logic
  useEffect(() => {
    // Show button briefly on page load
    setShowMenuButton(true);
    const timer = setTimeout(() => {
      setShowMenuButton(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowMenuButton(false);
  }, [location.pathname]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleMenuOpen = () => {
    setIsMobileMenuOpen(true);
    setShowMenuButton(false);
  };

  const handleMenuClose = () => {
    setIsMobileMenuOpen(false);
  };

  const handleUserUpdate = () => {
    base44.auth.me().then(setUser).catch(() => {});
  };

  // Swipe gesture handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe && !isMobileMenuOpen) {
      setIsMobileMenuOpen(true);
      setShowMenuButton(false);
    }
    if (isLeftSwipe && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <ReferralCodeHandler />
      <RealTimeReferralUpdates user={user} />
      <ProfileCompletionPopup user={user} onUpdate={handleUserUpdate} />
      <PaymentMethodPopup user={user} onUpdate={handleUserUpdate} />
      <div 
        className="min-h-screen flex bg-[#000000]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Desktop Sidebar - Always visible on lg+ */}
        <div className="hidden lg:block h-screen sticky top-0 overflow-hidden">
          <FuturisticSidebar user={user} onLogout={handleLogout} />
        </div>

        {/* Mobile Menu Button */}
        <AnimatePresence>
          {showMenuButton && !isMobileMenuOpen && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onClick={handleMenuOpen}
              className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/50"
              style={{
                animation: 'neon-pulse 2s ease-in-out infinite'
              }}
            >
              <Menu className="w-6 h-6 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Mobile Slide-out Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                onClick={handleMenuClose}
              />

              {/* Slide-out Menu */}
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30
                }}
                className="lg:hidden fixed left-0 top-0 bottom-0 z-50 h-full overflow-hidden"
              >
                <div className="h-full overflow-y-auto">
                  <FuturisticSidebar 
                    user={user} 
                    onLogout={handleLogout}
                    onNavigate={handleMenuClose}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] relative overflow-hidden min-h-screen">
          {/* Ambient Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
          </div>

          {/* Header */}
          <header className="relative z-10 bg-black/40 backdrop-blur-xl border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile: Show menu trigger area */}
              <button
                onClick={() => setShowMenuButton(true)}
                className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cyan-500/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-cyan-400" />
              </button>

              <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/30">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690cdf897b59e44d278ad008/f1f9f692a_AQPdYUAcWfSxcbl5WH1P7SHWzE69TPlSNmOOjFqmImtFnSve6HFjkZH2apvzXZjK2y6qEy-eyKZh-UhbfbQkKebhM9nYOpiVBMjjOkG5bcl67Qn9pdXC5KgkKkF0yVNx.jpeg" 
                      alt="SafeNestT" 
                      className="w-8 h-8 rounded object-contain"
                    />
                    <div>
                      <h1 className="text-white font-bold text-sm tracking-wider">SafeNestT</h1>
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
          <div className="relative z-10 flex-1 overflow-auto h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes neon-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.5),
                        0 0 40px rgba(6, 182, 212, 0.3),
                        inset 0 0 10px rgba(6, 182, 212, 0.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.8),
                        0 0 60px rgba(6, 182, 212, 0.5),
                        inset 0 0 15px rgba(6, 182, 212, 0.4);
          }
        }
      `}</style>
    </>
  );
}