import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ShieldCheck, Loader2, CheckCircle2, ArrowLeft,
  Users, Phone, MapPin, AlertCircle,
} from "lucide-react";
import {
  getEffectiveRole, canManageOrg, ORGANIZATION_TYPES, ORG_TYPE_LABELS,
} from "@/lib/organizationRoles";

export default function OrganizationSettings() {
  const { user, isLoadingAuth } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [phone, setPhone] = useState("");
  const [addr, setAddr] = useState({ line1: "", line2: "", city: "", state: "", postal_code: "", country: "" });
  const [twoFactor, setTwoFactor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const role = getEffectiveRole(user);
  const canManage = canManageOrg(user);

  useEffect(() => {
    if (!user) return;
    setOrgName(user.organization_name || "");
    setOrgType(user.organization_type || "");
    setPhone(user.organization_contact_phone || "");
    setAddr(user.organization_contact_address || { line1: "", line2: "", city: "", state: "", postal_code: "", country: "" });
    setTwoFactor(!!user.two_factor_enabled);
  }, [user]);

  if (isLoadingAuth) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;
  }

  if (!["ORG_ADMIN","INVESTIGATOR","ANALYST","CASE_MANAGER","VIEWER","AUDITOR","PLATFORM_ADMIN"].includes(role)) {
    return <NoOrgState />;
  }

  const save = async () => {
    setError(""); setSaved(false); setSaving(true);
    try {
      await base44.auth.updateMe({
        organization_name: orgName.trim(),
        organization_type: orgType,
        organization_contact_phone: phone,
        organization_contact_address: addr,
      });
      // Sync the tenant record name if the user owns it.
      if (user.tenant_id) {
        try { await base44.entities.Tenant.update(user.tenant_id, { name: orgName.trim() }); } catch (e) { /* ignore */ }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e?.message || "Failed to save organization settings.");
    } finally { setSaving(false); }
  };

  const saveSecurity = async () => {
    try { await base44.auth.updateMe({ two_factor_enabled: twoFactor }); } catch (e) { /* ignore */ }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link to="/OperationsDashboard" className="text-[12px] text-slate-500 hover:text-cyan-300 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </div>
      <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
        <Building2 className="w-5 h-5 text-cyan-400" /> Organization Settings
      </h1>
      <p className="text-slate-500 text-[13px] mb-6">
        {user?.organization_name || "Your organization"} · <span className="text-slate-400">{ORG_TYPE_LABELS[user?.organization_type] || "—"}</span>
      </p>

      {!canManage && (
        <div className="mb-4 flex items-center gap-2 text-[12px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5">
          <AlertCircle className="w-4 h-4" /> You have read-only access to organization settings.
        </div>
      )}

      {/* Organization Profile */}
      <Section title="Organization Profile" icon={Building2}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-slate-300 text-[12px]">Organization name</Label>
            <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={!canManage} className="mt-1 bg-[#0a0e13] border-slate-700/60" />
          </div>
          <div>
            <Label className="text-slate-300 text-[12px]">Organization type</Label>
            <select value={orgType} onChange={(e) => setOrgType(e.target.value)} disabled={!canManage} className="mt-1 w-full h-9 rounded-md bg-[#0a0e13] border border-slate-700/60 text-slate-200 text-sm px-2 disabled:opacity-60">
              <option value="">Select…</option>
              {ORGANIZATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* Contact Information */}
      <Section title="Contact Information" icon={Phone}>
        <div className="space-y-3">
          <div>
            <Label className="text-slate-300 text-[12px]">Primary phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canManage} placeholder="+1 (555) 000-0000" className="mt-1 bg-[#0a0e13] border-slate-700/60" />
          </div>
          <div>
            <Label className="text-slate-300 text-[12px] flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Address</Label>
            <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input value={addr.line1 || ""} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} disabled={!canManage} placeholder="Street address" className="bg-[#0a0e13] border-slate-700/60 sm:col-span-2" />
              <Input value={addr.line2 || ""} onChange={(e) => setAddr({ ...addr, line2: e.target.value })} disabled={!canManage} placeholder="Suite / unit" className="bg-[#0a0e13] border-slate-700/60 sm:col-span-2" />
              <Input value={addr.city || ""} onChange={(e) => setAddr({ ...addr, city: e.target.value })} disabled={!canManage} placeholder="City" className="bg-[#0a0e13] border-slate-700/60" />
              <Input value={addr.state || ""} onChange={(e) => setAddr({ ...addr, state: e.target.value })} disabled={!canManage} placeholder="State / province" className="bg-[#0a0e13] border-slate-700/60" />
              <Input value={addr.postal_code || ""} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} disabled={!canManage} placeholder="Postal code" className="bg-[#0a0e13] border-slate-700/60" />
              <Input value={addr.country || ""} onChange={(e) => setAddr({ ...addr, country: e.target.value })} disabled={!canManage} placeholder="Country" className="bg-[#0a0e13] border-slate-700/60" />
            </div>
          </div>
        </div>
      </Section>

      {error && <div className="mb-3 flex items-start gap-2 text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2.5"><AlertCircle className="w-4 h-4 mt-0.5" /><span>{error}</span></div>}

      {canManage && (
        <div className="flex justify-end gap-2 mb-6">
          {saved && <span className="text-emerald-300 text-[12px] flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
          <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save Profile
          </Button>
        </div>
      )}

      {/* Security Settings */}
      <Section title="Security Settings" icon={ShieldCheck}>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-slate-200 text-[13px] font-medium">Two-factor authentication</p>
            <p className="text-slate-500 text-[12px] mt-0.5">Require a second factor at sign-in (managed per account).</p>
          </div>
          <button
            onClick={() => { if (!canManage) return; setTwoFactor((v) => !v); setTimeout(saveSecurity, 100); }}
            disabled={!canManage}
            className={`w-11 h-6 rounded-full border transition-colors relative ${twoFactor ? "bg-cyan-500/30 border-cyan-500/50" : "bg-slate-800 border-slate-700"} ${!canManage ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${twoFactor ? "left-5 bg-cyan-400" : "left-0.5 bg-slate-500"}`} />
          </button>
        </div>
      </Section>

      {/* Team Management */}
      <Section title="Team Management" icon={Users}>
        <div className="flex items-center justify-between py-1">
          <p className="text-slate-400 text-[13px]">Manage members, roles, and invitations.</p>
          <Link to="/Team"><Button variant="outline" className="border-slate-700 text-slate-300">Open Team</Button></Link>
        </div>
      </Section>

      <p className="mt-6 text-[11px] font-mono text-slate-600 tracking-wider">
        ORGANIZATION CONTEXT IS ENFORCED SERVER-SIDE // NO SECRETS OR TOKENS ARE DISPLAYED
      </p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="mb-5 rounded-md border border-slate-800 bg-[#06090d]/60 p-4">
      <h2 className="text-slate-100 font-semibold text-[13px] flex items-center gap-2 mb-3"><Icon className="w-4 h-4 text-cyan-400" /> {title}</h2>
      {children}
    </div>
  );
}

function NoOrgState() {
  return (
    <div className="p-6 max-w-2xl mx-auto text-center">
      <div className="w-14 h-14 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-7 h-7 text-cyan-300" />
      </div>
      <h1 className="text-lg font-bold text-slate-100">No Organization</h1>
      <p className="text-slate-500 text-[13px] mt-2">Set up your organization to configure settings.</p>
      <Link to="/OrganizationOnboarding"><Button className="mt-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white">Create Organization</Button></Link>
    </div>
  );
}