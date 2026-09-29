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
import { logAuditEvent } from "@/lib/auditLogger";

const FRAUD_TYPES = [
  "crypto_theft", "phishing", "fake_exchange", "rug_pull", "romance_scam",
  "investment_scam", "pig_butchering", "ransomware", "other",
];
const PRIORITIES = ["low", "medium", "high", "critical"];
const STATUSES = ["new", "investigating", "documented", "submitted", "law_enforcement", "recovering", "recovered", "closed"];

// Parse a textarea (newline/comma separated) into a clean string array.
function toArray(text) {
  return String(text || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Edit an InvestigationCase — lets authorized personnel add data and targets
 * (scammer wallets, domains, IPs, monitored wallets, transaction hashes,
 * suspect details) directly into the case record. Gated by MutateGuard in the
 * caller; this modal performs no role check itself.
 */
export default function EditInvestigationCaseModal({ caseItem, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const si = caseItem?.scammer_info || {};
  const sd = caseItem?.suspect_details || {};
  const ps = sd.primary_suspect || {};
  const [form, setForm] = useState({
    case_title: caseItem?.case_title || "",
    case_number: caseItem?.case_number || "",
    victim_name: caseItem?.victim_name || "",
    victim_email: caseItem?.victim_email || "",
    fraud_type: caseItem?.fraud_type || "other",
    priority: caseItem?.priority || caseItem?.case_priority || "medium",
    status: caseItem?.status || "new",
    amount_stolen_usd: caseItem?.amount_stolen_usd ?? "",
    cryptocurrency: caseItem?.cryptocurrency || "",
    blockchain: caseItem?.blockchain || "",
    assigned_investigator: caseItem?.assigned_investigator || "",
    description: caseItem?.description || "",
    // Scammer info
    scammer_wallets: (si.wallet_addresses || []).join("\n"),
    scammer_email: si.email || "",
    scammer_phone: si.phone || "",
    scammer_website: si.website || "",
    // Suspect details
    suspect_wallets: (sd.wallet_addresses || []).join("\n"),
    suspect_domains: (sd.websites_domains || []).join("\n"),
    suspect_ips: (sd.ip_addresses || []).join("\n"),
    suspect_name: ps.name || "",
    suspect_email: ps.email || "",
    suspect_phone: ps.phone || "",
    suspect_location: ps.location || "",
    // Case-level crypto
    monitored_wallets: (caseItem?.monitored_wallets || []).join("\n"),
    transaction_hashes: (caseItem?.transaction_hashes || []).join("\n"),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.case_title.trim()) { toast.error("Case title is required"); return; }
    setSaving(true);
    try {
      const update = {
        case_title: form.case_title.trim(),
        case_number: form.case_number.trim() || undefined,
        victim_name: form.victim_name.trim() || undefined,
        victim_email: form.victim_email.trim() || undefined,
        fraud_type: form.fraud_type,
        priority: form.priority,
        case_priority: form.priority,
        status: form.status,
        amount_stolen_usd: form.amount_stolen_usd ? Number(form.amount_stolen_usd) : 0,
        cryptocurrency: form.cryptocurrency.trim() || undefined,
        blockchain: form.blockchain.trim() || undefined,
        assigned_investigator: form.assigned_investigator.trim() || undefined,
        description: form.description.trim() || undefined,
        scammer_info: {
          ...(caseItem?.scammer_info || {}),
          wallet_addresses: toArray(form.scammer_wallets),
          email: form.scammer_email.trim() || undefined,
          phone: form.scammer_phone.trim() || undefined,
          website: form.scammer_website.trim() || undefined,
        },
        suspect_details: {
          ...(caseItem?.suspect_details || {}),
          wallet_addresses: toArray(form.suspect_wallets),
          websites_domains: toArray(form.suspect_domains),
          ip_addresses: toArray(form.suspect_ips),
          primary_suspect: {
            ...(caseItem?.suspect_details?.primary_suspect || {}),
            name: form.suspect_name.trim() || undefined,
            email: form.suspect_email.trim() || undefined,
            phone: form.suspect_phone.trim() || undefined,
            location: form.suspect_location.trim() || undefined,
          },
        },
        monitored_wallets: toArray(form.monitored_wallets),
        transaction_hashes: toArray(form.transaction_hashes),
        last_activity: new Date().toISOString(),
      };
      await base44.entities.InvestigationCase.update(caseItem.id, update);
      await logAuditEvent({
        action: "case_edited",
        objectType: "case",
        objectId: caseItem.id,
        caseId: caseItem.id,
        description: `Case details updated by authorized personnel`,
      }).catch(() => {});
      toast.success("Case updated");
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error("Failed to update case: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0f1419] border-white/15 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Case — add data &amp; targets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-cyan-400/70 font-semibold">Case details</p>
            <div><Label className="text-gray-300">Case Title *</Label><Input value={form.case_title} onChange={(e) => set("case_title", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-300">Case Number</Label><Input value={form.case_number} onChange={(e) => set("case_number", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
              <div><Label className="text-gray-300">Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-300">Victim Name</Label><Input value={form.victim_name} onChange={(e) => set("victim_name", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
              <div><Label className="text-gray-300">Victim Email</Label><Input value={form.victim_email} onChange={(e) => set("victim_email", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-gray-300">Fraud Type</Label>
                <Select value={form.fraud_type} onValueChange={(v) => set("fraud_type", v)}>
                  <SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{FRAUD_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-gray-300">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                  <SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-gray-300">Amount Stolen (USD)</Label><Input type="number" value={form.amount_stolen_usd} onChange={(e) => set("amount_stolen_usd", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-gray-300">Cryptocurrency</Label><Input value={form.cryptocurrency} onChange={(e) => set("cryptocurrency", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" placeholder="ETH, BTC…" /></div>
              <div><Label className="text-gray-300">Blockchain</Label><Input value={form.blockchain} onChange={(e) => set("blockchain", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" placeholder="ethereum…" /></div>
              <div><Label className="text-gray-300">Assigned Investigator</Label><Input value={form.assigned_investigator} onChange={(e) => set("assigned_investigator", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" placeholder="email" /></div>
            </div>
            <div><Label className="text-gray-300">Description</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white min-h-[70px]" /></div>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-cyan-400/70 font-semibold">Scammer info</p>
            <div><Label className="text-gray-300">Scammer Wallet Addresses <span className="text-gray-600">(one per line)</span></Label><Textarea value={form.scammer_wallets} onChange={(e) => set("scammer_wallets", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white font-mono text-xs min-h-[60px]" placeholder="0x…&#10;bc1q…" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-gray-300">Scammer Email</Label><Input value={form.scammer_email} onChange={(e) => set("scammer_email", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
              <div><Label className="text-gray-300">Scammer Phone</Label><Input value={form.scammer_phone} onChange={(e) => set("scammer_phone", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
              <div><Label className="text-gray-300">Scammer Website</Label><Input value={form.scammer_website} onChange={(e) => set("scammer_website", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-cyan-400/70 font-semibold">Suspect details</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-300">Primary Suspect Name</Label><Input value={form.suspect_name} onChange={(e) => set("suspect_name", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
              <div><Label className="text-gray-300">Suspect Location</Label><Input value={form.suspect_location} onChange={(e) => set("suspect_location", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-gray-300">Suspect Email</Label><Input value={form.suspect_email} onChange={(e) => set("suspect_email", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
              <div><Label className="text-gray-300">Suspect Phone</Label><Input value={form.suspect_phone} onChange={(e) => set("suspect_phone", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
            </div>
            <div><Label className="text-gray-300">Suspect Wallet Addresses <span className="text-gray-600">(one per line)</span></Label><Textarea value={form.suspect_wallets} onChange={(e) => set("suspect_wallets", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white font-mono text-xs min-h-[60px]" /></div>
            <div><Label className="text-gray-300">Websites / Domains <span className="text-gray-600">(one per line)</span></Label><Textarea value={form.suspect_domains} onChange={(e) => set("suspect_domains", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white font-mono text-xs min-h-[50px]" /></div>
            <div><Label className="text-gray-300">IP Addresses <span className="text-gray-600">(one per line)</span></Label><Textarea value={form.suspect_ips} onChange={(e) => set("suspect_ips", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white font-mono text-xs min-h-[50px]" /></div>
          </section>

          <section className="space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-cyan-400/70 font-semibold">Blockchain targets</p>
            <div><Label className="text-gray-300">Monitored Wallets <span className="text-gray-600">(one per line)</span></Label><Textarea value={form.monitored_wallets} onChange={(e) => set("monitored_wallets", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white font-mono text-xs min-h-[60px]" /></div>
            <div><Label className="text-gray-300">Transaction Hashes <span className="text-gray-600">(one per line)</span></Label><Textarea value={form.transaction_hashes} onChange={(e) => set("transaction_hashes", e.target.value)} className="bg-[#0a0f1a] border-white/10 text-white font-mono text-xs min-h-[60px]" /></div>
          </section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/15 text-gray-200">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">{saving ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Saving…</> : "Save Changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}