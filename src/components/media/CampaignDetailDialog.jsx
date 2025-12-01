import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Wand2, Calendar, Users, Upload, FileText, Target, 
  MessageSquare, Play, Save, Loader2, CheckCircle, X, Paperclip
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CampaignDetailDialog({ project, open, onOpenChange }) {
    const [activeTab, setActiveTab] = useState("overview");
    const [formData, setFormData] = useState(project || {});
    const fileInputRef = useRef(null);
    const queryClient = useQueryClient();

    // Ensure formData updates when project changes
    React.useEffect(() => {
        if (project) setFormData(project);
    }, [project]);

    const { data: users } = useQuery({
        queryKey: ['users-list'],
        queryFn: () => base44.entities.User.list(),
        initialData: []
    });

    const updateCampaignMutation = useMutation({
        mutationFn: (data) => base44.entities.MediaProject.update(project.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['media-projects']);
            toast.success("Campaign updated successfully");
        }
    });

    const generateContentMutation = useMutation({
        mutationFn: async ({ type, field }) => {
            const res = await base44.functions.invoke('mediaAI', {
                endpoint: 'generate_campaign_content',
                type,
                campaign_data: formData
            });
            return { field, content: res.data.result };
        },
        onSuccess: ({ field, content }) => {
            const newData = { ...formData, [field]: content };
            setFormData(newData);
            updateCampaignMutation.mutate({ [field]: content }); // Auto-save generated content
            toast.success(`Generated ${field.replace('_', ' ')}!`);
        },
        onError: (e) => toast.error("AI Generation failed: " + e.message)
    });

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const uploadToast = toast.loading("Uploading asset...");
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            const currentAssets = formData.media_assets || [];
            const newAssets = [...currentAssets, file_url];
            
            setFormData({ ...formData, media_assets: newAssets });
            updateCampaignMutation.mutate({ media_assets: newAssets });
            toast.dismiss(uploadToast);
            toast.success("Asset uploaded!");
        } catch (err) {
            toast.dismiss(uploadToast);
            toast.error("Upload failed");
        }
    };

    const toggleStaff = (userId) => {
        const currentStaff = formData.assigned_staff || [];
        let newStaff;
        if (currentStaff.includes(userId)) {
            newStaff = currentStaff.filter(id => id !== userId);
        } else {
            newStaff = [...currentStaff, userId];
        }
        setFormData({ ...formData, assigned_staff: newStaff });
        // We don't auto-save here to allow bulk changes, user must click Save for staff
    };

    const handleSave = () => {
        updateCampaignMutation.mutate(formData);
    };

    if (!project) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1a2332] border-gray-700 text-white max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 border-b border-gray-700 bg-[#0f1419]">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                {formData.name}
                                <Badge className={
                                    formData.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-gray-700'
                                }>{formData.status}</Badge>
                            </DialogTitle>
                            <p className="text-gray-400 mt-1">Campaign Management Dashboard</p>
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={() => generateContentMutation.mutate({ type: 'analysis', field: 'analysis_result' })} // Just showing result in toast for now or separate dialog
                                disabled={generateContentMutation.isPending}
                                className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                            >
                                <Target className="w-4 h-4 mr-2" /> Run AI Analysis
                            </Button>
                            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-48 border-r border-gray-700 bg-[#111827] flex-shrink-0">
                        <TabsList className="flex flex-col h-full justify-start p-2 space-y-1 bg-transparent">
                            <TabsTrigger value="overview" className="w-full justify-start"><FileText className="w-4 h-4 mr-2" /> Overview</TabsTrigger>
                            <TabsTrigger value="strategy" className="w-full justify-start"><Target className="w-4 h-4 mr-2" /> Strategy</TabsTrigger>
                            <TabsTrigger value="plan" className="w-full justify-start"><Calendar className="w-4 h-4 mr-2" /> Weekly Plan</TabsTrigger>
                            <TabsTrigger value="content" className="w-full justify-start"><Wand2 className="w-4 h-4 mr-2" /> Scripts & Content</TabsTrigger>
                            <TabsTrigger value="assets" className="w-full justify-start"><Upload className="w-4 h-4 mr-2" /> Media Assets</TabsTrigger>
                            <TabsTrigger value="team" className="w-full justify-start"><Users className="w-4 h-4 mr-2" /> Staffing</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Content Area */}
                    <ScrollArea className="flex-1 p-6 bg-[#0f1419]">
                        
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Campaign Title</label>
                                        <Input 
                                            value={formData.name || ''} 
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                            className="bg-[#1a2332] border-gray-600"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Status</label>
                                        <select 
                                            value={formData.status || 'planning'}
                                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                                            className="w-full h-10 px-3 rounded-md bg-[#1a2332] border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="planning">Planning</option>
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="on_hold">On Hold</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">Start Date</label>
                                        <Input type="date" value={formData.start_date || ''} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="bg-[#1a2332] border-gray-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm text-gray-400">End Date</label>
                                        <Input type="date" value={formData.end_date || ''} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="bg-[#1a2332] border-gray-600" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Description</label>
                                    <Textarea 
                                        value={formData.description || ''} 
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        className="bg-[#1a2332] border-gray-600 min-h-[100px]"
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'strategy' && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Campaign Goal</label>
                                    <Textarea 
                                        value={formData.campaign_goal || ''} 
                                        onChange={(e) => setFormData({...formData, campaign_goal: e.target.value})}
                                        className="bg-[#1a2332] border-gray-600"
                                        placeholder="What is the primary objective?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm text-gray-400">Target Audience</label>
                                    <Textarea 
                                        value={formData.target_audience || ''} 
                                        onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                                        className="bg-[#1a2332] border-gray-600"
                                        placeholder="Who are we reaching?"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-gray-400">Key Messages</label>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            onClick={() => generateContentMutation.mutate({ type: 'key_messages', field: 'key_messages' })}
                                            disabled={generateContentMutation.isPending}
                                            className="text-xs border-pink-500 text-pink-400 hover:bg-pink-500/10"
                                        >
                                            <Wand2 className="w-3 h-3 mr-1" /> AI Generate
                                        </Button>
                                    </div>
                                    <Textarea 
                                        value={formData.key_messages || ''} 
                                        onChange={(e) => setFormData({...formData, key_messages: e.target.value})}
                                        className="bg-[#1a2332] border-gray-600 min-h-[150px]"
                                        placeholder="Core messaging points..."
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'plan' && (
                            <div className="space-y-4 h-full">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Weekly Breakdown</h3>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => generateContentMutation.mutate({ type: 'weekly_plan', field: 'weekly_breakdown' })}
                                        disabled={generateContentMutation.isPending}
                                        className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                                    >
                                        <Calendar className="w-3 h-3 mr-1" /> Generate 4-Week Plan
                                    </Button>
                                </div>
                                <Textarea 
                                    value={formData.weekly_breakdown || ''} 
                                    onChange={(e) => setFormData({...formData, weekly_breakdown: e.target.value})}
                                    className="bg-[#1a2332] border-gray-600 min-h-[400px] font-mono text-sm"
                                    placeholder="Week 1: ... Week 2: ..."
                                />
                            </div>
                        )}

                        {activeTab === 'content' && (
                            <div className="space-y-4 h-full">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Scripts & Content</h3>
                                    <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => generateContentMutation.mutate({ type: 'scripts', field: 'scripts_content' })}
                                        disabled={generateContentMutation.isPending}
                                        className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
                                    >
                                        <MessageSquare className="w-3 h-3 mr-1" /> Generate Scripts
                                    </Button>
                                </div>
                                <Textarea 
                                    value={formData.scripts_content || ''} 
                                    onChange={(e) => setFormData({...formData, scripts_content: e.target.value})}
                                    className="bg-[#1a2332] border-gray-600 min-h-[400px] font-mono text-sm"
                                    placeholder="Intro Script: ... Social Post: ..."
                                />
                            </div>
                        )}

                        {activeTab === 'assets' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold text-white">Media Assets</h3>
                                    <div>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            onChange={handleFileUpload}
                                        />
                                        <Button 
                                            size="sm" 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-gray-700 hover:bg-gray-600"
                                        >
                                            <Upload className="w-4 h-4 mr-2" /> Upload File
                                        </Button>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {formData.media_assets?.map((url, idx) => (
                                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="block group relative aspect-video bg-black rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500">
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                    <img src={url} alt="Asset" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Paperclip className="w-8 h-8 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className="text-xs text-white font-medium">View Asset</span>
                                            </div>
                                        </a>
                                    ))}
                                    {(!formData.media_assets || formData.media_assets.length === 0) && (
                                        <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                                            No assets uploaded yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'team' && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-semibold text-white">Assign Staff</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {users.map(u => {
                                        const isAssigned = (formData.assigned_staff || []).includes(u.id);
                                        return (
                                            <div 
                                                key={u.id} 
                                                onClick={() => toggleStaff(u.id)}
                                                className={`cursor-pointer p-3 rounded-lg border flex items-center gap-3 transition-all ${
                                                    isAssigned 
                                                        ? 'bg-blue-900/20 border-blue-500/50' 
                                                        : 'bg-[#1a2332] border-gray-700 hover:border-gray-500'
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    isAssigned ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                                                }`}>
                                                    {isAssigned ? <CheckCircle className="w-5 h-5" /> : <Users className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${isAssigned ? 'text-blue-300' : 'text-gray-300'}`}>
                                                        {u.full_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{u.job_title || 'Staff'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}