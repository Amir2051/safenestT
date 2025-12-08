import React from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Lock, Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComingSoon() {
  const handleLogin = () => {
    base44.auth.redirectToLogin();
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-8">
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-black/50 p-6 rounded-2xl border border-cyan-500/30 backdrop-blur-xl">
              <Shield className="w-16 h-16 text-cyan-400" />
              <Construction className="w-8 h-8 text-yellow-400 absolute -bottom-2 -right-2" />
            </div>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight">
          SafeNest<span className="text-cyan-400">T</span>
        </h1>
        
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            System Under Maintenance
          </h2>
          <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-lg mx-auto">
            We are currently performing critical security upgrades to our platform. Access is temporarily restricted to authorized administrators only.
          </p>
        </div>

        <div className="pt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
            <Lock className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">Restricted Access</span>
          </div>
          
          <div className="flex gap-4 mt-4">
            <Button 
              onClick={handleLogin}
              variant="outline"
              className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
            >
              Admin Login
            </Button>
            <Button 
              onClick={handleLogout}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-white/5"
            >
              Switch Account
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 text-center">
        <p className="text-gray-600 text-sm">
          &copy; {new Date().getFullYear()} SafeNestT Security Systems. All rights reserved.
        </p>
      </div>
    </div>
  );
}