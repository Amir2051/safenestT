import React, { useState } from "react";
import { Map, Globe, ToggleLeft, ToggleRight } from "lucide-react";

const SERVICES = [
  { name: "Google", category: "Search & Ads", data: "Search history, location, email, contacts", sharing: true },
  { name: "Meta (Facebook/Instagram)", category: "Social Media", data: "Posts, photos, messages, ad preferences", sharing: true },
  { name: "Amazon", category: "E-Commerce", data: "Purchase history, browsing, Alexa data", sharing: true },
  { name: "Apple", category: "Device", data: "App usage, location, health data", sharing: false },
  { name: "Microsoft", category: "Productivity", data: "Documents, emails, telemetry", sharing: true },
  { name: "Twitter/X", category: "Social Media", data: "Posts, DMs, location metadata", sharing: false },
  { name: "TikTok", category: "Social Media", data: "Videos watched, biometric patterns", sharing: true },
  { name: "Spotify", category: "Entertainment", data: "Listening habits, playlists, location", sharing: false },
  { name: "Netflix", category: "Entertainment", data: "Viewing history, device info", sharing: false },
  { name: "Uber/Lyft", category: "Transportation", data: "Location history, payment info, trips", sharing: true },
  { name: "LinkedIn", category: "Professional", data: "Work history, connections, browsing", sharing: false },
  { name: "PayPal / Venmo", category: "Finance", data: "Transaction history, contacts", sharing: true },
];

const categoryColors = {
  "Search & Ads": "text-red-400",
  "Social Media": "text-pink-400",
  "E-Commerce": "text-orange-400",
  "Device": "text-blue-400",
  "Productivity": "text-cyan-400",
  "Entertainment": "text-purple-400",
  "Transportation": "text-yellow-400",
  "Professional": "text-indigo-400",
  "Finance": "text-green-400",
};

export default function FootprintMap() {
  const [services, setServices] = useState(SERVICES);

  const toggle = (name) => {
    setServices(prev => prev.map(s => s.name === name ? { ...s, sharing: !s.sharing } : s));
  };

  const sharing = services.filter(s => s.sharing).length;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Map className="w-6 h-6 text-blue-400" /> Digital Footprint Map
        </h1>
        <p className="text-gray-400 text-sm mt-1">Audit which services are collecting and sharing your personal data</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-center">
          <div className="text-2xl font-bold text-blue-400">{services.length}</div>
          <div className="text-xs text-gray-400 mt-1">Services Tracked</div>
        </div>
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
          <div className="text-2xl font-bold text-red-400">{sharing}</div>
          <div className="text-xs text-gray-400 mt-1">Sharing Data</div>
        </div>
        <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 text-center">
          <div className="text-2xl font-bold text-green-400">{services.length - sharing}</div>
          <div className="text-xs text-gray-400 mt-1">Data Restricted</div>
        </div>
      </div>

      <div className="space-y-3">
        {services.map(s => (
          <div key={s.name} className="flex items-center justify-between p-4 rounded-xl border border-gray-700/50 bg-gray-900/30">
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-white font-medium text-sm">{s.name}</div>
                <div className={`text-xs ${categoryColors[s.category] || "text-gray-400"}`}>{s.category}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.data}</div>
              </div>
            </div>
            <button onClick={() => toggle(s.name)} className="flex-shrink-0 ml-4">
              {s.sharing
                ? <ToggleRight className="w-8 h-8 text-red-400" />
                : <ToggleLeft className="w-8 h-8 text-green-400" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}