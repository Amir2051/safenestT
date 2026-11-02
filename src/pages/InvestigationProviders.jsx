import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cpu, CheckCircle2, Loader2, ShieldCheck, XCircle, Activity } from "lucide-react";
import { toast } from "sonner";

/**
 * Administrator-only investigation provider configuration.
 * The selection is persisted server-side (SystemConfig) and enforced there:
 * non-admins receive 403 from the backend regardless of this page.
 */
export default function InvestigationProviders() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});

  const load = async () => {
    const res = await base44.functions.invoke("investigationProviderConfig", { action: "get" });
    setConfig(res?.data ?? res);
  };

  useEffect(() => {
    load().catch((e) => toast.error("Could not load provider configuration: " + (e?.message || e))).finally(() => setLoading(false));
  }, []);

  const save = async (provider) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke("investigationProviderConfig", { action: "set", provider });
      const body = res?.data ?? res;
      if (!body?.ok) throw new Error(body?.error || "Save failed");
      await load();
      toast.success(`Default investigation provider set to ${body.provider === "mia" ? "MIA Multi-Agent" : "Hermes Agent"}`);
    } catch (e) {
      toast.error("Could not save provider: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const test = async (provider) => {
    setTesting(provider);
    try {
      const res = await base44.functions.invoke("investigationProviderConfig", { action: "test", provider });
      const body = res?.data ?? res;
      setTestResults((prev) => ({ ...prev, [provider]: body }));
      if (body?.ok) toast.success(`${provider} healthy (${body.ms}ms)`);
      else toast.error(`${provider} failed: ${body?.error || body?.status}`);
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [provider]: { ok: false, error: e?.message || String(e) } }));
      toast.error("Health test failed: " + (e?.message || e));
    } finally {
      setTesting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading provider configuration…
      </div>
    );
  }

  const active = config?.provider || "hermes";
  const providers = config?.providers || [];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-4xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center shrink-0">
          <Cpu className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">Investigation Providers</h1>
          <p className="text-sm text-gray-400">
            The default provider preselected when an administrator launches an investigation. The provider is
            confirmed per run in the investigation launch panel. Only administrators can change the default.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/[0.06] px-4 py-3 flex items-center gap-2 flex-wrap">
        <ShieldCheck className="w-4 h-4 text-cyan-300" />
        <span className="text-sm text-cyan-100">Active provider:</span>
        <Badge variant="outline" className="border-cyan-400/40 text-cyan-200">
          {config?.providers?.find((p) => p.id === active)?.label || active}
        </Badge>
        {config?.updated_at && (
          <span className="text-[11px] text-cyan-200/60 font-mono">
            saved {new Date(config.updated_at).toLocaleString()}
            {config?.updated_by ? ` by ${config.updated_by}` : ""}
          </span>
        )}
        {config?.configured === false && (
          <span className="text-[11px] text-amber-300/80">No saved selection yet — using the default.</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((p) => {
          const isActive = p.id === active;
          const result = testResults[p.id];
          return (
            <Card key={p.id} className={isActive ? "border-cyan-500/40 bg-cyan-500/[0.04]" : "border-white/10 bg-white/[0.02]"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white flex items-center justify-between gap-2">
                  {p.label}
                  {isActive && <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-300">active</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed">{p.description}</p>

                {result && (
                  <div className={`rounded-md border px-2 py-1.5 text-[11px] flex items-center gap-1.5 ${
                    result.ok ? "border-green-500/25 bg-green-500/[0.05] text-green-300" : "border-red-500/25 bg-red-500/[0.05] text-red-300"
                  }`}>
                    {result.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {result.ok ? `healthy (${result.ms}ms)` : (result.error || result.status || "failed")}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => save(p.id)}
                    disabled={saving || isActive}
                    className="bg-cyan-600 hover:bg-cyan-700 h-8"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                    {isActive ? "Default" : "Set as default"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => test(p.id)}
                    disabled={testing === p.id}
                    className="border-cyan-500/30 text-cyan-300 h-8"
                  >
                    {testing === p.id ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
                    Health test
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed">
        Exactly two providers exist. Hermes Agent runs the Hermes gateway lifecycle (create → start → poll).
        MIA Multi-Agent runs SafeNestT's multi-agent workflow server-side: planning, evidence, three specialist
        analysts, reality-check, deterministic risk scoring and an evidence-gated dossier. A run is executed only by
        the provider the administrator confirms — there is no fallback between them.
      </p>
    </div>
  );
}