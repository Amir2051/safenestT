import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { FileText, FileJson, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Builds a clean, formatted PDF case report directly in the browser
// — no backend function required.
function buildCasePDF(caseData) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const M = 40;
  const W = doc.internal.pageSize.getWidth() - M * 2;
  let y = M;

  const line = (text, size = 10, bold = false, color = [40, 40, 40], gap = 4) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const split = doc.splitTextToSize(String(text || ""), W);
    split.forEach((s) => {
      if (y > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; }
      doc.text(s, M, y);
      y += size + gap;
    });
  };

  const section = (title) => {
    y += 8;
    doc.setFillColor(15, 20, 25);
    doc.rect(M, y - 12, W, 20, "F");
    doc.setTextColor(6, 182, 212);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, M + 8, y + 2);
    y += 18;
    doc.setTextColor(40, 40, 40);
  };

  const row = (label, val) => {
    if (!val && val !== 0) return;
    line(`${label}:  ${val}`, 10, false, [70, 70, 70], 3);
  };

  // Header
  doc.setFillColor(10, 15, 25);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, "F");
  doc.setTextColor(6, 182, 212);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("SafeNestT — Case Report", M, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Generated ${new Date().toLocaleString()}`, M, 46);
  y = 80;

  // Title
  line(caseData.case_title || caseData.case_number || "Untitled Case", 15, true, [15, 23, 42]);
  row("Case Number", caseData.case_number);
  row("Status", caseData.status);
  row("Priority / Urgency", caseData.priority || caseData.case_priority || caseData.urgency);
  row("Progress", `${caseData.investigation_progress || 0}%`);
  row("Issue Type", caseData.issue_type);
  row("Incident Classification", caseData.incident_classification);
  row("Created", caseData.created_date && new Date(caseData.created_date).toLocaleString());

  section("Client / Victim");
  row("Name", caseData.client_name || caseData.victim_name);
  row("Email", caseData.client_email || caseData.victim_email);
  row("Phone", caseData.phone_number || caseData.victim_phone);
  if (caseData.address_information) {
    row("Address", [
      caseData.address_information.street_address,
      caseData.address_information.apartment_unit,
      caseData.address_information.city,
      caseData.address_information.state_province,
      caseData.address_information.zip_postal_code,
      caseData.address_information.country,
    ].filter(Boolean).join(", "));
  }

  section("Incident & Financial");
  row("Amount Stolen (USD)", caseData.amount_lost || caseData.amount_stolen_usd
    ? `$${Number(caseData.amount_lost || caseData.amount_stolen_usd || 0).toLocaleString()}` : "");
  row("Recovery Amount", caseData.recovery_amount ? `$${Number(caseData.recovery_amount).toLocaleString()}` : "");
  row("Cryptocurrency", caseData.cryptocurrency);
  row("Blockchain", caseData.blockchain);
  row("Incident Date", caseData.incident_date || caseData.incident_timestamp);
  row("Description", caseData.description);

  section("Wallets & Blockchain");
  row("Victim Wallet", caseData.victim_wallet);
  row("Scammer Wallet", caseData.scammer_wallet);
  if (caseData.monitored_wallets?.length) {
    row("Monitored Wallets", caseData.monitored_wallets.join("; "));
  }
  if (caseData.transaction_hashes?.length) {
    row("Transaction Hashes", caseData.transaction_hashes.join("; "));
  }

  section("Suspect / Scammer");
  const si = caseData.scammer_info || caseData.suspect_details?.primary_suspect || {};
  row("Suspect Name", si.name);
  row("Suspect Email", si.email);
  row("Suspect Phone", si.phone || si.contact);
  row("Suspect Location", si.location);
  if (si.wallet_addresses?.length || si.wallet_addresses) {
    row("Suspect Wallets", (si.wallet_addresses || []).join("; "));
  }
  if (si.known_emails?.length) row("Known Emails", si.known_emails.join("; "));
  if (si.websites_domains?.length || si.websites?.length) {
    row("Websites", (si.websites_domains || si.websites || []).join("; "));
  }
  if (si.notes) row("Notes", si.notes);

  section("Legal & References");
  row("IC3 Complaint Number", caseData.ic3_complaint_number);
  row("Federal Case Number", caseData.federal_case_number);
  const le = caseData.law_enforcement_authorization || {};
  row("LE Authorized", le.authorized ? "Yes" : "No");
  row("Authorized By", le.full_name);
  if (le.agencies?.length) row("Agencies", le.agencies.join(", "));

  section("Payment Transactions");
  const txns = caseData.payment_transactions || caseData.transactions || [];
  if (txns.length === 0) line("No payment transactions recorded.", 10, false, [150, 150, 150]);
  txns.forEach((t, i) => {
    line(`${i + 1}. ${t.payment_method || ""} — $${Number(t.amount || 0).toLocaleString()} ${t.date ? `(${new Date(t.date).toLocaleDateString()})` : ""} ${t.transaction_id ? `Ref: ${t.transaction_id}` : ""}`, 9, false, [80, 80, 80], 3);
    if (t.notes) line(`   Notes: ${t.notes}`, 9, false, [120, 120, 120], 2);
  });

  section("Evidence Files");
  const ev = caseData.evidence_files || caseData.evidence_log || [];
  if (ev.length === 0) line("No evidence files recorded.", 10, false, [150, 150, 150]);
  ev.forEach((e, i) => {
    const name = e.name || e.description || `File ${i + 1}`;
    const dt = e.uploaded_date || e.timestamp;
    line(`${i + 1}. ${name}${dt ? ` — ${new Date(dt).toLocaleString()}` : ""}`, 9, false, [80, 80, 80], 3);
    if (e.url || e.file_url) line(`   ${e.url || e.file_url}`, 8, false, [6, 182, 212], 2);
    if (e.summary?.analysis_text) line(`   Summary: ${e.summary.analysis_text}`, 8, false, [120, 120, 120], 2);
  });

  section("Case Notes");
  const notes = caseData.case_notes || [];
  if (notes.length === 0) line("No case notes recorded.", 10, false, [150, 150, 150]);
  notes.forEach((n) => {
    line(`[${n.timestamp ? new Date(n.timestamp).toLocaleString() : "—"}] ${n.author || ""}: ${n.note || n.type || ""}`, 9, false, [80, 80, 80], 3);
  });

  // Footer page numbers
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`SafeNestT Confidential — Page ${i} of ${pages}`, M, doc.internal.pageSize.getHeight() - 16);
  }

  return doc;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

export default function CaseDownloadButtons({ caseData, size = "sm", variant = "outline", className = "" }) {
  const [busy, setBusy] = useState(null);

  const safeName = (caseData.case_number || caseData.id || "case").replace(/[^a-z0-9_-]/gi, "_");

  const handlePDF = () => {
    setBusy("pdf");
    try {
      const doc = buildCasePDF(caseData);
      doc.save(`Case_${safeName}.pdf`);
      toast.success("PDF downloaded to your device");
    } catch (e) {
      toast.error("PDF failed: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleJSON = () => {
    setBusy("json");
    try {
      const clean = JSON.parse(JSON.stringify(caseData));
      delete clean.ai_analysis_image;
      const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
      downloadBlob(blob, `Case_${safeName}.json`);
      toast.success("JSON downloaded to your device");
    } catch (e) {
      toast.error("Export failed: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = () => {
    setBusy("print");
    try {
      const doc = buildCasePDF(caseData);
      doc.autoPrint();
      const blobUrl = doc.output("bloburl");
      const w = window.open(blobUrl, "_blank");
      if (!w) toast.error("Pop-up blocked — allow pop-ups to print");
    } catch (e) {
      toast.error("Print failed: " + e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <Button size={size} variant={variant} onClick={handlePDF} disabled={!!busy}
        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
        {busy === "pdf" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileText className="w-3 h-3 mr-1" />}
        Download PDF
      </Button>
      <Button size={size} variant={variant} onClick={handleJSON} disabled={!!busy}
        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
        {busy === "json" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileJson className="w-3 h-3 mr-1" />}
        Download JSON
      </Button>
      <Button size={size} variant={variant} onClick={handlePrint} disabled={!!busy}
        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
        {busy === "print" ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Printer className="w-3 h-3 mr-1" />}
        Print
      </Button>
    </div>
  );
}