import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie, Lock, BarChart2, MessageSquare, Shield, Sliders, Ban, Link2 } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Cookie Policy & Settings page.
 *
 * Reflects the ACTUAL consent and tracking behavior implemented in the app:
 *  - PrivacyConsentBanner stores preferences in localStorage
 *    (key: safenest_privacy_consent) with `analytics` and `chat` toggles.
 *  - PrivacyGuard blocks third-party cookies, fingerprinting, and known
 *    tracker requests/domains by default.
 *  - The IONOS support chat widget and Apollo analytics tracker are only
 *    injected when the corresponding consent flag is true.
 * No claims are made about cookies or trackers that are not actually present.
 */
export default function CookiePolicy() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Cookie className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-bold text-white">Cookie Policy & Settings</h1>
        </div>
        <p className="text-gray-400">SafeNestT Inc.</p>
        <p className="text-gray-500 text-sm mt-2">Last Updated: January 12, 2026</p>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-8 space-y-8 text-gray-300">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Cookie className="w-6 h-6 text-cyan-400" />
              Our Approach to Cookies & Tracking
            </h2>
            <p className="leading-relaxed mb-4">
              SafeNestT is built with privacy-by-default. Unlike most websites, we
              <strong className="text-white"> block all third-party tracking cookies and trackers by default</strong>.
              You will never be silently tracked across the web while using SafeNestT.
            </p>
            <p className="leading-relaxed">
              We use a small number of strictly necessary cookies and local storage items to keep you logged in and
              remember your preferences. Optional analytics and a support chat widget are available, but only if you
              explicitly enable them through the consent banner or your settings.
            </p>
          </section>

          {/* Categories */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Cookie Categories We Use</h2>
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-green-400" />
                  <h3 className="text-xl font-semibold text-white">1. Essential (Always Active)</h3>
                </div>
                <p className="leading-relaxed mb-2">
                  These are required for the Platform to function and cannot be disabled. They are stored on your device
                  (browser cookies and <code className="text-cyan-300 text-sm">localStorage</code>) and include:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong className="text-white">Authentication & session tokens</strong> — keep you logged in securely</li>
                  <li><strong className="text-white">Security tokens</strong> — protect your account against CSRF and session hijacking</li>
                  <li><strong className="text-white">Core app functionality</strong> — navigation state and form inputs</li>
                </ul>
                <p className="text-sm text-gray-400 mt-3 italic">
                  These are set the moment you sign in and are removed when you log out.
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="w-5 h-5 text-blue-400" />
                  <h3 className="text-xl font-semibold text-white">2. Anonymous Analytics (Optional)</h3>
                </div>
                <p className="leading-relaxed mb-2">
                  If you enable "Anonymous Analytics," we record <strong className="text-white">page visit counts only</strong>
                  — no personal data, no cross-site tracking, and no behavioral profiles. This helps us understand which
                  features are used so we can improve them.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Stored consent flag: <code className="text-cyan-300 text-sm">analytics</code> in local privacy preferences</li>
                  <li>Only active when you explicitly toggle it on in the consent banner</li>
                  <li>Disabled by default for every new visitor</li>
                </ul>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-5 h-5 text-purple-400" />
                  <h3 className="text-xl font-semibold text-white">3. Support Chat Widget (Optional)</h3>
                </div>
                <p className="leading-relaxed mb-2">
                  Our optional support chat is powered by a third-party (IONOS AI voice receptionist). Because it loads an
                  external script, it is <strong className="text-white">blocked by default</strong> and only loads if you opt in.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Stored consent flag: <code className="text-cyan-300 text-sm">chat</code> in local privacy preferences</li>
                  <li>The third-party script is never injected unless you enable it</li>
                  <li>You can withdraw consent at any time and the script will no longer load</li>
                </ul>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-xl font-semibold text-white">4. Preference Cookies</h3>
                </div>
                <p className="leading-relaxed">
                  These remember your choices — such as your theme (dark/light), sidebar collapsed/expanded state, and
                  your privacy consent decisions — so they persist between visits. They do not track you and contain no
                  personal data beyond your own settings.
                </p>
              </div>
            </div>
          </section>

          {/* What we block */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Ban className="w-6 h-6 text-red-400" />
              What SafeNestT Blocks By Default
            </h2>
            <p className="leading-relaxed mb-4">
              Our built-in <strong className="text-white">PrivacyGuard</strong> protection runs on every page and actively
              blocks the following, regardless of your consent choices:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Third-party cookies</p>
                  <p className="text-sm text-gray-400">Cookies with <code className="text-cyan-300 text-sm">SameSite=None</code> (used for cross-site tracking) are stripped before they are set.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Browser fingerprinting</p>
                  <p className="text-sm text-gray-400">Canvas and WebGL fingerprinting APIs are neutralized so your device cannot be uniquely identified.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Known tracker requests</p>
                  <p className="text-sm text-gray-400">Network requests to known analytics, advertising, and session-replay domains (Google Analytics, DoubleClick, Meta Pixel, Hotjar, Mixpanel, FullStory, and many more) are intercepted and dropped.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                <Ban className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Tracker globals &amp; leftover storage</p>
                  <p className="text-sm text-gray-400">Common tracker globals (e.g. <code className="text-cyan-300 text-sm">ga</code>, <code className="text-cyan-300 text-sm">gtag</code>, <code className="text-cyan-300 text-sm">fbq</code>) are neutralized and known tracker storage keys are cleared.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Managing preferences */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-400" />
              Managing Your Cookie Preferences
            </h2>
            <p className="leading-relaxed mb-3">You can change your cookie and tracking preferences at any time:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the <strong className="text-white">Privacy &amp; Data Protection</strong> consent banner (shown on first visit) to enable or disable analytics and the support chat.</li>
              <li>Clear your browser's cookies and site data for SafeNestT to reset all preferences and consent flags.</li>
              <li>Most browsers also let you block all cookies in their privacy settings — note this may affect login sessions.</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Because consent is stored locally on your device, clearing your browser data will reset your choices and
              re-show the consent banner.
            </p>
          </section>

          {/* Related documents */}
          <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-cyan-400" />
              Related Legal &amp; Privacy Documents
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <Link to="/PrivacyPolicy" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Privacy Policy</Link>
              <Link to="/TermsAndConditions" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Terms &amp; Conditions</Link>
              <Link to="/AcceptableUsePolicy" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Acceptable Use Policy</Link>
              <Link to="/DataRightsDeletion" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Data Rights &amp; Deletion</Link>
              <Link to="/RightsCenter" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Rights Request Center</Link>
              <Link to="/CookieIntel" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Cookie Intel Tools</Link>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="leading-relaxed mb-4">Questions about cookies or tracking on SafeNestT? Contact us:</p>
            <div className="space-y-2 text-gray-300">
              <p><strong className="text-white">SafeNestT Inc.</strong></p>
              <p>Email: <span className="text-cyan-400 font-mono">privacy@safenestt.com</span></p>
              <p>Support: <span className="text-cyan-400 font-mono">support@safenestt.com</span></p>
              <p>Address: New York, United States</p>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}