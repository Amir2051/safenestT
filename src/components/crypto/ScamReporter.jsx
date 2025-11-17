import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function ScamReporter() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    scam_type: 'wallet',
    identifier: '',
    blockchain: 'ethereum',
    description: '',
    amount_stolen: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await base44.functions.invoke('cryptoScamDetection', {
        endpoint: 'report-scam',
        ...formData
      });

      toast.success('Scam reported successfully! Thank you for helping the community.');
      setSubmitted(true);
      
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          scam_type: 'wallet',
          identifier: '',
          blockchain: 'ethereum',
          description: '',
          amount_stolen: 0
        });
      }, 3000);
    } catch (error) {
      toast.error('Failed to report: ' + error.message);
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
        <CardContent className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Report Submitted!</h3>
          <p className="text-gray-400">
            Thank you for reporting. Our team will review and verify this scam.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Report a Scam
        </CardTitle>
        <p className="text-sm text-gray-400">Help protect the community by reporting scams</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-white">Scam Type</Label>
              <Select value={formData.scam_type} onValueChange={(v) => setFormData({...formData, scam_type: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="wallet">Scam Wallet</SelectItem>
                  <SelectItem value="website">Phishing Website</SelectItem>
                  <SelectItem value="app">Fake App</SelectItem>
                  <SelectItem value="exchange">Fake Exchange</SelectItem>
                  <SelectItem value="contract">Malicious Contract</SelectItem>
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
                  <SelectItem value="multiple">Multiple</SelectItem>
                  <SelectItem value="n/a">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-white">
              {formData.scam_type === 'wallet' ? 'Wallet Address' :
               formData.scam_type === 'website' ? 'Website URL' :
               formData.scam_type === 'app' ? 'App Name/ID' :
               'Identifier'}
            </Label>
            <Input
              value={formData.identifier}
              onChange={(e) => setFormData({...formData, identifier: e.target.value})}
              placeholder={
                formData.scam_type === 'wallet' ? '0x...' :
                formData.scam_type === 'website' ? 'https://...' :
                'Identifier'
              }
              className="bg-[#0f1419] border-cyan-500/20 text-white font-mono text-sm"
              required
            />
          </div>

          <div>
            <Label className="text-white">Amount Stolen (USD) - Optional</Label>
            <Input
              type="number"
              value={formData.amount_stolen}
              onChange={(e) => setFormData({...formData, amount_stolen: parseFloat(e.target.value) || 0})}
              placeholder="0.00"
              className="bg-[#0f1419] border-cyan-500/20 text-white"
            />
          </div>

          <div>
            <Label className="text-white">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe how the scam works, what happened, etc."
              className="bg-[#0f1419] border-cyan-500/20 text-white min-h-32"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}