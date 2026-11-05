import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { orgAccess } from "@/lib/orgAccess";
import { useAuth } from "@/lib/AuthContext";
import { getEffectiveRole, ORG_TYPE_LABELS } from "@/lib/organizationRoles";
import SafeNestTMark from "@/components/shared/SafeNestTMark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, CheckCircle2, Clock3, Loader2, Search, ShieldCheck, Users } from "lucide-react";

export default function OrganizationsDirectory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [requestingId, setRequestingId] = useState("");

  const { data: organizations = [], isLoading, error } = useQuery({
    queryKey: ["verified-organization-directory"],
    queryFn: async () => {
      const result = await orgAccess("listJoinable");
      return result?.organizations || [];
    },
    staleTime: 60000,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["my-organization-memberships", user?.id],
    queryFn: () => base44.entities.TenantMembership.filter({ user_id: user.id }),
    enabled: !!user?.id,
    initialData: [],
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((org) => [org.name, ORG_TYPE_LABELS[org.organization_type]].some((v) => v?.toLowerCase().includes(q)));
  }, [organizations, search]);

  const requestJoin = async (org) => {
    setRequestingId(org.id);
    try {
      await orgAccess("requestJoinOrg", { tenantId: org.id, fullName: user?.full_name || "" });
      await queryClient.invalidateQueries({ queryKey: ["my-organization-memberships", user?.id] });
      toast.success(`Your request to join ${org.name} was submitted. Access remains pending until approved.`);
    } catch (e) {
      toast.error(e?.message || "We couldn't submit your request. Please try again.");
    } finally {
      setRequestingId("");
    }
  };

  const membershipFor = (orgId) => memberships.find((m) => m.tenant_id === orgId && m.status !== "revoked");
  const role = getEffectiveRole(user);
  const isOrgUser = role !== "REGULAR_USER" && role !== "PLATFORM_ADMIN";

  return (
    <main className="min-h-full space-y-6 p-4 text-slate-100 sm:p-6 lg:p-8">
      <header className="flex items-start gap-4">
        <SafeNestTMark className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-cyan-300">SafeNestT network</p>
          <h1 className="mt-1 text-2xl font-semibold">Verified organizations</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Discover organizations currently open to membership requests. Organization records and case data remain private unless your membership is approved.</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by organization name or type…" className="border-white/10 bg-black/30 pl-9 text-white placeholder:text-slate-500" />
        </div>
        <div className="text-xs text-slate-400">{filtered.length} verified {filtered.length === 1 ? "organization" : "organizations"}</div>
      </div>

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-slate-400"><Loader2 className="h-5 w-5 animate-spin text-cyan-300" />Loading verified organizations…</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/[.06] p-4 text-sm text-rose-200">The organization directory couldn't be loaded. Please retry in a moment.</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/50 px-5 py-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-slate-500" />
          <h2 className="mt-3 font-medium">No matching organizations</h2>
          <p className="mt-1 text-sm text-slate-500">Try another search. Only verified organizations are listed here.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((org) => {
            const membership = membershipFor(org.id);
            const pending = membership && ["pending_verification", "pending_role_assignment", "invited"].includes(membership.status);
            const active = membership?.status === "active";
            return (
              <article key={org.id} className="rounded-xl border border-white/10 bg-slate-950/65 p-5 transition hover:border-cyan-300/25">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-300/[.07]"><Building2 className="h-5 w-5 text-cyan-200" /></div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-white">{org.name}</h2>
                    <p className="mt-1 text-xs text-slate-400">{ORG_TYPE_LABELS[org.organization_type] || "Organization"}</p>
                  </div>
                  <Badge variant="outline" className="border-emerald-400/25 text-emerald-300"><ShieldCheck className="mr-1 h-3 w-3" />Verified</Badge>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[.07] pt-4">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />Membership by approval</span>
                  {active ? <Badge className="bg-emerald-400/10 text-emerald-200"><CheckCircle2 className="mr-1 h-3 w-3" />Member</Badge>
                    : pending ? <Badge variant="outline" className="border-amber-300/25 text-amber-200"><Clock3 className="mr-1 h-3 w-3" />Request pending</Badge>
                    : isOrgUser ? <Badge variant="outline" className="border-white/10 text-slate-400">Organization account</Badge>
                    : <Button size="sm" disabled={!!requestingId} onClick={() => requestJoin(org)} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">{requestingId === org.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Request to join</Button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-slate-500">Only organization names and types are shown before approval. Internal cases, evidence, findings, members, and audit records are not exposed by this directory.</p>
    </main>
  );
}
