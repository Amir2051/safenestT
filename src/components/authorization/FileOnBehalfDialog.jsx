import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, BadgeCheck, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";

const FILING_SCOPE_LABELS = {
  FILE_REPORT: "File a report",
  FILE_LAW_ENFORCEMENT_REPORT: "File a law-enforcement report",
  SUBMIT_TO_REGULATOR: "Submit to a regulator",
  SUBMIT_TO_PLATFORM: "Submit to a platform",
};

export default function FileOnBehalfDialog({ open, onClose, authorization, onFiled }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    scope: "",
    filing_type: "",
    recipient: "",
    submission_reference: "",
    notes: "",
    document_url: "",
  });

  React.useEffect(() => {
    if (open && authorization) {
      const filingScopes = (authorization.scopes || []).filter((s) =>
        ["FILE_REPORT", "FILE_LAW_ENFORCEMENT_REPORT", "SUBMIT_TO_REGULATOR", "SUBMIT_TO_PLATFORM"].includes(s)
      );
      setForm({ scope: filingScopes[0] || "", filing_type: "", recipient: "", submission_reference: "", notes: "", document_url: "" });
      setError("");
    }
  }, [open, authorization]);

  if (!authorization) return null;

  const filingScopes = (authorization.scopes || []).filter((s) =>
    ["FILE_REPORT", "FILE_LAW_ENFORCEMENT_REPORT", "SUBMIT_TO_REGULATOR", "SUBMIT_TO_PLATFORM"].includes(s)
  );

  const handleSubmit = async () => {
    setError("");
    if (!form.scope) return setError("Select an authorization scope for this filing.");
    if (!form.recipient) return setError("Enter the recipient (agency / platform / regulator).");
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("clientAuthorizationService", {
        action: "file_on_behalf",
        case_id: authorization.case_id,
        client_user_id: authorization.client_user_id,
        scope: form.scope,
        filing_type: form.filing_type || form.scope,
        recipient: form.recipient,
        submission_reference: form.submission_reference,
        notes: form.notes,
        document_url: form.document_url,
      });
      const data = res?.data ?? res;
      if (!data?.success) throw new Error(data?.error || "Filing rejected by server");
      onFiled?.(data.filing);
      onClose?.();
    } catch (e) {
      setError(e.message || "Filing failed");
    } finally {
      setSubmitting(false);
    }
  };

  const expired = authorization.expires_at && new Date(authorization.expires_at).getTime() < Date.now();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-[#0f1419] border-cyan-500/30 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            File on Behalf of Client
          </DialogTitle>
        </DialogHeader>

        {/* Authorization status banner */}
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
            <BadgeCheck className="w-4 h-4" />
            Authorized to act on behalf of client
          </div>
          <div className="text-xs text-gray-300 space-y-0.5">
            <div><span className="text-gray-500">Client:</span> {authorization.client_name || "—"} ({authorization.client_email || "—"})</div>
            <div><span className="text-gray-500">Case:</span> {authorization.case_title || authorization.case_id}</div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Status:</span>
              <span className={authorization.status === "ACTIVE" && !expired ? "text-green-400" : "text-red-400"}>
                {authorization.status}{expired ? " (EXPIRED)" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500">Expires:</span> {authorization.expires_at ? new Date(authorization.expires_at).toLocaleString() : "No expiration"}
            </div>
            <div><span className="text-gray-500">Authorized scopes:</span> {(authorization.scopes || []).join(", ")}</div>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Filing scope</Label>
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
              className="w-full bg-[#0a0e14] border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
            >
              {filingScopes.length === 0 && <option value="">No filing scopes authorized</option>}
              {filingScopes.map((s) => (
                <option key={s} value={s}>{FILING_SCOPE_LABELS[s] || s}</option>
              ))}
            </select>
            {filingScopes.length === 0 && (
              <p className="text-xs text-red-400">This authorization does not include any filing scope. Filing is not permitted.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Recipient (agency / platform / regulator)</Label>
            <Input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })}
              placeholder="e.g. FBI IC3, FTC, Coinbase Support" className="bg-[#0a0e14] border-gray-700 text-white" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Filing type</Label>
            <Input value={form.filing_type} onChange={(e) => setForm({ ...form, filing_type: e.target.value })}
              placeholder="e.g. ic3_complaint, law_enforcement_report" className="bg-[#0a0e14] border-gray-700 text-white" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">External submission / reference number (if available)</Label>
            <Input value={form.submission_reference} onChange={(e) => setForm({ ...form, submission_reference: e.target.value })}
              placeholder="e.g. IC3-2025-XXXXX" className="bg-[#0a0e14] border-gray-700 text-white" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Filing document URL (optional)</Label>
            <Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })}
              placeholder="https://..." className="bg-[#0a0e14] border-gray-700 text-white" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-[#0a0e14] border-gray-700 text-white" rows={2} />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="text-gray-300">Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || filingScopes.length === 0}
            className="bg-cyan-600 hover:bg-cyan-500 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Filing on Behalf of Client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}