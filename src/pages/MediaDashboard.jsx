import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Briefcase, Calendar, Mic, Plus, Video, Users, 
  BarChart3, Radio, Megaphone, Search, PlayCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import CampaignDetailDialog from "@/components/media/CampaignDetailDialog";

export default function MediaDashboard() {
  const [user, setUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: projects } = useQuery({
    queryKey: ['media-projects'],
    queryFn: () => base44.entities.MediaProject.list(),
    initialData: []
  });

  const handleProjectClick = (project) => {
      setSelectedProject(project);
      setIsDetailOpen(true);
  };

  const myCampaigns = projects.filter(p => 
      (p.assigned_staff || []).includes(user?.id) || 
      p.assigned_to === user?.id // fallback for backward compatibility
  );

  const { data: meetings } = useQuery({
    queryKey: ['meeting-logs'],
    queryFn: () => base44.entities.MeetingLog.list(),
    initialData: []
  });

  const [isLogMeetingOpen, setIsLogMeetingOpen] = useState(false);
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [isScriptOpen, setIsScriptOpen] = useState(false);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);

  // Meeting State
  const [meetingData, setMeetingData] = useState({ title: "", date: "", type: "internal", notes: "" });
  // Campaign State
  const [campaignData, setCampaignData] = useState({ name: "", description: "", status: "planning", start_date: "" });
  // Script State
  const [scriptData, setScriptData] = useState({ title: "", topic: "", type: "press_release", tone: "Professional" });
  // Suggestion State
  const [suggestData, setSuggestData] = useState({ project_name: "", description: "" });

  const createMeetingMutation = useMutation({
    mutationFn: (data) => base44.entities.MeetingLog.create(data),
    onSuccess: () => {
        queryClient.invalidateQueries(['meeting-logs']);
        toast.success("Meeting logged successfully");
        setIsLogMeetingOpen(false);
        setMeetingData({ title: "", date: "", type: "internal", notes: "" });
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.MediaProject.create(data),
    onSuccess: () => {
        queryClient.invalidateQueries(['media-projects']);
        toast.success("Campaign created");
        setIsNewCampaignOpen(false);
        setCampaignData({ name: "", description: "", status: "planning", start_date: "" });
    }
  });

  const analyzeMeetingMutation = useMutation({
    mutationFn: async (meeting) => {
        const res = await base44.functions.invoke('mediaAI', {
            endpoint: 'analyze_meeting',
            meeting_id: meeting.id,
            notes: meeting.notes,
            title: meeting.title
        });
        return res.data;
    },
    onSuccess: (data) => {
        queryClient.invalidateQueries(['meeting-logs']);
        toast.success("Analysis complete!");
    }
  });

  const generateScriptMutation = useMutation({
    mutationFn: async (data) => {
        const res = await base44.functions.invoke('mediaAI', {
            endpoint: 'generate_script',
            ...data
        });
        return res.data;
    },
    onSuccess: () => {
        toast.success("Script generated and saved to Scripts!");
        setIsScriptOpen(false);
    }
  });

  const suggestMediaMutation = useMutation({
    mutationFn: async (data) => {
        const res = await base44.functions.invoke('mediaAI', {
            endpoint: 'media_suggestions',
            ...data
        });
        return res.data;
    },
    onSuccess: (data) => {
        // Show result in a simple alert or modal for now
        alert("Suggestions:\n\n" + data.suggestions);
        setIsSuggestOpen(false);
    }
  });

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Megaphone className="w-8 h-8 text-pink-500" />
                Media Command Center
            </h1>
            <p className="text-gray-400 mt-2">
                Welcome back, {user?.full_name}. Role: <span className="text-pink-400">{user?.job_title || 'Admin'}</span>
            </p>
        </div>
        <div className="flex flex-wrap gap-3">
            <Dialog open={isLogMeetingOpen} onOpenChange={setIsLogMeetingOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Calendar className="w-4 h-4 mr-2" /> Log Meeting
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Log New Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <Input placeholder="Meeting Title" value={meetingData.title} onChange={(e) => setMeetingData({...meetingData, title: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Input type="date" value={meetingData.date} onChange={(e) => setMeetingData({...meetingData, date: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Input placeholder="Notes / Transcript" value={meetingData.notes} onChange={(e) => setMeetingData({...meetingData, notes: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Button onClick={() => createMeetingMutation.mutate(meetingData)} className="w-full bg-blue-600">Save Meeting</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isNewCampaignOpen} onOpenChange={setIsNewCampaignOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-pink-600 hover:bg-pink-700">
                        <Plus className="w-4 h-4 mr-2" /> New Campaign
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle>Create Media Campaign</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <Input placeholder="Campaign Name" value={campaignData.name} onChange={(e) => setCampaignData({...campaignData, name: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Input placeholder="Description" value={campaignData.description} onChange={(e) => setCampaignData({...campaignData, description: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Input type="date" placeholder="Start Date" value={campaignData.start_date} onChange={(e) => setCampaignData({...campaignData, start_date: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Button onClick={() => createProjectMutation.mutate(campaignData)} className="w-full bg-pink-600">Create Campaign</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isScriptOpen} onOpenChange={setIsScriptOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
                        <mic className="w-4 h-4 mr-2" /> Generate Script
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle>AI Script Generator</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <Input placeholder="Script Title" value={scriptData.title} onChange={(e) => setScriptData({...scriptData, title: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Input placeholder="Topic / Key Points" value={scriptData.topic} onChange={(e) => setScriptData({...scriptData, topic: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Input placeholder="Tone (e.g. Professional, Urgent)" value={scriptData.tone} onChange={(e) => setScriptData({...scriptData, tone: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Button onClick={() => generateScriptMutation.mutate(scriptData)} disabled={generateScriptMutation.isPending} className="w-full bg-purple-600">
                            {generateScriptMutation.isPending ? 'Generating...' : 'Generate Script'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isSuggestOpen} onOpenChange={setIsSuggestOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="border-green-500 text-green-400 hover:bg-green-500/10">
                        <Search className="w-4 h-4 mr-2" /> Media Suggestions
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-gray-700 text-white">
                    <DialogHeader>
                        <DialogTitle>AI Media Strategy</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <Input placeholder="Project Name" value={suggestData.project_name} onChange={(e) => setSuggestData({...suggestData, project_name: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Input placeholder="Brief Description" value={suggestData.description} onChange={(e) => setSuggestData({...suggestData, description: e.target.value})} className="bg-[#0f1419] border-gray-600" />
                        <Button onClick={() => suggestMediaMutation.mutate(suggestData)} disabled={suggestMediaMutation.isPending} className="w-full bg-green-600">
                            {suggestMediaMutation.isPending ? 'Thinking...' : 'Get Suggestions'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Active Campaigns</CardTitle>
                <Briefcase className="h-4 w-4 text-pink-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{projects.filter(p => p.status === 'active').length}</div>
            </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Meetings this Week</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">{meetings.length}</div>
            </CardContent>
        </Card>
        <Card className="bg-[#1a2332] border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Press Mentions</CardTitle>
                <Radio className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-white">12</div>
                <p className="text-xs text-gray-500">+2 from last week</p>
            </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="projects" className="space-y-4">
        <TabsList className="bg-[#1a2332] border-gray-700">
            <TabsTrigger value="projects">Media Projects</TabsTrigger>
            <TabsTrigger value="meetings">Meeting Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-4">
            {user?.role !== 'admin' && user?.job_title !== 'Media Director' && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-4">
                    <h3 className="text-blue-300 font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Staff View</h3>
                    <p className="text-sm text-gray-400">You are viewing campaigns assigned to you.</p>
                </div>
            )}
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(user?.role === 'admin' || user?.job_title === 'Media Director' ? projects : myCampaigns).map(project => (
                    <Card 
                        key={project.id} 
                        onClick={() => handleProjectClick(project)}
                        className="bg-[#1a2332] border-gray-700 hover:border-pink-500/50 transition-all cursor-pointer group"
                    >
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-white truncate group-hover:text-pink-400 transition-colors">{project.name}</CardTitle>
                                <Badge className={
                                    project.status === 'active' ? 'bg-green-900 text-green-300' : 
                                    'bg-gray-700 text-gray-300'
                                }>{project.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-400 line-clamp-3 mb-4">{project.description || "No description provided."}</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {project.media_channels?.map(ch => (
                                    <Badge key={ch} variant="outline" className="border-gray-600 text-gray-400">{ch}</Badge>
                                ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-700 pt-3">
                                <span>{(project.assigned_staff || []).length} Staff Assigned</span>
                                <span className="flex items-center gap-1 group-hover:text-pink-400"><PlayCircle className="w-3 h-3" /> Open</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {(user?.role === 'admin' || user?.job_title === 'Media Director' ? projects : myCampaigns).length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                        <Megaphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        No campaigns found. {user?.role !== 'admin' ? "You haven't been assigned to any yet." : "Create one to get started."}
                    </div>
                )}
            </div>
        </TabsContent>

        <CampaignDetailDialog 
            project={selectedProject} 
            open={isDetailOpen} 
            onOpenChange={setIsDetailOpen} 
        />

        <TabsContent value="meetings" className="space-y-4">
             <Card className="bg-[#1a2332] border-gray-700">
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-700">
                        {meetings.map(meeting => (
                            <div key={meeting.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded bg-blue-900/30 flex items-center justify-center">
                                        <Mic className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-white">{meeting.title}</h4>
                                        <p className="text-sm text-gray-400">{new Date(meeting.date).toLocaleDateString()} • {meeting.type}</p>
                                        {meeting.ai_summary && <p className="text-xs text-green-400 mt-1">✓ AI Analyzed</p>}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button 
                                        size="sm" 
                                        onClick={() => analyzeMeetingMutation.mutate(meeting)}
                                        disabled={analyzeMeetingMutation.isPending}
                                        className="bg-purple-600 hover:bg-purple-700 text-xs"
                                    >
                                        {analyzeMeetingMutation.isPending ? 'Analyzing...' : 'Analyze Meeting'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {meetings.length === 0 && (
                             <div className="p-8 text-center text-gray-500">
                                No meetings logged yet.
                            </div>
                        )}
                    </div>
                </CardContent>
             </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}