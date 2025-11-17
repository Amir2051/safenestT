import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function AddWalletDialog({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    wallet_name: '',
    wallet_address: '',
    blockchain: 'ethereum',
    wallet_type: 'hot',
    balance_usd: 0,
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scamCheck = await base44.functions.invoke('cryptoScamDetection', {
        endpoint: 'check-wallet',
        address: formData.wallet_address,
        blockchain: formData.blockchain
      });

      const riskScore = scamCheck.data.risk_score || 0;

      if (scamCheck.data.is_scam) {
        toast.error('⚠️ This wallet is in our scam database! Not adding.');
        setLoading(false);
        return;
      }

      await base44.entities.CryptoWallet.create({
        ...formData,
        risk_score: riskScore,
        is_monitored: true,
        alerts_enabled: true
      });

      toast.success('Wallet added successfully!');
      onSuccess();
    } catch (error) {
      toast.error('Failed to add wallet: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-400" />
            Add Crypto Wallet
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label className="text-white">Wallet Name</Label>
            <Input
              value={formData.wallet_name}
              onChange={(e) => setFormData({...formData, wallet_name: e.target.value})}
              placeholder="My Ethereum Wallet"
              className="bg-[#0f1419] border-cyan-500/20 text-white"
              required
            />
          </div>

          <div>
            <Label className="text-white">Wallet Address</Label>
            <Input
              value={formData.wallet_address}
              onChange={(e) => setFormData({...formData, wallet_address: e.target.value})}
              placeholder="0x..."
              className="bg-[#0f1419] border-cyan-500/20 text-white font-mono text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Wallet Type</Label>
              <Select value={formData.wallet_type} onValueChange={(v) => setFormData({...formData, wallet_type: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="hot">Hot Wallet</SelectItem>
                  <SelectItem value="cold">Cold Wallet</SelectItem>
                  <SelectItem value="exchange">Exchange</SelectItem>
                  <SelectItem value="hardware">Hardware Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white">Balance (USD) - Optional</Label>
            <Input
              type="number"
              value={formData.balance_usd}
              onChange={(e) => setFormData({...formData, balance_usd: parseFloat(e.target.value) || 0})}
              placeholder="0.00"
              className="bg-[#0f1419] border-cyan-500/20 text-white"
            />
          </div>

          <div>
            <Label className="text-white">Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional information..."
              className="bg-[#0f1419] border-cyan-500/20 text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-pink-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Wallet'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}