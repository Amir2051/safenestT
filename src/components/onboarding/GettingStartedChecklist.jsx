import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  CheckCircle, Circle, Lock, Smartphone, Wifi, Shield, User, ChevronRight, Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const checklistItems = [
  {
    id: 'profile_completed',
    title: 'Complete Your Profile',
    description: 'Add your phone number and security preferences',
    icon: User,
    url: 'Settings',
    color: 'text-purple-400'
  },
  {
    id: 'password_added',
    title: 'Add Your First Password',
    description: 'Secure your credentials in the password vault',
    icon: Lock,
    url: 'PasswordVault',
    color: 'text-blue-400'
  },
  {
    id: 'device_scanned',
    title: 'Run a Security Scan',
    description: 'Check for threats and optimize your device',
    icon: Smartphone,
    url: 'DeviceCare',
    color: 'text-green-400'
  },
  {
    id: 'vpn_connected',
    title: 'Connect to VPN',
    description: 'Protect your browsing with secure VPN',
    icon: Wifi,
    url: 'VPNPage',
    color: 'text-indigo-400'
  },
  {
    id: 'two_factor_enabled',
    title: 'Enable Two-Factor Auth',
    description: 'Add an extra layer of account security',
    icon: Shield,
    url: 'Settings',
    color: 'text-cyan-400'
  }
];

export default function GettingStartedChecklist({ user, onUpdate }) {
  const [checklist, setChecklist] = useState({
    profile_completed: false,
    password_added: false,
    device_scanned: false,
    vpn_connected: false,
    two_factor_enabled: false
  });

  useEffect(() => {
    const updatedChecklist = {
      profile_completed: !!(user?.username && user?.phone),
      password_added: user?.onboarding_checklist?.password_added || false,
      device_scanned: !!(user?.last_scan_date),
      vpn_connected: user?.vpn_enabled || false,
      two_factor_enabled: user?.two_factor_enabled || false
    };
    
    setChecklist(updatedChecklist);
  }, [user]);

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progress = (completedCount / checklistItems.length) * 100;

  if (completedCount === checklistItems.length) {
    return null; // Hide when complete
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <div>
              <CardTitle className="text-white">Getting Started</CardTitle>
              <p className="text-sm text-gray-400 mt-1">
                {completedCount} of {checklistItems.length} completed
              </p>
            </div>
          </div>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
            {Math.round(progress)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2 bg-gray-800 mb-6" />
        
        <div className="space-y-3">
          {checklistItems.map((item, index) => {
            const Icon = item.icon;
            const isCompleted = checklist[item.id];
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={createPageUrl(item.url)}>
                  <div className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isCompleted
                      ? 'bg-green-500/10 border-green-500/30 opacity-75'
                      : 'bg-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-green-500/20' : 'bg-cyan-500/10'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <Icon className={`w-5 h-5 ${item.color}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold ${
                          isCompleted ? 'text-gray-400 line-through' : 'text-white'
                        }`}>
                          {item.title}
                        </h4>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                      {!isCompleted && (
                        <ChevronRight className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}