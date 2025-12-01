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
  BarChart3, Radio, Megaphone, Search 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function MediaDashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: projects } = useQuery({
    queryKey: ['media-projects'],
    queryFn: () => base44.entities.MediaProject.list(),
    initialData: []
  });

  const { data: meetings } = useQuery({
    queryKey: ['meeting-logs'],
    queryFn: () => base44.entities.MeetingLog.list(),
    initialData: []
  });

  // Helper for creating new items (simplified)
  const createProjectMutation = useMutation({
    mutationFn: (data) => base44.entities.MediaProject.create(data),
    onSuccess: () => {
        queryClient.invalidateQueries(['media-projects']);
        toast.success("Project created");
    }
  });

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="flex justify-between items-start mb-8">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
                <Megaphone className="w-8 h-8 text-pink-500" />
                Media Command Center
            </h1>
            <p className="text-gray-400 mt-2">
                Welcome back, {user?.full_name}. Role: <span className="text-pink-400">{user?.job_title || 'Admin'}</span>
            </p>
        </div>
        <div className="flex gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700">
                <Calendar className="w-4 h-4 mr-2" /> Log Meeting
            </Button>
            <Button className="bg-pink-600 hover:bg-pink-700">
                <Plus className="w-4 h-4 mr-2" /> New Campaign
            </Button>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {projects.map(project => (
                    <Card key={project.id} className="bg-[#1a2332] border-gray-700 hover:border-pink-500/50 transition-all">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-white truncate">{project.name}</CardTitle>
                                <Badge className={
                                    project.status === 'active' ? 'bg-green-900 text-green-300' : 
                                    'bg-gray-700 text-gray-300'
                                }>{project.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-400 line-clamp-3 mb-4">{project.description}</p>
                            <div className="flex flex-wrap gap-2">
                                {project.media_channels?.map(ch => (
                                    <Badge key={ch} variant="outline" className="border-gray-600 text-gray-400">{ch}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {projects.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No active media projects found.
                    </div>
                )}
            </div>
        </TabsContent>

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
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-gray-400">View AI Summary</Button>
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