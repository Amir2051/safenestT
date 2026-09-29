import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Building2, ArrowRight, ArrowLeft, CheckCircle2,
  Loader2, Lock, AlertCircle,
} from "lucide-react";
import { ORGANIZATION_TYPES } from "@/lib/organizationRoles";

/**
 * Organization onboarding — the institutional "signup" flow.
 *
 * The platform (Base44 auth) owns account creation (email + password). This
 * flow runs AFTER the user authenticates and collects the organization context
 * (name, type) plus the fixed Organization Administrator role for the first
 * account. It persists organization info via base44.auth.updateMe and creates
 * a Tenant + TenantMembership. It does NOT create auth credentials or grant
 * backend permissions.
 */
export default function OrganizationOnboarding() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoadingAuth) return;
    if (user) {
      setFullName(user.full_name || "");
      if (user.organization_role && user.organization_name) {
        navigate("/OperationsDashboard", { replace: true });
      }
    }
  }, [isLoadingAuth, user, navigate]);

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080b]">
        <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <EntryScreen onSignIn={() => navigateToLogin()} />;
  }

  const canContinueStep1 = true; // account already created via platform auth
  const canContinueStep2 = !!orgName.trim() && !!orgType;

  const submit = async () => {
    setError("");
    if (!canContinueStep2) {
      setError("Please enter your organization name and select an organization type.");
      return;
    }
    setSubmitting(true);
    try {
      await base44.auth.updateMe({
        organization_name: orgName.trim(),
        organization_type: orgType,
        organization_role: "ORG_ADMIN",
      });

      // Create the organization (Tenant) and the owner membership.
      try {
        const tenant = await base44.entities.Tenant.create({
          name: orgName.trim(),
          owner_user_id: user.id,
          owner_email: user.email,
          plan: "team",
          status: "active",
          members: [user.id],
        });
        if (tenant?.id) {
          await base44.auth.updateMe({ tenant_id: tenant.id, tenant_role: "owner" });
          await base44.entities.TenantMembership.create({
            tenant_id: tenant.id,
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name || fullName.trim(),
            role: "owner",
            organization_role: "ORG_ADMIN",
            status: "active",
            joined_at: new Date().toISOString(),
          });
        }
      } catch (tenantErr) {
        // Organization record creation may be constrained by RLS. The user's
        // organization context is already persisted on their profile above.
        console.warn("Tenant creation skipped:", tenantErr);
      }

      navigate("/OperationsDashboard", { replace: true });
    } catch (e) {
      setError(e?.message || "Failed to set up your organization. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#05080b] text-slate-200 relative overflow-hidden font-sans">
      <div className="absolute inset-0 ic-grid-bg pointer-events-none opacity-50" aria-hidden="true" />
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-cyan-500/[0.06] rounded-full blur-[120px] pointer-events-none" />

      {/* Top bar */}
      <header className="relative z-10 px-4 sm:px-6 h-12 flex items-center gap-2 border-b border-slate-800/60 bg-[#06090d]/60 backdrop-blur-sm">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[12px] font-bold tracking-wider text-slate-100 leading-none">SAFENESTT</p>
          <p className="text-[9px] text-cyan-500/80 tracking-wider mt-0.5">ORGANIZATION SETUP</p>
        </div>
      </header>

      <div className="relative z-10 px-4 sm:px-6 py-10 max-w-2xl mx-auto">
        <Stepper step={step} />

        <div className="mt-8 rounded-md border border-slate-800/60 bg-[#06090d]/70 p-6 sm:p-8">
          {error && (
            <div className="mb-5 flex items-start gap-2 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 && (
            <Step1
              fullName={fullName}
              setFullName={setFullName}
              email={user?.email}
              canContinue={canContinueStep1}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2
              orgName={orgName}
              setOrgName={setOrgName}
              orgType={orgType}
              setOrgType={setOrgType}
              canContinue={canContinueStep2}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3
              orgName={orgName}
              orgType={orgType}
              submitting={submitting}
              onBack={() => setStep(2)}
              onSubmit={submit}
            />
          )}
        </div>

        <p className="mt-6 text-center text-[11px] font-mono text-slate-600 tracking-wider">
          ORGANIZATION CONTEXT IS ENFORCED SERVER-SIDE // UI ROLES ARE NOT A SECURITY BOUNDARY
        </p>
      </div>
    </div>
  );
}

function EntryScreen({ onSignIn }) {
  return (
    <div className="min-h-screen bg-[#05080b] text-slate-200 relative overflow-hidden font-sans flex items-center justify-center px-4">
      <div className="absolute inset-0 ic-grid-bg pointer-events-none opacity-50" />
      <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-cyan-500/[0.06] rounded-full blur-[120px] pointer-events-none" />
      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-6 border border-cyan-500/40">
          <ShieldCheck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Create an Organization Account</h1>
        <p className="mt-3 text-slate-400 text-[14px] leading-relaxed">
          SafeNestT is a Security Operations &amp; Investigation Services platform. Sign in with your
          work email to begin organization setup. Account credentials are managed by SafeNestT
          authentication.
        </p>
        <Button
          onClick={onSignIn}
          className="mt-6 h-11 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold"
        >
          <Lock className="w-4 h-4" /> Continue to Sign In
        </Button>
        <p className="mt-5 text-[11px] font-mono text-slate-600 tracking-wider">
          EMAIL + PASSWORD // GOOGLE AUTHENTICATION
        </p>
      </div>
    </div>
  );
}

function Stepper({ step }) {
  const steps = ["Account", "Organization", "Role"];
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border ${
              active ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
              : done ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
              : "bg-slate-800/50 border-slate-700 text-slate-500"
            }`}>
              {done ? <CheckCircle2 className="w-4 h-4" /> : n}
            </div>
            <span className={`text-[12px] font-medium ${active ? "text-slate-100" : "text-slate-500"}`}>{label}</span>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-slate-800 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

function Step1({ fullName, setFullName, email, canContinue, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Account</h2>
        <p className="text-slate-500 text-[13px] mt-1">
          Your account was created through SafeNestT authentication. Confirm your details below.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-slate-300 text-[12px]">Full name</Label>
          <Input
            value={fullName}
            readOnly
            placeholder="Managed by your platform account"
            className="mt-1 bg-[#0a0e13] border-slate-700/60 text-slate-400"
          />
        </div>
        <div>
          <Label className="text-slate-300 text-[12px]">Work / business email</Label>
          <Input
            value={email || ""}
            readOnly
            className="mt-1 bg-[#0a0e13] border-slate-700/60 text-slate-400"
          />
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Password and authentication credentials are managed by SafeNestT. Use the platform password
          reset flow to change them.
        </p>
      </div>
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!canContinue} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function Step2({ orgName, setOrgName, orgType, setOrgType, canContinue, onBack, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Organization</h2>
        <p className="text-slate-500 text-[13px] mt-1">
          Tell us about your organization. This identifies your tenant-isolated workspace.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <Label className="text-slate-300 text-[12px]">Organization name</Label>
          <Input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. Acme Financial Investigations"
            className="mt-1 bg-[#0a0e13] border-slate-700/60 text-slate-100"
          />
        </div>
        <div>
          <Label className="text-slate-300 text-[12px]">Organization type</Label>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ORGANIZATION_TYPES.map((t) => {
              const selected = orgType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setOrgType(t.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-left text-[13px] transition-colors ${
                    selected
                      ? "border-cyan-500/60 bg-cyan-500/10 text-slate-100"
                      : "border-slate-700/60 bg-[#0a0e13] text-slate-400 hover:border-cyan-500/30 hover:text-slate-200"
                  }`}
                >
                  <Building2 className={`w-4 h-4 shrink-0 ${selected ? "text-cyan-300" : "text-slate-500"}`} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Selecting an organization type does not grant special privileges. The backend enforces actual
          permissions separately.
        </p>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="border-slate-700 text-slate-300">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onNext} disabled={!canContinue} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function Step3({ orgName, orgType, submitting, onBack, onSubmit }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Account Role</h2>
        <p className="text-slate-500 text-[13px] mt-1">
          As the first account for this organization, you will be the Organization Administrator.
        </p>
      </div>
      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/[0.06] p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-cyan-300" />
        </div>
        <div>
          <p className="text-slate-100 font-semibold text-sm">Organization Administrator</p>
          <p className="text-slate-400 text-[12px] mt-1 leading-relaxed">
            You will manage your organization's team, settings, and audit trail. Platform Administrator
            is an internal SafeNestT role and is never offered during signup.
          </p>
        </div>
      </div>
      <div className="rounded-md border border-slate-800 bg-[#0a0e13] p-4 text-[12px] text-slate-400 space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Organization</span><span className="text-slate-200">{orgName}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-200">{ORGANIZATION_TYPES.find((t) => t.value === orgType)?.label || "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="text-slate-200">Organization Administrator</span></div>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="border-slate-700 text-slate-300">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={submitting} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up…</> : <>Complete Setup <CheckCircle2 className="w-4 h-4" /></>}
        </Button>
      </div>
    </div>
  );
}