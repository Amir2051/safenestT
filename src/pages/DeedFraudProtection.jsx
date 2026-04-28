import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Home, Upload, CheckCircle, FileText, Lock, ChevronRight,
  ChevronLeft, AlertTriangle, Calendar, User, Mail, Phone, Loader2, Eye, Clock
} from "lucide-react";
import { toast } from "sonner";

const NY_BOROUGHS = [
  "Bronx", "Brooklyn (Kings County)", "Manhattan (New York County)",
  "Queens", "Staten Island (Richmond County)", "Albany County",
  "Erie County", "Nassau County", "Suffolk County",
  "Westchester County", "Other NY County"
];

const ISSUE_TYPES = [
  { value: "unauthorized_deed_transfer", label: "Unauthorized Deed Transfer" },
  { value: "suspicious_ownership_change", label: "Suspicious Ownership Change" },
  { value: "forged_documents", label: "Forged Documents" },
  { value: "other", label: "Other (describe below)" }
];

const STEPS = ["Your Info", "Property Details", "Issue Details", "Documents", "Review & Submit"];

export default function DeedFraudProtection() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    submitter_name: "",
    submitter_email: "",
    submitter_phone: "",
    property_address: "",
    property_city: "",
    property_zip: "",
    borough_county: "",
    issue_type: "",
    issue_type_other: "",
    description: "",
    date_noticed: "",
    documents: [],
    id_document_url: ""
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setForm(f => ({
        ...f,
        submitter_name: u.full_name || "",
        submitter_email: u.email || ""
      }));
    }).catch(() => {});
  }, []);

  // Fetch user's own cases - RLS handles filtering by created_by OR submitter_email
  const { data: myCases = [], isLoading } = useQuery({
    queryKey: ["deed-fraud-cases", user?.email],
    queryFn: () => base44.entities.DeedFraudCase.list("-created_date", 100),
    enabled: !!user?.email,
    refetchOnMount: true,
    staleTime: 0
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const caseId = `DFC-${Date.now().toString().slice(-8)}`;
      const payload = {
        ...form,
        case_id: caseId,
        status: "New",
        priority: "Medium",
        nys_structured_data: {
          reporter: {
            name: form.submitter_name,
            email: form.submitter_email,
            phone: form.submitter_phone
          },
          property: {
            address: form.property_address,
            city: form.property_city,
            state: "New York",
            zip: form.property_zip,
            borough_county: form.borough_county
          },
          fraud_type: form.issue_type,
          fraud_description: form.description,
          date_discovered: form.date_noticed,
          reporting_date: new Date().toISOString(),
          documents_count: form.documents.length
        }
      };
      return base44.entities.DeedFraudCase.create(payload);
    },
    onSuccess: (data) => {
      setSubmitted(data);
      queryClient.invalidateQueries({ queryKey: ["deed-fraud-cases"] });
      toast.success("Case submitted successfully!");
    },
    onError: (err) => toast.error("Submission failed: " + err.message)
  });

  const handleDocUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingDocs(true);
    const uploaded = [];
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploaded.push({ name: file.name, url: file_url, type: file.type, uploaded_at: new Date().toISOString() });
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
    setForm(f => ({ ...f, documents: [...f.documents, ...uploaded] }));
    setUploadingDocs(false);
    toast.success(`${uploaded.length} document(s) uploaded`);
  };

  const handleIdUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingId(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, id_document_url: file_url }));
      toast.success("ID document uploaded");
    } catch { toast.error("Failed to upload ID"); }
    setUploadingId(false);
  };

  const canProceed = () => {
    if (step === 0) return form.submitter_name && form.submitter_email;
    if (step === 1) return form.property_address && form.borough_county;
    if (step === 2) return form.issue_type && form.description;
    return true;
  };

  const statusColors = {
    New: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
    "Under Review": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    Filed: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    "Filed with NYS": "bg-purple-500/20 text-purple-400 border-purple-500/50",
    Closed: "bg-gray-500/20 text-gray-400 border-gray-500/50"
  };

  const resetForm = () => {
    setSubmitted(null);
    setStep(0);
    setForm({
      submitter_name: user?.full_name || "",
      submitter_email: user?.email || "",
      submitter_phone: "",
      property_address: "",
      property_city: "",
      property_zip: "",
      borough_county: "",
      issue_type: "",
      issue_type_other: "",
      description: "",
      date_noticed: "",
      documents: [],
      id_document_url: ""
    });
  };

  if (submitted) {
    return (
      <div className="p-6 max-w-2xl mx-auto min-h-screen flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full space-y-6 text-center"
        >
          {/* Success icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-28 h-28 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-green-500/50 shadow-lg shadow-green-500/20"
          >
            <CheckCircle className="w-14 h-14 text-green-400" />
          </motion.div>

          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Case Filed Successfully!</h1>
            <p className="text-gray-400 text-lg">Your deed fraud report has been received and is now under review by our team.</p>
          </div>

          {/* Case details card */}
          <Card className="bg-[#1a2332] border-green-500/30 text-left">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-700">
                <span className="text-gray-400 text-sm">Case Reference ID</span>
                <span className="font-mono text-cyan-400 font-bold text-lg">{submitted.case_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Status</span>
                <Badge className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/50">New — Pending Review</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Property</span>
                <span className="text-white text-sm text-right max-w-[60%]">{submitted.property_address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Borough / County</span>
                <span className="text-white text-sm">{submitted.borough_county}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Documents Submitted</span>
                <span className="text-white text-sm">{submitted.documents?.length || 0} file(s)</span>
              </div>
            </CardContent>
          </Card>

          {/* What happens next */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left space-y-2">
            <p className="text-blue-400 font-semibold text-sm">What happens next?</p>
            <ul className="text-gray-300 text-sm space-y-1">
              <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">→</span> Our team will review your report within 24–48 hours</li>
              <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">→</span> You'll be contacted at <strong>{submitted.submitter_email}</strong></li>
              <li className="flex items-start gap-2"><span className="text-cyan-400 mt-0.5">→</span> Track your case status below under "My Cases"</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={resetForm}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:text-white flex-1"
            >
              Report Another Case
            </Button>
            <Button
              onClick={() => {
                resetForm();
                // Small timeout so the page re-renders before scrolling
                setTimeout(() => {
                  document.getElementById("my-cases-section")?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="bg-cyan-600 hover:bg-cyan-700 flex-1 font-semibold"
            >
              <Eye className="w-4 h-4 mr-2" /> View My Cases
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
          <Home className="w-7 h-7 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Deed Fraud Protection</h1>
          <p className="text-gray-400 mt-1">Report suspected property deed fraud — NY State aligned case filing system</p>
          <div className="flex items-center gap-2 mt-2">
            <Lock className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400 font-medium">Secure Submission — All data is encrypted and protected</span>
          </div>
        </div>
      </div>

      {/* Multi-step Form */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader className="pb-0">
          {/* Progress Bar */}
          <div className="flex items-center gap-1 mb-6">
            {STEPS.map((s, i) => (
              <React.Fragment key={i}>
                <div className={`flex items-center gap-1.5 flex-1 ${i < STEPS.length - 1 ? '' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < step ? 'bg-green-500 border-green-500 text-white'
                    : i === step ? 'bg-cyan-500 border-cyan-500 text-white'
                    : 'bg-transparent border-gray-600 text-gray-500'
                  }`}>
                    {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs hidden lg:block ${i === step ? 'text-white' : 'text-gray-500'}`}>{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 transition-all ${i < step ? 'bg-green-500' : 'bg-gray-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <CardTitle className="text-white text-xl">Step {step + 1}: {STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }} className="space-y-5">

              {/* Step 0: Personal Info */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Full Name *</Label>
                      <div className="relative mt-1">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={form.submitter_name} onChange={e => setForm(f => ({ ...f, submitter_name: e.target.value }))}
                          className="bg-[#0f1419] border-gray-600 text-white pl-10" placeholder="John Smith" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Email Address *</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input type="email" value={form.submitter_email} onChange={e => setForm(f => ({ ...f, submitter_email: e.target.value }))}
                          className="bg-[#0f1419] border-gray-600 text-white pl-10" placeholder="you@email.com" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Phone Number</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input value={form.submitter_phone} onChange={e => setForm(f => ({ ...f, submitter_phone: e.target.value }))}
                          className="bg-[#0f1419] border-gray-600 text-white pl-10" placeholder="+1 (555) 000-0000" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
                    <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-300">Your personal information is protected and only used for case processing. We never share your data with unauthorized parties.</p>
                  </div>
                </div>
              )}

              {/* Step 1: Property Details */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Property Address *</Label>
                    <Input value={form.property_address} onChange={e => setForm(f => ({ ...f, property_address: e.target.value }))}
                      className="bg-[#0f1419] border-gray-600 text-white mt-1" placeholder="123 Main Street, Apt 4B" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">City</Label>
                      <Input value={form.property_city} onChange={e => setForm(f => ({ ...f, property_city: e.target.value }))}
                        className="bg-[#0f1419] border-gray-600 text-white mt-1" placeholder="New York" />
                    </div>
                    <div>
                      <Label className="text-gray-300">ZIP Code</Label>
                      <Input value={form.property_zip} onChange={e => setForm(f => ({ ...f, property_zip: e.target.value }))}
                        className="bg-[#0f1419] border-gray-600 text-white mt-1" placeholder="10001" />
                    </div>
                    <div>
                      <Label className="text-gray-300">Borough / County *</Label>
                      <Select value={form.borough_county} onValueChange={v => setForm(f => ({ ...f, borough_county: v }))}>
                        <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white mt-1">
                          <SelectValue placeholder="Select borough/county" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                          {NY_BOROUGHS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Issue Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Type of Issue *</Label>
                    <Select value={form.issue_type} onValueChange={v => setForm(f => ({ ...f, issue_type: v }))}>
                      <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white mt-1">
                        <SelectValue placeholder="Select issue type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                        {ISSUE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {form.issue_type === "other" && (
                    <div>
                      <Label className="text-gray-300">Describe the Issue Type</Label>
                      <Input value={form.issue_type_other} onChange={e => setForm(f => ({ ...f, issue_type_other: e.target.value }))}
                        className="bg-[#0f1419] border-gray-600 text-white mt-1" placeholder="Describe the type of fraud..." />
                    </div>
                  )}
                  <div>
                    <Label className="text-gray-300">Detailed Description *</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="bg-[#0f1419] border-gray-600 text-white mt-1 h-36"
                      placeholder="Please describe in detail what occurred, including dates, names, and any other relevant information..." />
                  </div>
                  <div>
                    <Label className="text-gray-300">Date Issue Was Noticed</Label>
                    <div className="relative mt-1">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input type="date" value={form.date_noticed} onChange={e => setForm(f => ({ ...f, date_noticed: e.target.value }))}
                        className="bg-[#0f1419] border-gray-600 text-white pl-10" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Documents */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-gray-300 text-base font-semibold">Supporting Documents</Label>
                    <p className="text-gray-500 text-sm mt-1">Upload deeds, letters, screenshots, or any relevant evidence (PDF, JPG, PNG)</p>
                    <div className="border-2 border-dashed border-gray-600 hover:border-cyan-500/50 rounded-lg p-8 text-center mt-3 transition-colors">
                      <input id="doc-upload" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDocUpload} disabled={uploadingDocs} />
                      <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center gap-3">
                        {uploadingDocs ? <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" /> : <Upload className="w-10 h-10 text-gray-400" />}
                        <span className="text-gray-400">{uploadingDocs ? "Uploading..." : "Click to upload documents"}</span>
                        <span className="text-xs text-gray-600">PDF, JPG, PNG accepted</span>
                      </label>
                    </div>
                    {form.documents.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {form.documents.map((doc, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-[#0f1419] rounded border border-gray-700">
                            <FileText className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm text-white flex-1 truncate">{doc.name}</span>
                            <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, documents: f.documents.filter((_, idx) => idx !== i) }))}
                              className="text-red-400 hover:text-red-300 h-6 w-6 p-0">×</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-gray-300 text-base font-semibold">Identity Verification <span className="text-gray-500 font-normal text-sm">(Optional but recommended)</span></Label>
                    <p className="text-gray-500 text-sm mt-1">Upload a government-issued ID to strengthen your case</p>
                    <div className="border-2 border-dashed border-gray-700 hover:border-purple-500/50 rounded-lg p-6 text-center mt-3 transition-colors">
                      <input id="id-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleIdUpload} disabled={uploadingId} />
                      <label htmlFor="id-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        {uploadingId ? <Loader2 className="w-8 h-8 text-purple-400 animate-spin" /> : <Lock className="w-8 h-8 text-gray-400" />}
                        <span className="text-gray-400 text-sm">{form.id_document_url ? "✓ ID Uploaded" : "Upload Government ID"}</span>
                      </label>
                    </div>
                    {form.id_document_url && (
                      <p className="text-green-400 text-xs mt-2 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> ID document uploaded securely</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-300">Please review your submission carefully before filing. Once submitted, your case will be reviewed by our team.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      ["Submitter", form.submitter_name],
                      ["Email", form.submitter_email],
                      ["Phone", form.submitter_phone || "Not provided"],
                      ["Property", form.property_address],
                      ["Borough/County", form.borough_county],
                      ["Issue Type", ISSUE_TYPES.find(t => t.value === form.issue_type)?.label || form.issue_type],
                      ["Date Noticed", form.date_noticed || "Not specified"],
                      ["Documents", `${form.documents.length} file(s) uploaded`]
                    ].map(([label, value]) => (
                      <div key={label} className="p-3 bg-[#0f1419] rounded border border-gray-700">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className="text-white text-sm font-medium mt-0.5 truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 bg-[#0f1419] rounded border border-gray-700">
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-white text-sm mt-0.5 line-clamp-3">{form.description}</p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <Lock className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-green-300">Your submission is secured with end-to-end encryption and will only be accessible by authorized SafeNestT personnel.</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t border-gray-700/50">
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}
              className="border-gray-600 text-gray-400 hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="bg-cyan-600 hover:bg-cyan-700">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}
                className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 min-w-[160px]">
                {submitMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Shield className="w-4 h-4 mr-2" /> Submit Case</>}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Submitted Cases - always shown when user is loaded */}
      {user && (
        <Card id="my-cases-section" className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              My Deed Fraud Reports ({myCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" /><p className="text-gray-500 text-sm mt-2">Loading your cases...</p></div>
            ) : myCases.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No deed fraud reports submitted yet.</p>
                <p className="text-gray-600 text-xs mt-1">Use the form above to report a case.</p>
              </div>
            ) : (
              myCases.map(c => (
                <div key={c.id} className="p-4 bg-[#0f1419] rounded-lg border border-gray-700 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-cyan-400 text-sm font-bold">{c.case_id}</span>
                      <Badge className={`${statusColors[c.status] || "bg-gray-500/20 text-gray-400"} border text-xs`}>{c.status}</Badge>
                    </div>
                    <p className="text-white text-sm">{c.property_address}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{c.borough_county} · Submitted {new Date(c.created_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.status === "New" && <Clock className="w-4 h-4 text-yellow-400" />}
                    {c.status === "Under Review" && <Eye className="w-4 h-4 text-blue-400" />}
                    {(c.status === "Filed" || c.status === "Filed with NYS") && <CheckCircle className="w-4 h-4 text-green-400" />}
                    <span className="text-gray-400 text-xs">{ISSUE_TYPES.find(t => t.value === c.issue_type)?.label || c.issue_type}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}