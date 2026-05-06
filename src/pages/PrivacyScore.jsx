import { useState, useEffect } from "react";
import { usePrivacyHub } from "@/lib/usePrivacyHub";
import { calcPrivacyScore, getScoreBand, DATA_BROKERS } from "@/lib/privacyHubData";
import { base44 } from "@/api/base44Client";
import { Star, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

const MODULE_CONTRIBUTIONS = [
  { id: "pg", label: "Privacy Guard", max: 15, route: "/privacy-guard", desc: "Block tracking domains" },
  { id: "br", label: "Broker Removal", max: 30, route: "/broker-removal", desc: "Submit data removal requests" },
  { id: "es", label: "Exposure Scanner", max: 5, route: "/exposure-scanner", desc: "Run your first scan" },
  { id: "dw", label: "Dark Web Monitor", max: 20, route: "/dark-web-monitor", desc: "Monitor emails & action breaches" },
  { id: "fm", label: "Footprint Map", max: 15, route: "/footprint-map", desc: "Download data & opt out of services" },
  { id: "ci", label: "Cookie Intel", max: 10, route: "/cookie-intel", desc: "Enable GPC & block 3rd-party cookies" },
];

function computeModuleScores(hub, guardState) {
  const blocked = (guardState?.blocked_domains || []).length;
  const requests = hub?.broker_requests || [];
  const confirmed = requests.filter(r => r.status === "confirmed").length;
  const submitted = requests.filter(r => r.status === "submitted").length;
  const hasScanned = (hub?.exposure_scans || []).length > 0;
  const emails = (hub?.dark_web_emails || []).length;
  const actionedBreaches = (hub?.dark_web_breaches || []).filter(b => b.actioned);
  const svcs = hub?.footprint_services || [];
  const cs = hub?.cookie_settings || {};
  return {
    pg: Math.min(blocked * 0.5, 15),
    br: Math.min(confirmed * 2 + submitted * 0.5, 30),
    es: hasScanned ? 5 : 0,
    dw: Math.min(emails * 3 + actionedBreaches.reduce((a, b) => a + (b.severity === "CRITICAL" ? 5 : 3), 0), 20),
    fm: Math.min(svcs.filter(s => s.downloaded).length * 1 + svcs.filter(s => s.deleted).length * 3 + svcs.filter(s => s.opted_out).length * 2, 15),
    ci: Math.min((cs.gpc ? 5 : 0) + (cs.block_third_party ? 5 : 0), 10),
  };
}

const GRADE_LETTERS = (pct) => pct >= 0.9 ? "A" : pct >= 0.75 ? "B" : pct >= 0.6 ? "C" : pct >= 0.4 ? "D" : "F";
const GRADE_COLORS = { A: "text-green-400", B: "text-blue-400", C: "text-yellow-400", D: "text-orange-400", F: "text-red-400" };

export default function PrivacyScore() {
  const { hub, loading } = usePrivacyHub();
  const [guardState, setGuardState] = useState(null);

  useEffect(() => {
    base44.auth.me().then(user => {
      base44.entities.PrivacyGuardState.filter({ user_email: user.email }).then(r => {
        if (r.length > 0) setGuardState(r[0]);
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const score = hub ? calcPrivacyScore(hub, guardState) : 50;
  const band = getScoreBand(score);
  const moduleScores = hub ? computeModuleScores(hub, guardState) : {};

  const recentHistory = (hub?.score_history || []).slice(-14).map(h => ({
    date: format(new Date(h.date), "MMM d"),
    score: h.score,
  }));
  if (recentHistory.length === 0) {
    recentHistory.push({ date: format(new Date(), "MMM d"), score });
  }

  const actions = [
    !guardState?.blocked_domains?.length && { label: "Block all tracking domains", pts: 7.5, route: "/privacy-guard" },
    (hub?.broker_requests || []).filter(r => r.status === "not_submitted").length > 0 && {
      label: `Submit ${Math.min(3, (hub?.broker_requests || []).filter(r => r.status === "not_submitted").length)} pending broker removals`,
      pts: 1.5, route: "/broker-removal"
    },
    !(hub?.exposure_scans || []).length && { label: "Run your first exposure scan", pts: 5, route: "/exposure-scanner" },
    !(hub?.dark_web_emails || []).length && { label: "Add your email to Dark Web Monitor", pts: 3, route: "/dark-web-monitor" },
    !(hub?.cookie_settings?.gpc) && { label: "Enable Global Privacy Control in your browser", pts: 5, route: "/cookie-intel" },
    !(hub?.cookie_settings?.block_third_party) && { label: "Enable third-party cookie blocking", pts: 5, route: "/cookie-intel" },
  ].filter(Boolean).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Star className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Privacy Score</h1>
          <p className="text-gray-400 text-xs">Your live privacy risk score — updated by actions across all modules</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" /></div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Score Hero */}
          <div className="lg:col-span-1 p-6 bg-gray-900/60 border border-gray-800/60 rounded-2xl flex flex-col items-center gap-4">
            <div className={`w-36 h-36 rounded-full border-4 ${band.border} flex flex-col items-center justify-center ${band.bg} relative`}>
              <span className={`text-5xl font-black ${band.color}`}>{score}</span>
              <span className="text-xs text-gray-500">/ 100</span>
            </div>
            <div className={`px-4 py-2 rounded-full border text-sm font-bold ${band.color} ${band.bg} ${band.border}`}>{band.label}</div>
            <p className="text-gray-500 text-xs">Last updated: {format(new Date(), "MMM d, HH:mm")}</p>
            <div className="flex items-center gap-1 text-green-400 text-sm"><TrendingUp className="w-4 h-4" />Score updates as you take actions</div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Chart */}
            {recentHistory.length > 1 && (
              <div className="p-5 bg-gray-900/60 border border-gray-800/60 rounded-xl">
                <h3 className="text-white font-semibold mb-3">Score History</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={recentHistory}>
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", color: "#e5e7eb", fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Module Breakdown */}
            <div className="p-5 bg-gray-900/60 border border-gray-800/60 rounded-xl">
              <h3 className="text-white font-semibold mb-4">Score Breakdown by Module</h3>
              <div className="space-y-4">
                {MODULE_CONTRIBUTIONS.map(mod => {
                  const earned = Math.round((moduleScores[mod.id] || 0) * 10) / 10;
                  const pct = earned / mod.max;
                  const grade = GRADE_LETTERS(pct);
                  return (
                    <div key={mod.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white">{mod.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${GRADE_COLORS[grade]}`}>{grade}</span>
                          <span className="text-xs text-gray-500">{earned} / {mod.max} pts</span>
                          <Link to={mod.route} className="text-cyan-400 text-xs hover:text-cyan-300">Improve →</Link>
                        </div>
                      </div>
                      <Progress value={(earned / mod.max) * 100} className="h-1.5 bg-gray-800" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="lg:col-span-3 p-5 bg-gray-900/60 border border-gray-800/60 rounded-xl">
            <h3 className="text-white font-semibold mb-4">Recommended Actions</h3>
            {actions.length === 0 ? (
              <p className="text-green-400 text-sm">🎉 Great job! You've completed all key recommended actions.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {actions.map((a, i) => (
                  <Link key={i} to={a.route} className="group p-3 bg-gray-950/60 border border-gray-800/60 rounded-lg hover:border-cyan-500/30 transition-all flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-300 group-hover:text-white">{a.label}</span>
                    <div className="text-right shrink-0">
                      <div className="text-green-400 text-xs font-bold">+{a.pts} pts</div>
                      <ArrowRight className="w-3 h-3 text-cyan-400 ml-auto mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}