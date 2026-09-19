import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import WalletTracker from "@/components/investigation/WalletTracker";

export default function WalletTrackerAdmin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const caseId = searchParams.get("case_id") || "";
  const selectedCase = useMemo(() => cases.find((c) => c.id === caseId) || null, [cases, caseId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke("getAllCases", {});
        const body = res?.data ?? res;
        if (active) setCases(Array.isArray(body?.cases) ? body.cases : []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const chooseCase = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("case_id", id); else next.delete("case_id");
    setSearchParams(next);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Search className="w-7 h-7 text-cyan-400" /> Wallet Tracker
        </h1>
        <p className="text-gray-400 mt-1">Live wallet intelligence connected to SafeNestT case records.</p>
      </div>
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader><CardTitle className="text-white text-sm">Case Context</CardTitle></CardHeader>
        <CardContent>
          <Select value={caseId} onValueChange={chooseCase}>
            <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
              <SelectValue placeholder={loading ? "Loading cases..." : "Select a case"} />
            </SelectTrigger>
            <SelectContent className="bg-[#1a2332] border-cyan-500/20">
              {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.case_number || c.id} — {c.case_title || "Untitled case"}</SelectItem>)}
            </SelectContent>
          </Select>
          {selectedCase && (
            <div className="mt-3 text-xs text-gray-400">
              Wallets on record: {[selectedCase.scammer_wallet, selectedCase.victim_wallet, ...(selectedCase.monitored_wallets || [])].filter(Boolean).join(", ") || "None"}
            </div>
          )}
        </CardContent>
      </Card>
      <WalletTracker cases={cases} caseData={selectedCase} />
    </div>
  );
}
