import React, { useState } from "react";
import { Cookie, Shield, AlertCircle, CheckCircle, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COOKIE_TIPS = [
  { title: "Use a privacy-focused browser", desc: "Firefox, Brave, or Safari block many trackers by default.", level: "easy" },
  { title: "Install uBlock Origin", desc: "Blocks ads and trackers across all websites.", level: "easy" },
  { title: "Clear cookies regularly", desc: "Clear cookies monthly or use auto-clear extensions.", level: "easy" },
  { title: "Opt out of tracking on visit", desc: "Always decline non-essential cookies on consent banners.", level: "medium" },
  { title: "Use Privacy Badger", desc: "EFF's extension learns to block invisible trackers.", level: "medium" },
  { title: "Enable DNS-over-HTTPS", desc: "Encrypt your DNS queries to prevent tracking at the network level.", level: "hard" },
];

const levelColor = { easy: "text-green-400 border-green-500/30 bg-green-500/10", medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", hard: "text-red-400 border-red-500/30 bg-red-500/10" };

export default function CookieIntel() {
  const [url, setUrl] = useState("");
  const [checked, setChecked] = useState([]);

  const handleCheck = () => {
    setChecked(prev => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });
    setUrl("");
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cookie className="w-6 h-6 text-yellow-400" /> Cookie Intel
        </h1>
        <p className="text-gray-400 text-sm mt-1">Manage browser consent, understand tracking, and improve cookie hygiene</p>
      </div>

      <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-3">
        <h2 className="text-white font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-yellow-400" /> Site Cookie Checker</h2>
        <div className="flex gap-2">
          <Input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCheck()}
            placeholder="Enter website URL (e.g. amazon.com)" className="bg-gray-900 border-gray-700 text-white placeholder-gray-500" />
          <Button onClick={handleCheck} className="bg-yellow-600 hover:bg-yellow-700 text-white">Check</Button>
        </div>
        {checked.map(site => (
          <div key={site} className="flex items-start gap-3 p-3 rounded-lg border border-orange-500/30 bg-orange-500/10">
            <AlertCircle className="w-4 h-4 text-orange-400 mt-0.5" />
            <div>
              <div className="text-white text-sm font-medium">{site}</div>
              <div className="text-xs text-gray-400 mt-0.5">Likely uses analytics, advertising, and functional cookies. Review their cookie policy to opt out.</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-white font-semibold">Privacy Tips</h2>
        {COOKIE_TIPS.map(tip => (
          <div key={tip.title} className={`flex items-start gap-3 p-4 rounded-xl border ${levelColor[tip.level]}`}>
            <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-white font-medium text-sm">{tip.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">{tip.desc}</div>
            </div>
            <span className={`ml-auto text-xs font-bold uppercase flex-shrink-0 px-2 py-0.5 rounded border ${levelColor[tip.level]}`}>{tip.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}