import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye, FileEdit, Download, Trash2, BellOff, UserX, Link2, ArrowRight,
} from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Data Rights & Deletion page.
 *
 * Explains the data rights users can exercise and links to the REAL places in
 * the app where those rights are actioned:
 *  - Settings > Profile   : correction of personal data
 *  - Settings > Danger Zone: account deletion (type DELETE to confirm)
 *  - RightsCenter          : submit CCPA/GDPR requests to third-party companies
 *  - PrivacyConsentBanner  : opt-out of optional analytics / chat tracking
 * No rights are listed that the app does not actually support.
 */
export default function DataRightsDeletion() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <UserX className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-bold text-white">Data Rights &amp; Deletion</h1>
        </div>
        <p className="text-gray-400">SafeNestT Inc.</p>
        <p className="text-gray-500 text-sm mt-2">Last Updated: January 12, 2026</p>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-8 space-y-8 text-gray-300">

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your Rights Over Your Data</h2>
            <p className="leading-relaxed mb-4">
              You own your data. SafeNestT gives you direct control over the personal information you provide — including
              the ability to access, correct, export, and delete it. This page explains each right and exactly where to
              exercise it within the app.
            </p>
            <p className="leading-relaxed">
              These rights reflect applicable U.S. privacy laws (such as CCPA/CPRA) and international frameworks (such as
              GDPR) where they apply to you.
            </p>
          </section>

          {/* Rights grid */}
          <section className="space-y-4">
            {/* Access */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">1. Right to Access</h3>
              </div>
              <p className="leading-relaxed mb-3">
                You can request a copy of the personal data SafeNestT holds about you, including profile information, case
                records you created, and audit history associated with your account.
              </p>
              <p className="leading-relaxed">
                To request a data export, email{" "}
                <a href="mailto:privacy@safenestt.com" className="text-cyan-400 font-mono hover:underline">privacy@safenestt.com</a>{" "}
                from the address registered on your account.
              </p>
            </div>

            {/* Correction */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileEdit className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">2. Right to Correction</h3>
              </div>
              <p className="leading-relaxed mb-3">
                You can update your name, username, phone number, country, wallet address, and monitored emails at any
                time — no need to contact us.
              </p>
              <Link
                to="/Settings"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Go to Settings <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-gray-500 mt-2">Email address cannot be changed once registered.</p>
            </div>

            {/* Portability */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">3. Right to Data Portability</h3>
              </div>
              <p className="leading-relaxed mb-3">
                You can request your personal data in a structured, machine-readable format (such as JSON or CSV) so you
                can move it to another service.
              </p>
              <p className="leading-relaxed">
                Email{" "}
                <a href="mailto:privacy@safenestt.com" className="text-cyan-400 font-mono hover:underline">privacy@safenestt.com</a>{" "}
                to request a portable export of your data.
              </p>
            </div>

            {/* Opt-out */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <BellOff className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-semibold text-white">4. Right to Opt-Out</h3>
              </div>
              <p className="leading-relaxed mb-3">
                You can opt out of optional analytics and the third-party support chat at any time. SafeNestT blocks all
                third-party trackers by default, so opting out simply keeps that protection in place.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 mb-3">
                <li>Use the <strong className="text-white">Privacy &amp; Data Protection</strong> banner and choose "Block All (Recommended)".</li>
                <li>Unsubscribe from any marketing emails using the link in the email itself.</li>
                <li>Service-related and security alerts may still be sent where necessary to operate your account.</li>
              </ul>
              <Link
                to="/CookiePolicy"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                See Cookie Policy <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Deletion */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h3 className="text-xl font-semibold text-white">5. Right to Deletion — Account &amp; Data</h3>
              </div>
              <p className="leading-relaxed mb-3">
                You can permanently delete your account and the personal data associated with it directly from the app.
                This action is irreversible.
              </p>
              <div className="bg-[#0f1419] border border-red-500/20 rounded-lg p-4 mb-3">
                <p className="text-sm text-gray-300 mb-2"><strong className="text-white">How to delete your account:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-2 text-sm text-gray-300">
                  <li>Open <Link to="/Settings" className="text-cyan-400 hover:underline">Settings</Link>.</li>
                  <li>Go to the <strong className="text-white">Alert Settings</strong> tab.</li>
                  <li>Scroll to the <strong className="text-white">Danger Zone</strong> card.</li>
                  <li>Click <strong className="text-white">Delete Account</strong> and type <code className="text-cyan-300 text-sm">DELETE</code> to confirm.</li>
                </ol>
              </div>
              <p className="leading-relaxed text-sm">
                Some records may be retained where required by law (for example, records connected to active
                investigations or legal obligations), as described in our Privacy Policy's Data Retention section.
              </p>
            </div>
          </section>

          {/* Third-party rights */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Submitting Requests to Other Companies</h2>
            <p className="leading-relaxed mb-4">
              SafeNestT's <strong className="text-white">Rights Request Center</strong> helps you prepare and track
              CCPA/GDPR data rights requests (access, deletion, portability, correction, opt-out of sale) to
              <em> other</em> companies that hold your data — such as Google, Meta, and data brokers.
            </p>
            <Link
              to="/RightsCenter"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
            >
              Open Rights Request Center <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Timeline */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Response Times</h2>
            <p className="leading-relaxed mb-3">
              We acknowledge data rights requests within <strong className="text-white">7 business days</strong> and aim
              to fulfill verified requests within <strong className="text-white">30 days</strong> (this may extend by up
              to 60 days for complex requests, with notice).
            </p>
            <p className="leading-relaxed">
              Account deletion via the in-app Settings flow is immediate for the data under your direct control; any
              retained records are handled per our legal retention obligations.
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
              <Link to="/RefundPolicy" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Refund Policy</Link>
              <Link to="/CookiePolicy" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Cookie Policy</Link>
              <Link to="/RightsCenter" className="text-cyan-400 hover:text-cyan-300 transition-colors">→ Rights Request Center</Link>
            </div>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="leading-relaxed mb-4">To exercise any of these rights, or with questions about your data:</p>
            <div className="space-y-2 text-gray-300">
              <p><strong className="text-white">SafeNestT Inc.</strong></p>
              <p>Privacy: <span className="text-cyan-400 font-mono">privacy@safenestt.com</span></p>
              <p>Support: <span className="text-cyan-400 font-mono">support@safenestt.com</span></p>
              <p>Address: New York, United States</p>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}