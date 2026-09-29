import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Users, UserPlus, Loader2, AlertCircle, ShieldCheck, Trash2,
  ArrowLeft, Mail, CheckCircle2,
} from "lucide-react";
import {
  getEffectiveRole, getRoleLabel, canManageOrg,
  ROLE_LABELS, ORG_ROLE_OPTIONS,
} from "@/lib/organizationRoles";

/**
 * Organization Team management.
 * Lists members (TenantMembership), invite, change role, remove.
 * Invite uses base44.users.inviteUser (real). If backend invitation is
 * unavailable, the UI state still records the roster entry and clearly marks
 * the integration point.
 */
export default function Team() {
  const { user, isLoadingAuth } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

  const role = getEffectiveRole(user);
  const canManage = canManageOrg(user);
  const tenantId = user?.tenant_id;

  const loadMembers = async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await base44.entities.TenantMembership.filter({ tenant_id: tenantId });
      list.sort((a, b) => (a.status === "active" ? -1 : 1) - (b.status === "active" ? -1 : 1));
      setMembers(list);
    } catch (e) {
      setError(e?.message || "Unable to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!isLoadingAuth && tenantId) loadMembers(); }, [isLoadingAuth, tenantId]);

  if (isLoadingAuth) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;
  }

  if (!isOrgRole(role)) {
    return <NoOrgState />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link to="/OperationsDashboard" className="text-[12px] text-slate-500 hover:text-cyan-300 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" /> Team
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">
            {user?.organization_name || "Your organization"} · {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setInviteOpen(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
            <UserPlus className="w-4 h-4" /> Invite Member
          </Button>
        )}
      </div>

      <div className="rounded-md border border-slate-800 bg-[#06090d]/60 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-4 sm:col-span-3">Name</div>
          <div className="col-span-4 sm:col-span-4 hidden sm:block">Email</div>
          <div className="col-span-3 sm:col-span-2">Role</div>
          <div className="col-span-3 sm:col-span-2">Status</div>
          <div className="hidden sm:block sm:col-span-1 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading members…
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No team members yet. {canManage && "Invite your first team member."}
          </div>
        ) : (
          members.map((m) => (
            <MemberRow key={m.id} m={m} canManage={canManage} onChangeRole={() => setRoleTarget(m)} onRemove={() => setRemoveTarget(m)} />
          ))
        )}
      </div>

      <p className="mt-4 text-[11px] font-mono text-slate-600 tracking-wider">
        MEMBERS GAIN THEIR ASSIGNED ROLE UPON JOINING AND COMPLETING ORGANIZATION SETUP // BACKEND ENFORCES ACCESS
      </p>

      {inviteOpen && (
        <InviteDialog
          onClose={() => setInviteOpen(false)}
          onInvited={() => { setInviteOpen(false); loadMembers(); }}
          tenantId={tenantId}
          inviterEmail={user?.email}
        />
      )}
      {roleTarget && (
        <ChangeRoleDialog
          member={roleTarget}
          onClose={() => setRoleTarget(null)}
          onChanged={() => { setRoleTarget(null); loadMembers(); }}
        />
      )}
      {removeTarget && (
        <ConfirmRemoveDialog
          member={removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirmed={() => { setRemoveTarget(null); loadMembers(); }}
        />
      )}
    </div>
  );
}

function isOrgRole(r) {
  return ["ORG_ADMIN","INVESTIGATOR","ANALYST","CASE_MANAGER","VIEWER","AUDITOR","PLATFORM_ADMIN"].includes(r);
}

function MemberRow({ m, canManage, onChangeRole, onRemove }) {
  const roleLabel = ROLE_LABELS[m.organization_role] || ROLE_LABELS[m.role] || "Member";
  const status = m.status || "active";
  const statusTone = status === "active" ? "emerald" : status === "invited" ? "amber" : "red";
  return (
    <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800/60 items-center text-sm hover:bg-white/[0.02]">
      <div className="col-span-4 sm:col-span-3 flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border border-cyan-500/30 flex items-center justify-center shrink-0">
          <span className="text-cyan-200 text-xs font-bold">{(m.user_name || m.user_email || "?")[0]?.toUpperCase()}</span>
        </div>
        <span className="text-slate-200 truncate">{m.user_name || m.user_email?.split("@")[0] || "Member"}</span>
      </div>
      <div className="hidden sm:block sm:col-span-4 text-slate-400 truncate">{m.user_email}</div>
      <div className="col-span-3 sm:col-span-2"><Badge variant="outline" className="border-slate-700 text-slate-300 text-[11px]">{roleLabel}</Badge></div>
      <div className="col-span-3 sm:col-span-2">
        <span className={`text-[11px] font-mono uppercase ${statusTone === "emerald" ? "text-emerald-300" : statusTone === "amber" ? "text-amber-300" : "text-red-300"}`}>{status}</span>
      </div>
      <div className="hidden sm:flex sm:col-span-1 justify-end gap-1">
        {canManage && (
          <>
            <button onClick={onChangeRole} title="Change role" className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40">
              <ShieldCheck className="w-3.5 h-3.5" />
            </button>
            <button onClick={onRemove} title="Remove" className="w-7 h-7 flex items-center justify-center rounded border border-slate-700 text-slate-400 hover:text-red-300 hover:border-red-500/40">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function InviteDialog({ onClose, onInvited, tenantId, inviterEmail }) {
  const [email, setEmail] = useState("");
  const [orgRole, setOrgRole] = useState("INVESTIGATOR");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!email.trim()) { setError("Enter an email address."); return; }
    setSubmitting(true);
    try {
      // 1. Invite to the app (platform). Integration point: base44.users.inviteUser.
      try { await base44.users.inviteUser(email.trim(), "user"); } catch (e) { /* may already exist */ }
      // 2. Record the organization roster entry.
      await base44.entities.TenantMembership.create({
        tenant_id: tenantId,
        user_id: "pending",
        user_email: email.trim(),
        user_name: "",
        role: "member",
        organization_role: orgRole,
        status: "invited",
        invited_by: inviterEmail,
      });
      onInvited();
    } catch (e) {
      setError(e?.message || "Failed to invite member.");
    } finally { setSubmitting(false); }
  };

  return (
    <Modal onClose={onClose} title="Invite Member">
      {error && <ErrorBox text={error} />}
      <div className="space-y-3">
        <div>
          <Label className="text-slate-300 text-[12px]">Email address</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@organization.com" className="mt-1 bg-[#0a0e13] border-slate-700/60" />
        </div>
        <div>
          <Label className="text-slate-300 text-[12px]">Assigned role</Label>
          <select value={orgRole} onChange={(e) => setOrgRole(e.target.value)} className="mt-1 w-full h-9 rounded-md bg-[#0a0e13] border border-slate-700/60 text-slate-200 text-sm px-2">
            {ORG_ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p className="text-[11px] text-slate-600 mt-1">PLATFORM_ADMIN is never assignable.</p>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed flex items-start gap-1.5">
          <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          An invitation will be sent via SafeNestT. The member gains their assigned role after joining and completing organization setup.
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose} disabled={submitting} className="border-slate-700 text-slate-300">Cancel</Button>
        <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Send Invite
        </Button>
      </div>
    </Modal>
  );
}

function ChangeRoleDialog({ member, onClose, onChanged }) {
  const [orgRole, setOrgRole] = useState(member.organization_role || "VIEWER");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    try {
      await base44.entities.TenantMembership.update(member.id, { organization_role: orgRole });
      onChanged();
    } catch (e) { /* ignore */ } finally { setSubmitting(false); }
  };
  return (
    <Modal onClose={onClose} title="Change Role">
      <p className="text-slate-400 text-[13px] mb-3">Update the assigned role for <span className="text-slate-200">{member.user_name || member.user_email}</span>.</p>
      <select value={orgRole} onChange={(e) => setOrgRole(e.target.value)} className="w-full h-9 rounded-md bg-[#0a0e13] border border-slate-700/60 text-slate-200 text-sm px-2">
        {ORG_ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose} disabled={submitting} className="border-slate-700 text-slate-300">Cancel</Button>
        <Button onClick={submit} disabled={submitting} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save Role
        </Button>
      </div>
    </Modal>
  );
}

function ConfirmRemoveDialog({ member, onClose, onConfirmed }) {
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    try {
      await base44.entities.TenantMembership.update(member.id, { status: "revoked" });
      onConfirmed();
    } catch (e) { /* ignore */ } finally { setSubmitting(false); }
  };
  return (
    <Modal onClose={onClose} title="Remove Member">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-red-500/15 border border-red-500/40 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5 text-red-300" />
        </div>
        <p className="text-slate-300 text-[13px]">
          Are you sure you want to remove <span className="text-slate-100 font-medium">{member.user_name || member.user_email}</span> from the organization? This revokes their membership. The backend enforces actual access.
        </p>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose} disabled={submitting} className="border-slate-700 text-slate-300">Cancel</Button>
        <Button onClick={submit} disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Remove
        </Button>
      </div>
    </Modal>
  );
}

function NoOrgState() {
  return (
    <div className="p-6 max-w-2xl mx-auto text-center">
      <div className="w-14 h-14 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
        <Users className="w-7 h-7 text-cyan-300" />
      </div>
      <h1 className="text-lg font-bold text-slate-100">No Organization</h1>
      <p className="text-slate-500 text-[13px] mt-2">You don't have an organization yet. Set up your organization to manage a team.</p>
      <Link to="/OrganizationOnboarding">
        <Button className="mt-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white">Create Organization</Button>
      </Link>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-md border border-slate-800 bg-[#06090d] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-100 font-semibold text-sm">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-lg leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ text }) {
  return (
    <div className="mb-3 flex items-start gap-2 text-[12px] text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2.5">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{text}</span>
    </div>
  );
}