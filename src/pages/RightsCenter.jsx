import { useState } from "react";
import { usePrivacyHub } from "@/lib/usePrivacyHub";
import { PRIVACY_COMPANIES } from "@/lib/privacyHubData";
import { FileText, Plus, Clock, CheckCircle, AlertTriangle, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays, differenceInDays } from "date-fns";

const REQUEST_TYPES = ["Access", "Deletion", "Opt-Out of Sale", "Correction", "Portability"];
const JURISDICTIONS = ["USA (CCPA)", "European Union (GDPR)", "United Kingdom (UK GDPR)", "Canada (PIPEDA)", "Other"];
const DEADLINES = { "USA (CCPA)": 45, "European Union (GDPR)": 30, "United Kingdom (UK GDPR)": 30, "Canada (PIPEDA)": 30, "Other": 30 };

const STATUS_COLORS = {
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  acknowledged: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  completed: "bg-green-500/20 text-green-400 border-green-500/40",
  overdue: "bg-red-500/20 text-red-400 border-red-500/40",
  disputed: "bg-orange-500/20 text-orange-400 border-orange-500/40",
};

function generateLetter(company, type, jurisdiction, name, email) {
  const date = format(new Date(), "MMMM d, yyyy");
  const days = DEADLINES[jurisdiction] || 30;
  const law = jurisdiction.includes("GDPR") ? "General Data Protection Regulation (GDPR)" :
    jurisdiction.includes("CCPA") ? "California Consumer Privacy Act (CCPA)" :
    jurisdiction.includes("PIPEDA") ? "Personal Information Protection and Electronic Documents Act (PIPEDA)" : "applicable privacy law";
  const right = type === "Deletion" ? "erasure/deletion of" : type === "Access" ? "access to" : type === "Opt-Out of Sale" ? "opt-out of the sale of" : type === "Correction" ? "correction of" : "portability of";
  return `${name}
${email}
${date}

Privacy Officer
${company.name}
${company.email}

Re: Request to ${type} Personal Information Under ${law}

Dear Privacy Officer,

I am writing to request ${right} all personal information that ${company.name} has collected about me, pursuant to my rights under ${law}.

Please process this request for the following individual:
Name: ${name}
Email: ${email}

Please confirm receipt of this request and completion within ${days} days as required by law. If you need any additional information to verify my identity, please contact me at the email address above.

Sincerely,
${name}`;
}

export default function RightsCenter() {
  const { hub, updateHub, addLog, user } = usePrivacyHub();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ company: "", customEmail: "", requestType: "Deletion", jurisdiction: "USA (CCPA)" });
  const [preview, setPreview] = useState(null);
  const [companySearch, setCompanySearch] = useState("");

  const requests = hub?.rights_requests || [];
  const filteredCompanies = PRIVACY_COMPANIES.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).slice(0, 8);
  const selectedCompany = PRIVACY_COMPANIES.find(c => c.name === form.company) || { name: form.company, email: form.customEmail };

  const generatePreview = () => {
    if (!form.company) { toast.error("Select a company"); return; }
    const letter = generateLetter(selectedCompany, form.requestType, form.jurisdiction, user?.full_name || "Your Name", user?.email || "your@email.com");
    setPreview(letter);
    setStep(4);
  };

  const sendRequest = () => {
    if (!preview) return;
    const deadline = addDays(new Date(), DEADLINES[form.jurisdiction] || 30);
    const req = {
      requestId: Date.now().toString(),
      company: selectedCompany.name,
      privacyEmail: selectedCompany.email || form.customEmail,
      requestType: form.requestType,
      jurisdiction: form.jurisdiction,
      generatedLetter: preview,
      sentAt: new Date().toISOString(),
      deadline: deadline.toISOString(),
      status: "sent",
      responseNotes: "",
    };
    updateHub(prev => ({ ...prev, rights_requests: [req, ...(prev.rights_requests || [])] }));
    addLog("Rights Center", `Sent ${form.requestType} request to ${selectedCompany.name}`, "success", 2);
    toast.success(`Request sent to ${selectedCompany.name}`);
    setStep(1); setForm({ company: "", customEmail: "", requestType: "Deletion", jurisdiction: "USA (CCPA)" }); setPreview(null);
    setCompanySearch("");
  };

  const downloadLetter = () => {
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `privacy-request-${form.company.replace(/\s/g,"-")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = (id, status) => {
    updateHub(prev => ({ ...prev, rights_requests: (prev.rights_requests || []).map(r => r.requestId === id ? { ...r, status } : r) }));
    if (status === "completed") addLog("Rights Center", `Request completed by company`, "success", 3);
    toast.success("Status updated");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f1419] to-[#0a0a0a] p-4 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Rights Request Center</h1>
          <p className="text-gray-400 text-xs">Generate and track formal data rights requests under GDPR, CCPA, PIPEDA & more</p>
        </div>
      </div>

      {/* Rights Banner */}
      <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
        <h3 className="text-green-400 font-semibold text-sm mb-2">Your Privacy Rights</h3>
        <div className="grid sm:grid-cols-3 gap-2">
          {["Right to Know / Access", "Right to Delete (Erasure)", "Right to Opt-Out of Sale", "Right to Correct", "Right to Data Portability", "Right to Non-Discrimination"].map(r => (
            <div key={r} className="flex items-center gap-1.5 text-xs text-gray-300"><CheckCircle className="w-3 h-3 text-green-400 shrink-0" />{r}</div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Request Builder */}
        <div className="p-5 bg-gray-900/60 border border-gray-800/60 rounded-xl space-y-4">
          <h2 className="text-white font-semibold">New Request</h2>
          {/* Step 1 - Company */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">1. Select Company</label>
            <Input value={companySearch} onChange={e => { setCompanySearch(e.target.value); setForm(p => ({...p, company: ""})); }} placeholder="Search company..." className="bg-gray-950/60 border-gray-700/50 text-white mb-2" />
            {companySearch && !form.company && (
              <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                {filteredCompanies.map(c => (
                  <button key={c.name} onClick={() => { setForm(p => ({...p, company: c.name, customEmail: c.email})); setCompanySearch(c.name); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 border-b border-gray-800/50 last:border-0">
                    <span>{c.name}</span><span className="text-gray-600 text-xs ml-2">{c.email}</span>
                  </button>
                ))}
                <button onClick={() => { setForm(p => ({...p, company: companySearch})); }}
                  className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-gray-800">
                  + Use "{companySearch}" (custom)
                </button>
              </div>
            )}
            {form.company && <p className="text-xs text-green-400">✓ {form.company}</p>}
          </div>
          {/* Step 2 - Type */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">2. Request Type</label>
            <div className="flex flex-wrap gap-2">
              {REQUEST_TYPES.map(t => (
                <button key={t} onClick={() => setForm(p => ({...p, requestType: t}))}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${form.requestType === t ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-gray-900/60 text-gray-400 border-gray-700/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          {/* Step 3 - Jurisdiction */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">3. Your Jurisdiction</label>
            <select value={form.jurisdiction} onChange={e => setForm(p => ({...p, jurisdiction: e.target.value}))} className="w-full bg-gray-950/60 border border-gray-700/50 text-gray-300 rounded-md px-3 py-2 text-sm">
              {JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <Button onClick={generatePreview} className="w-full bg-green-600 hover:bg-green-700 text-white">Preview Request Letter</Button>
          {/* Letter Preview */}
          {preview && (
            <div className="space-y-3">
              <textarea readOnly value={preview} className="w-full h-48 bg-gray-950 border border-gray-700/50 text-gray-300 rounded-lg p-3 text-xs font-mono resize-none" />
              <div className="flex gap-2">
                <Button onClick={sendRequest} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm">Send Request</Button>
                <Button onClick={downloadLetter} variant="outline" className="border-gray-700 text-gray-400 text-sm"><Download className="w-4 h-4 mr-1" />PDF</Button>
              </div>
            </div>
          )}
        </div>

        {/* Active Requests */}
        <div className="p-5 bg-gray-900/60 border border-gray-800/60 rounded-xl">
          <h2 className="text-white font-semibold mb-4">Active Requests ({requests.length})</h2>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500"><FileText className="w-8 h-8 mx-auto mb-2 text-gray-700" /><p>No requests yet.</p></div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {requests.map(req => {
                const daysLeft = differenceInDays(new Date(req.deadline), new Date());
                const isOverdue = daysLeft < 0;
                const status = isOverdue && req.status === "sent" ? "overdue" : req.status;
                return (
                  <div key={req.requestId} className={`p-3 rounded-lg border ${isOverdue && status === "overdue" ? "border-red-500/30 bg-red-500/5" : "border-gray-800/60 bg-gray-950/60"}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                      <div>
                        <span className="text-white text-sm font-medium">{req.company}</span>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge className={`text-[10px] border ${STATUS_COLORS[status]}`}>{status}</Badge>
                          <Badge className="text-[10px] bg-gray-800 text-gray-400 border-gray-700">{req.requestType}</Badge>
                          <span className="text-gray-600 text-[10px]">{req.jurisdiction}</span>
                        </div>
                      </div>
                      <select value={req.status} onChange={e => updateStatus(req.requestId, e.target.value)} className="bg-gray-900 border border-gray-700/50 text-gray-400 rounded text-xs px-2 py-1">
                        {["sent","acknowledged","completed","disputed"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(req.sentAt), "MMM d")}</span>
                      <span className={isOverdue ? "text-red-400 font-bold" : daysLeft <= 7 ? "text-orange-400" : "text-gray-500"}>
                        {isOverdue ? `⚠️ ${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}