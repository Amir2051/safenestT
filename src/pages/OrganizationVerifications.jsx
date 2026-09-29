import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ShieldCheck, Loader2, AlertCircle, CheckCircle2, XCircle, ArrowLeft, UserCheck,
} from "lucide-react";
import {
  ORGANIZATION_TYPES, ORG_TYPE_LABELS, ROLE_LABELS, ORG_ROLE_OPTIONS,
} from "@/lib/organizationRoles";

/**
 * Platform-admin organization verification queue.
 * Lists pending organization requests (new-org Tenants) and pending member
 * verifications (join requests). Platform admin verifies the company/org,
 * then the org admin assigns the member's role.
 */
export default function OrganizationVerifications() {
  const { user, isLoadingAuth } = useAuth();
  const [tab, setTab] = useState("orgs");
  const [orgs, setOrgs] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const isPlatformAdmin = user?.role === "admin" || user?.is_admin;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pendingOrgs, pendingMems] = await Promise.all([
        base44.entities.Tenant.filter({ status: "pending_verification" }).catch(() => []),
        base44.entities.TenantMembership.filter({ status: { $in: ["pending_verification", "pending_role_assignment"] } }).catch(() => []),
      ]);
      setOrgs(pendingOrgs || []);
      setMembers(pendingMems || []);
    } catch (e) {
      setError(e?.message || "Unable to load verification queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!isLoadingAuth && isPlatformAdmin) load(); }, [isLoadingAuth, isPlatformAdmin]);

  if (isLoadingAuth) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;
  }
  if (!isPlatformAdmin) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="w-14 h-14 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7 text-red-300" />
        </div>
        <h1 className="text-lg font-bold text-slate-100">Platform Administrators Only</h1>
        <p className="text-slate-500 text-[13px] mt-2">Organization verification is restricted to SafeNestT platform administrators.</p>
      </div>
    );
  }

  const approveOrg = async (org) => {
    setBusy(org.id);
    try {
      // 1. Activate the organization.
      await base44.entities.Tenant.update(org.id, {
        status: "active",
        verified_by: user.id,
        verified_by_email: user.email,
        verified_at: new Date().toISOString(),
      });
      // 2. Activate the requester's membership and grant ORG_ADMIN.
      const mems = await base44.entities.TenantMembership.filter({ tenant_id: org.id, user_id: org.requested_by_user_id || org.owner_user_id });
      for (const m of mems) {
        await base44.entities.TenantMembership.update(m.id, {
          status: "active",
          organization_role: "ORG_ADMIN",
          verified_by: user.id,
          verified_at: new Date().toISOString(),
        });
      }
      // 3. Update the requester's user profile (platform admin can update users).
      const targetId = org.requested_by_user_id || org.owner_user_id;
      if (targetId) {
        await base44.entities.User.update(targetId, {
          account_status: "active",
          organization_role: "ORG_ADMIN",
          tenant_id: org.id,
        }).catch(() => {});
      }
      await load();
    } catch (e) {
      setError(e?.message || "Failed to approve organization.");
    } finally { setBusy(null); }
  };

  const rejectOrg = async (org) => {
    if (!confirm(`Reject organization request from "${org.name}"?`)) return;
    setBusy(org.id);
    try {
      await base44.entities.Tenant.update(org.id, {
        status: "suspended",
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
      });
      const mems = await base44.entities.TenantMembership.filter({ tenant_id: org.id, user_id: org.requested_by_user_id || org.owner_user_id });
      for (const m of mems) {
        await base44.entities.TenantMembership.update(m.id, { status: "revoked", rejected_by: user.id, rejected_at: new Date().toISOString() });
      }
      await load();
    } catch (e) {
      setError(e?.message || "Failed to reject organization.");
    } finally { setBusy(null); }
  };

  const approveMember = async (m) => {
    setBusy(m.id);
    try {
      // Company verified — advance to pending_role_assignment so the org admin assigns the role.
      await base44.entities.TenantMembership.update(m.id, {
        status: "pending_role_assignment",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to verify member.");
    } finally { setBusy(null); }
  };

  const rejectMember = async (m) => {
    if (!confirm(`Reject membership request from ${m.user_email}?`)) return;
    setBusy(m.id);
    try {
      await base44.entities.TenantMembership.update(m.id, {
        status: "revoked",
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
      });
      await load();
    } catch (e) {
      setError(e?.message || "Failed to reject member.");
    } finally { setBusy(null); }
  };

  const orgName = (tid) => orgs.find((o) => o.id === tid)?.name || members.find((x) => x.tenant_id === tid)?.requested_org_name || "—";

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link to="/OperationsDashboard" className="text-[12px] text-slate-500 hover:text-cyan-300 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-5 h-5 text-cyan-400" />
        <h1 className="text-xl font-bold text-slate-100">Organization Verifications</h1>
      </div>
      <p className="text-slate-500 text-[13px] mb-5">
        Verify companies and organizations before granting access. Approved new organizations make the requester an Organization Administrator; approved join requests advance to the org admin for role assignment.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <TabButton active={tab === "orgs"} onClick={() => setTab("orgs")}>New Organizations ({orgs.length})</TabButton>
        <TabButton active={tab === "members"} onClick={() => setTab("members")}>Join Requests ({members.filter((m) => m.status === "pending_verification").length})</TabButton>
      </div>

      {loading ? (
        <div className="p-8 flex items-center justify-center text-slate-500 text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…</div>
      ) : tab === "orgs" ? (
        orgs.length === 0 ? (
          <Empty text="No pending organization requests." />
        ) : (
          <div className="space-y-3">
            {orgs.map((o) => (
              <div key={o.id} className="rounded-md border border-slate-800 bg-[#06090d]/60 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      <p className="text-slate-100 font-semibold text-sm">{o.name}</p>
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-[10px]">{ORG_TYPE_LABELS[o.organization_type] || o.organization_type || "—"}</Badge>
                    </div>
                    <p className="text-[12px] text-slate-500">Requested by {o.owner_email || "—"} · {new Date(o.requested_at || o.created_date).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveOrg(o)} disabled={busy === o.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {busy === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectOrg(o)} disabled={busy === o.id} className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        members.filter((m) => m.status === "pending_verification").length === 0 ? (
          <Empty text="No pending join requests awaiting company verification." />
        ) : (
          <div className="space-y-3">
            {members.filter((m) => m.status === "pending_verification").map((m) => (
              <div key={m.id} className="rounded-md border border-slate-800 bg-[#06090d]/60 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCheck className="w-4 h-4 text-cyan-400" />
                      <p className="text-slate-100 font-semibold text-sm">{m.user_name || m.user_email}</p>
                      <Badge variant="outline" className="border-slate-700 text-slate-300 text-[10px]">Joining {orgName(m.tenant_id)}</Badge>
                    </div>
                    <p className="text-[12px] text-slate-500">{m.user_email} · requested {new Date(m.requested_at || m.created_date || Date.now()).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveMember(m)} disabled={busy === m.id} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      {busy === m.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Verify Company
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rejectMember(m)} disabled={busy === m.id} className="border-red-500/40 text-red-300 hover:bg-red-500/10">
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <p className="mt-4 text-[11px] font-mono text-slate-600 tracking-wider">
        PLATFORM-ADMIN VERIFICATION // ORG ADMIN ASSIGNS ROLE AFTER COMPANY VERIFICATION
      </p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-md text-[12px] font-medium border transition-colors ${active ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200" : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>{children}</button>
  );
}

function Empty({ text }) {
  return <div className="p-8 text-center text-slate-500 text-sm">{text}</div>;
}