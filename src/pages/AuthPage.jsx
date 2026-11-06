import React, { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { orgAccess } from "@/lib/orgAccess";
import SafeNestTMark from "@/components/shared/SafeNestTMark";
import { ShieldCheck, UserRound, Building2, BriefcaseBusiness, Loader2, ArrowLeft, ArrowRight, MailCheck } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "personal", label: "Personal / Regular User", description: "For personal protection, scam reports, and your own cases.", icon: UserRound },
  { value: "individual_investigator", label: "Individual Investigator", description: "For independent investigators and consultants using professional case workflows.", icon: BriefcaseBusiness },
  { value: "organization", label: "Organization / Team", description: "For investigation firms, security teams, companies, and institutions.", icon: Building2 },
];

export default function AuthPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialMode = location.pathname.toLowerCase().includes("signup") || location.pathname.toLowerCase().includes("register") ? "signup" : "login";
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [accountType, setAccountType] = useState(searchParams.get("accountType") || "personal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const finishAccountSetup = async (type) => {
    if (type === "personal") {
      await orgAccess("ensurePersonalTenant");
      window.location.replace("/Dashboard");
      return;
    }
    window.location.replace(`/OrganizationOnboarding?accountType=${encodeURIComponent(type)}`);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      window.location.replace("/");
    } catch (e) {
      setError(e?.message || "Unable to sign in. Check your email and password.");
    } finally { setBusy(false); }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (!fullName.trim()) { setError("Enter your full name."); setBusy(false); return; }
    if (password.length < 8) { setError("Use a password with at least 8 characters."); setBusy(false); return; }
    if (password !== confirmPassword) { setError("Your passwords do not match."); setBusy(false); return; }
    if (!ACCOUNT_TYPES.some((item) => item.value === accountType)) { setError("Choose an account type."); setBusy(false); return; }
    try {
      const referralCode = searchParams.get("ref");
      await base44.auth.register({
        email: email.trim().toLowerCase(),
        password,
        ...(referralCode ? { referral_code: referralCode } : {}),
      });
      setStep("verify");
      setNotice("We sent a verification code to your email. Enter it below to finish creating your account.");
    } catch (e) {
      setError(e?.message || "Unable to create your account. Please check your details and try again.");
    } finally { setBusy(false); }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await base44.auth.verifyOtp({ email: email.trim().toLowerCase(), otpCode: otp.trim() });
      await base44.auth.loginViaEmailPassword(email.trim().toLowerCase(), password);
      await base44.auth.updateMe({ full_name: fullName.trim() });
      await finishAccountSetup(accountType);
    } catch (e) {
      setError(e?.message || "The verification code could not be confirmed. Check it and try again.");
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      await base44.auth.resendOtp(email.trim().toLowerCase());
      setNotice("A new verification code has been sent.");
    } catch (e) { setError(e?.message || "Unable to resend the verification code."); }
    finally { setBusy(false); }
  };

  const continueWithGoogle = () => {
    const returnPath = mode === "signup"
      ? `/AccountTypeSetup?accountType=${encodeURIComponent(accountType)}`
      : "/";
    base44.auth.loginWithProvider("google", `${window.location.origin}${returnPath}`);
  };

  return (
    <main className="min-h-screen bg-[#05080b] text-slate-100 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 ic-grid-bg opacity-40 pointer-events-none" />
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-cyan-500/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div className="relative z-10 w-full max-w-xl">
        <div className="text-center mb-7">
          <SafeNestTMark className="h-12 w-12 mx-auto mb-3" />
          <p className="text-xs font-bold tracking-[.24em] text-cyan-300">SAFENESTT</p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-semibold">{step === "verify" ? "Verify your email" : mode === "signup" ? "Create your SafeNestT account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-slate-400">{step === "verify" ? "One quick verification step, then we'll set up the right workspace." : mode === "signup" ? "Choose how you'll use SafeNestT before creating your account." : "Sign in to continue to your workspace."}</p>
        </div>

        <section className="rounded-2xl border border-slate-700/70 bg-[#080d13]/95 p-5 sm:p-7 shadow-2xl">
          {error && <div role="alert" className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>}
          {notice && <div role="status" className="mb-4 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-3 text-sm text-cyan-100">{notice}</div>}

          {step === "verify" ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
                <MailCheck className="h-5 w-5 text-cyan-300" />
                <div className="min-w-0"><p className="text-sm font-medium">Verification sent</p><p className="text-xs text-slate-400 truncate">{email}</p></div>
              </div>
              <label className="block text-sm text-slate-300">Email verification code
                <input required value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" autoComplete="one-time-code" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white tracking-[.25em] outline-none focus:border-cyan-400" placeholder="Enter code" />
              </label>
              <button disabled={busy} className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Verifying…" : "Verify and create workspace"}</button>
              <button type="button" disabled={busy} onClick={resendCode} className="w-full py-2 text-sm text-cyan-300 hover:text-cyan-200">Resend code</button>
              <button type="button" onClick={() => { setStep("form"); setNotice(""); setError(""); }} className="w-full flex items-center justify-center gap-2 py-1 text-xs text-slate-500"><ArrowLeft className="h-3 w-3" /> Back to account details</button>
            </form>
          ) : mode === "signup" ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <label className="block text-sm text-slate-300">I am signing up as
                <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white outline-none focus:border-cyan-400">
                  {ACCOUNT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] p-3 text-xs text-slate-300">
                {ACCOUNT_TYPES.find((item) => item.value === accountType)?.description}
                {accountType === "personal" ? <p className="mt-2 text-cyan-200">Personal subscriptions: $24.99 or $49.99 per month.</p> : <p className="mt-2 text-cyan-200">Professional subscriptions start at $49 per month. Organization access is subject to verification.</p>}
              </div>
              <label className="block text-sm text-slate-300">Full name
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white outline-none focus:border-cyan-400" placeholder="Your full name" />
              </label>
              <label className="block text-sm text-slate-300">Email address
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white outline-none focus:border-cyan-400" placeholder="you@example.com" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-300">Password
                  <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white outline-none focus:border-cyan-400" placeholder="At least 8 characters" />
                </label>
                <label className="block text-sm text-slate-300">Confirm password
                  <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white outline-none focus:border-cyan-400" placeholder="Repeat password" />
                </label>
              </div>
              <button disabled={busy} className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Create account <ArrowRight className="h-4 w-4" /></button>
              <button type="button" onClick={continueWithGoogle} className="w-full rounded-lg border border-slate-700 py-3 text-sm text-slate-200 hover:border-cyan-500/40">Continue with Google</button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block text-sm text-slate-300">Email address
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white outline-none focus:border-cyan-400" placeholder="you@example.com" />
              </label>
              <label className="block text-sm text-slate-300">Password
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#05080b] px-3 py-3 text-white outline-none focus:border-cyan-400" placeholder="Your password" />
              </label>
              <button disabled={busy} className="w-full rounded-lg bg-gradient-to-r from-cyan-400 to-blue-500 py-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
              <button type="button" onClick={continueWithGoogle} className="w-full rounded-lg border border-slate-700 py-3 text-sm text-slate-200 hover:border-cyan-500/40">Continue with Google</button>
            </form>
          )}

          {step !== "verify" && <div className="mt-6 text-center text-sm text-slate-400">{mode === "signup" ? "Already have an account?" : "New to SafeNestT?"} <button type="button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setStep("form"); setError(""); setNotice(""); }} className="font-semibold text-cyan-300 hover:text-cyan-200">{mode === "signup" ? "Sign in" : "Create an account"}</button></div>}
        </section>
        <p className="mt-5 text-center text-xs text-slate-600"><ShieldCheck className="inline h-3.5 w-3.5 mr-1 text-cyan-500" /> Your account type controls your starting workspace and pricing view. Organization staff permissions are assigned separately after verification.</p>
        <div className="mt-4 text-center"><Link to="/" className="text-xs text-slate-500 hover:text-cyan-300">Return to SafeNestT</Link></div>
      </div>
    </main>
  );
}
