import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  ShieldCheck, Building2, ArrowRight, ArrowLeft, CheckCircle2,
  Loader2, Lock, AlertCircle, Users,
} from "lucide-react";
import { ORGANIZATION_TYPES, ORG_TYPE_LABELS } from "@/lib/organizationRoles";

/**
 * Organization onboarding — the institutional "signup" flow.
 *
 * The platform (Base44 auth) owns account creation (email + password). This
 * flow runs AFTER the user authenticates and asks which organization they
 * belong to: join an EXISTING verified organization (dropdown), or REQUEST a
 * new organization (name + type). Either path creates a PENDING membership
 * (and a pending Tenant for new orgs). A platform admin verifies the
 * company, then the org admin assigns the role. Until verified the user has
 * read-only (VIEWER) access.
 */
export default function OrganizationOnboarding() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState("new"); // "join" | "new"
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [joinable, setJoinable] = useState([]);
  const [joinableLoading, setJoinableLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoadingAuth) return;
    if (user) {
      setFullName(user.full_name || "");
      // Already onboarded users skip straight into the workspace.
      if (user.organization_name && user.organization_role) {
        navigate("/OperationsDashboard", { replace: true });
      }
    }
  }, [isLoadingAuth, user, navigate]);

  // Load joinable organizations when entering Step 2 in join mode.
  useEffect(() => {
    if (step === 2 && mode === "join" && joinable.length === 0 && !joinableLoading) {
      setJoinableLoading(true);
      base44.functions.invoke("listJoinableOrganizations", {})
        .then((res) => setJoinable(res?.data?.organizations || []))
        .catch(() => setJoinable([]))
        .finally(() => setJoinableLoading(false));
    }
  }, [step, mode, joinable.length, joinableLoading]);

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

  const selectedOrg = joinable.find((o) => o.id === selectedOrgId);
  const canContinueStep2 = mode === "join"
    ? !!selectedOrgId
    : !!orgName.trim() && !!orgType;
  const finalOrgName = mode === "join" ? selectedOrg?.name : orgName.trim();
  const finalOrgType = mode === "join" ? selectedOrg?.organization_type : orgType;

  const submit = async () => {
    setError("");
    if (!canContinueStep2) {
      setError(mode === "join" ? "Please select an organization to join." : "Please enter your organization name and select an organization type.");
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "join" && selectedOrg) {
        // Join an existing verified organization — create a PENDING membership
        // for platform-admin company verification, then org-admin role assignment.
        await base44.auth.updateMe({
          organization_name: selectedOrg.name,
          organization_type: selectedOrg.organization_type || null,
          organization_role: "VIEWER", // read-only until approved
          tenant_id: selectedOrg.id,
          account_status: "pending",
        });
        await base44.entities.TenantMembership.create({
          tenant_id: selectedOrg.id,
          user_id: user.id,
          user_email: user.email,
          user_name: user.full_name || fullName.trim(),
          role: "member",
          organization_role: "VIEWER",
          status: "pending_verification",
          requested_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        });
      } else {
        // Request a NEW organization — pending Tenant + pending membership.
        const tenant = await base44.entities.Tenant.create({
          name: orgName.trim(),
          organization_type: orgType,
          owner_user_id: user.id,
          owner_email: user.email,
          plan: "team",
          status: "pending_verification",
          members: [user.id],
          requested_by_user_id: user.id,
          requested_at: new Date().toISOString(),
        });
        if (tenant?.id) {
          await base44.auth.updateMe({
            organization_name: orgName.trim(),
            organization_type: orgType,
            organization_role: "VIEWER", // read-only until the org is verified
            tenant_id: tenant.id,
            tenant_role: "owner",
            account_status: "pending",
          });
          await base44.entities.TenantMembership.create({
            tenant_id: tenant.id,
            user_id: user.id,
            user_email: user.email,
            user_name: user.full_name || fullName.trim(),
            role: "owner",
            organization_role: "ORG_ADMIN", // takes effect once verified
            status: "pending_verification",
            requested_org_name: orgName.trim(),
            requested_org_type: orgType,
            requested_at: new Date().toISOString(),
            joined_at: new Date().toISOString(),
          });
        } else {
          // Tenant creation blocked (RLS) — persist org context on the profile only.
          await base44.auth.updateMe({
            organization_name: orgName.trim(),
            organization_type: orgType,
            organization_role: "VIEWER",
            account_status: "pending",
          });
        }
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
              email={user?.email}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <Step2
              mode={mode}
              setMode={setMode}
              orgName={orgName}
              setOrgName={setOrgName}
              orgType={orgType}
              setOrgType={setOrgType}
              selectedOrgId={selectedOrgId}
              setSelectedOrgId={setSelectedOrgId}
              joinable={joinable}
              joinableLoading={joinableLoading}
              canContinue={canContinueStep2}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <Step3
              mode={mode}
              finalOrgName={finalOrgName}
              finalOrgType={finalOrgType}
              submitting={submitting}
              onBack={() => setStep(2)}
              onSubmit={submit}
            />
          )}
        </div>

        <p className="mt-6 text-center text-[11px] font-mono text-slate-600 tracking-wider">
          ORGANIZATION ACCESS REQUIRES ADMIN VERIFICATION // UI ROLES ARE NOT A SECURITY BOUNDARY
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
  const steps = ["Account", "Organization", "Review"];
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

function Step1({ fullName, email, onNext }) {
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
        <Button onClick={onNext} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          Continue <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function Step2({ mode, setMode, orgName, setOrgName, orgType, setOrgType, selectedOrgId, setSelectedOrgId, joinable, joinableLoading, canContinue, onBack, onNext }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Organization</h2>
        <p className="text-slate-500 text-[13px] mt-1">
          Join an existing verified organization, or request a new one. All requests are reviewed by a SafeNestT administrator before access is granted.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <ModeCard active={mode === "join"} onClick={() => setMode("join")} icon={Users} label="Join existing" hint="Request to join a verified org" />
        <ModeCard active={mode === "new"} onClick={() => setMode("new")} icon={Building2} label="Request new" hint="Set up a new organization" />
      </div>

      {mode === "join" ? (
        <div className="space-y-2">
          <Label className="text-slate-300 text-[12px]">Select your organization</Label>
          {joinableLoading ? (
            <div className="flex items-center gap-2 text-slate-500 text-[13px] py-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading organizations…</div>
          ) : joinable.length === 0 ? (
            <div className="rounded-md border border-slate-800 bg-[#0a0e13] p-3 text-[12px] text-slate-500">
              No verified organizations are available to join yet. You can request a new organization instead.
            </div>
          ) : (
            <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
              <SelectTrigger className="w-full bg-[#0a0e13] border-slate-700/60 text-slate-100">
                <SelectValue placeholder="Choose an organization…" />
              </SelectTrigger>
              <SelectContent>
                {joinable.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}{o.organization_type ? ` · ${ORG_TYPE_LABELS[o.organization_type] || o.organization_type}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Your join request is sent to a SafeNestT administrator for company verification, then to the organization's administrator for role assignment.
          </p>
        </div>
      ) : (
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
            <Select value={orgType} onValueChange={setOrgType}>
              <SelectTrigger className="w-full mt-1 bg-[#0a0e13] border-slate-700/60 text-slate-100">
                <SelectValue placeholder="Select an organization type…" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            A SafeNestT administrator will verify your company before the organization is activated. You get read-only access until then.
          </p>
        </div>
      )}

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

function ModeCard({ active, onClick, icon: Icon, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
        active ? "border-cyan-500/60 bg-cyan-500/10" : "border-slate-700/60 bg-[#0a0e13] hover:border-cyan-500/30"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${active ? "text-cyan-300" : "text-slate-500"}`} />
      <div>
        <p className={`text-[13px] font-medium ${active ? "text-slate-100" : "text-slate-300"}`}>{label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>
      </div>
    </button>
  );
}

function Step3({ mode, finalOrgName, finalOrgType, submitting, onBack, onSubmit }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Review &amp; Submit</h2>
        <p className="text-slate-500 text-[13px] mt-1">
          {mode === "join"
            ? "Your join request will be sent for verification. You'll have read-only access until an administrator approves it."
            : "Your organization request will be sent for company verification. You'll have read-only access until a SafeNestT administrator approves it."}
        </p>
      </div>
      <div className="rounded-md border border-cyan-500/30 bg-cyan-500/[0.06] p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-cyan-300" />
        </div>
        <div>
          <p className="text-slate-100 font-semibold text-sm">{mode === "join" ? "Join Request" : "New Organization Request"}</p>
          <p className="text-slate-400 text-[12px] mt-1 leading-relaxed">
            A platform administrator verifies the company, then an organization administrator assigns your role. This is enforced server-side.
          </p>
        </div>
      </div>
      <div className="rounded-md border border-slate-800 bg-[#0a0e13] p-4 text-[12px] text-slate-400 space-y-1">
        <div className="flex justify-between"><span className="text-slate-500">Organization</span><span className="text-slate-200">{finalOrgName || "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-200">{ORG_TYPE_LABELS[finalOrgType] || finalOrgType || "—"}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Initial access</span><span className="text-slate-200">Read-only (pending verification)</span></div>
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={submitting} className="border-slate-700 text-slate-300">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={submitting} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Request <CheckCircle2 className="w-4 h-4" /></>}
        </Button>
      </div>
    </div>
  );
}