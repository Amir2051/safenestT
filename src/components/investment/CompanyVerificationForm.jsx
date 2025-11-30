import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertTriangle, FileText, Building, Upload, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CompanyVerificationForm({ initialData, onSuccess, onCancel }) {
  const [formData, setFormData] = useState(initialData || {
    company_name: "",
    legal_name: "",
    registration_number: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    industry: "Tech",
    description: "",
    logo_url: "",
    verification_status: "pending",
    is_public: false,
    min_investment: 1000,
    expected_returns: "",
    risk_notes: "",
    escrow_requirements: "",
    fraud_check_data: {
      domain_reputation: "Unknown",
      phone_reputation: "Unknown",
      scam_db_scan: "Clean",
      wallet_risk_score: 0
    },
    owner_info: {
      name: "",
      id_url: "",
      verified: false
    }
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initialData?.id) {
        await base44.entities.VerifiedCompany.update(initialData.id, formData);
        toast.success("Company updated successfully");
      } else {
        await base44.entities.VerifiedCompany.create(formData);
        toast.success("Company created successfully");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save company");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="info" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800">
          <TabsTrigger value="info">Info & Docs</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Screening</TabsTrigger>
          <TabsTrigger value="listing">Listing & Escrow</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Company Name</label>
              <Input 
                value={formData.company_name} 
                onChange={(e) => handleChange("company_name", e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Legal Name</label>
              <Input 
                value={formData.legal_name} 
                onChange={(e) => handleChange("legal_name", e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Registration / EIN</label>
              <Input 
                value={formData.registration_number} 
                onChange={(e) => handleChange("registration_number", e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Industry</label>
              <Select value={formData.industry} onValueChange={(v) => handleChange("industry", v)}>
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tech">Tech</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <label className="text-sm text-slate-400">Owner Name</label>
               <Input 
                 value={formData.owner_info.name}
                 onChange={(e) => handleNestedChange("owner_info", "name", e.target.value)}
                 className="bg-slate-900 border-slate-700 text-white"
               />
            </div>
            <div className="space-y-2">
               <label className="text-sm text-slate-400">Owner Identity Verified?</label>
               <Select 
                 value={formData.owner_info.verified ? "yes" : "no"} 
                 onValueChange={(v) => handleNestedChange("owner_info", "verified", v === "yes")}
               >
                 <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="yes">Verified</SelectItem>
                   <SelectItem value="no">Not Verified</SelectItem>
                 </SelectContent>
               </Select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Address</label>
            <Input 
              value={formData.address} 
              onChange={(e) => handleChange("address", e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Documents URL (PDF)</label>
            <div className="flex gap-2">
                <Input 
                  placeholder="https://..."
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <Button type="button" variant="outline" size="icon">
                  <Upload className="w-4 h-4" />
                </Button>
            </div>
            <p className="text-xs text-slate-500">Upload Corporate Docs & Proof of Funds</p>
          </div>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4 mt-4">
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="text-base text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Internal Fraud Screening
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-sm text-slate-400">Domain Reputation</label>
                   <Select 
                     value={formData.fraud_check_data.domain_reputation} 
                     onValueChange={(v) => handleNestedChange("fraud_check_data", "domain_reputation", v)}
                   >
                     <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Safe">Safe</SelectItem>
                       <SelectItem value="Suspicious">Suspicious</SelectItem>
                       <SelectItem value="Malicious">Malicious</SelectItem>
                       <SelectItem value="Unknown">Unknown</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm text-slate-400">Scam Database Scan</label>
                   <Select 
                     value={formData.fraud_check_data.scam_db_scan} 
                     onValueChange={(v) => handleNestedChange("fraud_check_data", "scam_db_scan", v)}
                   >
                     <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Clean">Clean</SelectItem>
                       <SelectItem value="Match Found">Match Found</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">Wallet Risk Score (0-100)</label>
                 <Input 
                   type="number"
                   value={formData.fraud_check_data.wallet_risk_score}
                   onChange={(e) => handleNestedChange("fraud_check_data", "wallet_risk_score", Number(e.target.value))}
                   className="bg-slate-800 border-slate-600 text-white"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-sm text-slate-400">Risk Notes</label>
                 <Textarea 
                   value={formData.risk_notes}
                   onChange={(e) => handleChange("risk_notes", e.target.value)}
                   className="bg-slate-800 border-slate-600 text-white"
                   placeholder="Internal notes on risk assessment..."
                 />
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Verification Status</label>
             <Select 
               value={formData.verification_status} 
               onValueChange={(v) => handleChange("verification_status", v)}
             >
               <SelectTrigger className={`border-slate-700 text-white ${
                 formData.verification_status === 'active' ? 'bg-green-900/50 border-green-500/50' :
                 formData.verification_status === 'rejected' ? 'bg-red-900/50 border-red-500/50' :
                 'bg-slate-900'
               }`}>
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="pending">Pending Review</SelectItem>
                 <SelectItem value="active">Verified Active</SelectItem>
                 <SelectItem value="rejected">Rejected</SelectItem>
                 <SelectItem value="suspended">Suspended</SelectItem>
               </SelectContent>
             </Select>
          </div>
        </TabsContent>

        <TabsContent value="listing" className="space-y-4 mt-4">
          <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
            <div className="flex-1">
              <h4 className="text-white font-semibold">Public Visibility</h4>
              <p className="text-xs text-slate-400">Show this company on the User Investment Hub?</p>
            </div>
            <Select 
               value={formData.is_public ? "yes" : "no"} 
               onValueChange={(v) => handleChange("is_public", v === "yes")}
            >
               <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="yes">Visible</SelectItem>
                 <SelectItem value="no">Hidden</SelectItem>
               </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-400">Description</label>
            <Textarea 
              value={formData.description} 
              onChange={(e) => handleChange("description", e.target.value)}
              className="bg-slate-900 border-slate-700 text-white h-32"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-sm text-slate-400">Min Investment ($)</label>
                <Input 
                  type="number"
                  value={formData.min_investment} 
                  onChange={(e) => handleChange("min_investment", Number(e.target.value))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-slate-400">Expected Returns</label>
                <Input 
                  value={formData.expected_returns} 
                  onChange={(e) => handleChange("expected_returns", e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="e.g. 12% APY"
                />
             </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-400">Escrow Requirements</label>
            <Textarea 
              value={formData.escrow_requirements} 
              onChange={(e) => handleChange("escrow_requirements", e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
              placeholder="Conditions for releasing funds..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
        <Button type="button" variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white">
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          {saving ? "Saving..." : "Save Company"}
        </Button>
      </div>
    </form>
  );
}