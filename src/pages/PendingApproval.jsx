import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Shield, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function PendingApproval() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);

        // If status changed to active, reload the page to access the app
        if (userData.account_status === 'active') {
          window.location.reload();
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
      setChecking(false);
    };

    checkStatus();

    // Poll every 10 seconds to check if approved
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = () => {
    base44.auth.logout();
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        <Card className="bg-gradient-to-br from-[#1a2332]/90 to-[#0f1419]/90 backdrop-blur-xl border-cyan-500/30 shadow-2xl shadow-cyan-500/20">
          <CardContent className="p-12 text-center">
            {/* Animated Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative w-24 h-24 mx-auto mb-8"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/50">
                <Clock className="w-12 h-12 text-white animate-pulse" />
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-white mb-4"
            >
              Thank You for Signing Up! 🎉
            </motion.h1>

            {/* Message */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-300 mb-8 text-lg leading-relaxed"
            >
              Your account is <span className="text-cyan-400 font-semibold">pending approval</span> from our admin team.
              You'll be notified once access is granted.
            </motion.p>

            {/* Info Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="p-6 bg-cyan-500/10 border border-cyan-500/30 rounded-xl mb-8"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-cyan-400 mb-2">
                    What happens next?
                  </p>
                  <ul className="text-xs text-gray-300 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Our admin team will review your account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>You'll receive a notification when approved</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Full access will be granted automatically</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* User Info */}
            {user && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-8 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50"
              >
                <p className="text-xs text-gray-400 mb-1">Signed in as:</p>
                <p className="text-sm font-semibold text-white">{user.email}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Registered: {new Date(user.created_date).toLocaleDateString()}
                </p>
              </motion.div>
            )}

            {/* Sign Out Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800/50 hover:text-white"
              >
                Sign Out
              </Button>
            </motion.div>

            {/* Auto-refresh indicator */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-xs text-gray-500 mt-6"
            >
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2" />
              Auto-checking for approval status...
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}