import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, CheckCircle, User, Phone, Mail, Wallet, Calendar, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ScamReporter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  
  const [formData, setFormData] = useState({
    // Victim Information
    victim_name: '',
    victim_email: '',
    victim_phone: '',
    
    // Scammer Information
    scammer_name: '',
    scammer_phone: '',
    scammer_email: '',
    scammer_social_media: '',
    scammer_wallet: '',
    
    // Case Details
    fraud_type: 'crypto_theft',
    amount_stolen: 0,
    currency_type: 'USD',
    blockchain: 'ethereum',
    description: '',
    incident_date: ''
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

  const parseSocialMedia = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const lower = line.toLowerCase();
      let platform = 'other';
      if (lower.includes('instagram') || lower.includes('@')) platform = 'Instagram';
      else if (lower.includes('whatsapp') || lower.includes('+')) platform = 'WhatsApp';
      else if (lower.includes('telegram') || lower.includes('t.me')) platform = 'Telegram';
      else if (lower.includes('facebook') || lower.includes('fb')) platform = 'Facebook';
      else if (lower.includes('tiktok')) platform = 'TikTok';
      return { platform, profile: line.trim() };
    });
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
        case_title: `Scam Report: ${formData.fraud_type.replace('_', ' ')} - ${formData.amount_stolen} ${formData.currency_type}`,
        fraud_type: formData.fraud_type,
        victim_contact_info: {
          name: formData.victim_name,
          email: formData.victim_email,
          phone: formData.victim_phone,
          preferred_contact: 'email'
        },
        scammer_wallet: formData.scammer_wallet,
        suspect_details: {
          name: formData.scammer_name,
          email: formData.scammer_email,
          phone: formData.scammer_phone,
          social_media: parseSocialMedia(formData.scammer_social_media),
          wallet_addresses: [formData.scammer_wallet]
        },
        blockchain: formData.blockchain,
        amount_stolen: formData.amount_stolen,
        amount_stolen_usd: formData.currency_type === 'USD' ? formData.amount_stolen : 0,
        currency_type: formData.currency_type,
        description: formData.description,
        incident_date: formData.incident_date ? new Date(formData.incident_date).toISOString() : new Date().toISOString(),
        evidence: evidenceFiles.map(f => ({
          type: f.type,
          url: f.url,
          description: f.name
        })),
        evidence_log: evidenceFiles.map(f => ({
          timestamp: new Date().toISOString(),
          type: f.type,
          url: f.url,
          description: f.name,
          uploaded_by: user?.email || 'anonymous',
          verified: false
        })),
        status: 'reported',
        admin_contact_status: 'Pending',
        case_priority: formData.amount_stolen >= 10000 ? 'high' : formData.amount_stolen >= 1000 ? 'medium' : 'low'
      };

      await base44.entities.FraudCase.create(caseData);

      toast.success('Case submitted successfully! Our team will review it shortly.');
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          victim_name: user?.full_name || '',
          victim_email: user?.email || '',
          victim_phone: '',
          scammer_name: '',
          scammer_phone: '',
          scammer_email: '',
          scammer_social_media: '',
          scammer_wallet: '',
          fraud_type: 'crypto_theft',
          amount_stolen: 0,
          currency_type: 'USD',
          blockchain: 'ethereum',
          description: '',
          incident_date: ''
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
          
          {/* Victim Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">Your Information (Victim)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white font-semibold mb-2 block">Full Name *</Label>
                <Input
                  value={formData.victim_name}
                  onChange={(e) => setFormData({...formData, victim_name: e.target.value})}
                  placeholder="Your full name"
                  className="bg-[#0f1419] border-cyan-500/30 text-white placeholder:text-gray-500 h-12"
                  required
                />
              </div>
              
              <div>
                <Label className="text-white font-semibold mb-2 block">Email *</Label>
                <Input
                  type="email"
                  value={formData.victim_email}
                  onChange={(e) => setFormData({...formData, victim_email: e.target.value})}
                  placeholder="your.email@example.com"
                  className="bg-[#0f1419] border-cyan-500/30 text-white placeholder:text-gray-500 h-12"
                  required
                />
              </div>
              
              <div>
                <Label className="text-white font-semibold mb-2 block">Phone Number</Label>
                <Input
                  value={formData.victim_phone}
                  onChange={(e) => setFormData({...formData, victim_phone: e.target.value})}
                  placeholder="+1 (555) 123-4567"
                  className="bg-[#0f1419] border-cyan-500/30 text-white placeholder:text-gray-500 h-12"
                />
              </div>
            </div>
          </div>

          {/* Scammer Information Section */}
          <div className="space-y-4 pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-bold text-white">Scammer Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white font-semibold mb-2 block">Scammer Name / Alias</Label>
                <Input
                  value={formData.scammer_name}
                  onChange={(e) => setFormData({...formData, scammer_name: e.target.value})}
                  placeholder="Name or alias used by scammer"
                  className="bg-[#0f1419] border-red-500/30 text-white placeholder:text-gray-500 h-12"
                />
              </div>
              
              <div>
                <Label className="text-white font-semibold mb-2 block">Scammer Phone Number</Label>
                <Input
                  value={formData.scammer_phone}
                  onChange={(e) => setFormData({...formData, scammer_phone: e.target.value})}
                  placeholder="Phone number used by scammer"
                  className="bg-[#0f1419] border-red-500/30 text-white placeholder:text-gray-500 h-12"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white font-semibold mb-2 block">Scammer Email (Optional)</Label>
              <Input
                type="email"
                value={formData.scammer_email}
                onChange={(e) => setFormData({...formData, scammer_email: e.target.value})}
                placeholder="scammer@email.com"
                className="bg-[#0f1419] border-red-500/30 text-white placeholder:text-gray-500 h-12"
              />
            </div>
            
            <div>
              <Label className="text-white font-semibold mb-2 block">
                Scammer Social Media Accounts
                <span className="text-gray-400 font-normal ml-2 text-sm">(One per line)</span>
              </Label>
              <Textarea
                value={formData.scammer_social_media}
                onChange={(e) => setFormData({...formData, scammer_social_media: e.target.value})}
                placeholder={`Instagram: @scammer_handle\nWhatsApp: +1234567890\nTelegram: @username\nFacebook: facebook.com/profile\nTikTok: @tiktok_handle`}
                className="bg-[#0f1419] border-red-500/30 text-white placeholder:text-gray-500 min-h-[140px] font-mono text-sm"
              />
            </div>
            
            <div>
              <Label className="text-white font-semibold mb-2 block">
                <Wallet className="w-4 h-4 inline mr-2" />
                Scammer Wallet Address *
              </Label>
              <Input
                value={formData.scammer_wallet}
                onChange={(e) => setFormData({...formData, scammer_wallet: e.target.value})}
                placeholder="0x... or bc1... or T..."
                className="bg-[#0f1419] border-red-500/30 text-white placeholder:text-gray-500 h-12 font-mono"
                required
              />
            </div>
          </div>

          {/* Financial Details Section */}
          <div className="space-y-4 pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-bold text-white">Financial Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-white font-semibold mb-2 block">Amount Lost *</Label>
                <Input
                  type="number"
                  value={formData.amount_stolen}
                  onChange={(e) => setFormData({...formData, amount_stolen: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className="bg-[#0f1419] border-yellow-500/30 text-white placeholder:text-gray-500 h-12"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div>
                <Label className="text-white font-semibold mb-2 block">Currency Type *</Label>
                <Select value={formData.currency_type} onValueChange={(v) => setFormData({...formData, currency_type: v})}>
                  <SelectTrigger className="bg-[#0f1419] border-yellow-500/30 text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/30">
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                    <SelectItem value="USDT">Tether (USDT)</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-white font-semibold mb-2 block">Blockchain Network</Label>
                <Select value={formData.blockchain} onValueChange={(v) => setFormData({...formData, blockchain: v})}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/30">
                    <SelectItem value="bitcoin">Bitcoin</SelectItem>
                    <SelectItem value="ethereum">Ethereum</SelectItem>
                    <SelectItem value="bsc">BNB Smart Chain</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                    <SelectItem value="tron">Tron</SelectItem>
                    <SelectItem value="multiple">Multiple Networks</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Case Details Section */}
          <div className="space-y-4 pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Case Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white font-semibold mb-2 block">Fraud Type *</Label>
                <Select value={formData.fraud_type} onValueChange={(v) => setFormData({...formData, fraud_type: v})}>
                  <SelectTrigger className="bg-[#0f1419] border-purple-500/30 text-white h-12">
                    <SelectValue>
                      <span className={`font-semibold ${
                        formData.fraud_type === 'crypto_theft' ? 'text-red-400' :
                        formData.fraud_type === 'phishing' ? 'text-orange-400' :
                        formData.fraud_type === 'fake_exchange' ? 'text-yellow-400' :
                        formData.fraud_type === 'rug_pull' ? 'text-pink-400' :
                        formData.fraud_type === 'romance_scam' ? 'text-purple-400' :
                        formData.fraud_type === 'investment_scam' ? 'text-cyan-400' :
                        'text-gray-300'
                      }`}>
                        {formData.fraud_type === 'crypto_theft' ? '🔴 Crypto Theft' :
                         formData.fraud_type === 'phishing' ? '🟠 Phishing Attack' :
                         formData.fraud_type === 'fake_exchange' ? '🟡 Fake Exchange' :
                         formData.fraud_type === 'rug_pull' ? '🩷 Rug Pull' :
                         formData.fraud_type === 'romance_scam' ? '🟣 Romance Scam' :
                         formData.fraud_type === 'investment_scam' ? '🔵 Investment Scam' :
                         '⚪ Other'}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a2332] border-cyan-500/30">
                    <SelectItem value="crypto_theft" className="text-red-400 font-semibold focus:bg-red-500/20 focus:text-red-300">🔴 Crypto Theft</SelectItem>
                    <SelectItem value="phishing" className="text-orange-400 font-semibold focus:bg-orange-500/20 focus:text-orange-300">🟠 Phishing Attack</SelectItem>
                    <SelectItem value="fake_exchange" className="text-yellow-400 font-semibold focus:bg-yellow-500/20 focus:text-yellow-300">🟡 Fake Exchange</SelectItem>
                    <SelectItem value="rug_pull" className="text-pink-400 font-semibold focus:bg-pink-500/20 focus:text-pink-300">🩷 Rug Pull</SelectItem>
                    <SelectItem value="romance_scam" className="text-purple-400 font-semibold focus:bg-purple-500/20 focus:text-purple-300">🟣 Romance Scam</SelectItem>
                    <SelectItem value="investment_scam" className="text-cyan-400 font-semibold focus:bg-cyan-500/20 focus:text-cyan-300">🔵 Investment Scam</SelectItem>
                    <SelectItem value="other" className="text-gray-300 font-semibold focus:bg-gray-500/20 focus:text-gray-200">⚪ Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-white font-semibold mb-2 block">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date of Incident
                </Label>
                <Input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                  className="bg-[#0f1419] border-purple-500/30 text-white h-12"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div>
              <Label className="text-white font-semibold mb-2 block">Description of the Scam *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Please describe in detail what happened, how you were contacted, what was promised, and how the scam occurred. Include any relevant details that could help our investigation."
                className="bg-[#0f1419] border-purple-500/30 text-white placeholder:text-gray-500 min-h-[180px]"
                required
              />
            </div>
          </div>

          {/* Evidence Upload Section */}
          <div className="space-y-4 pt-4 border-t border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-bold text-white">Evidence Upload</h3>
              <span className="text-gray-400 text-sm">(Screenshots, PDFs, Images)</span>
            </div>
            
            <div className="border-2 border-dashed border-green-500/30 rounded-xl p-6 text-center bg-green-500/5 hover:bg-green-500/10 transition-colors">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="evidence-upload"
                disabled={uploadingFiles}
              />
              <label htmlFor="evidence-upload" className="cursor-pointer">
                {uploadingFiles ? (
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
                    <span className="text-green-400 font-medium">Uploading files...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-white font-semibold text-lg">Click to upload evidence files</p>
                    <p className="text-gray-400 mt-1">Supports: Images, Screenshots, PDFs, Documents</p>
                  </>
                )}
              </label>
            </div>
            
            {evidenceFiles.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-white font-semibold">{evidenceFiles.length} file(s) uploaded:</p>
                {evidenceFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-green-400" />
                      <span className="text-white text-sm truncate max-w-[300px]">{file.name}</span>
                      <span className="text-gray-500 text-xs px-2 py-1 bg-gray-800 rounded">{file.type}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-6 border-t border-gray-700/50">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Submitting Case...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-5 h-5 mr-3" />
                  Submit Scam Report
                </>
              )}
            </Button>
            
            <p className="text-center text-gray-400 text-sm mt-4">
              By submitting, you confirm this information is accurate. False reports may result in account suspension.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}