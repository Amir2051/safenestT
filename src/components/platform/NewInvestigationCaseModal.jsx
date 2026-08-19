import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const FRAUD_TYPES = [
  "Crypto Theft", "Investment Scam", "Romance Scam", "Identity Theft",
  "Account Takeover", "Phishing", "Online Fraud", "Business Email Compromise",
  "Marketplace Fraud", "Ransomware", "Other",
];
const PRIORITIES = ["low", "medium", "high", "critical"];

/**
 * Creates an InvestigationCase record (the investigation platform's
 * primary case entity). The investigation itself is executed by Hermes.
 */
export default function NewInvestigationCaseModal({ open, onClose, onCreated }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    case_title: "",
    case_number: "",
    victim_name: "",
    victim_email: "",
    fraud_type: "Crypto Theft",
    priority: "medium",
    amount_stolen_usd: "",
    description: "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.case_title.trim()) {
      toast.error("Case title is required");
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.InvestigationCase.create({
        case_title: form.case_title.trim(),
        case_number: form.case_number.trim() || undefined,
        victim_name: form.victim_name.trim() || undefined,
        victim_email: form.victim_email.trim() || undefined,
        fraud_type: form.fraud_type.toLowerCase().replace(/\s+/g, "_"),
        priority: form.priority,
        case_priority: form.priority,
        amount_stolen_usd: form.amount_stolen_usd ? Number(form.amount_stolen_usd) : 0,
        description: form.description.trim() || undefined,
        status: "new",
        investigation_progress: 0,
      });
      toast.success("Case created");
      onCreated?.(created);
      onClose?.();
    } catch (e) {
      toast.error("Failed to create case: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="bg-[#0f1419] border-white/15 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">New Investigation Case</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-gray-300">Case Title *</Label><Input value={form.case_title} onChange={(e) => set("case_title", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" placeholder="e.g. Ethereum wallet theft via phishing" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-gray-300">Case Number</Label><Input value={form.case_number} onChange={(e) => set("case_number", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" placeholder="optional" /></div>
            <div><Label className="text-gray-300">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-gray-300">Victim Name</Label><Input value={form.victim_name} onChange={(e) => set("victim_name", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
            <div><Label className="text-gray-300">Victim Email</Label><Input value={form.victim_email} onChange={(e) => set("victim_email", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-gray-300">Fraud Type</Label>
              <Select value={form.fraud_type} onValueChange={(v) => set("fraud_type", v)}>
                <SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{FRAUD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-gray-300">Amount Stolen (USD)</Label><Input type="number" value={form.amount_stolen_usd} onChange={(e) => set("amount_stolen_usd", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" placeholder="0" /></div>
          </div>
          <div><Label className="text-gray-300">Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white min-h-[80px]" placeholder="Chronological description of what occurred (facts only)" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/15 text-gray-200">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">{saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Creating…</> : "Create Case"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}