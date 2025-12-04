import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, FileText, Clock, User, DollarSign, Shield, Upload, Plus, 
  MessageSquare, ExternalLink, Calendar, AlertCircle, Database, Building2,
  Edit, Save, Phone, Mail, MapPin, TrendingUp
} from "lucide-react";
import InvestigationNotes from "./InvestigationNotes.jsx";
import RecommendedAgencies from "./RecommendedAgencies.jsx";
import CaseDocuments from "./CaseDocuments.jsx";
import SuspectEditForm from "./SuspectEditForm.jsx";
import TrackingToolsPanel from "@/components/admin/TrackingToolsPanel.jsx";
import AgencyReportGenerator from "./AgencyReportGenerator.jsx";
import CryptoIntelligenceReport from "./CryptoIntelligenceReport.jsx";
import { toast } from "sonner";

export default function CaseDetailDialog({ caseData, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize state directly matching ClientCase schema
  const [editedCase, setEditedCase] = useState({
    // Identity & Contact
    client_name: caseData.client_name || caseData.victim_name || '',
    client_email: caseData.client_email || caseData.victim_email || '',
    phone_number: caseData.phone_number || caseData.victim_phone || '',
    
    // Case Meta
    case_number: caseData.case_number || '', 
    case_title: caseData.case_title || caseData.case_number || 'Untitled Case',
    status: caseData.status || 'Pending',
    urgency: caseData.urgency || caseData.priority || 'Medium',
    issue_type: caseData.issue_type || 'crypto_theft',
    description: caseData.description || '',
    
    // Financial
    amount_lost: caseData.amount_lost || caseData.amount_stolen_usd || 0,
    recovery_amount: caseData.recovery_amount || 0,
    cryptocurrency: caseData.cryptocurrency || '',
    blockchain: caseData.blockchain || '',
    
    // Suspect / Scammer
    scammer_info: caseData.scammer_info || {},
    scammer_wallet: caseData.scammer_wallet || '',
    monitored_wallets: caseData.monitored_wallets || [],
    
    // Legal / Official
    ic3_complaint_number: caseData.ic3_complaint_number || '',
    federal_case_number: caseData.federal_case_number || '',
    law_enforcement_authorization: caseData.law_enforcement_authorization || { authorized: false, agencies: [], full_name: '' },
    
    // Progress
    investigation_progress: caseData.investigation_progress || 0,
    
    // System
    id: caseData.id,
    created_date: caseData.created_date
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (updates) => {
      // Always target ClientCase as the primary entity
      return await base44.entities.ClientCase.update(caseData.id, updates);
    },
    onSuccess: () => {
      if (onUpdate) onUpdate();
      toast.success("Case updated successfully");
      setEditing(false);
    },
    onError: (err) => {
        toast.error("Update failed: " + err.message);
    }
  });

  // --- Quick Actions Handlers ---

  const updateStatus = async (status) => {
    setEditedCase(prev => ({ ...prev, status }));
    await updateCaseMutation.mutateAsync({ status, last_activity: new Date().toISOString() });
  };

  const updateProgress = async (progress) => {
    const val = Math.min(100, Math.max(0, progress));
    setEditedCase(prev => ({ ...prev, investigation_progress: val }));
    await updateCaseMutation.mutateAsync({ 
      investigation_progress: val,
      last_activity: new Date().toISOString() 
    });
  };

  const updateUrgency = async (urgency) => {
    setEditedCase(prev => ({ ...prev, urgency }));
    await updateCaseMutation.mutateAsync({ 
      urgency, 
      last_activity: new Date().toISOString() 
    });
  };

  // --- Main Save Handler ---

  const saveEdits = async () => {
    setSaving(true);
    try {
      const updates = {
        // Identity
        client_name: editedCase.client_name,
        client_email: editedCase.client_email,
        phone_number: editedCase.phone_number,
        
        // Case Meta
        case_title: editedCase.case_title, // Note: schema might not have case_title, mostly case_number + issue_type is used, but we can try saving it or rely on UI to compose it. 
        // If case_title is not in schema, we should check. ClientCase schema doesn't have case_title. 
        // Ideally we save it to 'description' or just rely on client_name/case_number.
        // For now, we'll send it, if extra field, it might be ignored or stored if schema allows additional props (it doesn't usually).
        // Let's focus on schema fields.
        
        status: editedCase.status,
        urgency: editedCase.urgency,
        description: editedCase.description,
        
        // Financial
        amount_lost: parseFloat(editedCase.amount_lost) || 0,
        recovery_amount: parseFloat(editedCase.recovery_amount) || 0,
        cryptocurrency: editedCase.cryptocurrency,
        blockchain: editedCase.blockchain,
        
        // Suspect
        scammer_wallet: editedCase.scammer_wallet,
        monitored_wallets: editedCase.monitored_wallets,
        scammer_info: editedCase.scammer_info,
        
        // Legal
        ic3_complaint_number: editedCase.ic3_complaint_number,
        federal_case_number: editedCase.federal_case_number,
        law_enforcement_authorization: editedCase.law_enforcement_authorization,
        
        // Progress
        investigation_progress: parseInt(editedCase.investigation_progress) || 0,
        
        // Meta
        last_activity: new Date().toISOString()
      };

      await base44.entities.ClientCase.update(caseData.id, updates);
      
      toast.success("Case Updated Successfully");
      setEditing(false);
      if (onUpdate) onUpdate();
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error("Failed to save: " + error.message);
    }
    setSaving(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      const evidence = caseData.evidence_files || [];
      evidence.push({
        name: file.name,
        url: data.file_url,
        type: file.type,
        uploaded_date: new Date().toISOString()
      });

      // Sync with evidence_log for robust tracking
      const evidenceLog = caseData.evidence_log || [];
      evidenceLog.push({
        timestamp: new Date().toISOString(),
        evidence_type: file.type.includes('image') ? 'screenshot' : 'document',
        file_url: data.file_url,
        description: file.name,
        collected_by: "admin",
        verified: false
      });

      await updateCaseMutation.mutateAsync({ evidence_files: evidence, evidence_log: evidenceLog });
      toast.success("Evidence uploaded");
    } catch (error) {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  const progress = editedCase.investigation_progress || 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {editedCase.case_number ? `${editedCase.case_number} - ` : ''}{editedCase.client_name}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono">
                  {editedCase.case_number || 'NO-ID'}
                </Badge>
                <Badge className={`${
                  editedCase.urgency === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                  editedCase.urgency === 'High' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                  editedCase.urgency === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                  'bg-gray-500/20 text-gray-400 border-gray-500/50'
                }`}>
                  {editedCase.urgency} Priority
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Progress: {progress}%
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                onClick={() => setActiveTab('edit')} 
                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Case
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-gray-300 text-sm">Status:</Label>
              <select
                value={editedCase.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="px-4 py-2 bg-[#0f1419] border border-cyan-500/30 rounded-lg text-white text-sm font-medium"
              >
                <option value="Pending">Pending</option>
                <option value="In Review">In Review</option>
                <option value="In Progress">In Progress</option>
                <option value="investigating">Investigating</option>
                <option value="documented">Documented</option>
                <option value="submitted">Submitted</option>
                <option value="law_enforcement">Law Enforcement</option>
                <option value="Called">Called</option>
                <option value="recovering">Recovering</option>
                <option value="recovered">Recovered</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-gray-300 text-sm">Urgency:</Label>
              <select
                value={editedCase.urgency}
                onChange={(e) => updateUrgency(e.target.value)}
                className="px-4 py-2 bg-[#0f1419] border border-cyan-500/30 rounded-lg text-white text-sm font-medium"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-gray-300 text-sm">Progress:</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={progress}
                onChange={(e) => updateProgress(parseInt(e.target.value))}
                className="w-20 bg-[#0f1419] border-cyan-500/30 text-white"
              />
              <span className="text-gray-300 text-sm">%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 text-sm font-medium">Investigation Progress</span>
              <span className="text-cyan-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  progress === 100 ? 'bg-green-500' :
                  progress >= 75 ? 'bg-cyan-500' :
                  progress >= 50 ? 'bg-blue-500' :
                  progress >= 25 ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-[#0f1419] border border-cyan-500/30 flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="edit" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                <Edit className="w-3 h-3 mr-1" />Edit Case
              </TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="victim">Client Details</TabsTrigger>
              <TabsTrigger value="suspect">Suspect Details</TabsTrigger>
              <TabsTrigger value="edit-suspect" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <AlertCircle className="w-3 h-3 mr-1" />Edit Suspect
              </TabsTrigger>
              <TabsTrigger value="evidence">Evidence</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tracking">Wallet Tracking</TabsTrigger>
              <TabsTrigger value="technical-tools" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                <Shield className="w-3 h-3 mr-1" />IP Tracker
              </TabsTrigger>
              <TabsTrigger value="agencies">Agencies</TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                <FileText className="w-3 h-3 mr-1" />Generate Reports
              </TabsTrigger>
              <TabsTrigger value="intel-report" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                <Shield className="w-3 h-3 mr-1" />Crypto Intel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-300 font-medium">Client</p>
                  </div>
                  <p className="text-white font-semibold text-base">{editedCase.client_name}</p>
                  <p className="text-xs text-gray-300 mt-1">{editedCase.client_email}</p>
                  <p className="text-xs text-gray-300">{editedCase.phone_number}</p>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <p className="text-xs text-gray-300 font-medium">Created By</p>
                  </div>
                  <p className="text-white font-semibold text-base">{caseData.created_by_name || 'N/A'}</p>
                  <p className="text-xs text-gray-400 mt-1">{caseData.created_by_email || caseData.created_by || 'N/A'}</p>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-300 font-medium">Amount Lost</p>
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    ${editedCase.amount_lost?.toLocaleString() || 0}
                  </p>
                  {editedCase.cryptocurrency && (
                    <p className="text-xs text-gray-300 mt-1 font-medium">{editedCase.cryptocurrency}</p>
                  )}
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-300 font-medium">Created Date</p>
                  </div>
                  <p className="text-white font-semibold text-base">
                    {new Date(editedCase.created_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-gray-300 font-medium">Recovered</p>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    ${editedCase.recovery_amount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {editedCase.description && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <p className="text-xs text-gray-300 mb-2 font-medium">Case Description</p>
                  <p className="text-white text-sm leading-relaxed">{editedCase.description}</p>
                </div>
              )}

              {(editedCase.ic3_complaint_number || editedCase.federal_case_number) && (
                <div className="grid grid-cols-2 gap-4">
                  {editedCase.ic3_complaint_number && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 mb-2">IC3</Badge>
                      <p className="text-white font-mono">{editedCase.ic3_complaint_number}</p>
                    </div>
                  )}
                  {editedCase.federal_case_number && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mb-2">Federal</Badge>
                      <p className="text-white font-mono">{editedCase.federal_case_number}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* EDIT TAB */}
            <TabsContent value="edit" className="space-y-6">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Case Details
                </h3>
                <p className="text-gray-400 text-sm mt-1">Update case information. All changes are saved immediately to the database.</p>
              </div>

              {/* Case Info */}
              <div className="mb-4">
                 <Label className="text-gray-300 mb-2 block">SafeNest Case ID</Label>
                 <Input
                    value={editedCase.case_number || 'Generating...'}
                    disabled
                    className="bg-[#1a2332] border-cyan-500/20 text-cyan-400 font-mono font-bold"
                 />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Status *</Label>
                  <Select 
                    value={editedCase.status} 
                    onValueChange={(v) => setEditedCase(prev => ({...prev, status: v}))}
                  >
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="documented">Documented</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="law_enforcement">Law Enforcement</SelectItem>
                      <SelectItem value="Called">Called</SelectItem>
                      <SelectItem value="recovering">Recovering</SelectItem>
                      <SelectItem value="recovered">Recovered</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Urgency *</Label>
                  <Select 
                    value={editedCase.urgency} 
                    onValueChange={(v) => setEditedCase(prev => ({...prev, urgency: v}))}
                  >
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Client Info */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  Client Information
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">Client Name *</Label>
                    <Input
                      value={editedCase.client_name}
                      onChange={(e) => setEditedCase(prev => ({...prev, client_name: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Contact Email</Label>
                    <Input
                      type="email"
                      value={editedCase.client_email}
                      onChange={(e) => setEditedCase(prev => ({...prev, client_email: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Contact Phone</Label>
                    <Input
                      value={editedCase.phone_number}
                      onChange={(e) => setEditedCase(prev => ({...prev, phone_number: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter phone"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-cyan-400" />
                  Financial Information
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">Amount Lost (USD)</Label>
                    <Input
                      type="number"
                      value={editedCase.amount_lost}
                      onChange={(e) => setEditedCase(prev => ({...prev, amount_lost: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Recovery Amount (USD)</Label>
                    <Input
                      type="number"
                      value={editedCase.recovery_amount}
                      onChange={(e) => setEditedCase(prev => ({...prev, recovery_amount: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Cryptocurrency</Label>
                    <Input
                      value={editedCase.cryptocurrency}
                      onChange={(e) => setEditedCase(prev => ({...prev, cryptocurrency: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="BTC, ETH, USDT..."
                    />
                  </div>
                </div>
              </div>

              {/* Reference Numbers */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Reference Numbers
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">IC3 Complaint Number</Label>
                    <Input
                      value={editedCase.ic3_complaint_number}
                      onChange={(e) => setEditedCase(prev => ({...prev, ic3_complaint_number: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter IC3 number"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Federal Case Number</Label>
                    <Input
                      value={editedCase.federal_case_number}
                      onChange={(e) => setEditedCase(prev => ({...prev, federal_case_number: e.target.value}))}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter federal case number"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-gray-300 mb-2 block">Description</Label>
                <Textarea
                  value={editedCase.description}
                  onChange={(e) => setEditedCase(prev => ({...prev, description: e.target.value}))}
                  className="bg-[#0f1419] border-cyan-500/30 text-white min-h-[150px]"
                  placeholder="Enter detailed notes about the case..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('overview')}
                  className="border-gray-500/30"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEdits}
                  disabled={saving}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 min-w-[150px]"
                >
                  {saving ? (
                    <><span className="animate-spin mr-2">⏳</span>Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" />Update Case</>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <CaseDocuments caseData={caseData} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="victim" className="space-y-4">
              <h3 className="text-white font-semibold text-lg">Client Details</h3>
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Name</p>
                    <p className="text-white">{editedCase.client_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Email</p>
                    <p className="text-white">{editedCase.client_email}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Phone</p>
                    <p className="text-white">{editedCase.phone_number}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="suspect" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg">Suspect Information</h3>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('edit-suspect')}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Add / Edit Suspect Info
                </Button>
              </div>
              {editedCase.scammer_info && Object.keys(editedCase.scammer_info).length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0f1419] rounded-lg border border-red-500/20">
                    <p className="text-red-400 font-semibold mb-3">Primary Suspect</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Name</p>
                        <p className="text-white">{editedCase.scammer_info.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Email</p>
                        <p className="text-white">{editedCase.scammer_info.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Phone</p>
                        <p className="text-white">{editedCase.scammer_info.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Location</p>
                        <p className="text-white">{editedCase.scammer_info.location || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Additional Suspect Info Display */}
                  {editedCase.scammer_info.wallet_addresses?.length > 0 && (
                    <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                      <p className="text-cyan-400 font-semibold mb-2">Wallets</p>
                      {editedCase.scammer_info.wallet_addresses.map((w, i) => (
                        <p key={i} className="text-white font-mono text-sm">{w}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-red-500/10">
                  <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">No suspect details available</p>
                  <Button
                    onClick={() => setActiveTab('edit-suspect')}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Suspect Information
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="edit-suspect" className="space-y-6">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <h3 className="text-red-400 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Add / Edit Suspect Information
                </h3>
                <p className="text-gray-400 text-sm mt-1">Enter all known details about the suspect.</p>
              </div>

              <SuspectEditForm 
                caseData={caseData} 
                onSave={async (suspectData) => {
                  setSaving(true);
                  try {
                    // Update ClientCase directly
                    await base44.entities.ClientCase.update(caseData.id, {
                      scammer_info: suspectData,
                      // Sync monitored wallets
                      monitored_wallets: [
                        ...(caseData.monitored_wallets || []),
                        ...(suspectData.wallet_addresses || [])
                      ].filter((v, i, a) => a.indexOf(v) === i),
                      last_activity: new Date().toISOString()
                    });
                    
                    // Update local state as well
                    setEditedCase(prev => ({
                        ...prev, 
                        scammer_info: suspectData,
                        monitored_wallets: [
                            ...(prev.monitored_wallets || []),
                            ...(suspectData.wallet_addresses || [])
                        ].filter((v, i, a) => a.indexOf(v) === i),
                    }));

                    toast.success('Suspect information saved successfully!');
                    setActiveTab('suspect');
                    if (onUpdate) onUpdate();
                  } catch (error) {
                    console.error('Save error:', error);
                    toast.error('Failed to save: ' + error.message);
                  }
                  setSaving(false);
                }}
                onCancel={() => setActiveTab('suspect')}
                saving={saving}
              />
            </TabsContent>

            {/* ... Other tabs ... */}
            <TabsContent value="evidence" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg">Evidence Log</h3>
                <label>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  <Button size="sm" disabled={uploading} className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </label>
              </div>

              {(caseData.evidence_log || caseData.evidence_files)?.length > 0 ? (
                <div className="grid gap-2">
                  {(caseData.evidence_log || caseData.evidence_files || []).map((item, idx) => (
                    <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-cyan-400" />
                          <div>
                            <p className="text-white text-sm font-medium">{item.description || item.name}</p>
                            <p className="text-xs text-gray-300">
                              {new Date(item.timestamp || item.uploaded_date).toLocaleString()}
                              {item.verified && <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs">Verified</Badge>}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => window.open(item.file_url || item.url, '_blank')}>
                          <ExternalLink className="w-4 h-4 text-cyan-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No evidence uploaded yet</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4">
              <h3 className="text-white font-semibold text-lg">Case Timeline</h3>
              {caseData.timeline && caseData.timeline.length > 0 ? (
                <div className="space-y-3">
                  {caseData.timeline.map((event, idx) => (
                    <div key={idx} className="p-4 bg-[#0f1419] rounded-lg border-l-4 border-cyan-500">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-white font-semibold">{event.event}</p>
                        <p className="text-xs text-gray-300">{new Date(event.date).toLocaleString()}</p>
                      </div>
                      {event.details && <p className="text-sm text-gray-300">{event.details}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                  <Clock className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No timeline events</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <InvestigationNotes caseId={caseData.id} caseData={caseData} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="tracking" className="space-y-4">
              <h3 className="text-white font-semibold text-lg">Monitored Wallets</h3>
              {caseData.monitored_wallets?.length > 0 ? (
                <div className="space-y-2">
                  {caseData.monitored_wallets.map((wallet, idx) => (
                    <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                      <p className="text-white font-mono text-sm">{wallet}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No wallets monitored</p>
              )}
            </TabsContent>

            <TabsContent value="technical-tools" className="space-y-4">
              <TrackingToolsPanel 
                caseId={caseData.id} 
                caseTitle={caseData.case_title || 'Case'} 
              />
            </TabsContent>

            <TabsContent value="agencies" className="space-y-4">
              <RecommendedAgencies caseData={caseData} />
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              <AgencyReportGenerator caseData={caseData} onReportGenerated={onUpdate} />
            </TabsContent>

            <TabsContent value="intel-report" className="space-y-4">
              <CryptoIntelligenceReport caseData={caseData} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}