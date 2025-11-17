import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ReportFraudDialog({ onClose, onSuccess }) {
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
    description: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.entities.FraudCase.create({
        ...formData,
        status: 'reported',
        recovery_progress: 0,
        traced_wallets: [],
        exchanges_notified: [],
        case_notes: [{
          timestamp: new Date().toISOString(),
          note: 'Case created',
          author: 'User'
        }]
      });

      await base44.functions.invoke('cryptoScamDetection', {
        endpoint: 'report-scam',
        scam_type: 'wallet',
        identifier: formData.scammer_wallet,
        blockchain: formData.blockchain,
        description: `Related to fraud case: ${formData.case_title}`,
        amount_stolen: formData.amount_stolen_usd
      });

      toast.success('Fraud case reported. Starting investigation...');
      onSuccess();
    } catch (error) {
      toast.error('Failed to report: ' + error.message);
    }

    setLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-red-500/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Report Fraud Case
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label className="text-white">Case Title</Label>
            <Input
              value={formData.case_title}
              onChange={(e) => setFormData({...formData, case_title: e.target.value})}
              placeholder="Brief title of the incident"
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Fraud Type</Label>
              <Select value={formData.fraud_type} onValueChange={(v) => setFormData({...formData, fraud_type: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
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
              <Label className="text-white">Blockchain</Label>
              <Select value={formData.blockchain} onValueChange={(v) => setFormData({...formData, blockchain: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="bsc">BSC</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                  <SelectItem value="solana">Solana</SelectItem>
                  <SelectItem value="tron">Tron</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white">Your Wallet Address (Victim)</Label>
            <Input
              value={formData.victim_wallet}
              onChange={(e) => setFormData({...formData, victim_wallet: e.target.value})}
              placeholder="0x..."
              className="bg-[#0f1419] border-cyan-500/20 text-white font-mono text-sm"
            />
          </div>

          <div>
            <Label className="text-white">Scammer's Wallet Address</Label>
            <Input
              value={formData.scammer_wallet}
              onChange={(e) => setFormData({...formData, scammer_wallet: e.target.value})}
              placeholder="0x..."
              className="bg-[#0f1419] border-cyan-500/20 text-white font-mono text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Amount Stolen (Crypto)</Label>
              <Input
                type="number"
                step="0.00001"
                value={formData.amount_stolen}
                onChange={(e) => setFormData({...formData, amount_stolen: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Amount (USD)</Label>
              <Input
                type="number"
                value={formData.amount_stolen_usd}
                onChange={(e) => setFormData({...formData, amount_stolen_usd: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
                className="bg-[#0f1419] border-cyan-500/20 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label className="text-white">Incident Date</Label>
            <Input
              type="date"
              value={formData.incident_date}
              onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              required
            />
          </div>

          <div>
            <Label className="text-white">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe what happened, how you were scammed, any evidence you have..."
              className="bg-[#0f1419] border-cyan-500/20 text-white min-h-32"
              required
            />
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