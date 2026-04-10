import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Upload, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import TransactionsList from "./TransactionsList";

export default function NewCaseModal({ onCaseCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [paymentTransactions, setPaymentTransactions] = useState([]);
  
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
    amount_lost: '',
    currency_type: 'USD',
    blockchain: 'Ethereum',
    
    // Case
    fraud_type: 'Crypto Theft',
    incident_date: '',
    description: '',
    
    // Legal
    law_enforcement_authorized: false
  });

  const queryClient = useQueryClient();

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

  const createCaseMutation = useMutation({
    mutationFn: async (data) => {
      // Get current user for ownership fields
      const user = await base44.auth.me();

      // Calculate total from transactions if provided
      const totalFromTransactions = paymentTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const finalAmount = totalFromTransactions > 0 ? totalFromTransactions : parseFloat(data.amount_lost) || 0;

      // Generate a simple case number
      const caseNumber = `CASE-${Date.now().toString().slice(-8)}`;

      // Map to MyCase schema with REQUIRED field incident_classification
      const casePayload = {
        // REQUIRED: incident_classification (IC3-aligned)
        incident_classification: 'cryptocurrency_fraud',

        // Ownership (critical for RLS visibility — all fields must be set)
        user_id: user.id,
        created_by: user.email,
        created_by_name: user.full_name || user.email,
        created_by_email: user.email,
        case_number: caseNumber,
        source_type: 'manual',

        // Victim
        client_name: data.victim_name,
        client_email: data.victim_email || user.email,
        phone_number: data.victim_phone,

        // Scammer
        scammer_info: {
          name: data.scammer_name,
          phone: data.scammer_phone,
          email: data.scammer_email,
          social_media: data.scammer_social_media ? data.scammer_social_media.split('\n').filter(s => s.trim()) : [],
          wallet_addresses: data.scammer_wallet ? [data.scammer_wallet] : []
        },
        scammer_wallet: data.scammer_wallet || '',

        // Financial
        amount_lost: finalAmount,
        payment_transactions: paymentTransactions,
        cryptocurrency: data.currency_type,
        blockchain: data.blockchain,

        // Case
        issue_type: data.fraud_type.toLowerCase().replace(/ /g, '_'),
        transaction_date: data.incident_date,
        description: data.description,

        // Meta
        status: 'Pending',
        urgency: 'Medium',

        // Legal
        law_enforcement_authorization: {
          authorized: data.law_enforcement_authorized,
          authorized_date: data.law_enforcement_authorized ? new Date().toISOString() : null,
          agencies: ['FBI', 'IC3', 'FTC']
        },

        // Evidence
        evidence_files: evidenceFiles.map(f => ({
          name: f.name,
          url: f.url,
          type: f.type,
          uploaded_date: new Date().toISOString()
        }))
      };

      console.log('📤 Submitting case directly to MyCase entity:', casePayload);

      const createdCase = await base44.entities.MyCase.create(casePayload);

      console.log('✅ Case created successfully:', createdCase);

      if (!createdCase || !createdCase.id) {
        throw new Error('Case was not saved — no ID returned from database');
      }

      return createdCase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-cases'] });
      queryClient.invalidateQueries({ queryKey: ['client-cases'] });
      queryClient.invalidateQueries({ queryKey: ['my-cases-admin'] });
      toast.success(`Case created successfully: ${data.case_number || data.id}`);
      setIsOpen(false);
      // Reset form
      setFormData({
        victim_name: '',
        victim_email: '',
        victim_phone: '',
        scammer_name: '',
        scammer_phone: '',
        scammer_email: '',
        scammer_social_media: '',
        scammer_wallet: '',
        amount_lost: '',
        currency_type: 'USD',
        blockchain: 'Ethereum',
        fraud_type: 'Crypto Theft',
        incident_date: '',
        description: '',
        law_enforcement_authorized: false
      });
      setEvidenceFiles([]);
      setPaymentTransactions([]);

      if (onCaseCreated) onCaseCreated();
    },
    onError: (error) => {
      toast.error("Failed to create case: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.victim_name) {
      toast.error("Please enter the victim's name");
      return;
    }
    createCaseMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Case
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a2332] border-gray-700 text-white sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Client Case</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          
          {/* Victim Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase border-b border-gray-700 pb-1">Victim Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label>Full Name *</Label>
                    <Input value={formData.victim_name} onChange={e => setFormData({...formData, victim_name: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1" required />
                </div>
                <div>
                    <Label>Email *</Label>
                    <Input type="email" value={formData.victim_email} onChange={e => setFormData({...formData, victim_email: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1" required />
                </div>
                <div>
                    <Label>Phone</Label>
                    <Input value={formData.victim_phone} onChange={e => setFormData({...formData, victim_phone: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1" />
                </div>
            </div>
          </div>

          {/* Scammer Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase border-b border-gray-700 pb-1">Scammer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Scammer Name/Alias</Label>
                    <Input value={formData.scammer_name} onChange={e => setFormData({...formData, scammer_name: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1" />
                </div>
                <div>
                     <Label>Scammer Wallet</Label>
                     <Input value={formData.scammer_wallet} onChange={e => setFormData({...formData, scammer_wallet: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1" />
                </div>
                <div className="md:col-span-2">
                    <Label>Social Media (One per line)</Label>
                    <Textarea value={formData.scammer_social_media} onChange={e => setFormData({...formData, scammer_social_media: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1 h-20" />
                </div>
            </div>
          </div>

          {/* Financial */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase border-b border-gray-700 pb-1">Financial Details</h3>
            
            <TransactionsList 
              transactions={paymentTransactions}
              onChange={setPaymentTransactions}
            />

            <div className="pt-3 border-t border-gray-700">
              <p className="text-gray-400 text-xs mb-3">Or enter a single total amount (if not using transactions above):</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                      <Label>Total Amount</Label>
                      <Input type="number" value={formData.amount_lost} onChange={e => setFormData({...formData, amount_lost: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1" />
                  </div>
                  <div>
                      <Label>Currency</Label>
                      <Select value={formData.currency_type} onValueChange={v => setFormData({...formData, currency_type: v})}>
                          <SelectTrigger className="bg-[#0f1419] border-gray-600 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="BTC">Bitcoin</SelectItem>
                              <SelectItem value="ETH">Ethereum</SelectItem>
                              <SelectItem value="USDT">Tether</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  <div>
                      <Label>Blockchain</Label>
                      <Select value={formData.blockchain} onValueChange={v => setFormData({...formData, blockchain: v})}>
                          <SelectTrigger className="bg-[#0f1419] border-gray-600 mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                              <SelectItem value="Ethereum">Ethereum</SelectItem>
                              <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                              <SelectItem value="BSC">BSC</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
            </div>
          </div>

          {/* Case Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-cyan-400 uppercase border-b border-gray-700 pb-1">Case Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label>Fraud Type</Label>
                    <Select value={formData.fraud_type} onValueChange={v => setFormData({...formData, fraud_type: v})}>
                        <SelectTrigger className="bg-[#0f1419] border-gray-600 mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#1a2332] border-gray-600 text-white">
                            <SelectItem value="Crypto Theft">Crypto Theft</SelectItem>
                            <SelectItem value="Phishing">Phishing</SelectItem>
                            <SelectItem value="Investment Scam">Investment Scam</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Date</Label>
                    <Input type="date" value={formData.incident_date} onChange={e => setFormData({...formData, incident_date: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1" />
                </div>
                <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="bg-[#0f1419] border-gray-600 mt-1 h-24" />
                </div>
            </div>
          </div>

          {/* Legal & Evidence */}
          <div className="space-y-4">
             <div className="flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                <Checkbox 
                    id="legal" 
                    checked={formData.law_enforcement_authorized} 
                    onCheckedChange={c => setFormData({...formData, law_enforcement_authorized: c})} 
                    className="mt-1 border-purple-500 data-[state=checked]:bg-purple-500"
                />
                <div>
                    <Label htmlFor="legal" className="font-semibold cursor-pointer">Law Enforcement Authorization</Label>
                    <p className="text-xs text-gray-400 mt-1">By checking this box, you authorize SafeNestT to act as your representative and contact law enforcement agencies (FBI, IC3, etc.) on your behalf.</p>
                </div>
             </div>

             <div>
                <Label>Evidence Upload</Label>
                <div className="border border-dashed border-gray-600 rounded p-4 text-center mt-1">
                    <input type="file" id="modal-upload" multiple className="hidden" onChange={handleFileUpload} disabled={uploadingFiles} />
                    <label htmlFor="modal-upload" className="cursor-pointer flex justify-center gap-2 items-center text-sm text-gray-400">
                        {uploadingFiles ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploadingFiles ? "Uploading..." : "Click to upload files"}
                    </label>
                </div>
                {evidenceFiles.length > 0 && (
                    <div className="text-xs text-gray-400 mt-2">{evidenceFiles.length} files uploaded</div>
                )}
             </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createCaseMutation.isPending}>
              {createCaseMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}