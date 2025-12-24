import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  X, FileText, Clock, User, DollarSign, Shield, Upload, 
  MessageSquare, Calendar, AlertCircle, Save, Phone, Mail, 
  Download, Eye, Send, MapPin
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import TimelineFeed from "../investigation/TimelineFeed.jsx";
import SensitiveField from "../investigation/SensitiveField.jsx";

export default function UserCaseDetail({ caseData, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [uploading, setUploading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  // Basic update mutation for user-allowed fields
  const updateCaseMutation = useMutation({
    mutationFn: async (updates) => {
      const response = await base44.functions.invoke('caseManagement', {
        action: 'update',
        data: {
          id: caseData.id,
          entityName: caseData._entityName || 'MyCase',
          updates: {
            ...updates,
            updated_by_user: true // Flag to indicate user update
          }
        }
      });
      
      if (response.data.error) throw new Error(response.data.error);
      return response.data.case;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-cases']);
      toast.success("Case Updated Successfully");
    },
    onError: (err) => {
      toast.error("Update Failed: " + err.message);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const toastId = toast.loading("Uploading evidence...");
      const response = await base44.integrations.Core.UploadFile({ file });
      
      // Create CaseEvidenceFile
      await base44.entities.CaseEvidenceFile.create({
          case_id: caseData.id,
          file_url: response.file_url,
          filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
          uploaded_by_user: true
      });

      // Update legacy arrays for immediate display if needed
      const evidence = caseData.evidence_files || [];
      evidence.push({
        name: file.name,
        url: response.file_url,
        type: file.type,
        uploaded_date: new Date().toISOString(),
        description: "User uploaded evidence"
      });

      await updateCaseMutation.mutateAsync({ evidence_files: evidence });
      toast.success("Evidence uploaded", { id: toastId });
      
    } catch (error) {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Add to case notes/messages - treating notes as messages for now or use a dedicated system
    // The prompt asks for Secure Messages. We'll use case_notes with a specific type or format
    const notes = caseData.case_notes || [];
    notes.push({
      timestamp: new Date().toISOString(),
      author: "client",
      note: newMessage,
      type: "message"
    });

    await updateCaseMutation.mutateAsync({ case_notes: notes });
    setNewMessage("");
  };

  const downloadReceipt = async () => {
    const toastId = toast.loading("Generating Receipt...");
    try {
        // We can reuse generateCasePdf but might want a simplified version later
        // For now, let's assume generateCasePdf creates a suitable report/receipt
        const response = await base44.functions.invoke('generateCasePdf', { caseId: caseData.id, type: 'receipt' });

        if (response.headers && response.headers['content-type'] === 'application/json') {
            if (response.data.error) throw new Error(response.data.error);
        }

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Case_Receipt_${caseData.case_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Receipt Downloaded", { id: toastId });
    } catch (e) {
        toast.error("Generation failed", { id: toastId });
    }
  };

  const messages = (caseData.case_notes || []).filter(n => n.type === 'message' || n.type === 'response');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                {caseData.case_title}
                <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                  User View
                </Badge>
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono">
                  {caseData.case_number}
                </Badge>
                <Badge className="bg-gray-700 text-gray-300">
                  {caseData.status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={downloadReceipt} className="border-cyan-500/30 text-cyan-400">
                    <Download className="w-4 h-4 mr-2" />
                    Download Receipt
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
            {/* Status Banner */}
            <div className="p-4 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 border border-cyan-500/20 rounded-lg mb-6 flex items-center gap-4">
                <div className="p-2 bg-cyan-500/10 rounded-full">
                    <Clock className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                    <h4 className="font-semibold text-white">Current Status: {caseData.status}</h4>
                    <p className="text-sm text-gray-400">
                        {caseData.status === 'Pending' ? "Your case has been received and is awaiting investigator assignment." :
                         caseData.status === 'Investigating' ? "An investigator is actively working on your case." :
                         "Please check the timeline for the latest updates."}
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[#0f1419] border border-cyan-500/30 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="my-info">My Information</TabsTrigger>
                    <TabsTrigger value="suspect">Suspect Info</TabsTrigger>
                    <TabsTrigger value="evidence">Evidence</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="messages">Messages</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4">Case Summary</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Submission Date</span>
                                    <span className="text-white">{new Date(caseData.created_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Fraud Type</span>
                                    <span className="text-white capitalize">{caseData.issue_type?.replace(/_/g, ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Amount Lost</span>
                                    <span className="text-white">${caseData.amount_lost?.toLocaleString()} {caseData.cryptocurrency}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Blockchain</span>
                                    <span className="text-white">{caseData.blockchain}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4">Description</h3>
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {caseData.description}
                            </p>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="my-info" className="space-y-4 mt-4">
                    <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">My Submitted Details</h3>
                        <p className="text-sm text-gray-400 mb-4">You can update your contact information here.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SensitiveField 
                                field="client_name" 
                                value={caseData.client_name} 
                                label="Full Name"
                                caseData={caseData} onUpdate={() => queryClient.invalidateQueries(['my-cases'])}
                            />
                            <SensitiveField 
                                field="phone_number" 
                                value={caseData.phone_number} 
                                label="Phone Number"
                                icon={Phone}
                                caseData={caseData} onUpdate={() => queryClient.invalidateQueries(['my-cases'])}
                            />
                            <SensitiveField 
                                field="victim_wallet" 
                                value={caseData.victim_wallet} 
                                label="My Wallet Address"
                                icon={Shield}
                                caseData={caseData} onUpdate={() => queryClient.invalidateQueries(['my-cases'])}
                            />
                        </div>

                        {/* Address Information Section */}
                        <div className="mt-6 pt-6 border-t border-gray-700">
                            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-cyan-400" />
                                My Address (Optional)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <Label className="text-gray-300 text-sm">Street Address</Label>
                                    <Input 
                                        className="bg-[#1a2332] border-gray-600 mt-1" 
                                        defaultValue={caseData.address_information?.street_address}
                                        onBlur={(e) => updateCaseMutation.mutate({ 
                                            address_information: { 
                                                ...caseData.address_information, 
                                                street_address: e.target.value 
                                            } 
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300 text-sm">Apartment / Unit</Label>
                                    <Input 
                                        className="bg-[#1a2332] border-gray-600 mt-1" 
                                        defaultValue={caseData.address_information?.apartment_unit}
                                        onBlur={(e) => updateCaseMutation.mutate({ 
                                            address_information: { 
                                                ...caseData.address_information, 
                                                apartment_unit: e.target.value 
                                            } 
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300 text-sm">City</Label>
                                    <Input 
                                        className="bg-[#1a2332] border-gray-600 mt-1" 
                                        defaultValue={caseData.address_information?.city}
                                        onBlur={(e) => updateCaseMutation.mutate({ 
                                            address_information: { 
                                                ...caseData.address_information, 
                                                city: e.target.value 
                                            } 
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300 text-sm">State / Province</Label>
                                    <Input 
                                        className="bg-[#1a2332] border-gray-600 mt-1" 
                                        defaultValue={caseData.address_information?.state_province}
                                        onBlur={(e) => updateCaseMutation.mutate({ 
                                            address_information: { 
                                                ...caseData.address_information, 
                                                state_province: e.target.value 
                                            } 
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300 text-sm">ZIP / Postal Code</Label>
                                    <Input 
                                        className="bg-[#1a2332] border-gray-600 mt-1" 
                                        defaultValue={caseData.address_information?.zip_postal_code}
                                        onBlur={(e) => updateCaseMutation.mutate({ 
                                            address_information: { 
                                                ...caseData.address_information, 
                                                zip_postal_code: e.target.value 
                                            } 
                                        })}
                                    />
                                </div>
                                <div>
                                    <Label className="text-gray-300 text-sm">Country</Label>
                                    <Input 
                                        className="bg-[#1a2332] border-gray-600 mt-1" 
                                        defaultValue={caseData.address_information?.country}
                                        onBlur={(e) => updateCaseMutation.mutate({ 
                                            address_information: { 
                                                ...caseData.address_information, 
                                                country: e.target.value 
                                            } 
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="suspect" className="space-y-4 mt-4">
                    <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Suspect Information</h3>
                        <p className="text-sm text-gray-400 mb-4">Add or update any information you have about the scammer.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Scammer Name / Alias</Label>
                                <Input 
                                    className="bg-[#1a2332] border-gray-600" 
                                    defaultValue={caseData.scammer_info?.name}
                                    onBlur={(e) => updateCaseMutation.mutate({ 
                                        scammer_info: { ...caseData.scammer_info, name: e.target.value } 
                                    })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Scammer Email</Label>
                                <Input 
                                    className="bg-[#1a2332] border-gray-600" 
                                    defaultValue={caseData.scammer_info?.email}
                                    onBlur={(e) => updateCaseMutation.mutate({ 
                                        scammer_info: { ...caseData.scammer_info, email: e.target.value } 
                                    })}
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label>Scammer Wallet Address</Label>
                                <Input 
                                    className="bg-[#1a2332] border-gray-600 font-mono" 
                                    defaultValue={caseData.scammer_wallet}
                                    onBlur={(e) => updateCaseMutation.mutate({ 
                                        scammer_wallet: e.target.value,
                                        scammer_info: { ...caseData.scammer_info, wallet_addresses: [e.target.value] }
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="evidence" className="space-y-4 mt-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-white font-semibold">Evidence Files</h3>
                        <label>
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            <Button size="sm" disabled={uploading} className="bg-cyan-600 hover:bg-cyan-700 cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                {uploading ? "Uploading..." : "Upload New Evidence"}
                            </Button>
                        </label>
                    </div>

                    <div className="grid gap-2">
                        {(caseData.evidence_files || []).map((file, idx) => (
                            <div key={idx} className="p-3 bg-[#0f1419] rounded-lg border border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FileText className="w-5 h-5 text-cyan-400" />
                                    <div>
                                        <p className="text-white text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-gray-400">{new Date(file.uploaded_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => window.open(file.url, '_blank')}>
                                    <Eye className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {(!caseData.evidence_files || caseData.evidence_files.length === 0) && (
                            <p className="text-gray-500 text-center py-8">No evidence files uploaded yet.</p>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="timeline" className="space-y-4 mt-4">
                    <TimelineFeed caseId={caseData.id} initialTimeline={caseData.timeline} readOnly={true} />
                </TabsContent>

                <TabsContent value="messages" className="space-y-4 mt-4">
                    <div className="flex flex-col h-[400px]">
                        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#0f1419] rounded-lg border border-gray-700 mb-4">
                            {messages.length === 0 ? (
                                <p className="text-gray-500 text-center my-auto">No messages yet. Start a conversation with your investigator.</p>
                            ) : (
                                messages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-lg ${
                                            msg.author === 'client' 
                                                ? 'bg-cyan-600/20 border border-cyan-500/30 text-white rounded-br-none' 
                                                : 'bg-gray-700/50 border border-gray-600 text-gray-200 rounded-bl-none'
                                        }`}>
                                            <p className="text-sm">{msg.note}</p>
                                            <p className="text-[10px] opacity-50 mt-1 text-right">
                                                {new Date(msg.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a secure message to the investigator..."
                                className="bg-[#0f1419] border-gray-700"
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <Button onClick={handleSendMessage} className="bg-cyan-600 hover:bg-cyan-700">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}