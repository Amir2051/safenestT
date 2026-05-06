import React, { useState } from "react";
import { FileText, Plus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const REQUEST_TYPES = [
  { id: "access", label: "Right to Access", desc: "Request a copy of all data a company holds about you (GDPR Art. 15 / CCPA)" },
  { id: "delete", label: "Right to Delete", desc: "Request deletion of your personal data (GDPR Art. 17 / CCPA)" },
  { id: "portability", label: "Right to Portability", desc: "Request your data in a machine-readable format (GDPR Art. 20)" },
  { id: "correct", label: "Right to Correct", desc: "Request correction of inaccurate personal data (GDPR Art. 16)" },
  { id: "opt_out", label: "Opt Out of Sale", desc: "Opt out of the sale of your personal information (CCPA)" },
];

const statusIcon = { pending: <Clock className="w-4 h-4 text-yellow-400" />, sent: <CheckCircle className="w-4 h-4 text-blue-400" />, completed: <CheckCircle className="w-4 h-4 text-green-400" /> };

export default function RightsCenter() {
  const [requests, setRequests] = useState([]);
  const [company, setCompany] = useState("");
  const [selectedType, setSelectedType] = useState("delete");
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    if (!company.trim()) return;
    setRequests(prev => [...prev, { id: Date.now(), company: company.trim(), type: selectedType, status: "pending", date: new Date().toLocaleDateString() }]);
    setCompany("");
    setShowForm(false);
  };

  const typeLabel = (id) => REQUEST_TYPES.find(t => t.id === id)?.label || id;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-400" /> Rights Request Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">Submit CCPA/GDPR data rights requests to companies</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> New Request
        </Button>
      </div>

      {showForm && (
        <div className="p-5 rounded-xl border border-green-500/30 bg-green-500/5 space-y-4">
          <h2 className="text-white font-semibold">Create New Rights Request</h2>
          <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name (e.g. Google, Meta...)"
            className="bg-gray-900 border-gray-700 text-white placeholder-gray-500" />
          <div className="space-y-2">
            {REQUEST_TYPES.map(t => (
              <label key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedType === t.id ? "border-green-500/50 bg-green-500/10" : "border-gray-700 bg-gray-900/30 hover:border-gray-600"}`}>
                <input type="radio" name="type" value={t.id} checked={selectedType === t.id} onChange={() => setSelectedType(t.id)} className="mt-1 accent-green-500" />
                <div>
                  <div className="text-white text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-gray-400">{t.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <Button onClick={submit} className="w-full bg-green-600 hover:bg-green-700 text-white">Submit Request</Button>
        </div>
      )}

      {requests.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No requests yet. Create your first rights request above.</p>
        </div>
      )}

      <div className="space-y-3">
        {requests.map(r => (
          <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-700/50 bg-gray-900/30">
            <div className="flex items-center gap-3">
              {statusIcon[r.status]}
              <div>
                <div className="text-white font-medium text-sm">{r.company}</div>
                <div className="text-xs text-gray-400">{typeLabel(r.type)} · {r.date}</div>
              </div>
            </div>
            <span className="text-xs text-yellow-400 capitalize">{r.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}