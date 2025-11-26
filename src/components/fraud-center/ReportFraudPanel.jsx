import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle, User, Wallet, DollarSign, Calendar, FileText,
  Upload, Send, Loader2, CheckCircle, Shield, Scale
} from "lucide-react";
import { toast } from "sonner";

export default function ReportFraudPanel({ user, onCaseCreated }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    case_title: '',
    fraud_type: '',
    victim_name: user?.full_name || '',
    victim_email: user?.email || '',
    victim_phone: '',
    victim_address: '',
    amount_stolen_usd: '',
    cryptocurrency: '',
    blockchain: '',
    scammer_wallet: '',
    scammer_name: '',
    scammer_email: '',
    scammer_phone: '',
    scammer_telegram: '',
    scammer_website: '',
    incident_date: '',
    description: '',
    law_enforcement_authorized: false,
    authorization_full_name: ''
  });

  const fraudTypes = [
    { value: 'crypto_theft', label: 'Crypto Theft' },
    { value: 'phishing', label: 'Phishing Attack' },
    { value: 'fake_exchange', label: 'Fake Exchange' },
    { value: 'rug_pull', label: 'Rug Pull' },
    { value: 'romance_scam', label: 'Romance Scam' },
    { value: 'investment_scam', label: 'Investment Scam' },
    { value: 'pig_butchering', label: 'Pig Butchering' },
    { value: 'ransomware', label: 'Ransomware' },
    { value: 'other', label: 'Other' }
  ];

  const blockchains = [
    'Ethereum', 'Bitcoin', 'BSC', 'Polygon', 'Solana', 'Tron', 'Avalanche', 'Other'
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (stepNum) => {
    switch (stepNum) {
      case 1:
        return formData.case_title && formData.fraud_type;
      case 2:
        return formData.victim_name && formData.amount_stolen_usd;
      case 3:
        return true; // Suspect info is optional
      case 4:
        return formData.description && (!formData.law_enforcement_authorized || formData.authorization_full_name);
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    
    try {
      const caseNumber = `SF-${Date.now().toString(36).toUpperCase()}`;
      
      // Create FraudCase for user's My Cases
      await base44.entities.FraudCase.create({
        case_title: formData.case_title,
        fraud_type: formData.fraud_type,
        amount_stolen_usd: parseFloat(formData.amount_stolen_usd) || 0,
        blockchain: formData.blockchain,
        scammer_wallet: formData.scammer_wallet,
        victim_contact_info: {
          name: formData.victim_name,
          email: formData.victim_email,
          phone: formData.victim_phone,
          address: formData.victim_address
        },
        suspect_details: {
          name: formData.scammer_name,
          email: formData.scammer_email,
          phone: formData.scammer_phone,
          websites: formData.scammer_website ? [formData.scammer_website] : [],
          social_media: formData.scammer_telegram ? [{ platform: 'Telegram', profile: formData.scammer_telegram }] : []
        },
        incident_date: formData.incident_date || new Date().toISOString(),
        description: formData.description,
        status: 'reported',
        admin_contact_status: 'Pending',
        case_priority: parseFloat(formData.amount_stolen_usd) > 50000 ? 'high' : 
                  parseFloat(formData.amount_stolen_usd) > 10000 ? 'medium' : 'low',
        law_enforcement_authorization: formData.law_enforcement_authorized ? {
          authorized: true,
          authorized_date: new Date().toISOString(),
          authorized_agencies: ['FBI', 'IC3', 'FTC'],
          full_name: formData.authorization_full_name,
          signature_confirmation: true
        } : {
          authorized: false
        }
      });

      // Also create InvestigationCase for admin tracking
      await base44.entities.InvestigationCase.create({
        case_number: caseNumber,
        case_title: formData.case_title,
        fraud_type: formData.fraud_type,
        victim_name: formData.victim_name,
        victim_email: formData.victim_email,
        victim_phone: formData.victim_phone,
        amount_stolen_usd: parseFloat(formData.amount_stolen_usd) || 0,
        cryptocurrency: formData.cryptocurrency,
        blockchain: formData.blockchain,
        victim_contact_info: {
          primary_email: formData.victim_email,
          phone: formData.victim_phone,
          address: formData.victim_address
        },
        scammer_info: {
          name: formData.scammer_name,
          email: formData.scammer_email,
          phone: formData.scammer_phone,
          telegram: formData.scammer_telegram,
          website: formData.scammer_website,
          wallet_addresses: formData.scammer_wallet ? [formData.scammer_wallet] : [],
          known_emails: formData.scammer_email ? [formData.scammer_email] : []
        },
        suspect_details: {
          primary_suspect: {
            name: formData.scammer_name,
            email: formData.scammer_email,
            phone: formData.scammer_phone
          },
          wallet_addresses: formData.scammer_wallet ? [formData.scammer_wallet] : []
        },
        monitored_wallets: formData.scammer_wallet ? [formData.scammer_wallet] : [],
        incident_date: formData.incident_date || new Date().toISOString(),
        description: formData.description,
        status: 'new',
        priority: parseFloat(formData.amount_stolen_usd) > 50000 ? 'high' : 
                  parseFloat(formData.amount_stolen_usd) > 10000 ? 'medium' : 'low',
        investigation_progress: 0
      });

      toast.success('Fraud case reported successfully!');
      setStep(5); // Success step
      
      setTimeout(() => {
        if (onCaseCreated) onCaseCreated();
      }, 2000);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit case: ' + error.message);
    }
    
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3, 4].map((s) => (
          <React.Fragment key={s}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step >= s 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' 
                : 'bg-gray-700 text-gray-400'
            }`}>
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-20 h-1 ${step > s ? 'bg-cyan-500' : 'bg-gray-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 5: Success */}
      {step === 5 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/30">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Case Submitted Successfully!</h2>
            <p className="text-gray-400 mb-6">
              Your fraud case has been created and is now being tracked.
            </p>
            <Button 
              onClick={onCaseCreated}
              className="bg-gradient-to-r from-cyan-500 to-blue-600"
            >
              View Active Cases
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Case Info */}
      {step === 1 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Step 1: Case Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Case Title *</Label>
              <Input
                value={formData.case_title}
                onChange={(e) => handleChange('case_title', e.target.value)}
                placeholder="e.g., Bitcoin theft from exchange hack"
                className="bg-[#0f1419] border-cyan-500/30 text-white"
              />
            </div>

            <div>
              <Label className="text-white mb-2 block">Fraud Type *</Label>
              <Select value={formData.fraud_type} onValueChange={(v) => handleChange('fraud_type', v)}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                  <SelectValue placeholder="Select fraud type" />
                </SelectTrigger>
                <SelectContent>
                  {fraudTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Cryptocurrency</Label>
                <Input
                  value={formData.cryptocurrency}
                  onChange={(e) => handleChange('cryptocurrency', e.target.value)}
                  placeholder="e.g., BTC, ETH, USDT"
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Blockchain</Label>
                <Select value={formData.blockchain} onValueChange={(v) => handleChange('blockchain', v)}>
                  <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                    <SelectValue placeholder="Select blockchain" />
                  </SelectTrigger>
                  <SelectContent>
                    {blockchains.map((chain) => (
                      <SelectItem key={chain} value={chain.toLowerCase()}>
                        {chain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!validateStep(1)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Victim & Financial Info */}
      {step === 2 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              Step 2: Victim Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Victim Name *</Label>
                <Input
                  value={formData.victim_name}
                  onChange={(e) => handleChange('victim_name', e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="Full name"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Victim Email *</Label>
                <Input
                  type="email"
                  value={formData.victim_email}
                  onChange={(e) => handleChange('victim_email', e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="victim@email.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Phone</Label>
                <Input
                  value={formData.victim_phone}
                  onChange={(e) => handleChange('victim_phone', e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Address</Label>
                <Input
                  value={formData.victim_address}
                  onChange={(e) => handleChange('victim_address', e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                  placeholder="City, State, Country"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Amount Stolen (USD) *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.amount_stolen_usd}
                    onChange={(e) => handleChange('amount_stolen_usd', e.target.value)}
                    placeholder="0.00"
                    className="pl-10 bg-[#0f1419] border-cyan-500/30 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-white mb-2 block">Incident Date</Label>
                <Input
                  type="date"
                  value={formData.incident_date}
                  onChange={(e) => handleChange('incident_date', e.target.value)}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="border-gray-500/30">
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!validateStep(2)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Suspect Information */}
      {step === 3 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Step 3: Suspect Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-2">
              <p className="text-gray-300 text-sm">Enter any information you have about the scammer/suspect. All fields are optional.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Suspect Name / Alias</Label>
                <Input
                  value={formData.scammer_name}
                  onChange={(e) => handleChange('scammer_name', e.target.value)}
                  className="bg-[#0f1419] border-red-500/30 text-white"
                  placeholder="Name or alias used"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Suspect Email</Label>
                <Input
                  type="email"
                  value={formData.scammer_email}
                  onChange={(e) => handleChange('scammer_email', e.target.value)}
                  className="bg-[#0f1419] border-red-500/30 text-white"
                  placeholder="scammer@email.com"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Suspect Phone / WhatsApp</Label>
                <Input
                  value={formData.scammer_phone}
                  onChange={(e) => handleChange('scammer_phone', e.target.value)}
                  className="bg-[#0f1419] border-red-500/30 text-white"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Telegram Handle</Label>
                <Input
                  value={formData.scammer_telegram}
                  onChange={(e) => handleChange('scammer_telegram', e.target.value)}
                  className="bg-[#0f1419] border-red-500/30 text-white"
                  placeholder="@username"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white mb-2 block">Scammer Wallet Address</Label>
                <Input
                  value={formData.scammer_wallet}
                  onChange={(e) => handleChange('scammer_wallet', e.target.value)}
                  placeholder="0x..."
                  className="bg-[#0f1419] border-red-500/30 text-white font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-white mb-2 block">Scammer Website / Platform</Label>
                <Input
                  value={formData.scammer_website}
                  onChange={(e) => handleChange('scammer_website', e.target.value)}
                  className="bg-[#0f1419] border-red-500/30 text-white"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="border-gray-500/30">
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Description & Submit */}
      {step === 4 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Step 4: Incident Description
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white mb-2 block">Detailed Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe what happened in detail. Include how you were contacted, what was promised, how the funds were transferred, and any other relevant information..."
                className="bg-[#0f1419] border-cyan-500/30 text-white min-h-[200px]"
              />
            </div>

            {/* Law Enforcement Authorization */}
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Scale className="w-5 h-5 text-purple-400" />
                Law Enforcement Authorization
              </h4>
              <p className="text-gray-300 text-sm mb-4">
                By checking this box, you authorize SafeNestT to act as your representative and contact law enforcement agencies (including FBI, IC3, and other relevant authorities) on your behalf regarding this fraud case.
              </p>
              
              <div className="flex items-start space-x-3 mb-4">
                <Checkbox
                  id="law_enforcement_auth"
                  checked={formData.law_enforcement_authorized}
                  onCheckedChange={(checked) => handleChange('law_enforcement_authorized', checked)}
                  className="mt-1 border-purple-500 data-[state=checked]:bg-purple-500"
                />
                <label htmlFor="law_enforcement_auth" className="text-sm text-white leading-relaxed cursor-pointer">
                  I hereby authorize SafeNestT and its representatives to contact law enforcement agencies, including but not limited to the FBI, IC3 (Internet Crime Complaint Center), FTC, and other relevant federal, state, or local authorities on my behalf. I understand that SafeNestT may share my case details, personal information, and evidence with these agencies to assist in the investigation and potential recovery of my stolen assets.
                </label>
              </div>

              {formData.law_enforcement_authorized && (
                <div className="mt-4 p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
                  <Label className="text-white mb-2 block">Full Legal Name (Electronic Signature) *</Label>
                  <Input
                    value={formData.authorization_full_name}
                    onChange={(e) => handleChange('authorization_full_name', e.target.value)}
                    placeholder="Enter your full legal name to confirm authorization"
                    className="bg-[#0f1419] border-purple-500/30 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    By typing your name above, you are providing your electronic signature confirming this authorization. Date: {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Case Summary
              </h4>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="text-white ml-2">{fraudTypes.find(f => f.value === formData.fraud_type)?.label}</span>
                </div>
                <div>
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-red-400 ml-2">${parseFloat(formData.amount_stolen_usd || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Victim:</span>
                  <span className="text-white ml-2">{formData.victim_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Victim Email:</span>
                  <span className="text-white ml-2">{formData.victim_email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Suspect:</span>
                  <span className="text-white ml-2">{formData.scammer_name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Suspect Email:</span>
                  <span className="text-white ml-2">{formData.scammer_email || 'N/A'}</span>
                </div>
                <div className="col-span-2 mt-2 pt-2 border-t border-cyan-500/20">
                  <span className="text-gray-400">Law Enforcement Authorization:</span>
                  <span className={`ml-2 font-semibold ${formData.law_enforcement_authorized ? 'text-green-400' : 'text-gray-500'}`}>
                    {formData.law_enforcement_authorized ? `✓ Authorized (${formData.authorization_full_name})` : 'Not Authorized'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="border-gray-500/30">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!validateStep(4) || submitting}
                className="bg-gradient-to-r from-red-500 to-orange-600"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Submit Case</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}