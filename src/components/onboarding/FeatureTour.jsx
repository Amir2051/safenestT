import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const tourSteps = [
  {
    target: '[data-tour="dashboard"]',
    title: "Your Security Dashboard",
    description: "Monitor your overall security score and get quick access to all features."
  },
  {
    target: '[data-tour="alerts"]',
    title: "Real-time Alerts",
    description: "Stay informed about security threats and important notifications."
  },
  {
    target: '[data-tour="vault"]',
    title: "Password Vault",
    description: "Store and manage all your passwords securely in one place."
  },
  {
    target: '[data-tour="vpn"]',
    title: "VPN Protection",
    description: "Browse anonymously and protect your internet connection."
  }
];

export default function FeatureTour({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkTourStatus = async () => {
      const user = await base44.auth.me();
      if (user && !user.onboarding_completed) {
        setTimeout(() => setIsActive(true), 1000);
      }
    };
    checkTourStatus();
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const step = tourSteps[currentStep];
    const element = document.querySelector(step.target);
    
    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 10,
        left: rect.left
      });
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentStep, isActive]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsActive(false);
    await base44.auth.updateMe({ onboarding_completed: true });
    if (onComplete) onComplete();
  };

  if (!isActive) return null;

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
          />

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 9999
            }}
            className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border border-cyan-500/30 rounded-xl p-6 max-w-md shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400">{step.description}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleComplete}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
              <span className="text-xs text-gray-400">
                {currentStep + 1} of {tourSteps.length}
              </span>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button size="sm" variant="outline" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="bg-cyan-500">
                  {currentStep < tourSteps.length - 1 ? (
                    <>
                      Next
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    'Finish'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}