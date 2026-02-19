import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, Send, CheckCircle, X, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SCAM_TYPES = [
  "Cryptocurrency Fraud",
  "Romance Scam",
  "Investment Scam / Pig Butchering",
  "Phishing / Email Scam",
  "Tech Support Fraud",
  "Government Impersonation",
  "Business Email Compromise",
  "Identity Theft",
  "Online Shopping Fraud",
  "Lottery / Prize Scam",
  "Ransomware / Extortion",
  "Social Media Scam",
  "SIM Swap / Account Takeover",
  "Other"
];

export default function ScamReportModal({ open, onClose }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", scam_type: "",
    description: "", suspect_website: "", suspect_phone: ""
  });
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.scam_type || !form.description) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setUploading(true);
    try {
      let uploadedUrls = [];
      for (const file of files) {
        const res = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(res.file_url);
      }

      await base44.entities.MyCase.create({
        client_name: form.full_name,
        client_email: form.email,
        phone_number: form.phone,
        issue_type: "scam",
        incident_classification: "other_cyber_fraud",
        description: `[U.S. Cybercrime Resource Report]\nScam Type: ${form.scam_type}\n\n${form.description}${form.suspect_website ? `\n\nSuspect Website/Contact: ${form.suspect_website} ${form.suspect_phone}` : ""}`,
        status: "Pending",
        urgency: "High",
        evidence_files: uploadedUrls.map((url, i) => ({
          url, name: files[i]?.name || "screenshot", type: "screenshot",
          uploaded_date: new Date().toISOString()
        })),
        created_by_name: form.full_name,
        created_by_email: form.email,
        source_type: "manual",
        metadata: JSON.stringify({ source: "us_cybercrime_resources_page" })
      });

      setSubmitted(true);
    } catch (err) {
      toast.error("Submission failed: " + err.message);
    }
    setUploading(false);
  };

  const handleClose = () => {
    setForm({ full_name: "", email: "", phone: "", scam_type: "", description: "", suspect_website: "", suspect_phone: "" });
    setFiles([]);
    setSubmitted(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0a0f1a] border-red-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              Report a Scam
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Your report will be reviewed by our team and may be forwarded to appropriate U.S. authorities.
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Report Submitted</h3>
            <p className="text-gray-400 text-center text-sm max-w-sm">
              Thank you for your report. Our team will review it and may contact you. You can also track your case in <strong className="text-cyan-400">My Cases</strong>.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button onClick={handleClose} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30">
                Close
              </Button>
              <Button
                onClick={() => { handleClose(); window.location.href = "/MyCases"; }}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                View My Cases
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-1.5 block">Full Name <span className="text-red-400">*</span></Label>
                <Input
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Your full name"
                  className="bg-[#0f1419] border-gray-700 text-white focus:border-red-500/50"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1.5 block">Email Address <span className="text-red-400">*</span></Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-[#0f1419] border-gray-700 text-white focus:border-red-500/50"
                  required
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1.5 block">Phone Number</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="bg-[#0f1419] border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1.5 block">Type of Scam <span className="text-red-400">*</span></Label>
                <Select value={form.scam_type} onValueChange={v => setForm({ ...form, scam_type: v })}>
                  <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white">
                    <SelectValue placeholder="Select scam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCAM_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-gray-300 mb-1.5 block">What Happened? <span className="text-red-400">*</span></Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what happened in as much detail as possible — how you were contacted, what was promised, how money or info was taken..."
                className="bg-[#0f1419] border-gray-700 text-white min-h-[120px]"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 mb-1.5 block">Suspect Website or Email</Label>
                <Input
                  value={form.suspect_website}
                  onChange={e => setForm({ ...form, suspect_website: e.target.value })}
                  placeholder="e.g. fake-exchange.com"
                  className="bg-[#0f1419] border-gray-700 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 mb-1.5 block">Suspect Phone Number</Label>
                <Input
                  value={form.suspect_phone}
                  onChange={e => setForm({ ...form, suspect_phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="bg-[#0f1419] border-gray-700 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-300 mb-1.5 block flex items-center gap-2">
                <Upload className="w-4 h-4" /> Upload Screenshots (Optional)
              </Label>
              <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-red-500/40 transition-colors">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="scam-files"
                />
                <label htmlFor="scam-files" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Click to upload screenshots or PDFs</p>
                  {files.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                      {files.map((f, i) => (
                        <Badge key={i} className="bg-cyan-500/20 text-cyan-400 text-xs">{f.name}</Badge>
                      ))}
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-yellow-400 text-xs flex items-start gap-2">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                Your information is encrypted and handled confidentially. Only authorized SafeNestt staff will have access.
              </p>
            </div>

            <Button
              type="submit"
              disabled={uploading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 text-base"
            >
              {uploading ? (
                <><span className="animate-spin mr-2">⏳</span> Submitting Report...</>
              ) : (
                <><Send className="w-5 h-5 mr-2" /> Submit Report</>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}