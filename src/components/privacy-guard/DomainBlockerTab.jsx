import { useState } from "react";
import { BROKER_DOMAINS } from "@/pages/PrivacyGuard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, ShieldOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function DomainBlockerTab({ blockedDomains, onToggle, onBlockAll, onLog }) {
  const [search, setSearch] = useState("");

  const filtered = BROKER_DOMAINS.filter(d =>
    d.domain.includes(search.toLowerCase()) ||
    d.owner.toLowerCase().includes(search.toLowerCase()) ||
    d.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = () => {
    const lines = [
      "# Privacy Guard — Safenestt Block List",
      `# Generated: ${new Date().toLocaleDateString()}`,
      "# Paste into your /etc/hosts file",
      "",
      ...blockedDomains.map(d => `127.0.0.1  ${d}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "safenestt-block-list.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Block list exported");
    onLog("Exported block list as hosts file");
  };

  return (
    <div className="space-y-4">
      {/* Subheader */}
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <h2 className="text-white font-semibold text-lg mb-1">Oracle & Data Broker Domain Blocker</h2>
        <p className="text-gray-400 text-sm">These domains are known to track, profile, and sell your data. Block them to prevent profiling.</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search domain, company, or category..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-gray-900/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-cyan-500/50"
          />
        </div>
        <Button onClick={onBlockAll} className="bg-red-600 hover:bg-red-700 text-white shrink-0">
          <ShieldOff className="w-4 h-4 mr-2" />
          Block All
        </Button>
        <Button onClick={handleExport} variant="outline" className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 shrink-0">
          <Download className="w-4 h-4 mr-2" />
          Export Block List
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span className="text-green-400 font-bold">{blockedDomains.length} blocked</span>
        <span>•</span>
        <span>{BROKER_DOMAINS.length - blockedDomains.length} active</span>
        <span>•</span>
        <span>{BROKER_DOMAINS.filter(d => d.risk === "HIGH").length} high risk total</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-800/60 overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-900/80 border-b border-gray-800/60 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Domain</div>
          <div className="col-span-3">Owner</div>
          <div className="col-span-3">Category</div>
          <div className="col-span-1">Risk</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        <div className="divide-y divide-gray-800/40">
          {filtered.map(({ domain, owner, category, risk }) => {
            const isBlocked = blockedDomains.includes(domain);
            return (
              <div
                key={domain}
                className="grid grid-cols-2 md:grid-cols-12 gap-2 px-4 py-3 bg-gray-950/40 hover:bg-gray-900/40 transition-colors items-center"
              >
                <div className="col-span-2 md:col-span-3 font-mono text-xs text-cyan-300">{domain}</div>
                <div className="col-span-2 md:col-span-3 text-sm text-gray-300">{owner}</div>
                <div className="col-span-2 md:col-span-3 text-xs text-gray-500">{category}</div>
                <div className="col-span-1">
                  <Badge className={`text-[10px] px-1.5 py-0.5 border ${
                    risk === "HIGH"
                      ? "bg-red-500/20 text-red-400 border-red-500/50"
                      : "bg-orange-500/20 text-orange-400 border-orange-500/50"
                  }`}>
                    {risk}
                  </Badge>
                </div>
                <div className="col-span-1 md:col-span-2 flex justify-end">
                  <button
                    onClick={() => onToggle(domain)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isBlocked
                        ? "bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30"
                        : "bg-gray-800/60 text-gray-400 border-gray-700/40 hover:border-cyan-500/40 hover:text-cyan-400"
                    }`}
                  >
                    {isBlocked ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                    {isBlocked ? "Blocked" : "Active"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-gray-500">No domains match your search.</div>
      )}
    </div>
  );
}