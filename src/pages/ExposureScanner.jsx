import React, { useState } from "react";
import { Eye, Search, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MOCK_RESULTS = [
  { source: "LinkedIn", type: "Professional Profile", risk: "low", detail: "Name, employer, location publicly visible" },
  { source: "Facebook", type: "Social Profile", risk: "medium", detail: "Profile photo and hometown indexed by search engines" },
  { source: "Spokeo", type: "Data Broker", risk: "high", detail: "Full name, address, phone number, relatives listed" },
  { source: "WhitePages", type: "Data Broker", risk: "high", detail: "Phone number and home address available" },
  { source: "Google Search", type: "Search Index", risk: "medium", detail: "Multiple pages linking your name and location" },
  { source: "BeenVerified", type: "Data Broker", risk: "high", detail: "Background report with employment history found" },
];

const riskColor = { low: "text-green-400 border-green-500/30 bg-green-500/10", medium: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10", high: "text-red-400 border-red-500/30 bg-red-500/10" };

export default function ExposureScanner() {
  const [query, setQuery] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [scanned, setScanned] = useState(false);

  const handleScan = () => {
    if (!query.trim()) return;
    setScanning(true);
    setTimeout(() => {
      setResults(MOCK_RESULTS);
      setScanning(false);
      setScanned(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Eye className="w-6 h-6 text-orange-400" /> Identity Exposure Scanner
        </h1>
        <p className="text-gray-400 text-sm mt-1">Search for your personal information across public databases and data brokers</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Enter your full name or email..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleScan()}
          className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
        />
        <Button onClick={handleScan} disabled={scanning} className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Scan
        </Button>
      </div>

      {scanning && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-orange-500/30 bg-orange-500/10">
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
          <span className="text-orange-300 text-sm">Scanning public databases and data broker sites...</span>
        </div>
      )}

      {scanned && !scanning && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Scan Results for "{query}"</h2>
            <span className="text-xs text-gray-400">{results.length} exposures found</span>
          </div>
          {results.map((r, i) => (
            <div key={i} className={`p-4 rounded-xl border ${riskColor[r.risk]} flex items-start gap-3`}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-medium text-sm">{r.source}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded border ${riskColor[r.risk]}`}>{r.risk}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{r.type}</div>
                <div className="text-xs text-gray-400 mt-1">{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {scanned && !scanning && results.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/10">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-300 text-sm">No significant exposures found for "{query}"</span>
        </div>
      )}
    </div>
  );
}