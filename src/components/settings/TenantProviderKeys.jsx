import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, CheckCircle2, AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";

/**
 * TenantProviderKeys — organization-scoped provisioning of the Shodan and
 * VirusTotal keys used by the investigation agents.
 *
 * The key is submitted once, verified against the live provider server-side,
 * and stored where no browser can read it back. This panel only ever shows
 * whether a key is configured, which source it resolves from, and a masked
 * last-four — never the key itself.
 */
const call = async (payload) => {
  const res = await base44.functions.invoke("tenantProviderCredentials", payload);
  return res?.data ?? res;
};

export default function TenantProviderKeys() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [drafts, setDrafts] = useState({});

  const load = async () => {
    try {
      const body = await call({ action: "status" });
      if (body?.ok === false) setError(body.error || "Could not load provider keys.");
      else { setData(body); setError(""); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Could not load provider keys.");
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (tag, payload, provider) => {
    setBusy(tag); setError("");
    try {
      const body = await call(payload);
      if (body?.ok === false) setError(body.error || "The request was refused.");
      else {
        if (provider) setDrafts((d) => ({ ...d, [provider]: "" }));
        await load();
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "The request failed.");
    } finally { setBusy(""); }
  };

  if (!data) {
    return (
      <p className="text-[12px] text-slate-500 flex items-center gap-2">
        {error ? <AlertTriangle className="w-4 h-4 text-amber-400" /> : <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        {error || "Checking provider credentials…"}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-slate-500">
        Each organization can use its own Shodan and VirusTotal keys. A key is verified against the live provider before it is saved, stored server-side where no browser can read it back, and used by this organization's investigations before the platform key.
      </p>

      {error && (
        <div className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2.5">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {data.providers.map((p) => (
        <ProviderRow
          key={p.provider}
          provider={p}
          canManage={data.can_manage}
          busy={busy}
          draft={drafts[p.provider] || ""}
          onDraft={(v) => setDrafts((d) => ({ ...d, [p.provider]: v }))}
          onSave={() => run(`save:${p.provider}`, { action: "set", provider: p.provider, apiKey: drafts[p.provider] || "" }, p.provider)}
          onVerify={() => run(`verify:${p.provider}`, { action: "verify", provider: p.provider })}
          onRemove={() => run(`remove:${p.provider}`, { action: "remove", provider: p.provider })}
        />
      ))}

      <p className="text-[11px] text-slate-600 font-mono tracking-wider">
        KEYS ARE WRITE-ONLY FROM THE BROWSER // STORED SERVER-SIDE // NEVER DISPLAYED
      </p>
    </div>
  );
}

function ProviderRow({ provider: p, canManage, busy, draft, onDraft, onSave, onVerify, onRemove }) {
  const isTenant = p.source === "tenant";
  const saving = busy === `save:${p.provider}`;
  const verifying = busy === `verify:${p.provider}`;
  const removing = busy === `remove:${p.provider}`;

  return (
    <div className="rounded-md border border-slate-800 bg-[#0a0e13]/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <KeyRound className={`w-4 h-4 ${p.configured ? "text-emerald-400" : "text-slate-500"}`} />
        <p className="text-[13px] font-medium text-slate-100">{p.label}</p>
        <Badge
          variant="outline"
          className={`text-[10px] ${p.configured ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-300"}`}
        >
          {p.configured ? (isTenant ? "Configured — organization key" : "Configured — platform key") : "Not configured"}
        </Badge>
        {p.status === "invalid" && (
          <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-300">Key rejected</Badge>
        )}
        {isTenant && p.masked && <span className="text-[11px] font-mono text-slate-500">{p.masked}</span>}
      </div>

      <p className="text-[11px] text-slate-500 mt-1">{p.note}</p>
      <p className="text-[11px] text-slate-600 mt-0.5">Target: {p.target_hint}</p>
      {isTenant && p.verified_at && (
        <p className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          Verified {new Date(p.verified_at).toLocaleString()}{p.verified_by ? ` by ${p.verified_by}` : ""}
        </p>
      )}
      {p.last_error && <p className="text-[11px] text-red-300 mt-1">{p.last_error}</p>}

      {canManage && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            type="password"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder={isTenant ? `Replace key (${p.masked})` : `Paste ${p.label} API key`}
            className="h-8 max-w-xs bg-[#0a0e13] border-slate-700/60 text-[12px] font-mono"
          />
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving || draft.trim().length < 8}
            className="h-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[12px]"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
            Save &amp; verify
          </Button>
          {isTenant && (
            <>
              <Button size="sm" variant="outline" onClick={onVerify} disabled={verifying}
                className="h-8 border-slate-700 text-slate-300 text-[12px]">
                {verifying ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                Re-verify
              </Button>
              <Button size="sm" variant="outline" onClick={onRemove} disabled={removing}
                className="h-8 border-red-500/30 text-red-300 text-[12px]">
                {removing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                Remove
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}