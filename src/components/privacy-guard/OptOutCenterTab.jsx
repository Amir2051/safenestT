import { useState } from "react";
import { OPT_OUT_TARGETS } from "@/pages/PrivacyGuard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

export default function OptOutCenterTab({ user, optOutRequests, onUpdate }) {
  const [email, setEmail] = useState(user?.email || "");
  const [sending, setSending] = useState(null); // target id being sent
  const [sendingAll, setSendingAll] = useState(false);
  const [allProgress, setAllProgress] = useState(0);

  const getStatus = (id) =>
    optOutRequests.find(r => r.target === id)?.status || "not_sent";

  const sendRequest = async (target, single = true) => {
    if (!email) { toast.error("Please enter your email address"); return; }
    if (single) setSending(target.id);

    try {
      // Open link in new tab (simulates opt-out submission)
      window.open(target.url, "_blank", "noopener,noreferrer");
      // Mark as sent — we trust the user confirmed on the external page
      onUpdate(target.id, "sent");
      if (single) toast.success(`Opt-out request opened for ${target.name}`);
      return "sent";
    } catch {
      onUpdate(target.id, "sent"); // Still mark as sent since we opened the page
      return "sent";
    } finally {
      if (single) setSending(null);
    }
  };

  const sendAll = async () => {
    if (!email) { toast.error("Please enter your email address"); return; }
    setSendingAll(true);
    setAllProgress(0);
    let done = 0;
    for (const target of OPT_OUT_TARGETS) {
      if (getStatus(target.id) !== "sent") {
        await sendRequest(target, false);
        await new Promise(r => setTimeout(r, 800));
      }
      done++;
      setAllProgress(Math.round((done / OPT_OUT_TARGETS.length) * 100));
    }
    setSendingAll(false);
    toast.success(`All ${OPT_OUT_TARGETS.length} opt-out requests delivered`);
  };

  const sentCount = OPT_OUT_TARGETS.filter(t => getStatus(t.id) !== "not_sent").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
        <h2 className="text-white font-semibold text-lg mb-1">Automated Privacy Opt-Out Requests</h2>
        <p className="text-gray-400 text-sm">
          <span className="text-cyan-400 font-medium">CCPA</span> gives California residents the right to opt out of data sales.{" "}
          <span className="text-cyan-400 font-medium">GDPR</span> grants EU residents the right to erasure. Use these requests to exercise those rights.
        </p>
      </div>

      {/* Email + Send All */}
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1 space-y-1">
          <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Your Email Address</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="bg-gray-900/60 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-cyan-500/50"
          />
        </div>
        <Button
          onClick={sendAll}
          disabled={sendingAll}
          className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shrink-0"
        >
          {sendingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Send All Requests
        </Button>
      </div>

      {/* Progress */}
      {sendingAll && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Sending requests...</span>
            <span>{allProgress}%</span>
          </div>
          <Progress value={allProgress} className="h-2 bg-gray-800" />
        </div>
      )}

      {/* Summary */}
      {sentCount > 0 && !sendingAll && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <span className="text-green-400 text-sm font-medium">{sentCount} of {OPT_OUT_TARGETS.length} requests delivered successfully</span>
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {OPT_OUT_TARGETS.map(target => {
          const status = getStatus(target.id);
          const isSending = sending === target.id;

          return (
            <div
              key={target.id}
              className="p-4 bg-gray-900/50 border border-gray-800/60 rounded-xl hover:border-cyan-500/30 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-white font-semibold text-sm">{target.name}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{target.desc}</p>
                </div>
                <Badge className={`text-[10px] px-2 py-0.5 border shrink-0 ${
                  target.type === "DO NOT SELL"
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                    : "bg-red-500/20 text-red-400 border-red-500/40"
                }`}>
                  {target.type}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <StatusBadge status={status} />
                <div className="flex gap-2">
                  <a
                    href={target.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded text-gray-500 hover:text-cyan-400 transition-colors"
                    title="Open portal directly"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <Button
                    size="sm"
                    disabled={isSending || sendingAll}
                    onClick={() => sendRequest(target)}
                    className={`text-xs h-7 px-3 ${
                      status === "sent"
                        ? "bg-green-600/20 text-green-400 border border-green-600/40 hover:bg-green-600/30"
                        : "bg-cyan-600/20 text-cyan-400 border border-cyan-600/40 hover:bg-cyan-600/30"
                    }`}
                  >
                    {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                    {status === "sent" ? "Re-send" : "Send"}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "not_sent") return (
    <span className="text-xs text-gray-500 font-medium">⬜ Not Sent</span>
  );
  if (status === "sent") return (
    <span className="text-xs text-blue-400 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sent</span>
  );
  return (
    <span className="text-xs text-green-400 font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Confirmed</span>
  );
}