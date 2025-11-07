import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Shield, ArrowRight, Lock, HardDrive, Eye, Folder,
  CheckCircle, Sparkles, Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const ONBOARDING_STEPS = [
  {
    title: "Welcome to SafeNest",
    subtitle: "Your Complete Security & Privacy Guardian",
    description: "Protect your digital life with AI-powered security monitoring, dark web scanning, and automated threat protection.",
    icon: Shield,
    benefits: [
      "🔒 Monitor data breaches in real-time",
      "🧹 Optimize device performance",
      "🛡️ Secure password vault",
      "📊 Track your security score"
    ]
  },
  {
    title: "Let's Check Your Security",
    subtitle: "Get your personalized security score in 60 seconds",
    description: "We'll analyze your security posture and provide actionable recommendations to improve your protection.",
    icon: Zap,
    scanning: true
  },
  {
    title: "Explore Key Features",
    subtitle: "Everything you need to stay secure",
    features: [
      {
        icon: Eye,
        title: "Identity Protection",
        description: "Monitor dark web for your data"
      },
      {
        icon: HardDrive,
        title: "Device Optimization",
        description: "Clean and speed up your device"
      },
      {
        icon: Lock,
        title: "Password Vault",
        description: "Secure storage for passwords"
      },
      {
        icon: Folder,
        title: "Breach Monitoring",
        description: "Get instant breach alerts"
      }
    ]
  },
  {
    title: "Stay Protected 24/7",
    subtitle: "Enable notifications for instant alerts",
    description: "Get notified immediately when your data appears in breaches or when action is needed.",
    icon: Sparkles,
    final: true
  }
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const navigate = useNavigate();

  const step = ONBOARDING_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      if (step.scanning && !scanComplete) {
        startScan();
      } else {
        setCurrentStep(currentStep + 1);
      }
    } else {
      completeOnboarding();
    }
  };

  const startScan = async () => {
    setScanning(true);
    // Simulate scan
    await new Promise(resolve => setTimeout(resolve, 3000));
    setScanComplete(true);
    setScanning(false);
  };

  const completeOnboarding = async () => {
    try {
      await base44.auth.updateMe({ 
        onboarding_completed: true,
        last_checkin_date: new Date().toISOString().split('T')[0]
      });
      
      // Generate referral code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await base44.auth.updateMe({ referral_code: code });
      
      // Initialize first achievement
      await base44.entities.Achievement.create({
        achievement_id: 'first_login',
        name: 'Welcome Aboard',
        description: 'Completed onboarding',
        category: 'beginner',
        icon: '🎯',
        points: 10,
        unlocked: true,
        unlocked_date: new Date().toISOString(),
        progress: 100,
        requirement: 'Complete onboarding'
      });
      
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error('Onboarding error:', error);
      navigate(createPageUrl("Dashboard"));
    }
  };

  const skipOnboarding = () => {
    completeOnboarding();
  };

  const StepIcon = step.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1419] via-[#1a2332] to-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {ONBOARDING_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-8 bg-cyan-400'
                  : idx < currentStep
                  ? 'w-2 bg-cyan-600'
                  : 'w-2 bg-gray-600'
              }`}
            />
          ))}
        </div>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl" />

          <CardContent className="p-12 relative">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <StepIcon className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-bold text-white">{step.title}</h1>
              <p className="text-cyan-400 text-lg font-semibold">{step.subtitle}</p>
              <p className="text-gray-400">{step.description}</p>

              {/* Benefits List */}
              {step.benefits && (
                <div className="space-y-3 text-left max-w-md mx-auto mt-8">
                  {step.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-gray-300">
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      </div>
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scanning Animation */}
              {step.scanning && (
                <div className="py-8">
                  {!scanComplete ? (
                    <div className="relative w-32 h-32 mx-auto">
                      <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
                      {scanning && (
                        <>
                          <div className="absolute inset-0 rounded-full border-4 border-cyan-400 animate-ping opacity-20" />
                          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s' }}>
                            <div className="absolute top-1/2 left-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent transform -translate-x-1/2 -translate-y-1/2 origin-left" />
                          </div>
                        </>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Shield className="w-12 h-12 text-cyan-400" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-12 h-12 text-green-400" />
                      </div>
                      <p className="text-white font-semibold text-lg">Scan Complete!</p>
                      <p className="text-green-400">Your security score: 85/100</p>
                    </div>
                  )}
                </div>
              )}

              {/* Feature Cards */}
              {step.features && (
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {step.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0f1419] rounded-xl p-4 border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <feature.icon className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
                      <p className="text-gray-400 text-xs">{feature.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mt-12">
              <Button
                variant="ghost"
                onClick={skipOnboarding}
                className="text-gray-400 hover:text-white"
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                disabled={step.scanning && scanning}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 px-8"
              >
                {step.final ? (
                  'Finish Setup'
                ) : step.scanning && !scanComplete ? (
                  scanning ? 'Scanning...' : 'Start Scan'
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Skip text */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Step {currentStep + 1} of {ONBOARDING_STEPS.length}
        </p>
      </div>
    </div>
  );
}