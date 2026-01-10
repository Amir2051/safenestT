import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, Upload, X, FileText, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ReportIncident() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [user, setUser] = useState(null);
  const [showIC3Message, setShowIC3Message] = useState(false);
  
  const [formData, setFormData] = useState({
    reporter_name: '',
    reporter_email: '',
    reporter_phone: '',
    
    incident_classification: 'cryptocurrency_fraud',
    incident_began_date: '',
    incident_began_time: '',
    last_contact_date: '',
    last_contact_time: '',
    initial_contact_method: 'email',
    initial_contact_details: '',
    
    actor_emails: '',
    actor_phones: '',
    actor_usernames: '',
    actor_websites: '',
    actor_crypto_wallets: '',
    actor_social_media: '',
    actor_notes: '',
    
    has_financial_loss: 'yes',
    total_amount_usd: '',
    payment_method: 'cryptocurrency',
    payment_dates: '',
    transaction_ids: '',
    
    description: ''
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setFormData(prev => ({
        ...prev,
        reporter_name: u.full_name || '',
        reporter_email: u.email || ''
      }));
    }).catch(() => {});
  }, []);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingFiles(true);
    const uploadedFiles = [];
    
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedFiles.push({
          name: file.name,
          url: file_url,
          type: file.type.includes('image') ? 'screenshot' : 
                file.type.includes('pdf') ? 'pdf' : 
                file.name.includes('receipt') ? 'receipt' : 'other'
        });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setEvidenceFiles(prev => [...prev, ...uploadedFiles]);
    setUploadingFiles(false);
    toast.success(`${uploadedFiles.length} file(s) uploaded`);
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !user.email) {
      toast.error('You must be logged in to submit an incident report');
      return;
    }

    if (!formData.reporter_name?.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!formData.description?.trim()) {
      toast.error('Please provide a description of what occurred');
      return;
    }

    if (formData.has_financial_loss === 'yes' && !formData.total_amount_usd) {
      toast.error('Please enter the total amount lost');
      return;
    }

    setLoading(true);

    try {
      // Combine date and time
      const incidentBeganDateTime = formData.incident_began_date && formData.incident_began_time 
        ? `${formData.incident_began_date}T${formData.incident_began_time}:00`
        : null;
      
      const lastContactDateTime = formData.last_contact_date && formData.last_contact_time
        ? `${formData.last_contact_date}T${formData.last_contact_time}:00`
        : null;

      const response = await base44.functions.invoke('submitCase', {
        victim_name: formData.reporter_name,
        victim_email: formData.reporter_email,
        victim_phone: formData.reporter_phone,
        
        incident_classification: formData.incident_classification,
        issue_type: formData.incident_classification,
        
        incident_timeline: {
          incident_began_date: incidentBeganDateTime,
          last_contact_date: lastContactDateTime,
          initial_contact_method: formData.initial_contact_method,
          initial_contact_details: formData.initial_contact_details
        },
        
        alleged_actor_information: {
          email_addresses: formData.actor_emails.split('\n').filter(e => e.trim()),
          phone_numbers: formData.actor_phones.split('\n').filter(p => p.trim()),
          usernames: formData.actor_usernames.split('\n').filter(u => u.trim()),
          websites_platforms: formData.actor_websites.split('\n').filter(w => w.trim()),
          crypto_wallet_addresses: formData.actor_crypto_wallets.split('\n').filter(w => w.trim()),
          social_media_accounts: formData.actor_social_media,
          additional_notes: formData.actor_notes
        },
        
        financial_loss: {
          has_financial_loss: formData.has_financial_loss === 'yes',
          total_amount_usd: parseFloat(formData.total_amount_usd) || 0,
          payment_method: formData.payment_method,
          payment_dates: formData.payment_dates,
          transaction_ids: formData.transaction_ids
        },
        
        amount_lost: parseFloat(formData.total_amount_usd) || 0,
        description: formData.description,
        
        supporting_documentation: evidenceFiles.map(f => ({
          name: f.name,
          url: f.url,
          type: f.type,
          uploaded_date: new Date().toISOString()
        })),
        
        ic3_referral_acknowledged: true
      });

      if (!response || !response.data?.success) {
        throw new Error(response.data?.error || 'Submission failed');
      }

      const createdCase = response.data.case;
      setShowIC3Message(true);
      
      setTimeout(() => {
        navigate(createPageUrl('MyCases'));
      }, 5000);

    } catch (error) {
      toast.error(`Submission failed: ${error.message}`);
    }

    setLoading(false);
  };

  const classificationOptions = [
    { value: 'impersonation_government', label: 'Impersonation (Government)' },
    { value: 'impersonation_business', label: 'Impersonation (Business)' },
    { value: 'impersonation_individual', label: 'Impersonation (Individual)' },
    { value: 'investment_fraud', label: 'Investment Fraud' },
    { value: 'romance_scam', label: 'Romance Scam' },
    { value: 'business_email_compromise', label: 'Business Email Compromise (BEC)' },
    { value: 'tech_support_fraud', label: 'Tech Support Fraud' },
    { value: 'cryptocurrency_fraud', label: 'Cryptocurrency-Related Fraud' },
    { value: 'identity_theft', label: 'Identity Theft' },
    { value: 'other_cyber_fraud', label: 'Other Cyber-Enabled Fraud' }
  ];

  if (showIC3Message) {
    return (
      <div className="min-h-screen bg-[#000000] text-white p-6 md:p-12 flex items-center justify-center">
        <Card className="max-w-2xl bg-[#0f1419] border-green-500/30">
          <CardContent className="p-8 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Incident Report Submitted</h2>
              <p className="text-gray-300 mb-6">
                Your report has been documented. You will be redirected to your reports page shortly.
              </p>
            </div>

            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300">
                <strong className="text-white">Important: File an Official IC3 Report</strong>
                <p className="mt-2">
                  For incidents involving significant financial loss or ongoing criminal activity, 
                  we strongly encourage you to file an official complaint with the FBI's Internet Crime 
                  Complaint Center (IC3) at <a href="https://www.ic3.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">www.ic3.gov</a>.
                </p>
                <p className="mt-2 text-sm">
                  SafeNestT is a civilian documentation platform and does not conduct investigations. 
                  Your submission here is intended to support your record-keeping and appropriate reporting to authorities.
                </p>
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => navigate(createPageUrl('MyCases'))}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              View My Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="text-gray-400 hover:text-white pl-0"
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Submit Incident Report</h1>
          <p className="text-gray-400">
            Document cyber-enabled fraud or theft for your records and appropriate reporting.
          </p>
        </div>

        <Alert className="bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-gray-300 text-sm">
            <strong className="text-white">Legal Disclaimer:</strong> SafeNestT is not a law enforcement agency and does not conduct investigations. 
            All information submitted is user-reported and intended to support victim documentation and appropriate reporting to authorities. 
            For official complaints, please file with the FBI IC3 at <a href="https://www.ic3.gov" target="_blank" rel="noopener noreferrer" className="text-yellow-400 underline">www.ic3.gov</a>.
          </AlertDescription>
        </Alert>

        <Card className="bg-[#0f1419] border-cyan-500/20">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Reporter Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">Your Information</h3>
                <div className="grid gap-4">
                  <div>
                    <Label className="text-white">Full Name *</Label>
                    <Input
                      value={formData.reporter_name}
                      onChange={(e) => setFormData({...formData, reporter_name: e.target.value})}
                      className="bg-[#1a2332] border-gray-700 text-white mt-2"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Email *</Label>
                      <Input
                        type="email"
                        value={formData.reporter_email}
                        onChange={(e) => setFormData({...formData, reporter_email: e.target.value})}
                        className="bg-[#1a2332] border-gray-700 text-white mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Phone Number</Label>
                      <Input
                        value={formData.reporter_phone}
                        onChange={(e) => setFormData({...formData, reporter_phone: e.target.value})}
                        placeholder="+1 (555) 123-4567"
                        className="bg-[#1a2332] border-gray-700 text-white mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Incident Classification */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">Incident Classification</h3>
                <div>
                  <Label className="text-white">Incident Type *</Label>
                  <Select value={formData.incident_classification} onValueChange={(v) => setFormData({...formData, incident_classification: v})}>
                    <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                      {classificationOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Incident Timeline */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">Incident Timeline</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Date Incident Began *</Label>
                    <Input
                      type="date"
                      value={formData.incident_began_date}
                      onChange={(e) => setFormData({...formData, incident_began_date: e.target.value})}
                      className="bg-[#1a2332] border-gray-700 text-white mt-2"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Time Incident Began</Label>
                    <Input
                      type="time"
                      value={formData.incident_began_time}
                      onChange={(e) => setFormData({...formData, incident_began_time: e.target.value})}
                      className="bg-[#1a2332] border-gray-700 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Date of Last Contact</Label>
                    <Input
                      type="date"
                      value={formData.last_contact_date}
                      onChange={(e) => setFormData({...formData, last_contact_date: e.target.value})}
                      className="bg-[#1a2332] border-gray-700 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Time of Last Contact</Label>
                    <Input
                      type="time"
                      value={formData.last_contact_time}
                      onChange={(e) => setFormData({...formData, last_contact_time: e.target.value})}
                      className="bg-[#1a2332] border-gray-700 text-white mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white">Method of Initial Contact *</Label>
                  <Select value={formData.initial_contact_method} onValueChange={(v) => setFormData({...formData, initial_contact_method: v})}>
                    <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="text_message">Text Message</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="app">Mobile App</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-white">Additional Contact Details</Label>
                  <Textarea
                    value={formData.initial_contact_details}
                    onChange={(e) => setFormData({...formData, initial_contact_details: e.target.value})}
                    placeholder="Provide additional context about how the alleged actor initially contacted you"
                    className="bg-[#1a2332] border-gray-700 text-white min-h-[80px] mt-2"
                  />
                </div>
              </div>

              {/* Alleged Actor Information */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">Alleged Actor Information (Optional)</h3>
                <Alert className="bg-gray-500/10 border-gray-500/30">
                  <Info className="h-4 w-4 text-gray-400" />
                  <AlertDescription className="text-gray-400 text-xs">
                    This information is user-reported and unverified. Provide as much detail as possible.
                  </AlertDescription>
                </Alert>
                <div className="grid gap-4">
                  <div>
                    <Label className="text-white">Email Address(es) Used</Label>
                    <Textarea
                      value={formData.actor_emails}
                      onChange={(e) => setFormData({...formData, actor_emails: e.target.value})}
                      placeholder="One email per line"
                      className="bg-[#1a2332] border-gray-700 text-white min-h-[70px] mt-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Phone Number(s) Used</Label>
                    <Textarea
                      value={formData.actor_phones}
                      onChange={(e) => setFormData({...formData, actor_phones: e.target.value})}
                      placeholder="One phone number per line"
                      className="bg-[#1a2332] border-gray-700 text-white min-h-[70px] mt-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Username(s) or Account Name(s)</Label>
                    <Textarea
                      value={formData.actor_usernames}
                      onChange={(e) => setFormData({...formData, actor_usernames: e.target.value})}
                      placeholder="One username per line"
                      className="bg-[#1a2332] border-gray-700 text-white min-h-[70px] mt-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Website or Platform Involved</Label>
                    <Textarea
                      value={formData.actor_websites}
                      onChange={(e) => setFormData({...formData, actor_websites: e.target.value})}
                      placeholder="One URL per line"
                      className="bg-[#1a2332] border-gray-700 text-white min-h-[70px] mt-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Cryptocurrency Wallet Address(es), if applicable</Label>
                    <Textarea
                      value={formData.actor_crypto_wallets}
                      onChange={(e) => setFormData({...formData, actor_crypto_wallets: e.target.value})}
                      placeholder="One wallet address per line"
                      className="bg-[#1a2332] border-gray-700 text-white min-h-[70px] mt-2 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Loss Information */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">Financial Loss Information</h3>
                <div>
                  <Label className="text-white">Was there a financial loss? *</Label>
                  <Select value={formData.has_financial_loss} onValueChange={(v) => setFormData({...formData, has_financial_loss: v})}>
                    <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.has_financial_loss === 'yes' && (
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-white">Total Amount Lost (USD) *</Label>
                      <Input
                        type="number"
                        value={formData.total_amount_usd}
                        onChange={(e) => setFormData({...formData, total_amount_usd: e.target.value})}
                        placeholder="0.00"
                        className="bg-[#1a2332] border-gray-700 text-white mt-2"
                        required={formData.has_financial_loss === 'yes'}
                      />
                    </div>
                    <div>
                      <Label className="text-white">Payment Method</Label>
                      <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                        <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                          <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                          <SelectItem value="ach">ACH</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="gift_cards">Gift Cards</SelectItem>
                          <SelectItem value="cryptocurrency">Cryptocurrency</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-white">Date(s) Payment Was Sent</Label>
                      <Textarea
                        value={formData.payment_dates}
                        onChange={(e) => setFormData({...formData, payment_dates: e.target.value})}
                        placeholder="One date per line (e.g., 2026-01-10)"
                        className="bg-[#1a2332] border-gray-700 text-white min-h-[70px] mt-2"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Transaction ID(s) or Reference Number(s), if available</Label>
                      <Textarea
                        value={formData.transaction_ids}
                        onChange={(e) => setFormData({...formData, transaction_ids: e.target.value})}
                        placeholder="One transaction ID per line"
                        className="bg-[#1a2332] border-gray-700 text-white min-h-[70px] mt-2 font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Incident Description */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">Incident Description</h3>
                <div>
                  <Label className="text-white">Chronological Description of What Occurred (Facts Only) *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Provide a detailed, factual account of the incident in chronological order. Include dates, times, and specific details about communications, transactions, and events."
                    className="bg-[#1a2332] border-gray-700 text-white min-h-[200px] mt-2"
                    required
                  />
                </div>
              </div>

              {/* Supporting Documentation */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-cyan-400 border-b border-gray-800 pb-2">Supporting Documentation</h3>
                <Alert className="bg-gray-500/10 border-gray-500/30">
                  <Info className="h-4 w-4 text-gray-400" />
                  <AlertDescription className="text-gray-400 text-xs">
                    Files are user-submitted and not independently verified. Upload screenshots, receipts, transaction records, or other relevant documentation.
                  </AlertDescription>
                </Alert>
                
                <div className="border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-xl p-8 text-center transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploadingFiles}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    {uploadingFiles ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2" />
                        <p className="text-gray-400">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-8 h-8 text-gray-400 mb-2" />
                        <p className="text-white font-medium">Click to upload files</p>
                        <p className="text-gray-500 text-sm mt-1">Screenshots, PDFs, receipts, transaction records</p>
                      </div>
                    )}
                  </label>
                </div>

                {evidenceFiles.length > 0 && (
                  <div className="space-y-2">
                    {evidenceFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#1a2332] rounded-lg border border-gray-700">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span className="text-white text-sm truncate max-w-[200px]">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(idx)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white h-12 text-lg font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  'Submit Incident Report'
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

        <Alert className="bg-gray-500/10 border-gray-500/30">
          <Info className="h-4 w-4 text-gray-400" />
          <AlertDescription className="text-gray-400 text-xs">
            <strong className="text-white">Important:</strong> SafeNestT is not a law enforcement agency and does not conduct investigations. 
            Submitted information is user-reported and intended to support victim documentation and appropriate reporting to authorities.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}