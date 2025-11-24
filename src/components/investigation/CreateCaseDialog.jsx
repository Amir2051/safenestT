import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CreateCaseDialog({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    case_title: "",
    victim_name: "",
    victim_email: "",
    victim_phone: "",
    fraud_type: "crypto_theft",
    amount_stolen_usd: "",
    cryptocurrency: "",
    blockchain: "",
    incident_date: "",
    description: "",
    priority: "medium"
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await base44.auth.me();
      const plan = user?.subscription_plan || 'free';
      
      // Check case limit for non-premium users
      if (plan !== 'premium_unlimited') {
        const existingCases = await base44.entities.InvestigationCase.list();
        const userCases = existingCases.filter(c => c.created_by === user.email);
        
        const limits = {
          free: 1,
          basic: 3,
          elite: 10
        };
        
        const limit = limits[plan] || 0;
        
        if (userCases.length >= limit) {
          toast.error(`Case limit reached. Upgrade to Premium Unlimited for unlimited cases.`);
          setLoading(false);
          return;
        }
      }
      
      const caseNumber = `CASE-${Date.now()}`;
      
      await base44.entities.InvestigationCase.create({
        ...formData,
        case_number: caseNumber,
        amount_stolen_usd: parseFloat(formData.amount_stolen_usd) || 0,
        status: "new",
        last_activity: new Date().toISOString(),
        created_by_name: user.full_name,
        created_by_email: user.email,
        case_notes: [{
          timestamp: new Date().toISOString(),
          author: "system",
          note: "Case created",
          type: "system"
        }]
      });

      toast.success("Case created successfully!");
      onSuccess();
    } catch (error) {
      console.error('Create case error:', error);
      toast.error("Failed to create case: " + error.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Create New Investigation Case</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-white">Case Title *</Label>
              <Input
                value={formData.case_title}
                onChange={(e) => setFormData({...formData, case_title: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                placeholder="Brief case description"
                required
              />
            </div>

            <div>
              <Label className="text-white">Victim Name *</Label>
              <Input
                value={formData.victim_name}
                onChange={(e) => setFormData({...formData, victim_name: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                required
              />
            </div>

            <div>
              <Label className="text-white">Victim Email</Label>
              <Input
                type="email"
                value={formData.victim_email}
                onChange={(e) => setFormData({...formData, victim_email: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white">Victim Phone</Label>
              <Input
                value={formData.victim_phone}
                onChange={(e) => setFormData({...formData, victim_phone: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white">Fraud Type *</Label>
              <Select value={formData.fraud_type} onValueChange={(val) => setFormData({...formData, fraud_type: val})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="crypto_theft">Crypto Theft</SelectItem>
                  <SelectItem value="phishing">Phishing</SelectItem>
                  <SelectItem value="fake_exchange">Fake Exchange</SelectItem>
                  <SelectItem value="rug_pull">Rug Pull</SelectItem>
                  <SelectItem value="romance_scam">Romance Scam</SelectItem>
                  <SelectItem value="investment_scam">Investment Scam</SelectItem>
                  <SelectItem value="pig_butchering">Pig Butchering</SelectItem>
                  <SelectItem value="ransomware">Ransomware</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Amount Stolen (USD) *</Label>
              <Input
                type="number"
                value={formData.amount_stolen_usd}
                onChange={(e) => setFormData({...formData, amount_stolen_usd: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label className="text-white">Cryptocurrency</Label>
              <Input
                value={formData.cryptocurrency}
                onChange={(e) => setFormData({...formData, cryptocurrency: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
                placeholder="BTC, ETH, etc."
              />
            </div>

            <div>
              <Label className="text-white">Blockchain</Label>
              <Select value={formData.blockchain} onValueChange={(val) => setFormData({...formData, blockchain: val})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                  <SelectValue placeholder="Select blockchain" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="bsc">BSC</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Incident Date</Label>
              <Input
                type="date"
                value={formData.incident_date}
                onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2"
              />
            </div>

            <div>
              <Label className="text-white">Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-white">Case Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="bg-[#0f1419] border-cyan-500/20 text-white mt-2 h-32"
                placeholder="Detailed description of the incident..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="border-cyan-500/20">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-cyan-500 to-blue-600">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Case"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}