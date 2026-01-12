import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, XCircle, AlertTriangle, CheckCircle2, Eye, Lock } from "lucide-react";

export default function AcceptableUsePolicy() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <ShieldAlert className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-bold text-white">Acceptable Use Policy</h1>
        </div>
        <p className="text-gray-400">SafeNestT Inc.</p>
        <p className="text-gray-500 text-sm mt-2">Last Updated: January 12, 2026</p>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-8 space-y-8 text-gray-300">
          
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Introduction</h2>
            <p className="leading-relaxed mb-4">
              This Acceptable Use Policy ("Policy") governs your use of the SafeNestT platform ("Platform") operated by 
              SafeNestT Inc. ("SafeNestT," "we," "us," or "our"). This Policy supplements our Terms and Conditions and 
              Privacy Policy.
            </p>
            <p className="leading-relaxed">
              By accessing or using SafeNestT, you agree to comply with this Policy. Violations may result in account 
              suspension, termination, and potential legal action.
            </p>
          </section>

          {/* Purpose Statement */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-cyan-400" />
              Platform Purpose and Ethical Use
            </h2>
            <p className="leading-relaxed mb-4">
              SafeNestT is designed to be a <strong className="text-white">case preparation, reporting assistance, and 
              cybersecurity support platform</strong>. The Platform is intended for:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li>Victims of cyber fraud to document and organize incident details</li>
              <li>Preparing structured reports for submission to appropriate law enforcement authorities</li>
              <li>Accessing cybersecurity education and protective resources</li>
              <li>Tracking cryptocurrency transactions related to legitimate investigations</li>
              <li>Generating documentation to support official complaints</li>
            </ul>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="font-semibold text-green-400 mb-2">Ethical Use Principle:</p>
              <p>
                SafeNestT's tools must be used lawfully, ethically, and responsibly. We are committed to supporting 
                victims of cybercrime while ensuring our Platform is not misused for harmful purposes.
              </p>
            </div>
          </section>

          {/* Prohibited Activities */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-400" />
              Prohibited Activities
            </h2>
            <p className="leading-relaxed mb-4">
              The following activities are strictly prohibited on SafeNestT:
            </p>

            <div className="space-y-4">
              {/* Illegal Activity */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">1. Illegal Activity</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Using the Platform to commit, facilitate, or plan any illegal activity</li>
                  <li>Violating any federal, state, local, or international laws or regulations</li>
                  <li>Engaging in money laundering, fraud, or financial crimes</li>
                  <li>Distributing or possessing illegal materials (child exploitation, pirated content, etc.)</li>
                </ul>
              </div>

              {/* Harassment */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">2. Harassment and Abuse</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Harassing, stalking, threatening, or intimidating others</li>
                  <li>Publishing private information without consent (doxxing)</li>
                  <li>Using the Platform to organize or coordinate hate speech or discriminatory attacks</li>
                  <li>Creating false reports to harm another person's reputation</li>
                </ul>
              </div>

              {/* Impersonation */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">3. Impersonation and Fraud</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Impersonating another person, entity, or SafeNestT employee</li>
                  <li>Providing false, misleading, or fraudulent information</li>
                  <li>Creating accounts using stolen credentials or fake identities</li>
                  <li>Falsely claiming to be law enforcement or government officials</li>
                </ul>
              </div>

              {/* Vigilantism */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">4. Vigilantism and Unauthorized Investigations</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Using the Platform to conduct unauthorized investigations or vigilante activities</li>
                  <li>Attempting to track, confront, or retaliate against alleged perpetrators</li>
                  <li>Sharing personal information of suspects publicly ("mob justice")</li>
                  <li>Interfering with official law enforcement investigations</li>
                </ul>
                <p className="text-yellow-400 text-sm mt-3 italic">
                  Note: Report suspected criminals to appropriate authorities (FBI IC3, local police). Do not take 
                  matters into your own hands.
                </p>
              </div>

              {/* Data Misuse */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">5. Data Misuse and Unauthorized Access</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Accessing or attempting to access accounts that don't belong to you</li>
                  <li>Scraping, harvesting, or collecting data from the Platform without authorization</li>
                  <li>Using blockchain tracking tools to stalk or monitor individuals without legitimate cause</li>
                  <li>Selling, sharing, or distributing user data obtained from the Platform</li>
                </ul>
              </div>

              {/* Technical Abuse */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">6. Technical Abuse and Security Violations</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Attempting to hack, compromise, or disrupt the Platform's security</li>
                  <li>Introducing viruses, malware, or malicious code</li>
                  <li>Reverse engineering, decompiling, or extracting source code</li>
                  <li>Using automated bots or scripts without authorization</li>
                  <li>Overloading servers (denial-of-service attacks)</li>
                  <li>Circumventing access controls or usage limits</li>
                </ul>
              </div>

              {/* Spam */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">7. Spam and Commercial Misuse</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Sending unsolicited marketing messages or spam</li>
                  <li>Using the Platform for multi-level marketing or pyramid schemes</li>
                  <li>Posting advertisements or commercial solicitations without authorization</li>
                  <li>Creating accounts for the primary purpose of promoting third-party services</li>
                </ul>
              </div>

              {/* Intellectual Property */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-red-400 mb-2">8. Intellectual Property Violations</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                  <li>Uploading copyrighted materials without authorization</li>
                  <li>Using SafeNestT trademarks or branding without permission</li>
                  <li>Reproducing or distributing Platform content without license</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cybersecurity Tools Usage */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-cyan-400" />
              Responsible Use of Cybersecurity Tools
            </h2>
            <p className="leading-relaxed mb-4">
              SafeNestT provides various cybersecurity and investigative tools (blockchain tracking, wallet monitoring, 
              transaction analysis). These tools must be used responsibly and ethically:
            </p>
            <div className="space-y-3">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">✅ Acceptable Uses:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Tracking your own stolen funds or assets</li>
                  <li>Gathering evidence for official reports to law enforcement</li>
                  <li>Monitoring wallets involved in your specific fraud case</li>
                  <li>Educational purposes and cybersecurity research</li>
                  <li>Protecting your own accounts and assets</li>
                </ul>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-red-400 mb-2">❌ Unacceptable Uses:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Stalking or surveilling individuals without lawful authority</li>
                  <li>Tracking wallets for malicious purposes (blackmail, extortion)</li>
                  <li>Conducting "investigations" outside of legitimate victimization</li>
                  <li>Using tools to assist in criminal activity</li>
                  <li>Sharing tracked data publicly to incite harassment</li>
                </ul>
              </div>
            </div>
            <p className="leading-relaxed mt-4 text-yellow-400 italic">
              Remember: Blockchain data is public, but misuse of this information may violate privacy laws or other 
              regulations. Use responsibly.
            </p>
          </section>

          {/* Simulated vs Real Data */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Eye className="w-6 h-6 text-cyan-400" />
              Simulated Data and Testing Environments
            </h2>
            <p className="leading-relaxed mb-4">
              Certain SafeNestT features may include demo or simulated data for testing and educational purposes. When 
              using these features:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong className="text-white">Clearly Labeled:</strong> Simulated data is marked as "Demo," "Test," 
                or "Example" to distinguish it from real case information
              </li>
              <li>
                <strong className="text-white">Educational Use:</strong> Demo environments are for learning platform 
                features, not for submitting actual fraud reports
              </li>
              <li>
                <strong className="text-white">No Real Investigations:</strong> Do not use simulated data to file 
                official complaints or reports with authorities
              </li>
              <li>
                <strong className="text-white">Privacy:</strong> Demo data does not represent real individuals or cases
              </li>
            </ul>
            <p className="leading-relaxed mt-4">
              Always use production features with real data when preparing actual incident reports.
            </p>
          </section>

          {/* Reporting Violations */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-400" />
              Reporting Policy Violations
            </h2>
            <p className="leading-relaxed mb-4">
              If you become aware of conduct that violates this Acceptable Use Policy, please report it immediately:
            </p>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <p className="text-gray-300 mb-2">
                <strong className="text-white">Report To:</strong> 
                <span className="text-cyan-400 font-mono ml-2">abuse@safenestt.com</span>
              </p>
              <p className="text-gray-300 mb-2">
                <strong className="text-white">Include:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-gray-300">
                <li>Description of the violation</li>
                <li>Account or username involved (if known)</li>
                <li>Date and time of incident</li>
                <li>Screenshots or evidence (if available)</li>
              </ul>
            </div>
            <p className="leading-relaxed mt-4">
              We investigate all reports promptly and take appropriate action, which may include warnings, account 
              suspension, permanent bans, or referral to law enforcement.
            </p>
          </section>

          {/* Consequences */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Consequences of Violations</h2>
            <p className="leading-relaxed mb-4">
              Violations of this Policy may result in:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">Warning</p>
                  <p className="text-gray-400 text-sm">First-time minor violations may result in a formal warning</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">Temporary Suspension</p>
                  <p className="text-gray-400 text-sm">Account access suspended for a defined period (7-30 days)</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">Permanent Ban</p>
                  <p className="text-gray-400 text-sm">Severe or repeated violations result in permanent account termination</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-white">Legal Action</p>
                  <p className="text-gray-400 text-sm">
                    Illegal activity may be reported to law enforcement. We cooperate fully with legal investigations.
                  </p>
                </div>
              </div>
            </div>
            <p className="leading-relaxed mt-4 text-red-400 font-semibold">
              SafeNestT reserves the right to take action at our discretion, with or without prior notice, depending on 
              the severity of the violation.
            </p>
          </section>

          {/* Cooperation with Law Enforcement */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Cooperation with Law Enforcement</h2>
            <p className="leading-relaxed mb-4">
              SafeNestT cooperates with law enforcement agencies investigating illegal activity. We may:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Preserve account data and communications when legally required</li>
              <li>Respond to valid subpoenas, court orders, and legal process</li>
              <li>Report suspected criminal activity to appropriate authorities</li>
              <li>Provide technical assistance in lawful investigations</li>
            </ul>
            <p className="leading-relaxed mt-4">
              We balance user privacy with public safety and legal compliance.
            </p>
          </section>

          {/* Updates to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Updates to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Acceptable Use Policy to reflect changes in our practices, legal requirements, or 
              emerging threats. Material changes will be communicated via email or Platform notification. Your continued 
              use after updates constitutes acceptance.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Contact Information</h2>
            <p className="leading-relaxed mb-4">
              Questions about this Acceptable Use Policy? Contact us:
            </p>
            <div className="space-y-2 text-gray-300">
              <p><strong className="text-white">SafeNestT Inc.</strong></p>
              <p>Abuse Reports: <span className="text-cyan-400 font-mono">abuse@safenestt.com</span></p>
              <p>General Inquiries: <span className="text-cyan-400 font-mono">support@safenestt.com</span></p>
              <p>Legal: <span className="text-cyan-400 font-mono">legal@safenestt.com</span></p>
              <p>Address: New York, United States</p>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}