import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Crosshair, Loader2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/platform/EmptyState";
import { HermesAPI } from "@/lib/hermesClient";
import { TARGET_STATUS_STYLES } from "@/components/platform/investigationStyles";
import { logAuditEvent } from "@/lib/auditLogger";
import { toast } from "sonner";

const TARGET_TYPES = ["wallet_address", "transaction_hash", "token_contract", "blockchain_network", "domain", "url", "ip_address", "email", "phone", "username", "social_identifier", "other"];
const NETWORKS = ["ethereum", "bitcoin", "polygon", "bsc", "arbitrum", "base", "solana", "tron", "other"];

export default function TargetsTab({ caseId, hermesState }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [investigating, setInvestigating] = useState(null);
  const qc = useQueryClient();

  const { data: targets = [], isLoading } = useQuery({
    queryKey: ["targets", caseId],
    queryFn: () => base44.entities.InvestigationTarget.filter({ case_id: caseId }, "-created_date", 200),
    enabled: !!caseId,
  });

  const filtered = targets.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [t.value, t.label, t.description, t.network].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const investigate = async (target) => {
    setInvestigating(target.id);
    try {
      const res = await HermesAPI.submitTarget(caseId, { type: target.type, value: target.value, network: target.network });
      await base44.entities.InvestigationTarget.update(target.id, {
        status: res.status === "ok" ? "processing" : "failed",
        last_investigated: new Date().toISOString(),
        investigation_count: (target.investigation_count || 0) + 1,
      });
      await logAuditEvent({ action: "target_investigated", objectType: "target", objectId: target.id, caseId, description: `Submitted target to Hermes: ${target.value}` });
      if (res.status === "not_connected") toast.error("Hermes not connected. Connect Hermes to investigate targets.");
      else if (res.status === "backend_unavailable") toast.error("Hermes backend unavailable. Upgrade your plan.");
      else if (res.status === "ok") toast.success("Target submitted to Hermes for investigation.");
      else toast.error("Investigation failed: " + (res.error || "unknown"));
      qc.invalidateQueries({ queryKey: ["targets", caseId] });
    } catch (e) {
      toast.error("Failed: " + (e.message || e));
    } finally {
      setInvestigating(null);
    }
  };

  const handleDelete = async (target) => {
    if (!confirm(`Archive target "${target.value}"?`)) return;
    try {
      await base44.entities.InvestigationTarget.delete(target.id);
      await logAuditEvent({ action: "target_deleted", objectType: "target", objectId: target.id, caseId, description: `Archived target: ${target.value}` });
      qc.invalidateQueries({ queryKey: ["targets", caseId] });
      toast.success("Target archived");
    } catch (e) { toast.error("Failed: " + (e.message || e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search targets…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-[#0f1419] border-white/10 text-white" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All types</SelectItem>{TARGET_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 shrink-0" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1.5" />Add Target</Button>
      </div>

      {isLoading ? (
        <EmptyState variant="loading" title="Loading targets…" />
      ) : filtered.length === 0 ? (
        <EmptyState variant="empty" icon={Crosshair} title={targets.length === 0 ? "No targets yet" : "No targets match your filters"} description={targets.length === 0 ? "Add investigation targets (wallets, domains, IPs, etc.) for Hermes to analyze." : "Try adjusting your search."} action={targets.length === 0 ? <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1.5" />Add Target</Button> : null} />
      ) : (
        <div className="rounded-lg border border-white/10 divide-y divide-white/5">
          {filtered.map((t) => {
            const statusCls = TARGET_STATUS_STYLES[t.status] || TARGET_STATUS_STYLES.pending;
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 group hover:bg-white/[0.02]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-white/10 text-gray-400 text-[10px]">{t.type.replace(/_/g, " ")}</Badge>
                    {t.network && <Badge variant="outline" className="border-white/10 text-gray-500 text-[10px] capitalize">{t.network}</Badge>}
                    <p className="text-sm text-white font-mono truncate">{t.value}</p>
                  </div>
                  {(t.label || t.description) && <p className="text-xs text-gray-500 truncate mt-0.5">{t.label}{t.label && t.description ? " — " : ""}{t.description}</p>}
                </div>
                <Badge variant="outline" className={`text-[10px] capitalize ${statusCls}`}>{(t.status || "pending").replace(/_/g, " ")}</Badge>
                <Button size="sm" variant="outline" disabled={investigating === t.id} onClick={() => investigate(t)} className="border-cyan-500/30 text-cyan-400 h-7 text-xs">
                  {investigating === t.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Crosshair className="w-3 h-3 mr-1" />}Investigate
                </Button>
                <button onClick={() => setEditTarget(t)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-cyan-400"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(t)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            );
          })}
        </div>
      )}

      {(showAdd || editTarget) && <TargetModal caseId={caseId} target={editTarget} onClose={() => { setShowAdd(false); setEditTarget(null); }} onSaved={() => { setShowAdd(false); setEditTarget(null); qc.invalidateQueries({ queryKey: ["targets", caseId] }); }} />}
    </div>
  );
}

function TargetModal({ caseId, target, onClose, onSaved }) {
  const [form, setForm] = useState({
    type: target?.type || "wallet_address",
    value: target?.value || "",
    network: target?.network || "ethereum",
    label: target?.label || "",
    description: target?.description || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.value.trim()) { toast.error("Target value is required"); return; }
    setSaving(true);
    try {
      if (target) {
        await base44.entities.InvestigationTarget.update(target.id, form);
        await logAuditEvent({ action: "target_modified", objectType: "target", objectId: target.id, caseId, description: `Modified target: ${form.value}` });
      } else {
        const created = await base44.entities.InvestigationTarget.create({ ...form, case_id: caseId, source: "manual", status: "pending" });
        await logAuditEvent({ action: "target_created", objectType: "target", objectId: created.id, caseId, description: `Created target: ${form.value}` });
      }
      toast.success(target ? "Target updated" : "Target added");
      onSaved();
    } catch (e) { toast.error("Failed: " + (e.message || e)); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#0f1419] border-white/15 text-white max-w-lg">
        <DialogHeader><DialogTitle className="text-white">{target ? "Edit Target" : "Add Target"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-400">Type</label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{TARGET_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="text-xs text-gray-400">Value *</label><Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="bg-[#0a0f1a] border-white/10 text-white font-mono" placeholder="0x... / domain.com / 192.168.1.1" /></div>
          <div><label className="text-xs text-gray-400">Network (if blockchain)</label><Select value={form.network} onValueChange={(v) => setForm({ ...form, network: v })}><SelectTrigger className="bg-[#0a0f1a] border-white/10 text-white"><SelectValue /></SelectTrigger><SelectContent>{NETWORKS.map((n) => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="text-xs text-gray-400">Label</label><Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="bg-[#0a0f1a] border-white/10 text-white" /></div>
          <div><label className="text-xs text-gray-400">Description</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#0a0f1a] border-white/10 text-white min-h-[60px]" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-white/15 text-gray-200">Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">{saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}{target ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}