import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, CheckCircle, XCircle, Mail, Phone } from "lucide-react";

export default function RefundPolicy() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <DollarSign className="w-10 h-10 text-cyan-400" />
          <h1 className="text-4xl font-bold text-white">SafeNestT Refund Policy</h1>
        </div>
        <p className="text-gray-500 text-sm mt-2">Effective Date: January 12, 2026</p>
      </div>

      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-8 space-y-8 text-gray-300">
          
          {/* Introduction */}
          <section>
            <p className="leading-relaxed">
              At SafeNestT, we are committed to providing you with a secure platform to report and track scams, 
              connect with authorities, and protect your interests. Your satisfaction and trust are important to us. 
              This Refund Policy outlines the circumstances under which refunds may be issued.
            </p>
          </section>

          {/* Paid Services */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Paid Services</h2>
            <p className="leading-relaxed mb-4">
              SafeNestT may offer premium services, subscriptions, or additional features beyond the free platform access. 
              Refunds for paid services are considered only under the following conditions:
            </p>
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Service Not Delivered</h3>
                    <p className="text-gray-300">
                      If a service you paid for was not delivered or is unavailable due to technical issues, you may 
                      request a full refund.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Duplicate Payment</h3>
                    <p className="text-gray-300">
                      If you accidentally make a duplicate payment, SafeNestT will refund the extra charge.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">Cancellation Within Trial Period</h3>
                    <p className="text-gray-300">
                      If you cancel a subscription during the trial period (if applicable), a full refund will be issued.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Refund Request Procedure */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Refund Request Procedure</h2>
            <p className="leading-relaxed mb-4">To request a refund:</p>
            <div className="space-y-4">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold">1</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    Contact our support team at{" "}
                    <a href="mailto:support@safenestt.com" className="text-cyan-400 font-mono hover:underline">
                      support@safenestt.com
                    </a>{" "}
                    with your account details, payment information, and reason for the refund.
                  </p>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold">2</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    Our team will review your request and respond within <strong className="text-white">7 business days</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-cyan-400 font-bold">3</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    If approved, refunds will be processed using the original payment method within{" "}
                    <strong className="text-white">10 business days</strong>.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Non-Refundable Situations */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Non-Refundable Situations</h2>
            <p className="leading-relaxed mb-4">Refunds will not be issued in the following cases:</p>
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">Partial use of a subscription or service.</p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    Dissatisfaction due to user error, misunderstanding of features, or personal preference.
                  </p>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-300">
                    Services rendered correctly according to SafeNestT terms of use.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Changes to the Refund Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Changes to the Refund Policy</h2>
            <p className="leading-relaxed">
              SafeNestT reserves the right to update this Refund Policy at any time. Any changes will be posted on 
              this page with the updated effective date.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">5. Contact Us</h2>
            <p className="leading-relaxed mb-4">For questions regarding refunds, please reach out to us:</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <a 
                    href="mailto:support@safenestt.com" 
                    className="text-cyan-400 font-mono hover:underline"
                  >
                    support@safenestt.com
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-cyan-400" />
                <div>
                  <p className="text-gray-400 text-sm">Phone</p>
                  <p className="text-white">1-800-SAFE-NST</p>
                </div>
              </div>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}