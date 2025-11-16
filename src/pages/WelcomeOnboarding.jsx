import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Lock, Smartphone, Wifi, CheckCircle, ArrowRight,
  Sparkles, Zap, Globe, Bot, ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const onboardingSteps = [
  {
    id: 0,
    title: "Welcome to SafeNestt! 🎉",
    description: "Your all-in-one security platform is ready. Let's get you set up in just a few steps.",
    icon: Shield,
    color: "from-cyan-500 to-blue-500"
  },
  {
    id: 1,
    title: "Secure Your Passwords",
    description: "Store and manage all your passwords in one encrypted vault. Never forget a password again.",
    icon: Lock,
    color: "from-purple-500 to-pink-500",
    action: "Add your first password",
    url: "PasswordVault"
  },
  {
    id: 2,
    title: "Scan Your Device",
    description: "Run a security scan to detect threats, clean junk data, and optimize your device.",
    icon: Smartphone,
    color: "from-green-500 to-emerald-500",
    action: "Run device scan",
    url: "DeviceCare"
  },
  {
    id: 3,
    title: "Enable VPN Protection",
    description: "Browse securely with our VPN. Protect your online activity and hide your IP address.",
    icon: Wifi,
    color: "from-indigo-500 to-purple-500",
    action: "Connect to VPN",
    url: "VPNPage"
  },
  {
    id: 4,
    title: "Meet Mia - Your AI Assistant",
    description: "Get instant security advice, threat analysis, and personalized recommendations from Mia.",
    icon: Bot,
    color: "from-orange-500 to-pink-500",
    action: "Chat with Mia",
    url: "MiaAssistant"
  }
];

export default function WelcomeOnboarding() {
  const [user, setUser] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setCurrentStep(userData.onboarding_step || 0);
    }).catch(() => {});
  }, []);

  const handleNext = async () => {
    if (currentStep < onboardingSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await base44.auth.updateMe({ onboarding_step: nextStep });
    }
  };

  const handleSkip = async () => {
    await base44.auth.updateMe({
      onboarding_completed: true,
      onboarding_step: onboardingSteps.length
    });
    toast.success('Onboarding skipped. You can revisit anytime!');
    navigate(createPageUrl('Dashboard'));
  };

  const handleComplete = async () => {
    await base44.auth.updateMe({
      onboarding_completed: true,
      onboarding_step: onboardingSteps.length
    });
    toast.success('🎉 Welcome aboard! Let\'s secure your digital life.');
    navigate(createPageUrl('Dashboard'));
  };

  const handleAction = (step) => {
    if (step.url) {
      navigate(createPageUrl(step.url));
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1419]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Step {currentStep + 1} of {onboardingSteps.length}</span>
            <span className="text-sm text-cyan-400">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2 bg-gray-800" />
        </div>

        {/* Main Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-[#1a2332]/90 to-[#0f1419]/90 backdrop-blur-xl border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
              <CardContent className="p-12 text-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="relative w-28 h-28 mx-auto mb-8"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${step.color} rounded-full blur-xl opacity-50 animate-pulse`} />
                  <div className={`relative w-28 h-28 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/50`}>
                    <Icon className="w-14 h-14 text-white" />
                  </div>
                </motion.div>

                {/* Title */}
                <h1 className="text-4xl font-bold text-white mb-4">{step.title}</h1>

                {/* Description */}
                <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                  {step.description}
                </p>

                {/* Action Button */}
                {step.action && (
                  <Button
                    onClick={() => handleAction(step)}
                    className={`bg-gradient-to-r ${step.color} hover:opacity-90 text-white mb-6 h-14 px-8 text-lg`}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {step.action}
                  </Button>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 pt-8 border-t border-cyan-500/20">
                  <Button
                    variant="outline"
                    onClick={handleSkip}
                    className="border-gray-600 text-gray-400 hover:text-white"
                  >
                    Skip Tour
                  </Button>

                  <div className="flex gap-2">
                    {onboardingSteps.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === currentStep
                            ? 'bg-cyan-400 w-8'
                            : idx < currentStep
                            ? 'bg-green-400'
                            : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>

                  {currentStep < onboardingSteps.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600"
                    >
                      Next
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleComplete}
                      className="bg-gradient-to-r from-green-500 to-emerald-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Get Started
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}