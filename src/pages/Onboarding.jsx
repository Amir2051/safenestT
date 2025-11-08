import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    monitored_emails: []
  });
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(async (userData) => {
      setUser(userData);
      
      // Initialize trial if not already set
      if (!userData.trial_start_date) {
        const trialStartDate = new Date();
        const trialEndDate = new Date(trialStartDate);
        trialEndDate.setDate(trialEndDate.getDate() + 3); // 3-day trial

        await base44.auth.updateMe({
          subscription_plan: 'trial',
          payment_status: 'trial',
          trial_start_date: trialStartDate.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          trial_days_remaining: 3
        });

        console.log('🎁 3-day trial initialized');
        
        // Create audit log
        await base44.entities.AuditLog.create({
          action_type: 'profile_updated',
          action_category: 'settings',
          description: '3-day trial activated',
          metadata: {
            trial_end_date: trialEndDate.toISOString()
          },
          severity: 'info',
          status: 'success'
        });
      }
    }).catch(() => {});
  }, []);

  const handleNext = async () => {
    setLoading(true);
    
    try {
      if (step === 1) {
        if (!formData.full_name) {
          toast.error('Please enter your name');
          setLoading(false);
          return;
        }
        setStep(2);
      } else if (step === 2) {
        await base44.auth.updateMe({
          full_name: formData.full_name,
          phone: formData.phone,
          monitored_emails: formData.monitored_emails
        });

        await base44.entities.AuditLog.create({
          action_type: 'profile_updated',
          action_category: 'settings',
          description: 'Onboarding completed',
          severity: 'info',
          status: 'success'
        });

        toast.success('🎉 Welcome to SafeNest! Your 3-day trial has started.');
        navigate(createPageUrl("Dashboard"));
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Failed to complete onboarding');
    }
    
    setLoading(false);
  };

  const addEmail = () => {
    const email = prompt('Enter email address to monitor:');
    if (email && email.includes('@')) {
      setFormData(prev => ({
        ...prev,
        monitored_emails: [...prev.monitored_emails, email]
      }));
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Trial Banner */}
        <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 mb-6">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              🎁 Welcome! Your 3-Day Premium Trial Starts Now
            </h2>
            <p className="text-purple-300 mb-4">
              Get full access to all premium features for 3 days, completely free!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Trial ends in 3 days • No credit card required</span>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Steps */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-8">
            {/* Progress */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 1 ? 'bg-cyan-500' : 'bg-gray-700'
              }`}>
                {step > 1 ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <span className="text-white font-bold">1</span>
                )}
              </div>
              <div className={`h-1 w-20 ${step >= 2 ? 'bg-cyan-500' : 'bg-gray-700'}`} />
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                step >= 2 ? 'bg-cyan-500' : 'bg-gray-700'
              }`}>
                <span className="text-white font-bold">2</span>
              </div>
            </div>

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Let's get started
                  </h3>
                  <p className="text-gray-400">
                    Tell us a bit about yourself
                  </p>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Full Name *</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="John Doe"
                    className="bg-[#0f1419] border-cyan-500/20 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Phone Number (optional)</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+1 (555) 123-4567"
                    className="bg-[#0f1419] border-cyan-500/20 text-white"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Security Setup */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Set up monitoring
                  </h3>
                  <p className="text-gray-400">
                    Add emails to monitor for data breaches
                  </p>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                  <p className="text-cyan-400 text-sm font-semibold mb-2">
                    ✨ Trial Benefit: Monitor up to 2 emails
                  </p>
                  <p className="text-gray-400 text-xs">
                    During your trial, you can monitor 2 email addresses. Upgrade to monitor up to 5 (Elite plan).
                  </p>
                </div>

                {formData.monitored_emails.length > 0 && (
                  <div className="space-y-2">
                    {formData.monitored_emails.map((email, idx) => (
                      <div key={idx} className="bg-[#0f1419] rounded-lg p-3 border border-cyan-500/10">
                        <p className="text-white text-sm">{email}</p>
                      </div>
                    ))}
                  </div>
                )}

                {formData.monitored_emails.length < 2 && (
                  <Button
                    onClick={addEmail}
                    variant="outline"
                    className="w-full border-cyan-500/20 text-cyan-400"
                  >
                    + Add Email to Monitor
                  </Button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-[#0f1419] rounded-lg p-4 text-center">
                    <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-white font-semibold text-sm">VPN Protection</p>
                    <p className="text-gray-400 text-xs">Included</p>
                  </div>
                  <div className="bg-[#0f1419] rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-white font-semibold text-sm">Unlimited Passwords</p>
                    <p className="text-gray-400 text-xs">Included</p>
                  </div>
                  <div className="bg-[#0f1419] rounded-lg p-4 text-center">
                    <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-white font-semibold text-sm">AI Protection</p>
                    <p className="text-gray-400 text-xs">Included</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  onClick={() => setStep(step - 1)}
                  variant="outline"
                  className="flex-1 border-cyan-500/20 text-gray-300"
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Loading...
                  </>
                ) : step === 1 ? (
                  'Continue'
                ) : (
                  <>
                    Start My Trial
                    <Sparkles className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              No credit card required • Cancel anytime • Full access for 3 days
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}