import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield } from "lucide-react";
import DomainBlockerTab from "@/components/privacy-guard/DomainBlockerTab";
import OptOutCenterTab from "@/components/privacy-guard/OptOutCenterTab";
import ActivityLogTab from "@/components/privacy-guard/ActivityLogTab";
import { toast } from "sonner";

export const BROKER_DOMAINS = [
  { domain: "bluekai.com",         owner: "Oracle BlueKai",    category: "DMP / Audience Profiling",  risk: "HIGH" },
  { domain: "tags.bluekai.com",    owner: "Oracle BlueKai",    category: "DMP / Audience Profiling",  risk: "HIGH" },
  { domain: "addthis.com",         owner: "Oracle AddThis",     category: "Social Tracking",           risk: "HIGH" },
  { domain: "s7.addthis.com",      owner: "Oracle AddThis",     category: "Social Tracking",           risk: "HIGH" },
  { domain: "en25.com",            owner: "Oracle Eloqua",      category: "Email Tracking",            risk: "HIGH" },
  { domain: "img.en25.com",        owner: "Oracle Eloqua",      category: "Email Tracking",            risk: "HIGH" },
  { domain: "datalogix.com",       owner: "Oracle DataLogix",   category: "Audience Data Broker",      risk: "HIGH" },
  { domain: "moat.com",            owner: "Oracle Moat",        category: "Ad Measurement",            risk: "MEDIUM" },
  { domain: "d.moat.com",          owner: "Oracle Moat",        category: "Ad Measurement",            risk: "MEDIUM" },
  { domain: "responsys.net",       owner: "Oracle Responsys",   category: "Email Marketing",           risk: "MEDIUM" },
  { domain: "img.responsys.net",   owner: "Oracle Responsys",   category: "Email Marketing",           risk: "MEDIUM" },
  { domain: "oracleinfinity.io",   owner: "Oracle Infinity",    category: "Web Analytics",             risk: "HIGH" },
  { domain: "dc.oracleinfinity.io",owner: "Oracle Infinity",    category: "Web Analytics",             risk: "HIGH" },
  { domain: "grapeshot.co.uk",     owner: "Oracle Grapeshot",   category: "Contextual Targeting",      risk: "MEDIUM" },
  { domain: "crosswise.com",       owner: "Oracle Crosswise",   category: "Cross-Device Tracking",     risk: "HIGH" },
];

export const OPT_OUT_TARGETS = [
  { id: "bluekai",        name: "Oracle BlueKai",              type: "DO NOT SELL", desc: "Audience profiling and DMP data",        url: "https://tags.bluekai.com/site/opt-out" },
  { id: "bluekai_nai",   name: "Oracle BlueKai NAI",           type: "DO NOT SELL", desc: "NAI opt-out for audience profiling",      url: "https://bluekai.com/api/3.0/user/preferences?opt_out=1" },
  { id: "addthis",       name: "Oracle AddThis",               type: "DELETE DATA", desc: "Social sharing tracker data deletion",   url: "https://www.addthis.com/privacy/opt-out" },
  { id: "oracle_ccpa",   name: "Oracle Privacy Portal (CCPA)", type: "DO NOT SELL", desc: "CCPA Do Not Sell personal information",   url: "https://www.oracle.com/legal/privacy/privacy-choices.html" },
  { id: "data_cloud",    name: "Oracle Data Cloud",            type: "DELETE DATA", desc: "Delete from Oracle Data Cloud",           url: "https://datacloudoptout.oracle.com/optout" },
  { id: "nai",           name: "NAI Industry Opt-Out",         type: "DO NOT SELL", desc: "Industry-wide ad network opt-out",        url: "https://optout.networkadvertising.org" },
];

const DEFAULT_STATE = {
  blocked_domains: [],
  opt_out_requests: OPT_OUT_TARGETS.map(t => ({ target: t.id, status: "not_sent", sent_at: null })),
  activity_log: [],
};

export default function PrivacyGuard() {
  const [user, setUser] = useState(null);
  const [guardState, setGuardState] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    base44.entities.PrivacyGuardState.filter({ user_email: user.email })
      .then(records => {
        if (records.length > 0) {
          setRecordId(records[0].id);
          setGuardState({
            blocked_domains: records[0].blocked_domains || [],
            opt_out_requests: records[0].opt_out_requests?.length
              ? records[0].opt_out_requests
              : DEFAULT_STATE.opt_out_requests,
            activity_log: records[0].activity_log || [],
          });
        } else {
          setGuardState(DEFAULT_STATE);
        }
      })
      .catch(() => setGuardState(DEFAULT_STATE))
      .finally(() => setLoading(false));
  }, [user]);

  const persist = useCallback(async (newState) => {
    if (!user) return;
    const payload = { user_email: user.email, ...newState };
    if (recordId) {
      await base44.entities.PrivacyGuardState.update(recordId, payload);
    } else {
      const created = await base44.entities.PrivacyGuardState.create(payload);
      setRecordId(created.id);
    }
  }, [user, recordId]);

  const addLog = useCallback((action, status = "success") => {
    setGuardState(prev => {
      const entry = { timestamp: new Date().toISOString(), action, status };
      const updated = { ...prev, activity_log: [entry, ...(prev.activity_log || [])] };
      persist(updated);
      return updated;
    });
  }, [persist]);

  const toggleDomain = useCallback((domain) => {
    setGuardState(prev => {
      const blocked = prev.blocked_domains || [];
      const isBlocked = blocked.includes(domain);
      const newBlocked = isBlocked ? blocked.filter(d => d !== domain) : [...blocked, domain];
      const updated = { ...prev, blocked_domains: newBlocked };
      persist(updated);
      const action = isBlocked ? `Unblocked domain: ${domain}` : `Blocked domain: ${domain}`;
      toast.success(action);
      const entry = { timestamp: new Date().toISOString(), action, status: "success" };
      return { ...updated, activity_log: [entry, ...(prev.activity_log || [])] };
    });
  }, [persist]);

  const blockAll = useCallback(() => {
    setGuardState(prev => {
      const allDomains = BROKER_DOMAINS.map(d => d.domain);
      const entry = { timestamp: new Date().toISOString(), action: `Blocked all ${allDomains.length} domains`, status: "success" };
      const updated = { ...prev, blocked_domains: allDomains, activity_log: [entry, ...(prev.activity_log || [])] };
      persist(updated);
      toast.success(`All ${allDomains.length} domains blocked`);
      return updated;
    });
  }, [persist]);

  const updateOptOut = useCallback((targetId, status) => {
    setGuardState(prev => {
      const reqs = (prev.opt_out_requests || []).map(r =>
        r.target === targetId ? { ...r, status, sent_at: new Date().toISOString() } : r
      );
      const target = OPT_OUT_TARGETS.find(t => t.id === targetId);
      const entry = { timestamp: new Date().toISOString(), action: `Opt-out sent to ${target?.name}`, status };
      const updated = { ...prev, opt_out_requests: reqs, activity_log: [entry, ...(prev.activity_log || [])] };
      persist(updated);
      return updated;
    });
  }, [persist]);

  const clearLog = useCallback(() => {
    setGuardState(prev => {
      const updated = { ...prev, activity_log: [] };
      persist(updated);
      toast.success("Activity log cleared");
      return updated;
    });
  }, [persist]);

  const highRiskUnblocked = BROKER_DOMAINS.filter(
    d => d.risk === "HIGH" && !(guardState?.blocked_domains || []).includes(d.domain)
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">Privacy Guard</h1>
            <p className="text-cyan-400 text-xs font-mono">// ORACLE & DATA BROKER PROTECTION SUITE</p>
          </div>
          {highRiskUnblocked > 0 && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-red-400 text-xs font-bold">{highRiskUnblocked} HIGH RISK UNBLOCKED</span>
            </div>
          )}
        </div>
        <p className="text-gray-400 text-sm ml-13 pl-1">
          Block known data broker domains and automate CCPA/GDPR opt-out requests.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
        </div>
      ) : (
        <Tabs defaultValue="blocker" className="space-y-6">
          <TabsList className="bg-gray-900/60 border border-cyan-500/20 p-1 rounded-xl">
            <TabsTrigger value="blocker" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400 rounded-lg px-5">
              Domain Blocker
            </TabsTrigger>
            <TabsTrigger value="optout" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400 rounded-lg px-5">
              Opt-Out Center
            </TabsTrigger>
            <TabsTrigger value="log" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 text-gray-400 rounded-lg px-5">
              Activity Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blocker">
            <DomainBlockerTab
              blockedDomains={guardState?.blocked_domains || []}
              onToggle={toggleDomain}
              onBlockAll={blockAll}
              onLog={addLog}
            />
          </TabsContent>

          <TabsContent value="optout">
            <OptOutCenterTab
              user={user}
              optOutRequests={guardState?.opt_out_requests || []}
              onUpdate={updateOptOut}
            />
          </TabsContent>

          <TabsContent value="log">
            <ActivityLogTab
              log={guardState?.activity_log || []}
              onClear={clearLog}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}