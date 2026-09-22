import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";

const SCOPE_OPTIONS = [
  { value: "VIEW_CASE", label: "View case details" },
  { value: "INVESTIGATE", label: "Investigate the case" },
  { value: "COMMUNICATE", label: "Communicate on my behalf" },
  { value: "FILE_REPORT", label: "File a report" },
  { value: "FILE_LAW_ENFORCEMENT_REPORT", label: "File a law-enforcement report" },
  { value: "SUBMIT_TO_REGULATOR", label: "Submit to a regulator" },
  { value: "SUBMIT_TO_PLATFORM", label: "Submit to a platform" },
  { value: "OTHER", label: "Other (describe in notes)" },
];

export default function GrantAuthorizationDialog({ open, onClose, onGranted }) {
  const [cases, setCases] = useState([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    case_id: "",
    scopes: [],
    expires_at: "",
    authorization_document_url: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    setLoadingCases(true);
    base44.entities.MyCase.list("-created_date", 200)
      .then((c) => setCases(Array.isArray(c) ? c : []))
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false));
    setForm({ case_id: "", scopes: [], expires_at: "", authorization_document_url: "", notes: "" });
    setError("");
  }, [open]);

  const toggleScope = (scope) => {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.case_id) return setError("Please select a case.");
    if (form.scopes.length === 0) return setError("Select at least one authorization scope.");
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("clientAuthorizationService", {
        action: "grant",
        case_id: form.case_id,
        scopes: form.scopes,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        authorization_document_url: form.authorization_document_url,
        notes: form.notes,
      });
      const data = res?.data ?? res;
      if (!data?.success) throw new Error(data?.error || "Failed to grant authorization");
      onGranted?.(data.authorization);
      onClose?.();
    } catch (e) {
      setError(e.message || "Failed to grant authorization");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-[#0f1419] border-cyan-500/30 text-white max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            Grant SafeNestT Authorization
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-xs text-gray-400">
            By granting this authorization, you permit SafeNestT to perform <span className="text-cyan-400">only</span> the
            selected actions for this case. Authorization becomes ACTIVE after a SafeNestT staff member verifies it. You
            can revoke it at any time.
          </p>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Case</Label>
            {loadingCases ? (
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading your cases…
              </div>
            ) : cases.length === 0 ? (
              <p className="text-sm text-gray-500">You have no cases to authorize.</p>
            ) : (
              <select
                value={form.case_id}
                onChange={(e) => setForm({ ...form, case_id: e.target.value })}
                className="w-full bg-[#0a0e14] border border-gray-700 rounded-md px-3 py-2 text-sm text-white"
              >
                <option value="">Select a case…</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number || c.id.slice(-8)} — {c.client_name || "Untitled"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Authorization scope</Label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {SCOPE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <Checkbox checked={form.scopes.includes(opt.value)} onCheckedChange={() => toggleScope(opt.value)} />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Expiration (optional)</Label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="bg-[#0a0e14] border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Signed authorization document URL (optional)</Label>
            <Input
              value={form.authorization_document_url}
              onChange={(e) => setForm({ ...form, authorization_document_url: e.target.value })}
              placeholder="https://..."
              className="bg-[#0a0e14] border-gray-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300 text-xs uppercase tracking-wider">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-[#0a0e14] border-gray-700 text-white"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="text-gray-300">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !form.case_id || form.scopes.length === 0}
            className="bg-cyan-600 hover:bg-cyan-500 text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Grant Authorization"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}