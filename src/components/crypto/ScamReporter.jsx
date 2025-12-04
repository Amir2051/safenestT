import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, CheckCircle, User, Phone, Mail, Wallet, Calendar, Upload, X, FileText, Scale, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function ScamReporter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  useEffect(() => {
    base44.auth.me().then(userData => {
      setUser(userData);
      setFormData(prev => ({
        ...prev,
        victim_name: userData.full_name || '',
        victim_email: userData.email || ''
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
    
    if (!formData.scammer_wallet.trim()) {
      toast.error('Please enter the scammer wallet address');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Please provide a description of the scam');
      return;
    }
    
    setLoading(true);

    try {
      const caseData = {
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
        
        // Financial
        amount_lost: parseFloat(formData.amount_lost) || 0,
        amount_stolen_usd: formData.currency_type === 'USD' ? parseFloat(formData.amount_lost) : 0,
        currency_type: formData.currency_type,
        blockchain: formData.blockchain,
        cryptocurrency: formData.currency_type,
        
        // Case
        case_title: `Report: ${formData.fraud_type} - ${formData.amount_lost} ${formData.currency_type}`,
        fraud_type: formData.fraud_type.toLowerCase().replace(/ /g, '_'),
        issue_type: formData.fraud_type.toLowerCase().replace(/ /g, '_'),
        description: formData.description,
        incident_date: formData.incident_date,
        transaction_date: formData.incident_date,
        
        // Evidence
        evidence_files: evidenceFiles.map(f => ({
          name: f.name,
          url: f.url,
          type: f.type,
          uploaded_date: new Date().toISOString()
        })),
        
        // Meta
        status: 'Pending',
        case_priority: 'Medium',
        created_by_name: user?.full_name || 'Anonymous',
        created_by_email: user?.email || 'anonymous',
        
        // Legal
        law_enforcement_authorization: {
          authorized: formData.law_enforcement_authorized,
          authorized_date: formData.law_enforcement_authorized ? new Date().toISOString() : null,
          agencies: ['FBI', 'IC3', 'FTC']
        }
      };

      // Create ClientCase
      await base44.entities.ClientCase.create({
          ...caseData,
          case_number: `CASE-${Date.now()}`
      });
      
      // Also create FraudCase for tracking/analytics if needed, or just stick to one. 
      // Based on previous context, FraudCase is also used. I'll ensure ClientCase is primary.
      // But for redundancy and existing admin views:
      await base44.entities.FraudCase.create({
          ...caseData,
          victim_contact_info: {
              name: formData.victim_name,
              email: formData.victim_email,
              phone: formData.victim_phone
          },
          amount_stolen: parseFloat(formData.amount_lost) || 0,
          suspect_details: caseData.scammer_info
      });

      toast.success('Case submitted successfully! Our team will review it shortly.');
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        // Reset form
        setFormData({
            victim_name: user?.full_name || '',
            victim_email: user?.email || '',
            victim_phone: '',
            scammer_name: '',
            scammer_phone: '',
            scammer_email: '',
            scammer_social_media: '',
            scammer_wallet: '',
            amount_lost: 0,
            currency_type: 'USD',
            blockchain: 'Ethereum',
            fraud_type: 'Crypto Theft',
            incident_date: '',
            description: '',
            law_enforcement_authorized: false
        });
        setEvidenceFiles([]);
      }, 3000);
    } catch (error) {
      toast.error('Failed to submit: ' + error.message);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/30">
        <CardContent className="p-12 text-center">
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-white mb-3">Case Submitted Successfully!</h3>
          <p className="text-gray-300 text-lg">
            Thank you for reporting. Our investigation team will review your case and contact you soon.
          </p>
          <p className="text-cyan-400 mt-4 text-sm">
            Status: <span className="font-bold">Pending</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30">
      <CardHeader className="border-b border-red-500/20 pb-6">
        <CardTitle className="text-white flex items-center gap-3 text-2xl">
          <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          Report a Scam
        </CardTitle>
        <p className="text-gray-300 mt-2 text-base">
          Complete the form below with as much detail as possible. All information helps our investigation.
        </p>
      </CardHeader>
      
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Victim Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-400">Your Information (Victim)</h3>
            <div className="grid gap-4">
              <div>
                <Label className="text-white">Full Name *</Label>
                <Input
                  value={formData.victim_name}
                  onChange={(e) => setFormData({...formData, victim_name: e.target.value})}
                  placeholder="pilottest2025"
                  className="bg-[#1a2332] border-gray-700 text-white mt-2"
                  required
                />
              </div>
              <div>
                <Label className="text-white">Email *</Label>
                <Input
                  type="email"
                  value={formData.victim_email}
                  onChange={(e) => setFormData({...formData, victim_email: e.target.value})}
                  placeholder="pilottest2025@gmail.com"
                  className="bg-[#1a2332] border-gray-700 text-white mt-2"
                  required
                />
              </div>
              <div>
                <Label className="text-white">Phone Number</Label>
                <Input
                  value={formData.victim_phone}
                  onChange={(e) => setFormData({...formData, victim_phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                  className="bg-[#1a2332] border-gray-700 text-white mt-2"
                />
              </div>
            </div>
          </div>

          {/* Scammer Information */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-cyan-400">Scammer Information</h3>
            <div className="grid gap-4">
              <div>
                <Label className="text-white">Scammer Name / Alias</Label>
                <Input
                  value={formData.scammer_name}
                  onChange={(e) => setFormData({...formData, scammer_name: e.target.value})}
                  placeholder="Name or alias used by scammer"
                  className="bg-[#1a2332] border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">Scammer Phone Number</Label>
                <Input
                  value={formData.scammer_phone}
                  onChange={(e) => setFormData({...formData, scammer_phone: e.target.value})}
                  placeholder="Phone number used by scammer"
                  className="bg-[#1a2332] border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">Scammer Email (Optional)</Label>
                <Input
                  type="email"
                  value={formData.scammer_email}
                  onChange={(e) => setFormData({...formData, scammer_email: e.target.value})}
                  placeholder="scammer@email.com"
                  className="bg-[#1a2332] border-gray-700 text-white mt-2"
                />
              </div>
              <div>
                <Label className="text-white">Scammer Social Media Accounts (One per line)</Label>
                <Textarea
                  value={formData.scammer_social_media}
                  onChange={(e) => setFormData({...formData, scammer_social_media: e.target.value})}
                  placeholder={`Instagram: @scammer_handle\nWhatsApp: +1234567890\nTelegram: @username\nFacebook: facebook.com/profile\nTikTok: @tiktok_handle`}
                  className="bg-[#1a2332] border-gray-700 text-white min-h-[100px] mt-2 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-white">Scammer Wallet Address *</Label>
                <Input
                  value={formData.scammer_wallet}
                  onChange={(e) => setFormData({...formData, scammer_wallet: e.target.value})}
                  placeholder="0x... or bc1... or T..."
                  className="bg-[#1a2332] border-gray-700 text-white font-mono mt-2"
                  required
                />
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-cyan-400">Financial Details</h3>
            <div className="grid gap-4">
              <div>
                <Label className="text-white">Amount Lost *</Label>
                <Input
                  type="number"
                  value={formData.amount_lost}
                  onChange={(e) => setFormData({...formData, amount_lost: e.target.value})}
                  placeholder="0"
                  className="bg-[#1a2332] border-gray-700 text-white mt-2"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="text-white">Currency Type *</Label>
                    <Select value={formData.currency_type} onValueChange={(v) => setFormData({...formData, currency_type: v})}>
                        <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                        <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                        <SelectItem value="USDT">Tether (USDT)</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-white">Blockchain Network</Label>
                    <Select value={formData.blockchain} onValueChange={(v) => setFormData({...formData, blockchain: v})}>
                        <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                        <SelectItem value="Ethereum">Ethereum</SelectItem>
                        <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                        <SelectItem value="BSC">BSC</SelectItem>
                        <SelectItem value="Polygon">Polygon</SelectItem>
                        <SelectItem value="Solana">Solana</SelectItem>
                        <SelectItem value="Tron">Tron</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Case Details */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-cyan-400">Case Details</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label className="text-white">Fraud Type *</Label>
                    <Select value={formData.fraud_type} onValueChange={(v) => setFormData({...formData, fraud_type: v})}>
                        <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                        <SelectItem value="Crypto Theft">🔴 Crypto Theft</SelectItem>
                        <SelectItem value="Phishing">🟠 Phishing</SelectItem>
                        <SelectItem value="Fake Exchange">🟡 Fake Exchange</SelectItem>
                        <SelectItem value="Rug Pull">🩷 Rug Pull</SelectItem>
                        <SelectItem value="Romance Scam">🟣 Romance Scam</SelectItem>
                        <SelectItem value="Investment Scam">🔵 Investment Scam</SelectItem>
                        <SelectItem value="Other">⚪ Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-white">Date of Incident</Label>
                    <Input
                    type="date"
                    value={formData.incident_date}
                    onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                    className="bg-[#1a2332] border-gray-700 text-white mt-2"
                    />
                </div>
              </div>
              <div>
                <Label className="text-white">Description of the Scam *</Label>
                <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Please describe in detail what happened, how you were contacted, what was promised, and how the scam occurred. Include any relevant details that could help our investigation."
                    className="bg-[#1a2332] border-gray-700 text-white min-h-[150px] mt-2"
                    required
                />
              </div>
            </div>
          </div>

          {/* Law Enforcement Authorization */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-cyan-400">Law Enforcement Authorization</h3>
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-start space-x-3 mb-4">
                    <Checkbox
                    id="le_auth"
                    checked={formData.law_enforcement_authorized}
                    onCheckedChange={(checked) => setFormData({...formData, law_enforcement_authorized: checked})}
                    className="mt-1 border-purple-500 data-[state=checked]:bg-purple-500"
                    />
                    <div className="space-y-2">
                        <Label htmlFor="le_auth" className="text-white font-semibold cursor-pointer">
                            By checking this box, you authorize SafeNestT to act as your representative and contact law enforcement agencies (including FBI, IC3, and other relevant authorities) on your behalf regarding this fraud case.
                        </Label>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            I hereby authorize SafeNestT and its representatives to contact law enforcement agencies, including but not limited to the FBI, IC3 (Internet Crime Complaint Center), FTC, and other relevant federal, state, or local authorities on my behalf. I understand that SafeNestT may share my case details, personal information, and evidence with these agencies to assist in the investigation and potential recovery of my stolen assets.
                        </p>
                    </div>
                </div>
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h3 className="text-lg font-semibold text-cyan-400">Evidence Upload</h3>
            <p className="text-gray-400 text-sm">(Screenshots, PDFs, Images)</p>
            
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
                            <p className="text-white font-medium">Click to upload evidence files</p>
                            <p className="text-gray-500 text-sm mt-1">Supports: Images, Screenshots, PDFs, Documents</p>
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
              'Submit Report'
            )}
          </Button>

        </form>
      </CardContent>
    </Card>
  );
}