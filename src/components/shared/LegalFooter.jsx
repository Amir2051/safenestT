import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, FileText, Scale } from "lucide-react";

export default function LegalFooter() {
  return (
    <footer className="mt-auto border-t border-cyan-500/20 bg-black/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h3 className="text-white font-bold text-lg">SafeNestT Inc.</h3>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              Case preparation, reporting assistance, and cybersecurity support platform.
            </p>
            <p className="text-gray-500 text-xs italic">
              Not affiliated with law enforcement. Users file official reports independently.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <div className="space-y-2">
              <Link
                to={createPageUrl('PrivacyPolicy')}
                className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Privacy Policy
              </Link>
              <Link
                to={createPageUrl('TermsAndConditions')}
                className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                <Scale className="w-4 h-4" />
                Terms & Conditions
              </Link>
              <Link
                to={createPageUrl('AcceptableUsePolicy')}
                className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                <Shield className="w-4 h-4" />
                Acceptable Use Policy
              </Link>
              <Link
                to={createPageUrl('RefundPolicy')}
                className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                Refund Policy
              </Link>
            </div>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <div className="space-y-2">
              <Link
                to={createPageUrl('HelpCenter')}
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Help Center
              </Link>
              <a
                href="https://www.ic3.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                FBI IC3 Reporting
              </a>
              <a
                href="mailto:support@safenestt.com"
                className="block text-gray-400 hover:text-cyan-400 transition-colors text-sm"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2026 SafeNestT Inc. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            New York, United States
          </p>
        </div>
      </div>
    </footer>
  );
}