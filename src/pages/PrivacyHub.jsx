import React from "react";
import { Link } from "react-router-dom";
import { Shield, ShieldOff, Eye, Map, Star, Cookie, FileText, Lock, Bell, ChevronRight, TrendingUp } from "lucide-react";

const modules = [
  { title: "Privacy Score", desc: "Your real-time privacy risk rating", icon: Star, color: "cyan", path: "/PrivacyScore" },
  { title: "Broker Removal", desc: "Opt out from 40+ data brokers", icon: ShieldOff, color: "red", path: "/BrokerRemoval" },
  { title: "Exposure Scanner", desc: "Find where your data is exposed", icon: Eye, color: "orange", path: "/ExposureScanner" },
  { title: "Dark Web Monitor", desc: "Track your data in known breaches", icon: Shield, color: "pink", path: "/DarkWebMonitorHub" },
  { title: "Footprint Map", desc: "Audit your digital data trail", icon: Map, color: "blue", path: "/FootprintMap" },
  { title: "Cookie Intel", desc: "Manage consent & browser privacy", icon: Cookie, color: "yellow", path: "/CookieIntel" },
  { title: "Rights Center", desc: "CCPA/GDPR legal requests", icon: FileText, color: "green", path: "/RightsCenter" },
  { title: "Secure Vault", desc: "Encrypted document storage", icon: Lock, color: "emerald", path: "/SecureVault" },
  { title: "Coming Soon", desc: "More privacy tools on the way", icon: Bell, color: "purple", path: "/PrivacyComingSoon" },
];

const colorMap = {
  cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  red: "border-red-500/30 bg-red-500/10 text-red-400",
  orange: "border-orange-500/30 bg-orange-500/10 text-orange-400",
  pink: "border-pink-500/30 bg-pink-500/10 text-pink-400",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  green: "border-green-500/30 bg-green-500/10 text-green-400",
  emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  purple: "border-purple-500/30 bg-purple-500/10 text-purple-400",
};

export default function PrivacyHub() {
  return (
    <div className="min-h-screen p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-cyan-400" />
          Privacy Hub
        </h1>
        <p className="text-gray-400 mt-1">Your complete privacy protection center — monitor, remove, and defend your personal data.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const colors = colorMap[mod.color];
          return (
            <Link
              key={mod.title}
              to={mod.path}
              className={`group block p-5 rounded-xl border ${colors} bg-opacity-10 hover:scale-[1.02] transition-all duration-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colors}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{mod.title}</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{mod.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors mt-1" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-5 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-semibold">Get Started</span>
        </div>
        <p className="text-gray-400 text-sm">Start with your <Link to="/PrivacyScore" className="text-cyan-400 hover:underline">Privacy Score</Link> to see your current risk level, then use the tools above to reduce your digital footprint.</p>
      </div>
    </div>
  );
}