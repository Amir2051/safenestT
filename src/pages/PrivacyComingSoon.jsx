import React from "react";
import { Bell, Rocket, Shield, Eye, Lock, Globe } from "lucide-react";

const UPCOMING = [
  { icon: Shield, title: "AI Privacy Assistant", desc: "Chat-based advisor that guides you through privacy decisions in real-time", eta: "Q3 2025" },
  { icon: Eye, title: "Social Media Scrubber", desc: "Automatically scan and flag overshared posts across your social accounts", eta: "Q3 2025" },
  { icon: Globe, title: "VPN Integration", desc: "One-click VPN activation tied to your Privacy Score for smart protection", eta: "Q4 2025" },
  { icon: Lock, title: "Password Breach Correlator", desc: "Link breached credentials directly to broker exposure for full risk view", eta: "Q4 2025" },
  { icon: Rocket, title: "Automated Opt-Out Bot", desc: "Fully automated browser-based opt-out that completes forms on your behalf", eta: "2026" },
];

export default function PrivacyComingSoon() {
  return (
    <div className="min-h-screen p-6 space-y-8">
      <div className="text-center space-y-3 pt-6">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
          <Rocket className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">Coming Soon</h1>
        <p className="text-gray-400 max-w-lg mx-auto">We're building powerful new privacy tools. Here's what's on the roadmap.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
        {UPCOMING.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">{item.title}</h3>
                  <span className="text-xs text-purple-400">{item.eta}</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-sm">
          <Bell className="w-4 h-4" />
          You'll be notified when new features launch
        </div>
      </div>
    </div>
  );
}