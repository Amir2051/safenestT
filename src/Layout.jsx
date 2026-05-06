import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Menu, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NotificationCenter from "./components/shared/NotificationCenter.jsx";
import ReferralCodeHandler from "./components/shared/ReferralCodeHandler.jsx";
import RealTimeReferralUpdates from "./components/shared/RealTimeReferralUpdates.jsx";
import FuturisticSidebar from "./components/navigation/FuturisticSidebar.jsx";
import MobileBottomNav from "./components/navigation/MobileBottomNav.jsx";
import ProfileCompletionPopup from "./components/popups/ProfileCompletionPopup.jsx";
import PaymentMethodPopup from "./components/popups/PaymentMethodPopup.jsx";
import MessageNotifications from "./components/communication/MessageNotifications.jsx";
import LegalFooter from "./components/shared/LegalFooter";
import PrivacyConsentBanner from "./components/shared/PrivacyConsentBanner";
import { isAnalyticsAllowed, isChatAllowed } from "./lib/PrivacyGuard";

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6 text-center">
          <div>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-sm mb-4">This section failed to load.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Header Skeleton ───────────────────────────────────────────────────────────
function HeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-lg border border-white/10 animate-pulse">
      <div className="w-8 h-8 bg-white/10 rounded" />
      <div>
        <div className="w-24 h-3 bg-white/10 rounded mb-1" />
        <div className="w-16 h-2 bg-white/10 rounded" />
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────
export default function Layout({ children, currentPageName }) {
  const location = useLocation();

  const [user, setUser]               = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMenuButton, setShowMenuButton]     = useState(false);

  const touchStart = useRef(null);
  const touchEnd   = useRef(null);
  const MIN_SWIPE  = 50;

  // ── Fetch user + maintenance config ────────────────────────────────────────
  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setUserLoading(false));

    base44.entities.SystemConfig.list()
      .then(configs => setMaintenanceMode(configs[0]?.under_construction || false))
      .catch(() => {});
  }, []);

  // ── Chat widget (IONOS) — consent-gated ───────────────────────────────────
  useEffect(() => {
    if (!isChatAllowed()) return; // blocked unless user opted in
    if (document.querySelector('script[name="web-chat"]')) return;

    const originalError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (message?.toString().includes('NEWO_CHAT')) return true;
      return originalError ? originalError(message, source, lineno, colno, error) : false;
    };

    const secret = import.meta.env.VITE_CHAT_SECRET;
    if (!secret) return;

    const script = document.createElement('script');
    script.src = 'https://ionos.ai-voice-receptionist.com/chat-scripts-MqGN74WP/web-chat.js';
    script.setAttribute('name', 'web-chat');
    script.setAttribute('data-client-secret', secret);
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => console.warn('Chat widget failed to load');
    document.head.appendChild(script);

    return () => {
      window.onerror = originalError;
      document.querySelector('script[name="web-chat"]')?.remove();
    };
  }, []);

  // ── Apollo tracker — consent-gated ────────────────────────────────────────
  useEffect(() => {
    if (!isAnalyticsAllowed()) return; // blocked unless user opted in
    if (window.apolloTrackerInitialized) return;
    window.apolloTrackerInitialized = true;

    const script = document.createElement('script');
    script.src = 'https://assets.apollo.io/micro/website-tracker/tracker.iife.js';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-apollo-tracker', 'true');
    script.onload = () => {
      window.trackingFunctions?.onLoad?.({ appId: '694c5977dbc21700115a85f0' });
    };
    script.onerror = () => { window.apolloTrackerInitialized = false; };
    document.head.appendChild(script);
  }, []);

  // Track SPA page views for Apollo — only if allowed
  useEffect(() => {
    if (isAnalyticsAllowed()) window.trackingFunctions?.trackPage?.();
  }, [location.pathname]);

  // ── Mobile menu button — show briefly on page load ─────────────────────────
  useEffect(() => {
    setShowMenuButton(true);
    const t = setTimeout(() => setShowMenuButton(false), 2000);
    return () => clearTimeout(t);
  }, [location.pathname]);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowMenuButton(false);
  }, [location.pathname]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogout     = () => base44.auth.logout();
  const handleMenuOpen   = () => { setIsMobileMenuOpen(true);  setShowMenuButton(false); };
  const handleMenuClose  = () => setIsMobileMenuOpen(false);
  const handleUserUpdate = () => base44.auth.me().then(setUser).catch(() => {});

  // ── Swipe gestures ──────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
    touchEnd.current   = null;
  };
  const onTouchMove  = (e) => { touchEnd.current = e.targetTouches[0].clientX; };
  const onTouchEnd   = () => {
    if (touchStart.current === null || touchEnd.current === null) return;
    const dist = touchStart.current - touchEnd.current;
    if (dist < -MIN_SWIPE && !isMobileMenuOpen) handleMenuOpen();
    if (dist >  MIN_SWIPE &&  isMobileMenuOpen) handleMenuClose();
    touchStart.current = null;
    touchEnd.current   = null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <ReferralCodeHandler />
      <RealTimeReferralUpdates user={user} />
      <MessageNotifications user={user} />
      {!userLoading && (
        <>
          <ProfileCompletionPopup user={user} onUpdate={handleUserUpdate} />
          <PaymentMethodPopup     user={user} onUpdate={handleUserUpdate} />
        </>
      )}

      <div
        className="min-h-screen flex bg-[#000000]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Desktop Sidebar */}
        <div className="hidden lg:block h-screen sticky top-0 overflow-hidden">
          <FuturisticSidebar user={user} onLogout={handleLogout} />
        </div>

        {/* Mobile: floating menu button (auto-hides after 2s) */}
        <AnimatePresence>
          {showMenuButton && !isMobileMenuOpen && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onClick={handleMenuOpen}
              aria-label="Open navigation menu"
              className="lg:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/50"
              style={{ animation: 'neon-pulse 2s ease-in-out infinite' }}
            >
              <Menu className="w-6 h-6 text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Mobile Slide-out Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                onClick={handleMenuClose}
                aria-hidden="true"
              />
              <motion.div
                initial={{ x: -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="lg:hidden fixed left-0 top-0 bottom-0 z-50 h-full overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
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

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] relative overflow-hidden min-h-screen">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
          </div>

          {/* Header */}
          <header
            className="relative z-10 bg-black/40 backdrop-blur-xl border-b border-cyan-500/20 px-6 py-4 flex items-center justify-between"
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))', userSelect: 'none' }}
          >
            <div className="flex items-center gap-3">
              {currentPageName !== 'Dashboard' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.history.back()}
                    aria-label="Go back"
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cyan-500/10 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-cyan-400" />
                  </button>
                  <button
                    onClick={handleMenuOpen}
                    aria-label="Open navigation menu"
                    className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cyan-500/10 transition-colors"
                  >
                    <Menu className="w-5 h-5 text-cyan-400" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowMenuButton(true)}
                  aria-label="Show navigation menu"
                  className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-cyan-500/10 transition-colors"
                >
                  <Menu className="w-5 h-5 text-cyan-400" />
                </button>
              )}

              {userLoading ? (
                <HeaderSkeleton />
              ) : (
                <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/30">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/690cdf897b59e44d278ad008/f1f9f692a_AQPdYUAcWfSxcbl5WH1P7SHWzE69TPlSNmOOjFqmImtFnSve6HFjkZH2apvzXZjK2y6qEy-eyKZh-UhbfbQkKebhM9nYOpiVBMjjOkG5bcl67Qn9pdXC5KgkKkF0yVNx.jpeg"
                    alt="SafeNestT logo"
                    className="w-8 h-8 rounded object-contain"
                  />
                  <div>
                    <h1 className="text-white font-bold text-sm tracking-wider">SafeNestT</h1>
                    <p className="text-cyan-400 text-[10px] font-mono">// SECURED //</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-500/50" aria-hidden="true" />
                <span className="text-xs font-bold text-green-400 tracking-wide">LIVE</span>
              </div>

              {!userLoading && user?.risk_score !== undefined && (
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
          <div
            className="relative z-10 flex-1 overflow-auto h-full flex flex-col pb-20 lg:pb-0"
            style={{ overscrollBehaviorY: 'none' }}
          >
            <div className="flex-1">
              {maintenanceMode && user?.role !== 'admin' && !user?.is_admin ? (
                <div className="flex items-center justify-center min-h-[80vh] p-6">
                  <div className="max-w-2xl w-full text-center space-y-6">
                    <div className="w-24 h-24 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-12 h-12 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-white">🚧 Under Construction</h1>
                    <p className="text-xl text-gray-300">SafeNestT is currently undergoing maintenance and improvements.</p>
                    <p className="text-gray-400">We're working hard to bring you an even better experience. All your data is safe and will be available when we're back online.</p>
                    <p className="text-sm text-gray-500 pt-6">Thank you for your patience. We'll be back soon!</p>
                  </div>
                </div>
              ) : (
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              )}
            </div>

            <LegalFooter />
          </div>
        </main>

        <MobileBottomNav />
      </div>

      <style>{`
        button, .sidebar {
          user-select: none;
          -webkit-user-select: none;
        }
        @keyframes neon-pulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(6,182,212,.5),
                        0 0 40px rgba(6,182,212,.3),
                        inset 0 0 10px rgba(6,182,212,.2);
          }
          50% {
            box-shadow: 0 0 30px rgba(6,182,212,.8),
                        0 0 60px rgba(6,182,212,.5),
                        inset 0 0 15px rgba(6,182,212,.4);
          }
        }
        [name="web-chat"], #web-chat-widget, .web-chat-container {
          z-index: 9999 !important;
        }
      `}</style>

      <div id="web-chat-widget-container" style={{ zIndex: 9999, position: 'relative' }} />
      <PrivacyConsentBanner />
    </>
  );
}