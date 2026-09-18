import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Globe, Server, ShieldAlert, Database, Crosshair, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/platform/EmptyState";
import { toast } from "sonner";

const CATEGORY_ICON = {
  network: Globe,
  blockchain: Database,
  reputation: ShieldAlert,
  infrastructure: Server,
  web: Globe,
};

export default function OsintProvidersTab({ caseId }) {
  const qc = useQueryClient();
  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ["osint-provider-statuses"],
    queryFn: async () => {
      const res = await base44.functions.invoke("osintProxy", { provider: "status" });
      const body = res?.data ?? res;
      return body?.data || body || [];
    },
    staleTime: 60000,
  });

  const { data: targets = [] } = useQuery({
    queryKey: ["targets", caseId],
    queryFn: () => base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">OSINT Providers</h3>
        <p className="text-xs text-gray-500 mb-3">
          All API keys are stored server-side and never exposed to the browser. Providers without a configured key are reported as “Not configured” — the investigation continues with the tools that are available.
        </p>
        {isLoading ? (
          <EmptyState variant="loading" title="Checking provider status…" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {statuses.map((s) => {
              const Icon = CATEGORY_ICON[s.category] || Globe;
              return (
                <div key={s.provider} className={`rounded-lg border p-3 ${s.configured ? "border-green-500/20 bg-green-500/[0.03]" : "border-white/10 bg-white/[0.02]"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className={`w-4 h-4 ${s.configured ? "text-green-400" : "text-gray-500"}`} />
                    <p className="text-sm font-medium text-white">{s.label}</p>
                    <Badge variant="outline" className={`ml-auto text-[10px] ${s.configured ? "border-green-500/30 text-green-400" : "border-amber-500/30 text-amber-400"}`}>
                      {s.configured ? "Configured" : "Not configured"}
                    </Badge>
                  </div>
                  {s.note && <p className="text-[11px] text-gray-500">{s.note}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-1">Run OSINT on Targets</h3>
        <p className="text-xs text-gray-500 mb-3">Dispatch the appropriate real provider for each target type. Results are returned live; failures are surfaced honestly.</p>
        {targets.length === 0 ? (
          <EmptyState variant="empty" icon={Crosshair} title="No targets" description="Add targets (wallets, domains, IPs) to run OSINT lookups." />
        ) : (
          <div className="space-y-2">
            {targets.map((t) => (
              <TargetOsintRow key={t.id} target={t} onRan={() => qc.invalidateQueries({ queryKey: ["targets", caseId] })} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function providerForTarget(type) {
  if (type === "domain" || type === "url") return ["dns", "rdap"];
  if (type === "wallet_address" || type === "token_contract" || type === "transaction_hash") return ["etherscan", "alchemy"];
  if (type === "ip_address") return ["virustotal", "shodan"];
  if (type === "email") return ["virustotal"];
  return [];
}

function TargetOsintRow({ target, onRan }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const providers = providerForTarget(target.type);

  const run = async () => {
    setRunning(true); setResults(null);
    const out = [];
    for (const p of providers) {
      try {
        const res = await base44.functions.invoke("osintProxy", { provider: p, target: target.value, network: target.network });
        const body = res?.data ?? res;
        out.push({ provider: p, ok: body?.ok !== false && body?.status !== "error", configured: body?.configured, data: body?.data, error: body?.error });
      } catch (e) {
        out.push({ provider: p, ok: false, error: e?.message || String(e) });
      }
    }
    setResults(out);
    setRunning(false);
    const anyOk = out.some((r) => r.ok);
    if (anyOk) toast.success(`OSINT complete for ${target.value}`);
    else toast.error(`OSINT failed for ${target.value}`);
    onRan();
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{target.type.replace(/_/g, " ")}</Badge>
        <p className="text-sm text-white font-mono truncate flex-1">{target.value}</p>
        <Button size="sm" variant="outline" onClick={run} disabled={running || providers.length === 0}
          className="border-cyan-500/30 text-cyan-400 h-7 text-xs">
          {running ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Crosshair className="w-3 h-3 mr-1" />}
          Run OSINT
        </Button>
      </div>
      {providers.length === 0 && <p className="text-[11px] text-amber-400">No OSINT provider available for this target type.</p>}
      {results && (
        <div className="space-y-2 mt-2">
          {results.map((r) => (
            <div key={r.provider} className={`rounded-md border p-2 text-xs ${r.ok ? "border-green-500/20 bg-green-500/[0.03]" : r.configured === false ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-red-500/20 bg-red-500/[0.03]"}`}>
              <div className="flex items-center gap-1.5 mb-1">
                {r.ok ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : r.configured === false ? <AlertTriangle className="w-3 h-3 text-amber-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                <span className="font-medium text-white capitalize">{r.provider}</span>
                {r.configured === false && <span className="text-amber-400">— Not configured</span>}
              </div>
              {r.ok ? (
                <pre className="text-[10px] text-gray-400 max-h-40 overflow-auto whitespace-pre-wrap font-mono">{JSON.stringify(r.data, null, 2)}</pre>
              ) : (
                <p className="text-[11px] text-red-300">{r.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}