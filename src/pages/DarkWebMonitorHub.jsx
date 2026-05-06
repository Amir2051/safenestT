import React, { useState } from "react";
import { Shield, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SAMPLE_BREACHES = [
  { name: "RockYou2024", date: "2024-07-04", records: "10 billion", severity: "critical" },
  { name: "LinkedIn 2021", date: "2021-06-22", records: "700 million", severity: "high" },
  { name: "Facebook 2021", date: "2021-04-03", records: "533 million", severity: "high" },
  { name: "Adobe 2013", date: "2013-10-04", records: "153 million", severity: "medium" },
  { name: "Dropbox 2012", date: "2012-07-01", records: "68 million", severity: "medium" },
];

const severityColor = {
  critical: "text-red-400 border-red-500/30 bg-red-500/10",
  high: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
};

export default function DarkWebMonitorHub() {
  const [emails, setEmails] = useState([]);
  const [input, setInput] = useState("");

  const addEmail = () => {
    if (input.trim() && !emails.includes(input.trim())) {
      setEmails(prev => [...prev, input.trim()]);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-pink-400" /> Dark Web Monitor
        </h1>
        <p className="text-gray-400 text-sm mt-1">Monitor your emails against known mega-breaches and dark web databases</p>
      </div>

      <div className="p-5 rounded-xl border border-pink-500/20 bg-pink-500/5 space-y-4">
        <h2 className="text-white font-semibold">Monitored Emails</h2>
        <div className="flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addEmail()}
            placeholder="Add email to monitor..." className="bg-gray-900 border-gray-700 text-white placeholder-gray-500" />
          <Button onClick={addEmail} className="bg-pink-600 hover:bg-pink-700 text-white">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {emails.length === 0 && <p className="text-gray-500 text-sm">No emails added yet. Add an email to start monitoring.</p>}
        {emails.map(email => (
          <div key={email} className="flex items-center justify-between p-3 rounded-lg border border-gray-700 bg-gray-900/50">
            <div>
              <span className="text-gray-200 text-sm">{email}</span>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-green-400">Monitoring active</span>
              </div>
            </div>
            <button onClick={() => setEmails(prev => prev.filter(e => e !== email))} className="text-gray-500 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-white font-semibold">Known Major Breaches Database</h2>
        <p className="text-gray-500 text-xs">Your monitored emails are cross-referenced against these breaches</p>
        {SAMPLE_BREACHES.map(b => (
          <div key={b.name} className={`flex items-center justify-between p-4 rounded-xl border ${severityColor[b.severity]}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4" />
              <div>
                <div className="text-white font-medium text-sm">{b.name}</div>
                <div className="text-xs text-gray-400">{b.date} · {b.records} records</div>
              </div>
            </div>
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${severityColor[b.severity]}`}>{b.severity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}