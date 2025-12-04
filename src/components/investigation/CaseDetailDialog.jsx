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
  const [editedCase, setEditedCase] = useState({
    case_title: caseData.case_title || caseData.case_number || '',
    victim_name: caseData.victim_name || caseData.client_name || '',
    victim_email: caseData.victim_email || caseData.client_email || '',
    victim_phone: caseData.victim_phone || caseData.phone_number || '',
    amount_stolen_usd: caseData.amount_stolen_usd || caseData.amount_lost || 0,
    cryptocurrency: caseData.cryptocurrency || '',
    blockchain: caseData.blockchain || '',
    description: caseData.description || '',
    status: caseData.status || 'new',
    priority: caseData.priority || caseData.case_priority || caseData.urgency || 'medium',
    investigation_progress: caseData.investigation_progress || 0,
    ic3_complaint_number: caseData.ic3_complaint_number || '',
    federal_case_number: caseData.federal_case_number || '',
    recovery_amount: caseData.recovery_amount || 0,
    monitored_wallets: caseData.monitored_wallets || [],
    scammer_info: caseData.scammer_info || {},
    scammer_wallet: caseData.scammer_wallet || '', // Added for ClientCase
    law_enforcement_authorization: caseData.law_enforcement_authorization || { authorized: false, agencies: [], full_name: '' }
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (updates) => {
      // Default to ClientCase if no entity name provided or if it matches ClientCase
      if (!caseData._entityName || caseData._entityName === 'ClientCase') {
         return await base44.entities.ClientCase.update(caseData.id, updates);
      }
      const entityName = caseData._entityName;
      if (entityName === 'FraudCase') {
        return await base44.entities.FraudCase.update(caseData.id, updates);
      }
      if (entityName === 'InvestigationCase') {
        return await base44.entities.InvestigationCase.update(caseData.id, updates);
      }
      // Fallback to ClientCase
      return await base44.entities.ClientCase.update(caseData.id, updates);
    },
    onSuccess: () => {
      onUpdate();
      toast.success("Case updated");
      setEditing(false);
    }
  });

  const addNote = async () => {
    if (!newNote.trim()) return;

    const notes = caseData.case_notes || [];
    notes.push({
      timestamp: new Date().toISOString(),
      author: "investigator",
      note: newNote,
      type: "manual"
    });

    await updateCaseMutation.mutateAsync({ case_notes: notes, last_activity: new Date().toISOString() });
    setNewNote("");
  };

  const updateStatus = async (status) => {
    await updateCaseMutation.mutateAsync({ status, last_activity: new Date().toISOString() });
  };

  const updateProgress = async (progress) => {
    await updateCaseMutation.mutateAsync({ 
      investigation_progress: Math.min(100, Math.max(0, progress)),
      last_activity: new Date().toISOString() 
    });
  };

  const updatePriority = async (priority) => {
    await updateCaseMutation.mutateAsync({ 
      priority, 
      case_priority: priority,
      last_activity: new Date().toISOString() 
    });
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      const entityName = caseData._entityName || 'InvestigationCase';
      const updateFn = entityName === 'FraudCase' 
        ? base44.entities.FraudCase.update 
        : base44.entities.InvestigationCase.update;

      const updates = {
        // Shared/InvestigationCase fields
        case_title: editedCase.case_title,
        victim_name: editedCase.victim_name,
        victim_email: editedCase.victim_email,
        victim_phone: editedCase.victim_phone,
        amount_stolen_usd: parseFloat(editedCase.amount_stolen_usd) || 0,
        
        // ClientCase mappings
        client_name: editedCase.victim_name,
        client_email: editedCase.victim_email,
        phone_number: editedCase.victim_phone,
        amount_lost: parseFloat(editedCase.amount_stolen_usd) || 0,
        scammer_wallet: editedCase.scammer_wallet, // Ensure this is saved
        urgency: editedCase.priority,

        // Common
        cryptocurrency: editedCase.cryptocurrency,
        blockchain: editedCase.blockchain,
        description: editedCase.description,
        status: editedCase.status,
        priority: editedCase.priority,
        case_priority: editedCase.priority,
        investigation_progress: parseInt(editedCase.investigation_progress) || 0,
        ic3_complaint_number: editedCase.ic3_complaint_number,
        federal_case_number: editedCase.federal_case_number,
        recovery_amount: parseFloat(editedCase.recovery_amount) || 0,
        monitored_wallets: editedCase.monitored_wallets,
        scammer_info: editedCase.scammer_info,
        law_enforcement_authorization: editedCase.law_enforcement_authorization,
        last_activity: new Date().toISOString(),
        updated_date: new Date().toISOString()
      };

      await updateFn(caseData.id, updates);
      
      toast.success("Case updated successfully!");
      setEditing(false);
      onUpdate();
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

  const progress = caseData.investigation_progress || 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-2">
                {caseData.case_title}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono">
                  {caseData.case_number}
                </Badge>
                <Badge className={`${
                  (caseData.priority || caseData.case_priority) === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                  (caseData.priority || caseData.case_priority) === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                  (caseData.priority || caseData.case_priority) === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                  'bg-gray-500/20 text-gray-400 border-gray-500/50'
                }`}>
                  {caseData.priority || caseData.case_priority || 'medium'}
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
                value={caseData.status}
                onChange={(e) => updateStatus(e.target.value)}
                className="px-4 py-2 bg-[#0f1419] border border-cyan-500/30 rounded-lg text-white text-sm font-medium"
              >
                <option value="new">New</option>
                <option value="investigating">Investigating</option>
                <option value="documented">Documented</option>
                <option value="submitted">Submitted</option>
                <option value="law_enforcement">Law Enforcement</option>
                <option value="recovering">Recovering</option>
                <option value="recovered">Recovered</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-gray-300 text-sm">Priority:</Label>
              <select
                value={caseData.priority || caseData.case_priority || 'medium'}
                onChange={(e) => updatePriority(e.target.value)}
                className="px-4 py-2 bg-[#0f1419] border border-cyan-500/30 rounded-lg text-white text-sm font-medium"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
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
              <TabsTrigger value="victim">Victim Details</TabsTrigger>
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
                    <p className="text-xs text-gray-300 font-medium">Victim</p>
                  </div>
                  <p className="text-white font-semibold text-base">{caseData.victim_name}</p>
                  {caseData.victim_email && (
                    <p className="text-xs text-gray-300 mt-1">{caseData.victim_email}</p>
                  )}
                  {caseData.victim_phone && (
                    <p className="text-xs text-gray-300">{caseData.victim_phone}</p>
                  )}
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
                    <p className="text-xs text-gray-300 font-medium">Amount Stolen</p>
                  </div>
                  <p className="text-2xl font-bold text-red-400">
                    ${caseData.amount_stolen_usd?.toLocaleString() || 0}
                  </p>
                  {caseData.cryptocurrency && (
                    <p className="text-xs text-gray-300 mt-1 font-medium">{caseData.cryptocurrency}</p>
                  )}
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <p className="text-xs text-gray-300 font-medium">Incident Date</p>
                  </div>
                  <p className="text-white font-semibold text-base">
                    {(caseData.incident_date || caseData.incident_timestamp) ? 
                      new Date(caseData.incident_date || caseData.incident_timestamp).toLocaleString() : 'N/A'}
                  </p>
                </div>

                <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-gray-300 font-medium">Recovered</p>
                  </div>
                  <p className="text-2xl font-bold text-green-400">
                    ${caseData.recovery_amount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {caseData.description && (
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <p className="text-xs text-gray-300 mb-2 font-medium">Case Description</p>
                  {editing ? (
                    <Textarea
                      value={editedCase.description}
                      onChange={(e) => setEditedCase({...editedCase, description: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white min-h-[100px]"
                    />
                  ) : (
                    <p className="text-white text-sm leading-relaxed">{caseData.description}</p>
                  )}
                </div>
              )}

              {(caseData.ic3_complaint_number || caseData.federal_case_number) && (
                <div className="grid grid-cols-2 gap-4">
                  {caseData.ic3_complaint_number && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 mb-2">IC3</Badge>
                      <p className="text-white font-mono">{caseData.ic3_complaint_number}</p>
                    </div>
                  )}
                  {caseData.federal_case_number && (
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 mb-2">Federal</Badge>
                      <p className="text-white font-mono">{caseData.federal_case_number}</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* EDIT TAB - Full Admin Case Editing */}
            <TabsContent value="edit" className="space-y-6">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg mb-4">
                <h3 className="text-cyan-400 font-semibold flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Edit Case Details
                </h3>
                <p className="text-gray-400 text-sm mt-1">Make changes to the case and click Update to save.</p>
              </div>

              {/* Case Info Section */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Case Title *</Label>
                  <Input
                    value={editedCase.case_title}
                    onChange={(e) => setEditedCase({...editedCase, case_title: e.target.value})}
                    className="bg-[#0f1419] border-cyan-500/30 text-white"
                    placeholder="Enter case title"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 mb-2 block">Status *</Label>
                  <Select 
                    value={editedCase.status} 
                    onValueChange={(v) => setEditedCase({...editedCase, status: v})}
                  >
                    <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="documented">Documented</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="law_enforcement">Law Enforcement</SelectItem>
                      <SelectItem value="Called">Called</SelectItem>
                      <SelectItem value="recovering">Recovering</SelectItem>
                      <SelectItem value="recovered">Recovered</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Client/Victim Info */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-400" />
                  Client / Victim Information
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">Client Name *</Label>
                    <Input
                      value={editedCase.victim_name}
                      onChange={(e) => setEditedCase({...editedCase, victim_name: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter client name"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Contact Email</Label>
                    <Input
                      type="email"
                      value={editedCase.victim_email}
                      onChange={(e) => setEditedCase({...editedCase, victim_email: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Contact Phone</Label>
                    <Input
                      value={editedCase.victim_phone}
                      onChange={(e) => setEditedCase({...editedCase, victim_phone: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter phone"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Priority</Label>
                    <Select 
                      value={editedCase.priority} 
                      onValueChange={(v) => setEditedCase({...editedCase, priority: v})}
                    >
                      <SelectTrigger className="bg-[#1a2332] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Label className="text-gray-300 mb-2 block">Amount Stolen (USD)</Label>
                    <Input
                      type="number"
                      value={editedCase.amount_stolen_usd}
                      onChange={(e) => setEditedCase({...editedCase, amount_stolen_usd: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Recovery Amount (USD)</Label>
                    <Input
                      type="number"
                      value={editedCase.recovery_amount}
                      onChange={(e) => setEditedCase({...editedCase, recovery_amount: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Cryptocurrency</Label>
                    <Input
                      value={editedCase.cryptocurrency}
                      onChange={(e) => setEditedCase({...editedCase, cryptocurrency: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="BTC, ETH, USDT..."
                    />
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Wallet & Blockchain
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">Blockchain</Label>
                    <Select 
                      value={editedCase.blockchain || ''} 
                      onValueChange={(v) => setEditedCase({...editedCase, blockchain: v})}
                    >
                      <SelectTrigger className="bg-[#1a2332] border-cyan-500/30 text-white">
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                        <SelectItem value="bitcoin">Bitcoin</SelectItem>
                        <SelectItem value="bsc">BSC</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="solana">Solana</SelectItem>
                        <SelectItem value="tron">Tron</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Scammer Wallet Address</Label>
                    <Input
                      value={editedCase.scammer_info?.wallet_addresses?.[0] || ''}
                      onChange={(e) => setEditedCase({
                        ...editedCase, 
                        scammer_info: { 
                          ...editedCase.scammer_info, 
                          wallet_addresses: [e.target.value] 
                        },
                        monitored_wallets: e.target.value ? [e.target.value] : []
                      })}
                      className="bg-[#1a2332] border-cyan-500/30 text-white font-mono text-sm"
                      placeholder="0x..."
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
                      onChange={(e) => setEditedCase({...editedCase, ic3_complaint_number: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter IC3 number"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Federal Case Number</Label>
                    <Input
                      value={editedCase.federal_case_number}
                      onChange={(e) => setEditedCase({...editedCase, federal_case_number: e.target.value})}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                      placeholder="Enter federal case number"
                    />
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <h4 className="text-white font-semibold mb-4">Investigation Progress</h4>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editedCase.investigation_progress}
                    onChange={(e) => setEditedCase({...editedCase, investigation_progress: e.target.value})}
                    className="w-24 bg-[#1a2332] border-cyan-500/30 text-white"
                  />
                  <span className="text-gray-300">%</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                      style={{ width: `${editedCase.investigation_progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Law Enforcement Authorization - Editable */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h4 className="text-purple-400 font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Law Enforcement Authorization
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="le_auth"
                      checked={editedCase.law_enforcement_authorization?.authorized || false}
                      onChange={(e) => setEditedCase({
                        ...editedCase,
                        law_enforcement_authorization: {
                          ...editedCase.law_enforcement_authorization,
                          authorized: e.target.checked,
                          authorized_date: e.target.checked ? new Date().toISOString() : null
                        }
                      })}
                      className="w-4 h-4 rounded border-purple-500/50 bg-[#1a2332]"
                    />
                    <Label htmlFor="le_auth" className="text-white cursor-pointer">Authorized by Client</Label>
                  </div>
                  
                  {editedCase.law_enforcement_authorization?.authorized && (
                    <>
                      <div>
                        <Label className="text-gray-300 mb-2 block">Full Legal Name (Signature)</Label>
                        <Input
                          value={editedCase.law_enforcement_authorization?.full_name || ''}
                          onChange={(e) => setEditedCase({
                            ...editedCase,
                            law_enforcement_authorization: {
                              ...editedCase.law_enforcement_authorization,
                              full_name: e.target.value
                            }
                          })}
                          className="bg-[#1a2332] border-purple-500/30 text-white"
                          placeholder="Enter full legal name"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label className="text-gray-300 mb-2 block">Authorized Agencies (comma separated)</Label>
                        <Input
                          value={editedCase.law_enforcement_authorization?.agencies?.join(', ') || 'FBI, IC3, FTC'}
                          onChange={(e) => setEditedCase({
                            ...editedCase,
                            law_enforcement_authorization: {
                              ...editedCase.law_enforcement_authorization,
                              agencies: e.target.value.split(',').map(s => s.trim())
                            }
                          })}
                          className="bg-[#1a2332] border-purple-500/30 text-white"
                          placeholder="FBI, IC3, FTC, Local Police"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-gray-300 mb-2 block">Case Notes / Description</Label>
                <Textarea
                  value={editedCase.description}
                  onChange={(e) => setEditedCase({...editedCase, description: e.target.value})}
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
              <h3 className="text-white font-semibold text-lg">Victim Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-5 h-5 text-cyan-400" />
                    <p className="text-sm text-gray-300 font-medium">Primary Contact</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-white text-sm">{caseData.victim_contact_info?.primary_email || caseData.victim_email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-white text-sm">{caseData.victim_contact_info?.phone || caseData.victim_phone || 'N/A'}</span>
                    </div>
                    {caseData.victim_contact_info?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-white text-sm">{caseData.victim_contact_info.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {caseData.victim_contact_info?.emergency_contact && (
                  <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                      <p className="text-sm text-gray-300 font-medium">Emergency Contact</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white">{caseData.victim_contact_info.emergency_contact.name}</p>
                      <p className="text-gray-300 text-sm">{caseData.victim_contact_info.emergency_contact.phone}</p>
                      <p className="text-gray-400 text-xs">{caseData.victim_contact_info.emergency_contact.relationship}</p>
                    </div>
                  </div>
                )}
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
              {caseData.suspect_details || caseData.scammer_info ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0f1419] rounded-lg border border-red-500/20">
                    <p className="text-red-400 font-semibold mb-3">Primary Suspect</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(caseData.suspect_details?.primary_suspect?.name || caseData.scammer_info?.name) && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Name</p>
                          <p className="text-white">{caseData.suspect_details?.primary_suspect?.name || caseData.scammer_info?.name}</p>
                        </div>
                      )}
                      {(caseData.suspect_details?.primary_suspect?.email || caseData.scammer_info?.email) && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Email</p>
                          <p className="text-white">{caseData.suspect_details?.primary_suspect?.email || caseData.scammer_info?.email}</p>
                        </div>
                      )}
                      {(caseData.suspect_details?.primary_suspect?.phone || caseData.scammer_info?.phone) && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Phone / Telegram / WhatsApp</p>
                          <p className="text-white">{caseData.suspect_details?.primary_suspect?.phone || caseData.scammer_info?.phone}</p>
                        </div>
                      )}
                      {(caseData.suspect_details?.primary_suspect?.location || caseData.scammer_info?.location) && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Location</p>
                          <p className="text-white">{caseData.suspect_details?.primary_suspect?.location || caseData.scammer_info?.location}</p>
                        </div>
                      )}
                      {(caseData.suspect_details?.wallet_addresses || caseData.scammer_info?.wallet_addresses)?.length > 0 && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-400 mb-2">Wallet Addresses</p>
                          {(caseData.suspect_details?.wallet_addresses || caseData.scammer_info?.wallet_addresses || []).map((wallet, idx) => (
                            <p key={idx} className="text-white font-mono text-sm mb-1">{wallet}</p>
                          ))}
                        </div>
                      )}
                      {caseData.scammer_info?.notes && (
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-400 mb-1">Notes</p>
                          <p className="text-white text-sm">{caseData.scammer_info.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Known Emails */}
                  {caseData.scammer_info?.known_emails?.length > 0 && (
                    <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/20">
                      <p className="text-orange-400 font-semibold mb-3">Known Emails</p>
                      <div className="flex flex-wrap gap-2">
                        {caseData.scammer_info.known_emails.map((email, idx) => (
                          <Badge key={idx} className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                            {email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Media */}
                  {(caseData.scammer_info?.social_media || caseData.suspect_details?.social_profiles)?.length > 0 && (
                    <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20">
                      <p className="text-purple-400 font-semibold mb-3">Social Media / Online Presence</p>
                      <div className="space-y-2">
                        {(caseData.scammer_info?.social_media || caseData.suspect_details?.social_profiles || []).map((profile, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{typeof profile === 'string' ? 'Link' : profile.platform}</Badge>
                            <a 
                              href={typeof profile === 'string' ? profile : profile.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:underline text-sm"
                            >
                              {typeof profile === 'string' ? profile : (profile.url || profile.profile)}
                            </a>
                          </div>
                        ))}
                      </div>
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

            {/* EDIT SUSPECT TAB */}
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
                    const entityName = caseData._entityName || 'InvestigationCase';
                    const updateFn = entityName === 'FraudCase' 
                      ? base44.entities.FraudCase.update 
                      : base44.entities.InvestigationCase.update;

                    await updateFn(caseData.id, {
                      scammer_info: suspectData,
                      suspect_details: {
                        primary_suspect: {
                          name: suspectData.name,
                          email: suspectData.email,
                          phone: suspectData.phone,
                          location: suspectData.location
                        },
                        wallet_addresses: suspectData.wallet_addresses,
                        social_profiles: suspectData.social_media
                      },
                      monitored_wallets: [
                        ...(caseData.monitored_wallets || []),
                        ...(suspectData.wallet_addresses || [])
                      ].filter((v, i, a) => a.indexOf(v) === i),
                      last_activity: new Date().toISOString()
                    });
                    toast.success('Suspect information saved successfully!');
                    setActiveTab('suspect');
                    onUpdate();
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