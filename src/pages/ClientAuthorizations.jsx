import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, Plus, FileText, Ban, CheckCircle2, UserCog, ScrollText } from "lucide-react";
import GrantAuthorizationDialog from "@/components/authorization/GrantAuthorizationDialog";
import FileOnBehalfDialog from "@/components/authorization/FileOnBehalfDialog";
import AuthorizationBadge from "@/components/authorization/AuthorizationBadge";

function isStaff(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const tr = user.data?.tenant_role || user.tenant_role;
  return ["owner", "admin", "investigator"].includes(tr);
}

const STATUS_FILTERS = ["ALL", "PENDING", "ACTIVE", "EXPIRED", "REVOKED"];

export default function ClientAuthorizations() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("authorizations");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [grantOpen, setGrantOpen] = useState(false);
  const [fileAuth, setFileAuth] = useState(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const staff = isStaff(user);

  const {
    data: authData,
    isLoading: authLoading,
    refetch: refetchAuth,
  } = useQuery({
    queryKey: ["client-authorizations", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("clientAuthorizationService", { action: "list" });
      return res?.data ?? res;
    },
    enabled: !!user,
  });

  const { data: filingsData, refetch: refetchFilings } = useQuery({
    queryKey: ["client-filings", user?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke("clientAuthorizationService", { action: "list_filings" });
      return res?.data ?? res;
    },
    enabled: !!user,
  });

  const authorizations = authData?.authorizations || [];
  const filings = filingsData?.filings || [];

  const refresh = () => { refetchAuth(); refetchFilings(); };

  const handleVerify = async (id) => {
    setBusy("verify-" + id);
    try {
      const res = await base44.functions.invoke("clientAuthorizationService", { action: "verify", authorization_id: id });
      const d = res?.data ?? res;
      if (!d?.success) throw new Error(d?.error);
      refresh();
    } catch (e) { alert(e.message); } finally { setBusy(""); }
  };

  const handleRevoke = async (id) => {
    if (!confirm("Revoke this authorization? The client will no longer be able to act under it.")) return;
    setBusy("revoke-" + id);
    try {
      const res = await base44.functions.invoke("clientAuthorizationService", { action: "revoke", authorization_id: id });
      const d = res?.data ?? res;
      if (!d?.success) throw new Error(d?.error);
      refresh();
    } catch (e) { alert(e.message); } finally { setBusy(""); }
  };

  const filtered = authorizations.filter((a) => statusFilter === "ALL" || a.status === statusFilter);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050a10] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Client Authorization</h1>
              <p className="text-xs text-gray-400">
                {staff ? "SafeNestT staff — verify, manage, and act on behalf of authorized clients." : "Manage SafeNestT's authority to act on your behalf."}
              </p>
            </div>
          </div>
          {!staff && (
            <Button onClick={() => setGrantOpen(true)} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              <Plus className="w-4 h-4" /> Grant Authorization
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-800">
          {[
            { key: "authorizations", label: "Authorizations", icon: ShieldCheck },
            { key: "filings", label: "Filings on Behalf", icon: FileText },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-cyan-400 text-cyan-400" : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Authorizations tab */}
        {tab === "authorizations" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    statusFilter === s ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" : "bg-[#0f1419] border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {authLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="bg-[#0f1419] border-gray-800">
                <CardContent className="py-12 text-center text-gray-500">
                  <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No authorizations {statusFilter !== "ALL" ? `with status ${statusFilter}` : "yet"}.</p>
                  {!staff && <p className="text-xs mt-2">Grant an authorization to let SafeNestT act on your behalf.</p>}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map((a) => (
                  <Card key={a.id} className="bg-[#0f1419] border-gray-800">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-white">{a.client_name || a.client_email || "Client"}</span>
                            <AuthorizationBadge authorization={a} compact />
                          </div>
                          <div className="text-xs text-gray-400">
                            Case: <span className="text-gray-300">{a.case_title || a.case_id}</span>
                            {a.case_number && ` · ${a.case_number}`}
                          </div>
                          <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                            <span>Scopes: {(a.scopes || []).join(", ")}</span>
                            <span>Granted: {a.granted_at ? new Date(a.granted_at).toLocaleDateString() : "—"}</span>
                            {a.expires_at && <span>Expires: {new Date(a.expires_at).toLocaleDateString()}</span>}
                            {a.verified_by_email && <span>Verified by: {a.verified_by_email}</span>}
                            {a.revoked_by_email && <span>Revoked by: {a.revoked_by_email}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {staff && a.status === "PENDING" && (
                            <Button size="sm" onClick={() => handleVerify(a.id)} disabled={busy === "verify-" + a.id}
                              className="bg-green-600 hover:bg-green-500 text-white">
                              {busy === "verify-" + a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              Verify & Activate
                            </Button>
                          )}
                          {staff && a.status === "ACTIVE" && (a.scopes || []).some((s) =>
                            ["FILE_REPORT", "FILE_LAW_ENFORCEMENT_REPORT", "SUBMIT_TO_REGULATOR", "SUBMIT_TO_PLATFORM"].includes(s)) && (
                            <Button size="sm" onClick={() => setFileAuth(a)} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                              <FileText className="w-3 h-3" /> File on Behalf
                            </Button>
                          )}
                          {(a.status === "ACTIVE" || a.status === "PENDING") && (staff || a.client_user_id === user.id) && (
                            <Button size="sm" variant="outline" onClick={() => handleRevoke(a.id)} disabled={busy === "revoke-" + a.id}
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                              {busy === "revoke-" + a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filings tab */}
        {tab === "filings" && (
          <div className="space-y-4">
            {filings.length === 0 ? (
              <Card className="bg-[#0f1419] border-gray-800">
                <CardContent className="py-12 text-center text-gray-500">
                  <ScrollText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No filings have been recorded on behalf of clients{staff ? "" : " for your cases"}.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filings.map((f) => (
                  <Card key={f.id} className="bg-[#0f1419] border-gray-800">
                    <CardContent className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-cyan-400" />
                          {f.filing_type || f.scope_used}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${f.status === "submitted" || f.status === "accepted" ? "text-green-400 bg-green-500/10" : "text-yellow-400 bg-yellow-500/10"}`}>
                          {f.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        On behalf of <span className="text-gray-300">{f.client_name || f.client_email}</span> · Case {f.case_title || f.case_id}
                      </div>
                      <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                        <span>Recipient: {f.recipient || "—"}</span>
                        <span>Ref: {f.submission_reference || "—"}</span>
                        <span>Filed by: {f.filed_by_email || f.filed_by_name}</span>
                        <span>{f.filed_at ? new Date(f.filed_at).toLocaleString() : ""}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <GrantAuthorizationDialog open={grantOpen} onClose={() => setGrantOpen(false)} onGranted={refresh} />
      <FileOnBehalfDialog open={!!fileAuth} onClose={() => setFileAuth(null)} authorization={fileAuth} onFiled={refresh} />
    </div>
  );
}