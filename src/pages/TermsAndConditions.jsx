import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Shield, AlertTriangle, Scale, CheckCircle } from "lucide-react";

export default function TermsAndConditions() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <FileText className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-bold text-white">Terms and Conditions</h1>
        </div>
        <p className="text-gray-400">SafeNestT Inc.</p>
        <p className="text-gray-500 text-sm mt-2">Last Updated: January 12, 2026</p>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-8 space-y-8 text-gray-300">
          
          {/* Agreement to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-cyan-400" />
              Agreement to Terms
            </h2>
            <p className="leading-relaxed mb-4">
              These Terms and Conditions ("Terms") govern your access to and use of the SafeNestT platform ("Platform"), 
              operated by SafeNestT Inc. ("SafeNestT," "we," "us," or "our"). By accessing or using the Platform, you 
              agree to be bound by these Terms.
            </p>
            <p className="leading-relaxed">
              If you do not agree to these Terms, you must not use the Platform. We reserve the right to modify these 
              Terms at any time, and your continued use after changes constitutes acceptance.
            </p>
          </section>

          {/* Platform Description */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-400" />
              Platform Description
            </h2>
            <p className="leading-relaxed mb-4">
              SafeNestT is a <strong className="text-white">case preparation, reporting assistance, and cybersecurity support platform</strong>. 
              We provide tools to help users:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Document and organize information related to cyber fraud incidents</li>
              <li>Prepare structured reports for submission to appropriate authorities</li>
              <li>Access cybersecurity resources and educational materials</li>
              <li>Track cryptocurrency transactions and wallet activity</li>
              <li>Generate case summaries and documentation</li>
            </ul>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 mt-6">
              <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Critical Disclaimer
              </h3>
              <div className="space-y-3 text-gray-300">
                <p>
                  <strong className="text-white">SafeNestT IS NOT a law enforcement agency.</strong> We do not:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Submit reports to the FBI, IC3, or any government agency on your behalf</li>
                  <li>Conduct criminal investigations or have law enforcement authority</li>
                  <li>Guarantee fund recovery or prosecution of alleged perpetrators</li>
                  <li>Provide legal advice or act as legal counsel</li>
                </ul>
                <p className="font-semibold text-red-400 mt-4">
                  YOU are responsible for filing official complaints directly with appropriate authorities such as 
                  FBI IC3 (ic3.gov), local law enforcement, or other relevant agencies.
                </p>
              </div>
            </div>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Eligibility</h2>
            <p className="leading-relaxed mb-3">To use SafeNestT, you must:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Be at least 18 years of age</li>
              <li>Have the legal capacity to enter into binding contracts</li>
              <li>Provide accurate and complete registration information</li>
              <li>Not be prohibited from using the Platform under applicable laws</li>
              <li>Not have been previously banned or suspended from SafeNestT</li>
            </ul>
            <p className="leading-relaxed mt-4">
              By using the Platform, you represent and warrant that you meet these eligibility requirements.
            </p>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">User Accounts</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Account Creation</h3>
                <p className="leading-relaxed">
                  You must create an account to access certain Platform features. You agree to provide accurate, current, 
                  and complete information during registration and to update it as necessary.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Account Security</h3>
                <p className="leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                  under your account. Notify us immediately of any unauthorized access or security breach.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Account Termination</h3>
                <p className="leading-relaxed">
                  We reserve the right to suspend or terminate your account at any time for violations of these Terms, 
                  suspicious activity, or any other reason at our discretion, with or without notice.
                </p>
              </div>
            </div>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">User Responsibilities</h2>
            <p className="leading-relaxed mb-3">When using SafeNestT, you agree to:</p>
            <div className="space-y-3">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Accuracy of Information</h4>
                <p>
                  Provide truthful, accurate, and complete information. You are solely responsible for the accuracy of 
                  all data you enter into the Platform. False or misleading information may result in account termination 
                  and potential legal consequences.
                </p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Lawful Use</h4>
                <p>
                  Use the Platform only for lawful purposes and in compliance with all applicable laws and regulations. 
                  Do not use SafeNestT to engage in harassment, fraud, impersonation, or any illegal activity.
                </p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Official Reporting</h4>
                <p>
                  File official complaints with appropriate authorities (FBI IC3, local law enforcement) independently. 
                  SafeNestT's tools assist with preparation but do not replace official reporting requirements.
                </p>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Prohibited Activities</h4>
                <p>
                  Do not attempt to hack, reverse engineer, or disrupt the Platform. Do not share accounts, scrape data, 
                  or use automated tools without authorization. See our Acceptable Use Policy for full details.
                </p>
              </div>
            </div>
          </section>

          {/* No Legal Advice */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Scale className="w-6 h-6 text-cyan-400" />
              No Legal Advice
            </h2>
            <p className="leading-relaxed mb-4">
              <strong className="text-white">SafeNestT does not provide legal advice.</strong> Information, tools, 
              and resources on the Platform are for informational and organizational purposes only and do not constitute 
              legal counsel.
            </p>
            <p className="leading-relaxed mb-4">
              We do not establish an attorney-client relationship with users. For legal advice specific to your situation, 
              consult a licensed attorney in your jurisdiction.
            </p>
            <p className="leading-relaxed">
              Any templates, forms, or suggested language provided are general guidelines and may not be appropriate for 
              your specific circumstances.
            </p>
          </section>

          {/* No Guarantees */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">No Guarantee of Outcomes</h2>
            <p className="leading-relaxed mb-4">
              <strong className="text-white">SafeNestT makes no guarantees regarding:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Recovery of stolen funds or assets</li>
              <li>Law enforcement action or investigation outcomes</li>
              <li>Prosecution or apprehension of alleged perpetrators</li>
              <li>Success of reports filed with government agencies</li>
              <li>Accuracy of blockchain tracking or wallet analysis</li>
              <li>Completeness or reliability of third-party data sources</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Results vary based on numerous factors beyond SafeNestT's control, including jurisdiction, evidence quality, 
              and law enforcement resources. Use our Platform at your own risk.
            </p>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Intellectual Property</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Platform Ownership</h3>
                <p className="leading-relaxed">
                  All content, features, and functionality of the Platform (including software, design, text, graphics, 
                  logos, and trademarks) are owned by SafeNestT Inc. and protected by U.S. and international copyright, 
                  trademark, and intellectual property laws.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">User Content</h3>
                <p className="leading-relaxed">
                  You retain ownership of content you submit to the Platform (case information, documents, notes). By 
                  submitting content, you grant SafeNestT a limited, non-exclusive license to store, process, and display 
                  your content solely to provide our services.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Restrictions</h3>
                <p className="leading-relaxed">
                  You may not copy, modify, distribute, sell, or create derivative works of SafeNestT's proprietary 
                  materials without written permission.
                </p>
              </div>
            </div>
          </section>

          {/* Payment Terms */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Payment and Subscription Terms</h2>
            <p className="leading-relaxed mb-3">
              Certain Platform features may require payment or subscription. By subscribing, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Pay all applicable fees and charges</li>
              <li>Provide accurate payment information</li>
              <li>Authorize recurring billing for subscription services (unless canceled)</li>
              <li>Accept that fees are non-refundable except as required by law or stated in our refund policy</li>
              <li>Understand that subscription benefits may change with reasonable notice</li>
            </ul>
            <p className="leading-relaxed mt-4">
              You may cancel subscriptions at any time through your account settings. Cancellations take effect at the 
              end of the current billing period.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
              <p className="leading-relaxed mb-4 uppercase font-semibold text-yellow-400">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <p className="leading-relaxed mb-4">
                SafeNestT Inc., its officers, directors, employees, and affiliates SHALL NOT BE LIABLE for any indirect, 
                incidental, special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Loss of profits, revenue, or data</li>
                <li>Failure to recover stolen funds</li>
                <li>Unsuccessful law enforcement outcomes</li>
                <li>Errors or inaccuracies in Platform-generated content</li>
                <li>Unauthorized access to your account or data</li>
                <li>Service interruptions or technical failures</li>
              </ul>
              <p className="leading-relaxed">
                Our total liability to you for any claims arising from use of the Platform SHALL NOT EXCEED the amount 
                you paid to SafeNestT in the twelve (12) months preceding the claim, or $100, whichever is greater.
              </p>
            </div>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Indemnification</h2>
            <p className="leading-relaxed">
              You agree to indemnify, defend, and hold harmless SafeNestT Inc. and its affiliates from any claims, 
              liabilities, damages, losses, or expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>Your use or misuse of the Platform</li>
              <li>Violation of these Terms or applicable laws</li>
              <li>Infringement of third-party rights</li>
              <li>Inaccurate or false information you provide</li>
              <li>Your interactions with other users or third parties</li>
            </ul>
          </section>

          {/* Disclaimer of Warranties */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Disclaimer of Warranties</h2>
            <p className="leading-relaxed mb-4 uppercase font-semibold text-gray-400">
              THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND.
            </p>
            <p className="leading-relaxed mb-4">
              SafeNestT disclaims all warranties, express or implied, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Merchantability and fitness for a particular purpose</li>
              <li>Non-infringement of third-party rights</li>
              <li>Accuracy, reliability, or completeness of information</li>
              <li>Uninterrupted or error-free operation</li>
              <li>Security of data transmission or storage</li>
            </ul>
            <p className="leading-relaxed mt-4">
              We do not warrant that the Platform will meet your requirements or achieve any specific results.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Governing Law and Dispute Resolution</h2>
            <p className="leading-relaxed mb-4">
              These Terms are governed by the laws of the State of New York, United States, without regard to conflict 
              of law principles.
            </p>
            <p className="leading-relaxed mb-4">
              Any disputes arising from these Terms or your use of the Platform shall be resolved through binding 
              arbitration in New York, NY, in accordance with the rules of the American Arbitration Association, except 
              where prohibited by law.
            </p>
            <p className="leading-relaxed">
              You waive any right to participate in class action lawsuits or class-wide arbitration.
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Severability and Waiver</h2>
            <p className="leading-relaxed mb-3">
              If any provision of these Terms is found unenforceable, the remaining provisions shall remain in full effect.
            </p>
            <p className="leading-relaxed">
              Our failure to enforce any right or provision does not constitute a waiver of that right or provision.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Changes to Terms</h2>
            <p className="leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email 
              or prominent Platform notice. Your continued use after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
            <p className="leading-relaxed mb-4">
              Questions about these Terms? Contact us:
            </p>
            <div className="space-y-2 text-gray-300">
              <p><strong className="text-white">SafeNestT Inc.</strong></p>
              <p>Email: <span className="text-cyan-400 font-mono">legal@safenestt.com</span></p>
              <p>Support: <span className="text-cyan-400 font-mono">support@safenestt.com</span></p>
              <p>Address: New York, United States</p>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}