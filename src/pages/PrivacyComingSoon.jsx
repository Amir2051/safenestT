import { usePrivacyHub } from "@/lib/usePrivacyHub";
import { toast } from "sonner";
import { Bell, Mail, ShieldCheck, Fingerprint, Key, BarChart2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const COMING_SOON_MODULES = [
  {
    id: "email-aliases",
    icon: Mail,
    label: "Email Alias Manager",
    route: "/email-aliases",
    desc: "Generate disposable email addresses that forward to your real inbox. Protect your real email from spam and breaches.",
    features: ["Create unlimited aliases", "Forward to any inbox", "'Burn' alias to block all emails", "Per-alias analytics"],
  },
  {
    id: "app-permissions",
    icon: ShieldCheck,
    label: "App Permission Auditor",
    route: "/app-permissions",
    desc: "Audit your mobile apps' permissions. See what each app can access and rate its risk.",
    features: ["Add apps manually", "Permission risk ratings", "Excessive permission warnings", "Revoke guidance"],
  },
  {
    id: "fingerprint-guard",
    icon: Fingerprint,
    label: "Device Fingerprint Defense",
    route: "/fingerprint-guard",
    desc: "Detect and randomize your browser fingerprint — canvas, WebGL, fonts, and screen signals — to prevent cross-site tracking.",
    features: ["Fingerprint test tool", "Canvas randomization", "WebGL spoofing", "Font list masking"],
  },
  {
    id: "password-health",
    icon: Key,
    label: "Password Health Monitor",
    route: "/password-health",
    desc: "Check your passwords against breach databases using a k-anonymity model. Score strength. Flag reused passwords.",
    features: ["HIBP-style breach check", "Strength scoring", "Reuse detection", "Password generator"],
  },
  {
    id: "ad-profiler",
    icon: BarChart2,
    label: "Ad Network Profiler",
    route: "/ad-profiler",
    desc: "See what ad networks know about you — inferred age, income, interests, and political leanings from transparency portals.",
    features: ["Interest category viewer", "Ad network list", "Google Ad topics", "Opt-out shortcuts"],
  },
  {
    id: "ai-assistant",
    icon: MessageSquare,
    label: "Privacy AI Assistant",
    route: "/ai-assistant",
    desc: "Chat with an AI assistant trained on privacy law. Get answers, help drafting requests, and breach guidance.",
    features: ["Privacy law Q&A", "Request letter drafting", "Breach advice", "GDPR / CCPA guidance"],
  },
];

export default function PrivacyComingSoon() {
  const { hub, updateHub } = usePrivacyHub();

  const joinWaitlist = (moduleId) => {
    const waitlist = hub?.waitlist || [];
    if (waitlist.includes(moduleId)) { toast.info("You're already on the waitlist!"); return; }
    updateHub(prev => ({ ...prev, waitlist: [...(prev.waitlist || []), moduleId] }));
    toast.success("You're on the waitlist! We'll notify you when it launches.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Bell className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Coming Soon</h1>
          <p className="text-gray-400 text-xs">Next-generation privacy features currently in development</p>
        </div>
        {(hub?.waitlist || []).length > 0 && (
          <Badge className="ml-auto bg-purple-500/20 text-purple-400 border-purple-500/40">{hub.waitlist.length} waitlists joined</Badge>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {COMING_SOON_MODULES.map(mod => {
          const Icon = mod.icon;
          const onWaitlist = (hub?.waitlist || []).includes(mod.id);
          return (
            <div key={mod.id} className="p-5 bg-gray-900/60 border border-gray-800/60 rounded-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40 text-[10px]">COMING SOON</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-pink-600/30 rounded-xl flex items-center justify-center border border-purple-500/20">
                  <Icon className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-white font-semibold text-sm pr-16">{mod.label}</h3>
              </div>
              <p className="text-gray-400 text-sm">{mod.desc}</p>
              <ul className="space-y-1">
                {mod.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-1 h-1 bg-purple-400 rounded-full shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => joinWaitlist(mod.id)}
                className={`w-full text-sm ${onWaitlist ? "bg-green-600/20 text-green-400 border border-green-600/40" : "bg-purple-600/20 text-purple-400 border border-purple-600/40 hover:bg-purple-600/30"}`}
              >
                {onWaitlist ? "✓ On Waitlist" : <><Bell className="w-4 h-4 mr-2" />Notify Me</>}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}