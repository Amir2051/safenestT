import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, Database, Users, FileText } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
        </div>
        <p className="text-gray-400">SafeNestT Inc.</p>
        <p className="text-gray-500 text-sm mt-2">Last Updated: January 12, 2026</p>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-8 space-y-8 text-gray-300">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-400" />
              Introduction
            </h2>
            <p className="leading-relaxed mb-4">
              SafeNestT Inc. ("SafeNestT," "we," "us," or "our") operates a case preparation, reporting assistance, 
              and cybersecurity support platform accessible at SafeNestT.com (the "Platform"). This Privacy Policy 
              describes how we collect, use, store, and protect information you provide when using our Platform.
            </p>
            <p className="leading-relaxed">
              By using SafeNestT, you agree to the collection and use of information in accordance with this policy. 
              If you do not agree with any part of this Privacy Policy, you should not use our Platform.
            </p>
          </section>

          {/* What We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Database className="w-6 h-6 text-cyan-400" />
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">1. User-Provided Information</h3>
                <p className="leading-relaxed mb-2">When you use SafeNestT, you may voluntarily provide:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Personal identification information (name, email address, phone number)</li>
                  <li>Incident details (dates, descriptions, financial losses)</li>
                  <li>Contact information for alleged perpetrators (emails, phone numbers, wallet addresses)</li>
                  <li>Supporting documentation (screenshots, transaction records, communications)</li>
                  <li>Payment information (processed securely through third-party payment processors)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2. Automatically Collected Information</h3>
                <p className="leading-relaxed mb-2">We automatically collect certain information when you use our Platform:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage data (pages visited, time spent, features accessed)</li>
                  <li>Cookies and similar tracking technologies (for authentication and preferences)</li>
                  <li>Log data (access times, error logs, system diagnostics)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-cyan-400" />
              How We Use Your Information
            </h2>
            <p className="leading-relaxed mb-3">We use collected information for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Case Documentation:</strong> To organize, format, and prepare incident reports you create</li>
              <li><strong className="text-white">Platform Services:</strong> To provide cybersecurity support tools, wallet tracking, and educational resources</li>
              <li><strong className="text-white">User Support:</strong> To respond to inquiries, provide technical assistance, and resolve issues</li>
              <li><strong className="text-white">Platform Improvement:</strong> To analyze usage patterns and improve our services</li>
              <li><strong className="text-white">Security:</strong> To detect fraud, prevent abuse, and protect user accounts</li>
              <li><strong className="text-white">Legal Compliance:</strong> To comply with applicable laws and legal processes when required</li>
              <li><strong className="text-white">Communications:</strong> To send service updates, security alerts, and important notifications</li>
            </ul>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mt-4">
              <p className="text-orange-400 font-semibold mb-2">Important Clarification:</p>
              <p className="text-gray-300">
                SafeNestT is NOT a law enforcement agency. We do not submit reports to the FBI, IC3, or any 
                government agency on your behalf. Users are responsible for filing their own official complaints 
                with appropriate authorities. SafeNestT provides tools to help you prepare and organize information 
                for such filings.
              </p>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              Information Sharing and Disclosure
            </h2>
            <p className="leading-relaxed mb-3">We do not sell your personal information. We may share your information in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-3 ml-4">
              <li>
                <strong className="text-white">With Your Consent:</strong> When you explicitly authorize us to share information 
                with law enforcement or other third parties
              </li>
              <li>
                <strong className="text-white">Service Providers:</strong> With trusted third-party vendors who assist in platform 
                operations (hosting, analytics, payment processing) under strict confidentiality agreements
              </li>
              <li>
                <strong className="text-white">Legal Requirements:</strong> When required by law, subpoena, court order, or 
                government investigation
              </li>
              <li>
                <strong className="text-white">Business Transfers:</strong> In connection with a merger, acquisition, or sale of 
                assets, subject to continued privacy protections
              </li>
              <li>
                <strong className="text-white">Safety and Security:</strong> To protect the rights, property, or safety of 
                SafeNestT, our users, or the public
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-cyan-400" />
              Data Security
            </h2>
            <p className="leading-relaxed mb-3">
              We implement industry-standard security measures to protect your information:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>End-to-end encryption for sensitive data in transit and at rest</li>
              <li>Secure servers with regular security audits and updates</li>
              <li>Access controls limiting employee access to personal information</li>
              <li>Regular backup and disaster recovery procedures</li>
              <li>Multi-factor authentication options for user accounts</li>
            </ul>
            <p className="leading-relaxed mt-4 text-gray-400 italic">
              However, no method of transmission over the internet or electronic storage is 100% secure. While we 
              strive to protect your information, we cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Data Retention</h2>
            <p className="leading-relaxed mb-3">
              We retain your information for as long as necessary to provide our services and comply with legal obligations:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Active Accounts:</strong> Data is retained while your account is active</li>
              <li><strong className="text-white">Inactive Accounts:</strong> Data may be retained for up to 7 years for legal and audit purposes</li>
              <li><strong className="text-white">Case Records:</strong> Incident reports may be retained longer if connected to ongoing investigations</li>
              <li><strong className="text-white">Deletion Requests:</strong> You may request account deletion at any time (see Your Rights section)</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Your Privacy Rights</h2>
            <p className="leading-relaxed mb-3">You have the following rights regarding your personal information:</p>
            <div className="space-y-3">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Access and Portability</h4>
                <p>Request a copy of your personal data in a portable format</p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Correction</h4>
                <p>Update or correct inaccurate information through your account settings</p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Deletion</h4>
                <p>Request deletion of your account and associated data (subject to legal retention requirements)</p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Opt-Out</h4>
                <p>Unsubscribe from marketing communications (service-related communications may still be sent)</p>
              </div>
            </div>
            <p className="leading-relaxed mt-4">
              To exercise these rights, contact us at <span className="text-cyan-400 font-mono">privacy@safenestt.com</span>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Cookies and Tracking</h2>
            <p className="leading-relaxed mb-3">
              We use cookies and similar technologies to enhance your experience:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-white">Essential Cookies:</strong> Required for authentication and platform functionality</li>
              <li><strong className="text-white">Analytics Cookies:</strong> Help us understand how users interact with the Platform</li>
              <li><strong className="text-white">Preference Cookies:</strong> Remember your settings and preferences</li>
            </ul>
            <p className="leading-relaxed mt-3">
              You can manage cookie preferences through your browser settings. Disabling certain cookies may limit platform functionality.
            </p>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Third-Party Links</h2>
            <p className="leading-relaxed">
              Our Platform may contain links to external websites (such as FBI IC3, cryptocurrency exchanges, or security resources). 
              SafeNestT is not responsible for the privacy practices or content of these third-party sites. We encourage you to 
              review their privacy policies before providing any personal information.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Children's Privacy</h2>
            <p className="leading-relaxed">
              SafeNestT is not intended for use by individuals under 18 years of age. We do not knowingly collect personal 
              information from children. If we become aware that we have collected data from a child without parental consent, 
              we will take steps to delete that information promptly.
            </p>
          </section>

          {/* International Users */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">International Users</h2>
            <p className="leading-relaxed">
              SafeNestT operates from the United States. If you are accessing our Platform from outside the U.S., your information 
              may be transferred to, stored, and processed in the United States. By using SafeNestT, you consent to this transfer 
              and processing. We comply with applicable data protection regulations, including GDPR where applicable.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Changes to This Privacy Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
              We will notify users of material changes via email or a prominent notice on our Platform. Your continued use of 
              SafeNestT after such changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Us</h2>
            <p className="leading-relaxed mb-4">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
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