import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { orgAccess } from "@/lib/orgAccess";
import SafeNestTMark from "@/components/shared/SafeNestTMark";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, CheckCircle2, Loader2, ShieldCheck, UserRound } from "lucide-react";

export default function AccountTypeSetup() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && user?.tenant_id && !user?.organization_name) {
      navigate("/Dashboard", { replace: true });
    }
    if (!isLoadingAuth && user?.organization_name) {
      navigate("/OrganizationOnboarding", { replace: true });
    }
  }, [isLoadingAuth, user, navigate]);

  const createPersonalWorkspace = async () => {
    setCreating(true);
    setError("");
    try {
      await orgAccess("ensurePersonalTenant");
      window.location.replace("/Dashboard");
    } catch (e) {
      setError(e?.message || "We couldn't create your personal workspace. Please try again.");
      setCreating(false);
    }
  };

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-[#05080b]"><Loader2 className="h-6 w-6 animate-spin text-cyan-300" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#05080b] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <SafeNestTMark className="h-14 w-14 mx-auto mb-5" />
          <h1 className="text-2xl font-semibold">Sign in to SafeNestT</h1>
          <p className="mt-2 text-sm text-slate-400">Choose your workspace after signing in.</p>
          <Button className="mt-6 bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={navigateToLogin}>Continue to sign in</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05080b] px-4 py-10 text-slate-100 sm:px-6">
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.08) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/[0.08] blur-[100px]" />
      <div className="relative mx-auto max-w-4xl">
        <header className="mb-12 flex items-center justify-center gap-3">
          <SafeNestTMark className="h-12 w-12" />
          <div><div className="text-sm font-bold tracking-[.22em]">SAFENESTT</div><div className="text-[10px] tracking-[.18em] text-cyan-300">SECURE INVESTIGATION WORKSPACE</div></div>
        </header>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">Welcome{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">How will you use SafeNestT?</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">Choose the workspace that matches how you work. You can use a private personal workspace or request access to an organization.</p>
        </div>

        {error && <div role="alert" className="mx-auto mt-6 max-w-xl rounded-lg border border-rose-400/25 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}

        <div className="mt-9 grid gap-4 md:grid-cols-2">
          <section className="flex flex-col rounded-2xl border border-cyan-300/25 bg-slate-950/75 p-6 shadow-[0_18px_55px_rgba(0,0,0,.25)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10"><UserRound className="h-6 w-6 text-cyan-200" /></div>
            <h2 className="mt-5 text-xl font-semibold">Personal workspace</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">For individuals managing their own cases, reports, security concerns, and investigations. Your workspace is private to your account.</p>
            <ul className="mt-5 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> Personal dashboard and case list</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> Browse verified organizations</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> Request organization membership</li>
            </ul>
            <Button onClick={createPersonalWorkspace} disabled={creating} className="mt-7 w-full bg-gradient-to-r from-cyan-300 to-sky-400 font-semibold text-slate-950 hover:from-cyan-200 hover:to-sky-300">
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />} Create personal workspace
            </Button>
          </section>

          <section className="flex flex-col rounded-2xl border border-violet-300/20 bg-slate-950/75 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-300/10"><Building2 className="h-6 w-6 text-violet-200" /></div>
            <h2 className="mt-5 text-xl font-semibold">Organization workspace</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">For investigation firms, security teams, enterprises, and institutions that need shared cases, team roles, and organization-level operations.</p>
            <ul className="mt-5 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-300" /> Join an existing verified organization</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-300" /> Request a new organization</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-violet-300" /> Organization roles and team dashboard</li>
            </ul>
            <Button variant="outline" onClick={() => navigate("/OrganizationOnboarding")} className="mt-7 w-full border-violet-300/30 bg-violet-300/[0.06] text-violet-100 hover:bg-violet-300/10">
              Continue to organization setup <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </section>
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] text-slate-500"><ShieldCheck className="h-4 w-4 text-cyan-400" /> Organization access remains subject to verification and membership approval.</p>
      </div>
    </main>
  );
}
