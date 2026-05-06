import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, ChevronDown, ChevronUp, Lock, Eye, BarChart2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getConsent, saveConsent, hasConsented } from "@/lib/PrivacyGuard";

export default function PrivacyConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ analytics: false, chat: false });

  useEffect(() => {
    // Show banner if user hasn't consented yet
    if (!hasConsented()) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    saveConsent({ analytics: true, chat: true });
    setVisible(false);
  };

  const handleRejectAll = () => {
    saveConsent({ analytics: false, chat: false });
    setVisible(false);
  };

  const handleSavePrefs = () => {
    saveConsent(prefs);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-3xl mx-auto bg-[#0f1419] border border-cyan-500/30 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Privacy & Data Protection</h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  SafeNestT blocks all third-party tracking by default.
                </p>
              </div>
            </div>
            <button
              onClick={handleRejectAll}
              className="text-gray-500 hover:text-white transition-colors p-1"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 pb-3">
            <p className="text-gray-400 text-xs leading-relaxed">
              We use strictly necessary cookies to keep you logged in and secure your session.
              All third-party trackers, analytics scripts, and fingerprinting are <strong className="text-cyan-400">blocked by default</strong>.
              You may optionally enable anonymous analytics or our support chat below.
            </p>
          </div>

          {/* Expandable preferences */}
          <div className="px-5 pb-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Manage preferences
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3 pb-1">
                    {/* Always on */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-white">Essential (Always Active)</p>
                          <p className="text-[11px] text-gray-500">Login sessions, security tokens, app functionality</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-green-400 font-mono bg-green-500/10 px-2 py-0.5 rounded">Required</span>
                    </div>

                    {/* Analytics toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/50">
                      <div className="flex items-center gap-2.5">
                        <BarChart2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-white">Anonymous Analytics</p>
                          <p className="text-[11px] text-gray-500">Page visit counts only — no personal data, no cross-site tracking</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPrefs(p => ({ ...p, analytics: !p.analytics }))}
                        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${prefs.analytics ? "bg-blue-500" : "bg-gray-700"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.analytics ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    {/* Chat toggle */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/40 border border-gray-700/50">
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-white">Support Chat Widget</p>
                          <p className="text-[11px] text-gray-500">IONOS AI chat assistant — loads a third-party script</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setPrefs(p => ({ ...p, chat: !p.chat }))}
                        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${prefs.chat ? "bg-purple-500" : "bg-gray-700"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${prefs.chat ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </div>
                  </div>

                  <Button
                    onClick={handleSavePrefs}
                    size="sm"
                    className="mt-3 w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                  >
                    Save My Preferences
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 p-5 pt-2">
            <Button
              onClick={handleRejectAll}
              variant="outline"
              size="sm"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800 text-xs"
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Block All (Recommended)
            </Button>
            <Button
              onClick={handleAcceptAll}
              size="sm"
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs"
            >
              Accept All
            </Button>
          </div>

          {/* Footer note */}
          <div className="px-5 pb-4 flex items-center gap-1.5">
            <Eye className="w-3 h-3 text-gray-600 flex-shrink-0" />
            <p className="text-[10px] text-gray-600">
              Read our <a href="/PrivacyPolicy" className="text-cyan-600 hover:underline">Privacy Policy</a> · SafeNestT never sells your data.
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}