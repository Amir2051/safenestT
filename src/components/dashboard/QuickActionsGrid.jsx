import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Bell, FileText, Bot, Shield, Scan, Wifi, Globe } from 'lucide-react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickActionsGrid({ user, alerts, passwords }) {
  const actions = [
    {
      title: 'Password Vault',
      description: `${passwords.length} passwords secured`,
      icon: Lock,
      color: 'from-purple-500 to-pink-500',
      url: createPageUrl('PasswordVault'),
      glow: 'shadow-purple-500/20'
    },
    {
      title: 'Active Alerts',
      description: `${alerts.length} requiring attention`,
      icon: Bell,
      color: 'from-red-500 to-orange-500',
      url: createPageUrl('Alerts'),
      glow: 'shadow-red-500/20',
      pulse: alerts.filter(a => a.severity === 'critical').length > 0
    },
    {
      title: 'Device Protection',
      description: 'Scan for threats',
      icon: Shield,
      color: 'from-green-500 to-emerald-500',
      url: createPageUrl('DeviceCare'),
      glow: 'shadow-green-500/20'
    },
    {
      title: 'Web VPN',
      description: 'Secure browsing',
      icon: Globe,
      color: 'from-cyan-500 to-blue-500',
      url: createPageUrl('WebVPN'),
      glow: 'shadow-cyan-500/20'
    },
    {
      title: 'VPN Protection',
      description: 'Full device VPN',
      icon: Wifi,
      color: 'from-indigo-500 to-purple-500',
      url: createPageUrl('VPNPage'),
      glow: 'shadow-indigo-500/20'
    },
    {
      title: 'Talk to Mia AI',
      description: 'Get instant help',
      icon: Bot,
      color: 'from-orange-500 to-pink-500',
      url: createPageUrl('MiaAssistant'),
      glow: 'shadow-orange-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action, idx) => (
        <Link key={idx} to={action.url}>
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300 cursor-pointer group hover:scale-105 relative overflow-hidden">
            {action.pulse && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            )}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${action.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
            <CardContent className="p-6 relative">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 shadow-lg ${action.glow}`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{action.title}</h3>
              <p className="text-sm text-gray-400">{action.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}