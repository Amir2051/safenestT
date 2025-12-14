import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Send, MessageSquare, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResponseTemplates({ caseData }) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [previewContent, setPreviewContent] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ title: "", category: "other", content: "" });

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const data = await base44.entities.ResponseTemplate.list();
            setTemplates(data);
        } catch (e) {
            console.error("Failed to load templates", e);
        }
    };

    const handleSelectTemplate = (templateId) => {
        const template = templates.find(t => t.id === templateId);
        setSelectedTemplate(template);
        if (template) {
            // Process placeholders
            let content = template.content;
            content = content.replace(/{{client_name}}/g, caseData.client_name || "Client");
            content = content.replace(/{{case_number}}/g, caseData.case_number || "CASE-XXX");
            content = content.replace(/{{case_title}}/g, caseData.case_title || "Case");
            content = content.replace(/{{agent_name}}/g, caseData.assigned_to || "Investigator");
            setPreviewContent(content);
        } else {
            setPreviewContent("");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(previewContent);
        toast.success("Response copied to clipboard");
    };

    const handleCreate = async () => {
        if (!newTemplate.title || !newTemplate.content) return;
        try {
            await base44.entities.ResponseTemplate.create(newTemplate);
            toast.success("Template created");
            setIsCreating(false);
            setNewTemplate({ title: "", category: "other", content: "" });
            loadTemplates();
        } catch (e) {
            toast.error("Failed to create template");
        }
    };

    const handleDelete = async (id) => {
        try {
            await base44.entities.ResponseTemplate.delete(id);
            toast.success("Template deleted");
            loadTemplates();
            if (selectedTemplate?.id === id) {
                setSelectedTemplate(null);
                setPreviewContent("");
            }
        } catch (e) {
            toast.error("Failed to delete template");
        }
    };

    return (
        <Card className="bg-[#0f1419] border-cyan-500/20 h-full">
            <CardHeader className="pb-3 border-b border-cyan-500/10">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-cyan-400" />
                        Response Templates
                    </CardTitle>
                    <Dialog open={isCreating} onOpenChange={setIsCreating}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-cyan-400">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1a2332] border-cyan-500/20 text-white">
                            <DialogHeader>
                                <DialogTitle>Create New Template</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div>
                                    <Label>Title</Label>
                                    <Input 
                                        value={newTemplate.title} 
                                        onChange={(e) => setNewTemplate({...newTemplate, title: e.target.value})}
                                        className="bg-[#0f1419] border-cyan-500/30"
                                    />
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <Select 
                                        value={newTemplate.category} 
                                        onValueChange={(v) => setNewTemplate({...newTemplate, category: v})}
                                    >
                                        <SelectTrigger className="bg-[#0f1419] border-cyan-500/30">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="initial_outreach">Initial Outreach</SelectItem>
                                            <SelectItem value="update">Update</SelectItem>
                                            <SelectItem value="recovery_info">Recovery Info</SelectItem>
                                            <SelectItem value="closing">Closing</SelectItem>
                                            <SelectItem value="scam_warning">Scam Warning</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Content (Use {'{{client_name}}'}, {'{{case_number}}'})</Label>
                                    <Textarea 
                                        value={newTemplate.content} 
                                        onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                                        className="bg-[#0f1419] border-cyan-500/30 min-h-[150px]"
                                    />
                                </div>
                                <Button onClick={handleCreate} className="w-full bg-cyan-600 hover:bg-cyan-700">Save Template</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <Select value={selectedTemplate?.id} onValueChange={handleSelectTemplate}>
                    <SelectTrigger className="bg-[#1a2332] border-cyan-500/30 text-white w-full">
                        <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2332] border-cyan-500/20 text-white">
                        {templates.map(t => (
                            <SelectItem key={t.id} value={t.id}>{t.title} ({t.category})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {selectedTemplate && (
                    <div className="space-y-3">
                        <div className="relative">
                            <Textarea 
                                value={previewContent} 
                                onChange={(e) => setPreviewContent(e.target.value)}
                                className="bg-[#1a2332] border-cyan-500/30 text-gray-300 min-h-[200px] text-sm p-3 resize-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <div className="absolute bottom-2 right-2 flex gap-2">
                                <Button 
                                    size="icon" 
                                    variant="secondary" 
                                    className="h-7 w-7 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400"
                                    onClick={handleCopy}
                                    title="Copy to Clipboard"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                    size="icon" 
                                    variant="secondary" 
                                    className="h-7 w-7 bg-red-500/20 hover:bg-red-500/30 text-red-400"
                                    onClick={() => handleDelete(selectedTemplate.id)}
                                    title="Delete Template"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-xs" onClick={() => window.location.href = `mailto:${caseData.client_email}?subject=Update on Case ${caseData.case_number}&body=${encodeURIComponent(previewContent)}`}>
                                <Send className="w-3 h-3 mr-2" /> Send Email
                            </Button>
                        </div>
                    </div>
                )}
                
                {!selectedTemplate && (
                    <div className="text-center py-8 text-gray-500 text-sm italic">
                        Select a template to generate a response.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}