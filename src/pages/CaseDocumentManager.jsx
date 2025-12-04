import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import {
  FileText, Search, Plus, Save, Download, Mail, Clock, 
  Shield, AlertTriangle, CheckCircle, Loader2, ChevronRight,
  Briefcase, Building2, DollarSign, Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CaseDocumentManager() {
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingCase, setEditingCase] = useState(false);
  const [formData, setFormData] = useState({});

  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const navigate = useNavigate(); // Needs import in next step if missing

  useEffect(() => {
    base44.auth.me().then(userData => {
      if (userData.role !== 'admin' && !userData.is_admin) {
        navigate(createPageUrl("Dashboard"));
      }
      setUser(userData);
    }).catch(() => {
      navigate(createPageUrl("Dashboard"));
    });
  }, [navigate]);

  // 1. Fetch Cases
  const { data: cases = [], isLoading: loadingCases } = useQuery({
    queryKey: ['client-cases'],
    queryFn: () => base44.entities.ClientCase.list('-created_date'),
    enabled: !!user
  });

  // 2. Fetch Documents for Selected Case
  const { data: documents = [] } = useQuery({
    queryKey: ['generated-documents', selectedCase?.id],
    queryFn: () => base44.entities.GeneratedDocument.filter({ case_id: selectedCase.id }, '-created_date'),
    enabled: !!selectedCase
  });

  // 3. Fetch Timeline for Selected Case
  const { data: timeline = [] } = useQuery({
    queryKey: ['case-timeline', selectedCase?.id],
    queryFn: () => base44.entities.CaseTimelineEvent.filter({ case_id: selectedCase.id }, '-created_date'),
    enabled: !!selectedCase
  });

  // Update Case Mutation
  const updateCaseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClientCase.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries(['client-cases']);
      setSelectedCase(updated);
      setEditingCase(false);
      toast.success("Case details updated successfully");
      // Log event
      base44.entities.CaseTimelineEvent.create({
        case_id: updated.id,
        event_type: 'case_info_updated',
        description: 'Updated case financial/scammer details',
        performed_by: 'Admin' // In real app, backend fills this or we fetch current user
      });
      queryClient.invalidateQueries(['case-timeline']);
    },
    onError: (err) => toast.error("Failed to update case: " + err.message)
  });

  // Generate Document Mutation
  const generateDocMutation = useMutation({
    mutationFn: async (docType) => {
      const res = await base44.functions.invoke('caseDocumentService', {
        endpoint: 'generate_document',
        case_id: selectedCase.id,
        document_type: docType,
        case_data: selectedCase
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['generated-documents']);
      queryClient.invalidateQueries(['case-timeline']);
      toast.success("Document generated successfully");
    },
    onError: (err) => toast.error("Failed to generate document: " + err.message)
  });

  // Handle Case Selection
  const handleSelectCase = (c) => {
    setSelectedCase(c);
    setFormData(c); // Initialize form data
    setEditingCase(false);
  };

  // Handle Form Change
  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle Save Case
  const handleSaveCase = () => {
    updateCaseMutation.mutate({ id: selectedCase.id, data: formData });
  };

  // Download PDF
  const handleDownload = (doc) => {
    const pdf = new jsPDF();
    const splitText = pdf.splitTextToSize(doc.content, 180);
    pdf.setFontSize(12);
    pdf.text(splitText, 15, 20);
    pdf.save(`${doc.title || 'document'}.pdf`);
  };

  const filteredCases = cases.filter(c => 
    (c.client_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.client_email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const docTypes = [
    { id: 'fraud_recall_request', label: 'Fraud Recall Request' },
    { id: 'account_freeze_request', label: 'Account Freeze Request' },
    { id: 'suspicious_activity_report', label: 'Suspicious Activity Report' },
    { id: 'complaint_fdic', label: 'FDIC Complaint' },
    { id: 'complaint_occ', label: 'OCC Complaint' },
    { id: 'complaint_cfpb', label: 'CFPB Complaint' },
    { id: 'police_report_template', label: 'Police Report Template' },
    { id: 'ic3_incident_template', label: 'IC3 Incident Template' },
    { id: 'international_recovery_letter', label: 'International Recovery Letter' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 lg:p-8 text-white">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-cyan-400" />
              Case Document Manager
            </h1>
            <p className="text-gray-400 mt-1">Automated document generation and case tracking</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar: Case List */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-[#1a2332] border-cyan-500/20 h-[calc(100vh-200px)] flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-lg">Select Case</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Search..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-[#0f1419] border-gray-700 text-white text-sm"
                  />
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-2 p-2 pt-0">
                {loadingCases ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin text-cyan-400" /></div>
                ) : filteredCases.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => handleSelectCase(c)}
                    className={`p-3 rounded-lg cursor-pointer border transition-all ${
                      selectedCase?.id === c.id 
                        ? 'bg-cyan-500/10 border-cyan-500 text-white' 
                        : 'bg-[#0f1419] border-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold truncate">{c.client_name}</span>
                      <Badge className={`text-[10px] px-1 ${
                        c.status === 'Resolved' ? 'bg-green-500/20 text-green-400' :
                        c.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {c.status}
                      </Badge>
                    </div>
                    <p className="text-xs truncate">{c.issue_type}</p>
                    <p className="text-[10px] opacity-60 mt-1">
                      {new Date(c.created_date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-6">
            {selectedCase ? (
              <>
                {/* Case Details */}
                <Card className="bg-[#1a2332] border-cyan-500/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-cyan-400" />
                      Case Details: {selectedCase.client_name}
                    </CardTitle>
                    <Button 
                      size="sm" 
                      variant={editingCase ? "default" : "outline"}
                      onClick={() => editingCase ? handleSaveCase() : setEditingCase(true)}
                      className={editingCase ? "bg-green-600 hover:bg-green-700" : "border-cyan-500/30 text-cyan-400"}
                    >
                      {editingCase ? <Save className="w-4 h-4 mr-2" /> : <Briefcase className="w-4 h-4 mr-2" />}
                      {editingCase ? "Save Changes" : "Edit Details"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Victim Bank Name</Label>
                        <Input 
                          value={formData.victim_bank_name || ''} 
                          onChange={(e) => handleFormChange('victim_bank_name', e.target.value)}
                          disabled={!editingCase}
                          className="bg-[#0f1419] border-gray-700 text-white h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Victim Account #</Label>
                        <Input 
                          value={formData.victim_account_number || ''} 
                          onChange={(e) => handleFormChange('victim_account_number', e.target.value)}
                          disabled={!editingCase}
                          className="bg-[#0f1419] border-gray-700 text-white h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Amount Lost</Label>
                        <Input 
                          value={formData.amount_lost || ''} 
                          onChange={(e) => handleFormChange('amount_lost', e.target.value)}
                          disabled={!editingCase}
                          type="number"
                          className="bg-[#0f1419] border-gray-700 text-white h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Scammer Bank Name</Label>
                        <Input 
                          value={formData.scammer_bank_name || ''} 
                          onChange={(e) => handleFormChange('scammer_bank_name', e.target.value)}
                          disabled={!editingCase}
                          className="bg-[#0f1419] border-gray-700 text-white h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Scammer Routing #</Label>
                        <Input 
                          value={formData.scammer_routing_number || ''} 
                          onChange={(e) => handleFormChange('scammer_routing_number', e.target.value)}
                          disabled={!editingCase}
                          className="bg-[#0f1419] border-gray-700 text-white h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-400">Scammer Account #</Label>
                        <Input 
                          value={formData.scammer_account_number || ''} 
                          onChange={(e) => handleFormChange('scammer_account_number', e.target.value)}
                          disabled={!editingCase}
                          className="bg-[#0f1419] border-gray-700 text-white h-8"
                        />
                      </div>

                      <div className="col-span-full space-y-1">
                         <Label className="text-xs text-gray-400">Transaction Date</Label>
                         <Input 
                          type="date"
                          value={formData.transaction_date || ''} 
                          onChange={(e) => handleFormChange('transaction_date', e.target.value)}
                          disabled={!editingCase}
                          className="bg-[#0f1419] border-gray-700 text-white h-8 w-full md:w-1/3"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Document Generation */}
                  <Card className="bg-[#1a2332] border-cyan-500/20 flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-400" />
                        Generate Documents
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1">
                      <div className="grid grid-cols-1 gap-2">
                        {docTypes.map(dt => (
                          <Button
                            key={dt.id}
                            variant="outline"
                            onClick={() => generateDocMutation.mutate(dt.id)}
                            disabled={generateDocMutation.isPending}
                            className="justify-between border-gray-700 hover:bg-[#0f1419] text-gray-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-cyan-500" />
                              {dt.label}
                            </span>
                            {generateDocMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Generated Documents List */}
                  <Card className="bg-[#1a2332] border-cyan-500/20 flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Download className="w-5 h-5 text-blue-400" />
                        Generated Files
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[400px] space-y-2">
                      {documents.length === 0 ? (
                        <p className="text-gray-500 text-center py-4 text-sm">No documents generated yet.</p>
                      ) : documents.map(doc => (
                        <div key={doc.id} className="bg-[#0f1419] p-3 rounded border border-gray-800 flex justify-between items-center">
                           <div className="overflow-hidden">
                             <p className="text-sm text-white font-medium truncate">{doc.title}</p>
                             <p className="text-xs text-gray-500">{new Date(doc.created_date).toLocaleString()}</p>
                           </div>
                           <div className="flex gap-1">
                             <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-400" onClick={() => handleDownload(doc)}>
                               <Download className="w-4 h-4" />
                             </Button>
                           </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Timeline */}
                <Card className="bg-[#1a2332] border-cyan-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-400" />
                      Case Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {timeline.map(evt => (
                        <div key={evt.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2" />
                            <div className="w-0.5 bg-gray-800 flex-1 my-1" />
                          </div>
                          <div className="bg-[#0f1419] p-3 rounded border border-gray-800 flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm text-white">{evt.description}</p>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {new Date(evt.created_date).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">by {evt.performed_by}</p>
                          </div>
                        </div>
                      ))}
                      {timeline.length === 0 && (
                        <p className="text-gray-500 text-center text-sm">No events recorded.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg">Select a case to manage documents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}