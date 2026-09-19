import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { ShieldCheck, ArrowLeft, LogIn } from "lucide-react";
import LegalFooter from "./LegalFooter";

/**
 * Lightweight shell for public legal/policy pages (Terms, Privacy, AUP, Refund).
 * Lets unauthenticated visitors read the policies linked from the public landing
 * page and footer without needing to sign in. Mirrors the app's dark SOC aesthetic
 * but omits the authenticated sidebar/header.
 */
export default function PublicLegalLayout({ children }) {
  const { navigateToLogin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-slate-100">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-black/70 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="leading-none">
              <p className="text-white font-bold tracking-wider text-sm">SafeNestT</p>
              <p className="text-cyan-400 text-[10px] font-mono mt-0.5">// SECURED //</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-cyan-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <button
              onClick={() => navigateToLogin()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg hover:opacity-90 transition-opacity"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10">
          {children}
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}