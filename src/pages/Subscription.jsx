import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Crown,
  FileSearch,
  Fingerprint,
  LockKeyhole,
  Loader2,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    eyebrow: "GET STARTED",
    price: "$0",
    cadence: "forever",
    summary: "A focused starting point for organizing your first investigations.",
    cases: "2 active cases",
    investigations: "2 AI investigations / month",
    seats: "1 user",
    features: [
      "Core case workspace",
      "Case and evidence organization",
      "Essential investigation tools",
      "A clear path to upgrade as work grows",
    ],
    icon: Shield,
    tone: "slate",
  },
  {
    id: "professional",
    name: "Professional",
    eyebrow: "FOR INVESTIGATORS",
    price: "$49",
    cadence: "per month",
    summary: "More capacity for independent investigators and growing practices.",
    cases: "Up to 25 active cases",
    investigations: "30 AI investigations / month",
    seats: "1 user",
    features: [
      "Expanded investigation capacity",
      "AI-assisted case analysis",
      "Evidence and findings workflows",
      "Professional case operations",
    ],
    priceId: "price_1UYWgmBgEK1rvq8hw9gRnQkO",
    icon: FileSearch,
    tone: "cyan",
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    eyebrow: "FOR SECURITY TEAMS",
    price: "$199",
    cadence: "per month",
    summary: "Shared investigation capacity for teams working cases together.",
    cases: "Up to 100 active cases",
    investigations: "100 pooled AI investigations / month",
    seats: "Up to 5 members",
    features: [
      "Shared team capacity",
      "Pooled AI investigation allowance",
      "Multi-member case operations",
      "Room to coordinate a larger workload",
    ],
    priceId: "price_1UYW9OBgEK1rvq8hsGNWSrNZ",
    icon: Users,
    tone: "violet",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    eyebrow: "CUSTOM AGREEMENT",
    price: "Custom",
    cadence: "contract",
    summary: "A tailored arrangement for organizations with larger or specialized needs.",
    cases: "Custom case capacity",
    investigations: "Custom AI usage",
    seats: "Organization-wide",
    features: [
      "Contract-based pricing",
      "Capacity tailored to your operation",
      "Organization-level requirements",
      "Talk with SafeNestT about your workflow",
    ],
    icon: BriefcaseBusiness,
    tone: "magenta",
  },
];

const STATUS_LABELS = {
  active: "Active",
  trialing: "Trial active",
  trial: "Trial active",
  past_due: "Payment needs attention",
  unpaid: "Payment overdue",
  canceled: "Canceled",
  incomplete: "Pending checkout",
  inactive: "No paid subscription",
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const normalizePlan = (value) => {
  const plan = String(value || "").toLowerCase();
  if (["professional", "team", "enterprise"].includes(plan)) return plan;
  return "starter";
};

export default function Subscription() {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    base44.auth.me()
      .then((currentUser) => {
        if (mounted) setUser(currentUser);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setUserLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const {
    data: subscriptionInfo,
    isLoading: subscriptionLoading,
    isError: subscriptionError,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: ["subscription-info"],
    queryFn: async () => {
      const response = await base44.functions.invoke("subscriptionService", {
        endpoint: "get-subscription-info",
      });
      return response?.data ?? response;
    },
    enabled: !!user,
    refetchInterval: 30000,
    retry: 1,
  });

  const currentPlan = normalizePlan(subscriptionInfo?.subscription_plan || user?.subscription_plan);
  const status = String(subscriptionInfo?.subscription_status || user?.subscription_status || "inactive").toLowerCase();
  const statusLabel = STATUS_LABELS[status] || status.replaceAll("_", " ");
  const nextBillingDate = formatDate(
    subscriptionInfo?.next_billing_date || subscriptionInfo?.billing_cycle_anchor || user?.next_billing_date
  );
  const trialEndDate = formatDate(subscriptionInfo?.trial_ends || user?.trial_ends);
  const trialActive = Boolean(subscriptionInfo?.is_trial_active) || status === "trialing" || status === "trial";
  const hasManagedSubscription =
    ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(status) &&
    Boolean(user?.stripe_subscription_id || ["professional", "team"].includes(currentPlan));
  const canCancel =
    Boolean(user?.stripe_subscription_id) &&
    ["active", "trialing", "past_due", "unpaid"].includes(status);

  const handleSubscribe = async (plan) => {
    if (!user) {
      toast.error("Please sign in before choosing a subscription.");
      return;
    }
    if (!plan.priceId || loadingPlan || hasManagedSubscription) return;

    setLoadingPlan(plan.id);
    try {
      const response = await base44.functions.invoke("subscriptionService", {
        endpoint: "create-checkout-session",
        priceId: plan.priceId,
      });
      const checkoutUrl = response?.data?.url || response?.url;
      if (!checkoutUrl) throw new Error("Stripe did not return a checkout link.");
      window.location.assign(checkoutUrl);
    } catch (error) {
      console.error("SafeNestT checkout could not be started:", error);
      toast.error(error?.message || "We couldn't start secure checkout. Please try again.");
      setLoadingPlan("");
    }
  };

  const handleCancel = async () => {
    if (!canCancel || cancelling) return;
    setCancelling(true);
    try {
      const response = await base44.functions.invoke("subscriptionService", {
        endpoint: "cancel-subscription",
      });
      toast.success(response?.data?.message || "Your cancellation request was submitted.");
      await queryClient.invalidateQueries({ queryKey: ["subscription-info"] });
      await refetchSubscription();
      const refreshedUser = await base44.auth.me().catch(() => null);
      if (refreshedUser) setUser(refreshedUser);
    } catch (error) {
      console.error("SafeNestT cancellation request failed:", error);
      toast.error(error?.message || "We couldn't update your subscription. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const supportLink = "/Support";
  const isPageLoading = userLoading || (!!user && subscriptionLoading);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-7 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-36 -top-32 h-[30rem] w-[30rem] rounded-full bg-cyan-400/[0.07] blur-[110px]" />
        <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-fuchsia-500/[0.06] blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.16]" style={{
          backgroundImage: "linear-gradient(rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.12) 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          maskImage: "linear-gradient(to bottom, black, transparent 88%)",
        }} />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-8">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[0.07] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
            <Fingerprint className="h-3.5 w-3.5" />
            SafeNestT Investigation Platform
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Capacity that scales with
            <span className="block bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400 bg-clip-text text-transparent">
              your investigations.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
            One secure workspace for case management, AI-assisted investigation, evidence, and findings.
            Choose the capacity that fits the work you manage today.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-cyan-300" /> Investigation-focused tools</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-cyan-300" /> Secure Stripe checkout</span>
            <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-cyan-300" /> Clear usage limits</span>
          </div>
        </header>

        {isPageLoading ? (
          <div className="flex min-h-36 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/50">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
            <span className="ml-3 text-sm text-slate-400">Loading your subscription…</span>
          </div>
        ) : null}

        {subscriptionError && user ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
            <span>We couldn't load your current subscription details. Your plan selection is still available.</span>
            <Button variant="outline" size="sm" onClick={() => refetchSubscription()} className="border-amber-300/30 text-amber-100 hover:bg-amber-300/10">
              Retry status
            </Button>
          </div>
        ) : null}

        {user && (status !== "inactive" || trialActive) ? (
          <section className="overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950/65 shadow-[0_18px_60px_rgba(0,0,0,.22)]">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10">
                  {trialActive ? <Zap className="h-6 w-6 text-cyan-300" /> : <BadgeCheck className="h-6 w-6 text-cyan-300" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">Your subscription</h2>
                    <Badge className="border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/10">
                      {statusLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    {PLANS.find((plan) => plan.id === currentPlan)?.name || "Starter"} plan
                    {trialActive && trialEndDate ? ` · Trial ends ${trialEndDate}` : ""}
                    {!trialActive && nextBillingDate ? ` · Next billing ${nextBillingDate}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]">
                  <a href="/Billing"><CreditCard className="mr-2 h-4 w-4" /> Billing details</a>
                </Button>
                {canCancel ? (
                  <Button
                    variant="outline"
                    disabled={cancelling}
                    onClick={() => {
                      if (window.confirm("Schedule your SafeNestT subscription to cancel at the end of its current billing period?")) {
                        handleCancel();
                      }
                    }}
                    className="border-rose-400/25 text-rose-200 hover:bg-rose-400/10"
                  >
                    {cancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                    Cancel at period end
                  </Button>
                ) : null}
              </div>
            </div>
            {status === "past_due" || status === "unpaid" ? (
              <div className="border-t border-amber-300/15 bg-amber-300/[0.06] px-5 py-3 text-sm text-amber-100">
                Your latest payment needs attention. Open Billing to review your payment method and subscription.
              </div>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="plans-heading">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Plans & capacity</p>
              <h2 id="plans-heading" className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Choose your operating level</h2>
            </div>
            <p className="text-xs text-slate-500">USD · Monthly billing for paid plans</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isCurrentPlan = plan.id === currentPlan && (plan.id === "starter" || ["active", "trialing", "trial"].includes(status));
              const isLockedByExistingSubscription = hasManagedSubscription && !isCurrentPlan && plan.priceId;
              const isLoadingThisPlan = loadingPlan === plan.id;
              const accent = {
                slate: "border-white/10 bg-slate-950/55",
                cyan: "border-cyan-300/35 bg-slate-950/80 shadow-[0_0_36px_rgba(0,217,255,.08)]",
                violet: "border-violet-300/25 bg-slate-950/65",
                magenta: "border-fuchsia-300/20 bg-slate-950/55",
              }[plan.tone];
              const iconTone = {
                slate: "bg-white/[0.06] text-slate-300 border-white/10",
                cyan: "bg-cyan-300/10 text-cyan-200 border-cyan-300/20",
                violet: "bg-violet-300/10 text-violet-200 border-violet-300/20",
                magenta: "bg-fuchsia-300/10 text-fuchsia-200 border-fuchsia-300/20",
              }[plan.tone];

              return (
                <article key={plan.id} className={`relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition duration-200 hover:-translate-y-1 hover:border-cyan-300/40 ${accent}`}>
                  {plan.popular ? (
                    <div className="absolute right-0 top-0 rounded-bl-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-950">
                      Most selected
                    </div>
                  ) : null}
                  <div className="mb-5 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${iconTone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{plan.eyebrow}</p>
                      <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    </div>
                  </div>

                  <div className="mb-3 min-h-[4.25rem]">
                    <div className="flex items-end gap-1.5">
                      <span className="text-3xl font-semibold tracking-tight text-white">{plan.price}</span>
                      <span className="pb-1 text-xs text-slate-500">{plan.cadence}</span>
                    </div>
                    <p className="mt-2 min-h-10 text-xs leading-5 text-slate-400">{plan.summary}</p>
                  </div>

                  <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                    <div className="flex items-start gap-2 text-sm text-slate-200">
                      <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <span>{plan.cases}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-200">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <span>{plan.investigations}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-200">
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                      <span>{plan.seats}</span>
                    </div>
                  </div>

                  <ul className="my-5 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-xs leading-5 text-slate-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.id === "enterprise" ? (
                    <Button asChild className="w-full border border-fuchsia-300/25 bg-fuchsia-300/[0.08] text-fuchsia-100 hover:bg-fuchsia-300/[0.14]">
                      <a href={supportLink}>Discuss Enterprise <ArrowUpRight className="ml-2 h-4 w-4" /></a>
                    </Button>
                  ) : plan.id === "starter" ? (
                    <Button
                      variant="outline"
                      disabled={isCurrentPlan}
                      onClick={() => window.location.assign("/Billing")}
                      className="w-full border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07] disabled:opacity-60"
                    >
                      {isCurrentPlan ? "Your current plan" : "Included with SafeNestT"}
                    </Button>
                  ) : isCurrentPlan ? (
                    <Button disabled className="w-full bg-cyan-300/10 text-cyan-100 opacity-100">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Current plan
                    </Button>
                  ) : isLockedByExistingSubscription ? (
                    <Button asChild variant="outline" className="w-full border-white/15 text-slate-200 hover:bg-white/[0.07]">
                      <a href={supportLink}>Change plan <ArrowRight className="ml-2 h-4 w-4" /></a>
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSubscribe(plan)}
                      disabled={Boolean(loadingPlan)}
                      className={`w-full font-semibold ${plan.id === "professional"
                        ? "bg-gradient-to-r from-cyan-300 to-sky-400 text-slate-950 hover:from-cyan-200 hover:to-sky-300"
                        : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400"
                      }`}
                    >
                      {isLoadingThisPlan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                      {isLoadingThisPlan ? "Opening secure checkout…" : `Choose ${plan.name}`}
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-cyan-200">
              <Activity className="h-5 w-5" />
              <h2 className="font-semibold text-white">Know what your plan includes</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-white">Active cases</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">The number of cases you can keep active in your workspace at one time.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white">AI investigations</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">Monthly investigation capacity. Team usage is pooled across its members.</p>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Team members</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">The number of people included in the plan's workspace allowance.</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.08] to-fuchsia-400/[0.04] p-5 sm:p-6">
            <div className="flex items-center gap-2 text-cyan-200">
              <LockKeyhole className="h-5 w-5" />
              <h2 className="font-semibold text-white">Checkout you can trust</h2>
            </div>
            <p className="mt-3 text-xs leading-6 text-slate-400">
              Paid plans open a secure Stripe Checkout session. SafeNestT receives subscription status and billing events from Stripe; your card details are handled by Stripe.
            </p>
            <a href="/Billing" className="mt-4 inline-flex items-center text-xs font-semibold text-cyan-200 hover:text-cyan-100">
              Manage billing details <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-950/45 p-5 sm:p-7">
          <div className="mb-5 flex items-center gap-2">
            <CircleHelp className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-semibold text-white">Subscription questions</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Can I start on Starter?</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">Yes. Starter is free and includes a limited case and AI investigation allowance. Upgrade when you need more capacity.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">What happens when I choose a paid plan?</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">You'll be sent to Stripe's secure checkout. Your plan is updated after Stripe confirms the subscription event.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Can I change or cancel my plan?</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">You can request cancellation from this page. For a plan change, contact the SafeNestT team so we can avoid creating a second subscription by mistake.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Do you offer custom arrangements?</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">Yes. Enterprise pricing and capacity are discussed directly based on your organization's requirements.</p>
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-5 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Shield className="h-4 w-4 text-cyan-300" />
            <span className="font-semibold tracking-[0.14em] text-slate-300">SAFENESTT</span>
            <span>· Investigation operations, organized.</span>
          </div>
          <a href={supportLink} className="text-xs text-slate-400 transition hover:text-cyan-200">Need help choosing a plan? Contact support</a>
        </footer>
      </div>
    </div>
  );
}
