import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle, ChevronLeft, Shield, Wallet, FileText } from "lucide-react";
import { toast } from "sonner";

export default function ReportScam() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    case_title: '',
    fraud_type: 'crypto_theft',
    victim_wallet: '',
    scammer_wallet: '',
    blockchain: 'ethereum',
    amount_stolen: 0,
    amount_stolen_usd: 0,
    incident_date: new Date().toISOString().split('T')[0],
    description: '',
    victim_contact_info: {
        name: '',
        email: '',
        phone: '',
        preferred_contact: 'email'
    },
    evidence: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      
      // Prepare Case Data
      const caseData = {
        client_name: formData.victim_contact_info.name || user?.full_name,
        client_email: formData.victim_contact_info.email || user?.email,
        phone_number: formData.victim_contact_info.phone,
        issue_type: formData.fraud_type,
        status: 'Pending',
        urgency: 'Medium',
        description: formData.description,
        amount_lost: parseFloat(formData.amount_stolen_usd) || 0,
        blockchain: formData.blockchain,
        scammer_wallet: formData.scammer_wallet,
        victim_wallet: formData.victim_wallet,
        cryptocurrency: formData.cryptocurrency,
        transaction_date: formData.incident_date,
        case_number: `CASE-${Date.now()}`,
        created_by_name: user?.full_name,
        created_by_email: user?.email,
        case_notes: [{
          timestamp: new Date().toISOString(),
          note: 'Case submitted via Victim Portal',
          author: user?.email || 'Victim'
        }]
      };

      await base44.entities.ClientCase.create(caseData);

      // Trigger AI Analysis immediately
      await base44.functions.invoke('cryptoScamDetection', {
        endpoint: 'report-scam',
        scam_type: 'wallet',
        identifier: formData.scammer_wallet,
        blockchain: formData.blockchain,
        description: `Related to fraud case: ${formData.case_title}`,
        amount_stolen: formData.amount_stolen_usd
      });

      toast.success('Fraud case submitted successfully. Our investigation team has been notified.');
      navigate(createPageUrl('MyCases'));
    } catch (error) {
      toast.error('Failed to submit report: ' + error.message);
    }

    setLoading(false);
  };

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
          <h1 className="text-3xl font-bold text-white">File New Scam Report</h1>
          <p className="text-gray-400">
            Provide as much detail as possible. This information is encrypted and shared only with investigators.
          </p>
        </div>

        <Card className="bg-[#0f1419] border-cyan-500/20 shadow-xl shadow-cyan-900/10">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Section 1: Incident Basics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Incident Details
                </h3>
                <div className="grid gap-4">
                   <div>
                    <Label className="text-white">Case Title *</Label>
                    <Input
                      value={formData.case_title}
                      onChange={(e) => setFormData({...formData, case_title: e.target.value})}
                      placeholder="e.g. Metamask Phishing Attack"
                      className="bg-[#1a2332] border-gray-700 text-white mt-2"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white">Fraud Type *</Label>
                        <Select value={formData.fraud_type} onValueChange={(v) => setFormData({...formData, fraud_type: v})}>
                            <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                            <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                            <SelectItem value="crypto_theft">Crypto Theft</SelectItem>
                            <SelectItem value="phishing">Phishing Attack</SelectItem>
                            <SelectItem value="fake_exchange">Fake Exchange</SelectItem>
                            <SelectItem value="rug_pull">Rug Pull</SelectItem>
                            <SelectItem value="romance_scam">Romance Scam</SelectItem>
                            <SelectItem value="investment_scam">Investment Scam</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-white">Date of Incident *</Label>
                        <Input
                        type="date"
                        value={formData.incident_date}
                        onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                        className="bg-[#1a2332] border-gray-700 text-white mt-2"
                        required
                        />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Wallet Info */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                  <Wallet className="w-5 h-5" /> Blockchain Information
                </h3>
                <div className="grid gap-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                            <Label className="text-white">Blockchain Network</Label>
                            <Select value={formData.blockchain} onValueChange={(v) => setFormData({...formData, blockchain: v})}>
                                <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white mt-2">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a2332] border-gray-700 text-white">
                                <SelectItem value="bitcoin">Bitcoin</SelectItem>
                                <SelectItem value="ethereum">Ethereum</SelectItem>
                                <SelectItem value="bsc">Binance Smart Chain</SelectItem>
                                <SelectItem value="polygon">Polygon</SelectItem>
                                <SelectItem value="solana">Solana</SelectItem>
                                <SelectItem value="tron">Tron</SelectItem>
                                </SelectContent>
                            </Select>
                       </div>
                       <div>
                           <Label className="text-white">Scammer's Wallet Address *</Label>
                            <Input
                            value={formData.scammer_wallet}
                            onChange={(e) => setFormData({...formData, scammer_wallet: e.target.value})}
                            placeholder="0x..."
                            className="bg-[#1a2332] border-gray-700 text-white font-mono mt-2"
                            required
                            />
                       </div>
                   </div>
                   <div>
                       <Label className="text-white">Your Wallet Address (Optional)</Label>
                        <Input
                        value={formData.victim_wallet}
                        onChange={(e) => setFormData({...formData, victim_wallet: e.target.value})}
                        placeholder="0x..."
                        className="bg-[#1a2332] border-gray-700 text-white font-mono mt-2"
                        />
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                           <Label className="text-white">Amount Stolen (Crypto)</Label>
                            <Input
                            type="number"
                            step="any"
                            value={formData.amount_stolen}
                            onChange={(e) => setFormData({...formData, amount_stolen: parseFloat(e.target.value) || 0})}
                            className="bg-[#1a2332] border-gray-700 text-white mt-2"
                            required
                            />
                       </div>
                       <div>
                           <Label className="text-white">Approx Value (USD)</Label>
                            <Input
                            type="number"
                            step="any"
                            value={formData.amount_stolen_usd}
                            onChange={(e) => setFormData({...formData, amount_stolen_usd: parseFloat(e.target.value) || 0})}
                            className="bg-[#1a2332] border-gray-700 text-white mt-2"
                            required
                            />
                       </div>
                   </div>
                </div>
              </div>

              {/* Section 3: Description */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Description & Contact
                </h3>
                <div>
                    <Label className="text-white">Detailed Description *</Label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Please describe exactly what happened. Include any website URLs, names, or other platforms used by the scammer."
                        className="bg-[#1a2332] border-gray-700 text-white min-h-[150px] mt-2"
                        required
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white">Your Name</Label>
                        <Input
                        value={formData.victim_contact_info.name}
                        onChange={(e) => setFormData({
                            ...formData, 
                            victim_contact_info: {...formData.victim_contact_info, name: e.target.value}
                        })}
                        className="bg-[#1a2332] border-gray-700 text-white mt-2"
                        />
                    </div>
                     <div>
                        <Label className="text-white">Your Phone (Optional)</Label>
                        <Input
                        value={formData.victim_contact_info.phone}
                        onChange={(e) => setFormData({
                            ...formData, 
                            victim_contact_info: {...formData.victim_contact_info, phone: e.target.value}
                        })}
                        className="bg-[#1a2332] border-gray-700 text-white mt-2"
                        />
                    </div>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate(-1)} 
                  className="flex-1 border-gray-700 h-12"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white h-12 text-lg font-semibold"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Submitting Encrypted Report...
                    </>
                  ) : (
                    'Submit Fraud Report'
                  )}
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}