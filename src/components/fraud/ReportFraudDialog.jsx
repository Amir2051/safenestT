import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, Upload, X, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function ReportFraudDialog({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  
  const [formData, setFormData] = useState({
    // Victim
    victim_name: '',
    victim_email: '',
    victim_phone: '',
    
    // Scammer
    scammer_name: '',
    scammer_phone: '',
    scammer_email: '',
    scammer_social_media: '',
    scammer_wallet: '',
    
    // Financial
    amount_lost: 0,
    currency_type: 'USD',
    blockchain: 'Ethereum',
    
    // Case
    fraud_type: 'Crypto Theft',
    incident_date: '',
    description: '',
    
    // Legal
    law_enforcement_authorized: false
  });

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
          type: file.type.includes('image') ? 'screenshot' : 'document'
        });
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    setEvidenceFiles(prev => [...prev, ...uploadedFiles]);
    setUploadingFiles(false);
    toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user to ensure correct ownership
      const user = await base44.auth.me();
      if (!user) throw new Error("You must be logged in to submit a case.");

      const caseData = {
        // Standardized created_by fields
        created_by: user.email,
        created_by_email: user.email,
        created_by_name: user.full_name || formData.victim_name,

        // Victim
        client_name: formData.victim_name,
        client_email: formData.victim_email,
        phone_number: formData.victim_phone,
        
        // Scammer
        scammer_info: {
          name: formData.scammer_name,
          phone: formData.scammer_phone,
          email: formData.scammer_email,
          social_media: formData.scammer_social_media.split('\n').filter(s => s.trim()),
          wallet_addresses: [formData.scammer_wallet]
        },
        scammer_wallet: formData.scammer_wallet,
        monitored_wallets: [formData.scammer_wallet],
        
        // Financial
        amount_lost: parseFloat(formData.amount_lost) || 0,
        amount_stolen_usd: formData.currency_type === 'USD' ? parseFloat(formData.amount_lost) : 0,
        cryptocurrency: formData.currency_type,
        blockchain: formData.blockchain,
        
        // Case
        case_title: `Fraud Report: ${formData.fraud_type}`,
        issue_type: formData.fraud_type.toLowerCase().replace(/ /g, '_'),
        description: formData.description,
        transaction_date: formData.incident_date,
        incident_date: formData.incident_date,
        
        // Evidence
        evidence_files: evidenceFiles.map(f => ({
          name: f.name,
          url: f.url,
          type: f.type,
          uploaded_date: new Date().toISOString()
        })),
        
        // Meta
        status: 'Pending',
        urgency: 'Medium',
        case_number: `CASE-${Date.now()}`,
        
        // Legal
        law_enforcement_authorization: {
          authorized: formData.law_enforcement_authorized,
          authorized_date: formData.law_enforcement_authorized ? new Date().toISOString() : null,
          agencies: ['FBI', 'IC3', 'FTC']
        }
      };

      // Create MyCase via backend function
      const response = await base44.functions.invoke('caseManagement', {
          action: 'create',
          data: caseData
      });
      
      if (response.data.error) throw new Error(response.data.error);
      
      toast.success('Case created and saved to My Cases');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      toast.error('Failed to report: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-red-500/20 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Report Fraud Case
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          
          {/* Victim Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-gray-700 pb-2">Your Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="text-white">Full Name *</Label>
                    <Input
                    value={formData.victim_name}
                    onChange={(e) => setFormData({...formData, victim_name: e.target.value})}
                    placeholder="Full name"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    required
                    />
                </div>
                <div>
                    <Label className="text-white">Email *</Label>
                    <Input
                    type="email"
                    value={formData.victim_email}
                    onChange={(e) => setFormData({...formData, victim_email: e.target.value})}
                    placeholder="Email address"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    required
                    />
                </div>
                <div>
                    <Label className="text-white">Phone Number</Label>
                    <Input
                    value={formData.victim_phone}
                    onChange={(e) => setFormData({...formData, victim_phone: e.target.value})}
                    placeholder="Phone number"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    />
                </div>
            </div>
          </div>

          {/* Scammer Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-gray-700 pb-2">Scammer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="text-white">Scammer Name / Alias</Label>
                    <Input
                    value={formData.scammer_name}
                    onChange={(e) => setFormData({...formData, scammer_name: e.target.value})}
                    placeholder="Name/Alias"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    />
                </div>
                <div>
                    <Label className="text-white">Scammer Phone</Label>
                    <Input
                    value={formData.scammer_phone}
                    onChange={(e) => setFormData({...formData, scammer_phone: e.target.value})}
                    placeholder="Phone number"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    />
                </div>
                <div>
                    <Label className="text-white">Scammer Email</Label>
                    <Input
                    value={formData.scammer_email}
                    onChange={(e) => setFormData({...formData, scammer_email: e.target.value})}
                    placeholder="Email address"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    />
                </div>
                <div>
                    <Label className="text-white">Scammer Wallet *</Label>
                    <Input
                    value={formData.scammer_wallet}
                    onChange={(e) => setFormData({...formData, scammer_wallet: e.target.value})}
                    placeholder="Wallet Address"
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    required
                    />
                </div>
                <div className="md:col-span-2">
                    <Label className="text-white">Scammer Social Media (One per line)</Label>
                    <Textarea
                    value={formData.scammer_social_media}
                    onChange={(e) => setFormData({...formData, scammer_social_media: e.target.value})}
                    placeholder={`Instagram: @handle\nTelegram: @username`}
                    className="bg-[#0f1419] border-gray-700 text-white mt-1 font-mono text-xs"
                    />
                </div>
            </div>
          </div>

          {/* Financial & Case Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-gray-700 pb-2">Case Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label className="text-white">Amount Lost *</Label>
                    <Input
                    type="number"
                    value={formData.amount_lost}
                    onChange={(e) => setFormData({...formData, amount_lost: e.target.value})}
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    required
                    />
                </div>
                <div>
                    <Label className="text-white">Currency</Label>
                    <Select value={formData.currency_type} onValueChange={(v) => setFormData({...formData, currency_type: v})}>
                        <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="BTC">Bitcoin</SelectItem>
                            <SelectItem value="ETH">Ethereum</SelectItem>
                            <SelectItem value="USDT">Tether</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-white">Blockchain</Label>
                    <Select value={formData.blockchain} onValueChange={(v) => setFormData({...formData, blockchain: v})}>
                        <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                            <SelectItem value="Ethereum">Ethereum</SelectItem>
                            <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                            <SelectItem value="BSC">BSC</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-white">Fraud Type</Label>
                    <Select value={formData.fraud_type} onValueChange={(v) => setFormData({...formData, fraud_type: v})}>
                        <SelectTrigger className="bg-[#0f1419] border-gray-700 text-white mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                            <SelectItem value="Crypto Theft">Crypto Theft</SelectItem>
                            <SelectItem value="Phishing">Phishing</SelectItem>
                            <SelectItem value="Investment Scam">Investment Scam</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-white">Date</Label>
                    <Input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                    className="bg-[#0f1419] border-gray-700 text-white mt-1"
                    />
                </div>
            </div>
            <div>
                <Label className="text-white">Description *</Label>
                <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the incident..."
                className="bg-[#0f1419] border-gray-700 text-white mt-1 min-h-[100px]"
                required
                />
            </div>
          </div>

          {/* Legal */}
          <div className="p-4 bg-purple-500/10 rounded border border-purple-500/30 flex items-start gap-3">
            <Checkbox 
                id="legal_auth"
                checked={formData.law_enforcement_authorized}
                onCheckedChange={(c) => setFormData({...formData, law_enforcement_authorized: c})}
                className="mt-1 border-purple-500 data-[state=checked]:bg-purple-500"
            />
            <div>
                <Label htmlFor="legal_auth" className="text-white font-semibold cursor-pointer">Law Enforcement Authorization</Label>
                <p className="text-xs text-gray-300 mt-1">
                    By checking this box, you authorize SafeNestT to act as your representative and contact law enforcement agencies (FBI, IC3, etc.) on your behalf.
                </p>
            </div>
          </div>

          {/* Evidence */}
          <div>
            <Label className="text-white block mb-2">Evidence Upload (Screenshots, PDFs)</Label>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center">
                <input type="file" id="evidence" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingFiles} />
                <label htmlFor="evidence" className="cursor-pointer flex flex-col items-center gap-2">
                    {uploadingFiles ? <Loader2 className="w-6 h-6 animate-spin text-cyan-400" /> : <Upload className="w-6 h-6 text-gray-400" />}
                    <span className="text-sm text-gray-400">{uploadingFiles ? "Uploading..." : "Click to upload files"}</span>
                </label>
            </div>
            {evidenceFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                    {evidenceFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-[#0f1419] p-2 rounded border border-gray-700">
                            <span className="text-white truncate max-w-[200px]">{f.name}</span>
                            <button type="button" onClick={() => removeFile(i)}><X className="w-3 h-3 text-red-400" /></button>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-red-500 to-orange-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reporting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}