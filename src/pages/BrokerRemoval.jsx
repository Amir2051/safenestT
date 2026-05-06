import React, { useState } from "react";
import { ShieldOff, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const BROKERS = [
  "Spokeo", "WhitePages", "BeenVerified", "Intelius", "PeopleFinder",
  "PeopleSmart", "PeopleLooker", "Radaris", "Pipl", "ZabaSearch",
  "TruthFinder", "Instant Checkmate", "US Search", "PublicRecords360",
  "AnyWho", "YellowPages", "Addresses.com", "MyLife", "Classmates",
  "PeekYou", "Spokeo", "FastPeopleSearch", "ClustrMaps", "FamilyTreeNow",
  "Ancestry", "Acxiom", "LexisNexis", "Equifax", "Epsilon", "Experian",
  "TransUnion", "Oracle Data Cloud", "Nielson", "Datalogix", "BlueKai",
  "TargetSmart", "Catalist", "i360", "L2", "Aristotle"
];

const statusOptions = ["not_sent", "sent", "confirmed"];

export default function BrokerRemoval() {
  const [requests, setRequests] = useState(() =>
    BROKERS.reduce((acc, b) => ({ ...acc, [b]: "not_sent" }), {})
  );
  const [loading, setLoading] = useState(false);

  const counts = {
    not_sent: Object.values(requests).filter(s => s === "not_sent").length,
    sent: Object.values(requests).filter(s => s === "sent").length,
    confirmed: Object.values(requests).filter(s => s === "confirmed").length,
  };

  const handleSendAll = () => {
    setLoading(true);
    setTimeout(() => {
      setRequests(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k] === "not_sent") next[k] = "sent"; });
        return next;
      });
      setLoading(false);
    }, 1500);
  };

  const cycleStatus = (broker) => {
    setRequests(prev => {
      const idx = statusOptions.indexOf(prev[broker]);
      return { ...prev, [broker]: statusOptions[(idx + 1) % statusOptions.length] };
    });
  };

  const statusIcon = (s) => {
    if (s === "confirmed") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (s === "sent") return <Clock className="w-4 h-4 text-yellow-400" />;
    return <AlertCircle className="w-4 h-4 text-gray-500" />;
  };

  const statusColor = (s) => {
    if (s === "confirmed") return "border-green-500/30 bg-green-500/5";
    if (s === "sent") return "border-yellow-500/30 bg-yellow-500/5";
    return "border-gray-700/50 bg-gray-900/30";
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldOff className="w-6 h-6 text-red-400" /> Data Broker Removal
          </h1>
          <p className="text-gray-400 text-sm mt-1">Send opt-out requests to {BROKERS.length}+ data brokers</p>
        </div>
        <Button onClick={handleSendAll} disabled={loading || counts.not_sent === 0}
          className="bg-red-600 hover:bg-red-700 text-white">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
          Send All Pending Requests
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[["Pending", counts.not_sent, "gray"], ["Sent", counts.sent, "yellow"], ["Confirmed", counts.confirmed, "green"]].map(([label, count, color]) => (
          <div key={label} className={`p-4 rounded-xl border border-${color}-500/30 bg-${color}-500/10 text-center`}>
            <div className={`text-2xl font-bold text-${color}-400`}>{count}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BROKERS.map(broker => (
          <button key={broker} onClick={() => cycleStatus(broker)}
            className={`flex items-center justify-between p-3 rounded-lg border ${statusColor(requests[broker])} text-left hover:opacity-80 transition-opacity`}>
            <span className="text-sm text-gray-300">{broker}</span>
            {statusIcon(requests[broker])}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600 text-center">Click any broker to cycle status. Tap "Send All" to mark pending requests as sent.</p>
    </div>
  );
}