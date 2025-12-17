import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Save, X, Loader2, Wand2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function LogEntryForm({ caseId, user, onSuccess, onCancel }) {
    const queryClient = useQueryClient();
    const [analyzing, setAnalyzing] = useState(false);
    const [activeTab, setActiveTab] = useState("notes");
    
    // Form State
    const [formData, setFormData] = useState({
        communication_type: "Follow-Up",
        direction: "Outbound",
        duration_minutes: 0,
        summary: "",
        raw_notes: "",
        structured_data: {
            scam_type: "",
            amount_lost_fiat: 0,
            amount_lost_crypto: 0,
            platforms: "",
            wallets_involved: "",
            tx_hashes: "",
            evidence_checklist: {
                wallet_provided: false,
                tx_hashes_provided: false,
                screenshots_provided: false,
                chats_provided: false,
                exchange_involved: ""
            },
            risk_assessment: {
                risk_level: "Low",
                ongoing_contact: false,
                funds_moving: false,
                client_at_risk: false
            },
            actions_taken: {
                actions_explained: "",
                disclaimers_acknowledged: false,
                escalation_status: "None"
            },
            next_steps: {
                task_description: "",
                assigned_to: "",
                deadline: ""
            }
        },
        tags: []
    });

    const aiAnalyzeMutation = useMutation({
        mutationFn: async (notes) => {
            const res = await base44.functions.invoke('communicationAI', { 
                action: 'analyze_notes', 
                rawNotes: notes 
            });
            return res.data;
        },
        onSuccess: (data) => {
            if (data.error) {
                toast.error("AI Analysis failed: " + data.error);
                return;
            }
            
            // Auto-fill form
            setFormData(prev => ({
                ...prev,
                summary: data.summary || prev.summary,
                structured_data: {
                    ...prev.structured_data,
                    scam_type: data.extracted_data?.scam_type || prev.structured_data.scam_type,
                    amount_lost_fiat: data.extracted_data?.amount_lost_fiat || prev.structured_data.amount_lost_fiat,
                    amount_lost_crypto: data.extracted_data?.amount_lost_crypto || prev.structured_data.amount_lost_crypto,
                    platforms: data.extracted_data?.platforms || prev.structured_data.platforms,
                    wallets_involved: data.extracted_data?.wallets_involved || prev.structured_data.wallets_involved,
                    tx_hashes: data.extracted_data?.tx_hashes || prev.structured_data.tx_hashes,
                    risk_assessment: {
                        ...prev.structured_data.risk_assessment,
                        risk_level: data.risk_assessment?.risk_level || "Medium",
                    }
                },
                tags: [...new Set([...prev.tags, ...(data.suggested_tags || [])])]
            }));
            
            toast.success("AI Analysis Complete - Form populated");
            setActiveTab("details"); // Switch to details to show filled data
        },
        onError: () => toast.error("Failed to analyze notes")
    });

    const createLogMutation = useMutation({
        mutationFn: async (data) => {
            return base44.entities.CommunicationLog.create({
                ...data,
                case_id: caseId,
                logged_by_email: user?.email,
                logged_by_name: user?.full_name || user?.email,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['communication-logs'] });
            toast.success("Log entry saved");
            onSuccess();
        },
        onError: (err) => toast.error("Failed to save log: " + err.message)
    });

    const handleAnalyze = () => {
        if (!formData.raw_notes.trim()) {
            toast.error("Please enter some notes first");
            return;
        }
        setAnalyzing(true);
        aiAnalyzeMutation.mutate(formData.raw_notes, {
            onSettled: () => setAnalyzing(false)
        });
    };

    const handleSubmit = () => {
        if (!formData.summary) {
            toast.error("Summary is required");
            return;
        }
        createLogMutation.mutate(formData);
    };

    // Helper to update nested state
    const updateStructured = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            structured_data: {
                ...prev.structured_data,
                [section]: {
                    ...prev.structured_data[section],
                    [field]: value
                }
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <Label className="text-gray-400 mb-1.5 block">Type</Label>
                    <Select 
                        value={formData.communication_type} 
                        onValueChange={(v) => setFormData({...formData, communication_type: v})}
                    >
                        <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Intake Call">Intake Call</SelectItem>
                            <SelectItem value="Follow-Up">Follow-Up</SelectItem>
                            <SelectItem value="Evidence Review">Evidence Review</SelectItem>
                            <SelectItem value="Escalation">Escalation</SelectItem>
                            <SelectItem value="Internal Note">Internal Note</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="Voice Note">Voice Note</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-gray-400 mb-1.5 block">Direction</Label>
                    <Select 
                        value={formData.direction} 
                        onValueChange={(v) => setFormData({...formData, direction: v})}
                    >
                        <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Inbound">Inbound (Incoming)</SelectItem>
                            <SelectItem value="Outbound">Outbound (Outgoing)</SelectItem>
                            <SelectItem value="Internal">Internal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-gray-400 mb-1.5 block">Duration (mins)</Label>
                    <Input 
                        type="number"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 0})}
                        className="bg-[#1a2332] border-gray-700 text-white"
                    />
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-[#1a2332] border border-gray-700 w-full justify-start h-auto flex-wrap gap-1 p-1">
                    <TabsTrigger value="notes" className="data-[state=active]:bg-cyan-600">Raw Notes & AI</TabsTrigger>
                    <TabsTrigger value="details" className="data-[state=active]:bg-blue-600">Structured Data</TabsTrigger>
                    <TabsTrigger value="risk" className="data-[state=active]:bg-red-600">Risk & Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="notes" className="space-y-4 pt-4">
                    <div className="relative">
                        <Label className="text-gray-300 mb-2 block">Raw Notes / Transcript</Label>
                        <Textarea 
                            value={formData.raw_notes}
                            onChange={(e) => setFormData({...formData, raw_notes: e.target.value})}
                            placeholder="Type raw notes here, then click 'Analyze with AI' to auto-fill..."
                            className="min-h-[200px] bg-[#1a2332] border-gray-700 text-white font-mono text-sm leading-relaxed"
                        />
                        <div className="absolute bottom-4 right-4">
                            <Button 
                                size="sm" 
                                onClick={handleAnalyze} 
                                disabled={analyzing || !formData.raw_notes}
                                className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20"
                            >
                                {analyzing ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Wand2 className="w-4 h-4 mr-2" />
                                )}
                                {analyzing ? "Analyzing..." : "Analyze with AI"}
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label className="text-gray-300 mb-2 block">Summary *</Label>
                        <Input 
                            value={formData.summary}
                            onChange={(e) => setFormData({...formData, summary: e.target.value})}
                            placeholder="Brief summary of the interaction..."
                            className="bg-[#1a2332] border-gray-700 text-white"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-gray-400 mb-1.5 block">Scam Type</Label>
                            <Input 
                                value={formData.structured_data.scam_type}
                                onChange={(e) => setFormData(prev => ({...prev, structured_data: {...prev.structured_data, scam_type: e.target.value}}))}
                                className="bg-[#1a2332] border-gray-700 text-white"
                            />
                        </div>
                        <div>
                            <Label className="text-gray-400 mb-1.5 block">Platforms Involved</Label>
                            <Input 
                                value={formData.structured_data.platforms}
                                onChange={(e) => setFormData(prev => ({...prev, structured_data: {...prev.structured_data, platforms: e.target.value}}))}
                                className="bg-[#1a2332] border-gray-700 text-white"
                            />
                        </div>
                        <div>
                             <Label className="text-gray-400 mb-1.5 block">Loss (Fiat USD)</Label>
                            <Input 
                                type="number"
                                value={formData.structured_data.amount_lost_fiat}
                                onChange={(e) => setFormData(prev => ({...prev, structured_data: {...prev.structured_data, amount_lost_fiat: parseFloat(e.target.value)}}))}
                                className="bg-[#1a2332] border-gray-700 text-white"
                            />
                        </div>
                         <div>
                             <Label className="text-gray-400 mb-1.5 block">Loss (Crypto Amount)</Label>
                            <Input 
                                type="number"
                                value={formData.structured_data.amount_lost_crypto}
                                onChange={(e) => setFormData(prev => ({...prev, structured_data: {...prev.structured_data, amount_lost_crypto: parseFloat(e.target.value)}}))}
                                className="bg-[#1a2332] border-gray-700 text-white"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            Evidence Checklist
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { key: 'wallet_provided', label: 'Wallet Address Provided' },
                                { key: 'tx_hashes_provided', label: 'TX Hashes Provided' },
                                { key: 'screenshots_provided', label: 'Screenshots Uploaded' },
                                { key: 'chats_provided', label: 'Chat Logs Uploaded' }
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between p-2 bg-[#1a2332] rounded border border-gray-700">
                                    <span className="text-sm text-gray-300">{item.label}</span>
                                    <Switch 
                                        checked={formData.structured_data.evidence_checklist[item.key]}
                                        onCheckedChange={(checked) => updateStructured('evidence_checklist', item.key, checked)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="risk" className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-red-950/20 p-4 rounded-lg border border-red-500/20">
                            <h4 className="text-red-400 font-semibold mb-4 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Risk Assessment
                            </h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-gray-400 mb-1.5 block">Risk Level</Label>
                                    <Select 
                                        value={formData.structured_data.risk_assessment.risk_level} 
                                        onValueChange={(v) => updateStructured('risk_assessment', 'risk_level', v)}
                                    >
                                        <SelectTrigger className="bg-[#1a2332] border-gray-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low Risk</SelectItem>
                                            <SelectItem value="Medium">Medium Risk</SelectItem>
                                            <SelectItem value="High">High Risk</SelectItem>
                                            <SelectItem value="Critical">Critical (Life/Funds at immediate risk)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    {[
                                        { key: 'ongoing_contact', label: 'Ongoing Contact with Scammer?' },
                                        { key: 'funds_moving', label: 'Are Funds Moving Right Now?' },
                                        { key: 'client_at_risk', label: 'Is Client Vulnerable / At Risk?' }
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-300">{item.label}</span>
                                            <Switch 
                                                checked={formData.structured_data.risk_assessment[item.key]}
                                                onCheckedChange={(checked) => updateStructured('risk_assessment', item.key, checked)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-950/20 p-4 rounded-lg border border-blue-500/20">
                                <h4 className="text-blue-400 font-semibold mb-3">Actions & Commitments</h4>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-gray-400 text-xs mb-1 block">Actions Explained to Client</Label>
                                        <Input 
                                            value={formData.structured_data.actions_taken.actions_explained}
                                            onChange={(e) => updateStructured('actions_taken', 'actions_explained', e.target.value)}
                                            className="bg-[#1a2332] border-gray-700 text-white h-8 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-300">Disclaimers Acknowledged</span>
                                        <Switch 
                                            checked={formData.structured_data.actions_taken.disclaimers_acknowledged}
                                            onCheckedChange={(checked) => updateStructured('actions_taken', 'disclaimers_acknowledged', checked)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-950/20 p-4 rounded-lg border border-green-500/20">
                                <h4 className="text-green-400 font-semibold mb-3">Next Steps</h4>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-gray-400 text-xs mb-1 block">Task Description</Label>
                                        <Input 
                                            value={formData.structured_data.next_steps.task_description}
                                            onChange={(e) => updateStructured('next_steps', 'task_description', e.target.value)}
                                            className="bg-[#1a2332] border-gray-700 text-white h-8 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-gray-400 text-xs mb-1 block">Assigned To</Label>
                                            <Input 
                                                value={formData.structured_data.next_steps.assigned_to}
                                                onChange={(e) => updateStructured('next_steps', 'assigned_to', e.target.value)}
                                                className="bg-[#1a2332] border-gray-700 text-white h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-gray-400 text-xs mb-1 block">Deadline</Label>
                                            <Input 
                                                type="date"
                                                value={formData.structured_data.next_steps.deadline}
                                                onChange={(e) => updateStructured('next_steps', 'deadline', e.target.value)}
                                                className="bg-[#1a2332] border-gray-700 text-white h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button 
                    onClick={handleSubmit} 
                    disabled={createLogMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                    {createLogMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Log Entry
                </Button>
            </div>
        </div>
    );
}