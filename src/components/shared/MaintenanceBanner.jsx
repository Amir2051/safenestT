import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MaintenanceBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('maintenance_banner_dismissed_2025');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('maintenance_banner_dismissed_2025', 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="relative mb-6"
        >
          <div className="bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2 mb-1">
                  We're Back Online! <Zap className="w-4 h-4 text-yellow-400" />
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Thank you for your patience during our scheduled maintenance. SafeNestT has been updated with enhanced features and our servers have been upgraded for better performance. 
                  We're excited to continue protecting you against cyber threats!
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}