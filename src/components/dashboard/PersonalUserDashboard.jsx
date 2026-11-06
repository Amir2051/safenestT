import React from "react";
import { Link } from "react-router-dom";
import { Briefcase, ShieldAlert, Building2, Bot, ChevronRight, ShieldCheck } from "lucide-react";

const actions = [
  { title: "My Cases", description: "View your submitted reports and case updates.", path: "/MyCases", icon: Briefcase },
  { title: "Report a Scam", description: "Submit a fraud, scam, or cybercrime report.", path: "/ReportScam", icon: ShieldAlert },
  { title: "Organizations", description: "Discover verified organizations and request membership.", path: "/Organizations", icon: Building2 },
  { title: "MIA Assistant", description: "Get help navigating your personal security workspace.", path: "/MiaAssistant", icon: Bot },
];

export default function PersonalUserDashboard({ user }) {
  return (
    <main className="min-h-full space-y-6 p-4 text-slate-100 sm:p-6 lg:p-8">
      <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-slate-950 via-[#0b1722] to-[#071018] p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold tracking-wide text-cyan-200">PERSONAL WORKSPACE</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">REGULAR USER</span>
        </div>
        <h1 className="mt-5 text-2xl font-semibold sm:text-3xl">Welcome{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Your personal SafeNestT space for managing cases, reporting scams, following updates, and finding verified organizations.</p>
        <div className="mt-5 flex items-center gap-2 text-xs text-cyan-200"><ShieldCheck className="h-4 w-4" /> Your personal account is separate from organization workspaces.</div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Your workspace</h2>
        <p className="mt-1 text-sm text-slate-400">Choose an action to get started.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {actions.map(({ title, description, path, icon: Icon }) => (
            <Link key={path} to={path} className="group rounded-xl border border-white/10 bg-slate-950/60 p-5 transition hover:border-cyan-300/40 hover:bg-cyan-300/[.04]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10"><Icon className="h-5 w-5 text-cyan-200" /></span>
                <div className="min-w-0 flex-1"><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-sm leading-5 text-slate-400">{description}</p></div>
                <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <p className="text-xs text-slate-500">Organization cases and internal records remain restricted unless an organization approves your membership.</p>
    </main>
  );
}
