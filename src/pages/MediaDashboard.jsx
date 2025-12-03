import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Send, Users, Calendar, FileText, Plus, Search, Edit2, Trash2, 
  CheckCircle, Clock, AlertCircle, Sparkles, Copy, ChevronDown, ChevronUp,
  Mic, Briefcase, Radio, Megaphone
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MediaDashboard() {
  const [activeTab, setActiveTab] = useState('media');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const [editingContact, setEditingContact] = useState(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);

  // Data Fetching
  const { data: contacts = [] } = useQuery({
    queryKey: ['media-contacts'],
    queryFn: () => base44.entities.MediaContact.list('-created_date'),
    initialData: []
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['meeting-logs'],
    queryFn: () => base44.entities.MeetingLog.list('-created_date'),
    initialData: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['media-tasks'],
    queryFn: () => base44.entities.MediaTask.list('-created_date'),
    initialData: []
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['media-documents'],
    queryFn: () => base44.entities.MediaDocument.list('-created_date'),
    initialData: []
  });

  // Mutations
  const createContact = useMutation({
    mutationFn: (data) => base44.entities.MediaContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['media-contacts']);
      setShowContactForm(false);
      toast.success('Contact added successfully');
    }
  });

  const updateContact = useMutation({
    mutationFn: ({id, data}) => base44.entities.MediaContact.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['media-contacts']);
      setEditingContact(null);
      toast.success('Contact updated successfully');
    }
  });

  const deleteContact = useMutation({
    mutationFn: (id) => base44.entities.MediaContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['media-contacts']);
      toast.success('Contact deleted');
    }
  });

  const createMeeting = useMutation({
    mutationFn: (data) => base44.entities.MeetingLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['meeting-logs']);
      setShowMeetingForm(false);
      toast.success('Meeting scheduled successfully');
    }
  });

  const createTask = useMutation({
    mutationFn: (data) => base44.entities.MediaTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['media-tasks']);
      setShowTaskForm(false);
      toast.success('Task added successfully');
    }
  });

  const createDocument = useMutation({
    mutationFn: (data) => base44.entities.MediaDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['media-documents']);
      setShowDocumentForm(false);
      toast.success('Document saved successfully');
    }
  });

  // AI Assistant Logic
  const generateAIResponse = async (prompt) => {
    setIsGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a PR assistant for SafeNestt, a domestic violence prevention organization. ${prompt}\n\nProvide professional, actionable PR content suitable for immediate use.`,
        add_context_from_internet: false
      });
      
      // InvokeLLM returns a string directly if no schema is provided
      setAiResponse(res); 
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse("Error generating response. Please try again.");
    }
    setIsGenerating(false);
  };

  // Components
  const MediaContactForm = ({ contact, onCancel }) => {
    const [formData, setFormData] = useState(contact || {
      name: '', outlet: '', role: '', email: '', phone: '', 
      topics: '', region: '', priority: 'Medium', status: 'Not Contacted', 
      notes: '', lastContact: '', nextFollowUp: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      if (contact) {
        updateContact.mutate({ id: contact.id, data: formData });
      } else {
        createContact.mutate(formData);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="bg-[#1a2332] p-6 rounded-lg border border-gray-700 mb-6 text-white">
        <h3 className="text-lg font-semibold mb-4 text-white">
          {contact ? 'Edit Contact' : 'Add New Media Contact'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Contact Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          <Input placeholder="Media Outlet *" value={formData.outlet} onChange={(e) => setFormData({ ...formData, outlet: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          <Input placeholder="Role/Title" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
          <Input type="email" placeholder="Email *" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          <Input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
          <Input placeholder="Topics/Beat" value={formData.topics} onChange={(e) => setFormData({ ...formData, topics: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
          <Input placeholder="Region/Location" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
          
          <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
            <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
            <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Not Contacted">Not Contacted</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Follow-up Needed">Follow-up Needed</SelectItem>
              <SelectItem value="Replied">Replied</SelectItem>
              <SelectItem value="Meeting Scheduled">Meeting Scheduled</SelectItem>
              <SelectItem value="No Response">No Response</SelectItem>
            </SelectContent>
          </Select>

          <Input type="date" placeholder="Last Contact" value={formData.lastContact} onChange={(e) => setFormData({ ...formData, lastContact: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
          <Input type="date" placeholder="Next Follow-up" value={formData.nextFollowUp} onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
        </div>
        <Textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full mt-4 bg-[#0f1419] border-gray-600 text-white" rows="3" />
        <div className="flex gap-3 mt-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">{contact ? 'Update Contact' : 'Add Contact'}</Button>
          <Button type="button" variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300 hover:bg-gray-800">Cancel</Button>
        </div>
      </form>
    );
  };

  const MeetingForm = ({ onCancel }) => {
    const [formData, setFormData] = useState({
      title: '', date: '', time: '', attendees: '', purpose: '',
      agenda: '', notes: '', actionItems: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      createMeeting.mutate({
        ...formData,
        date: new Date(`${formData.date}T${formData.time || '09:00'}`).toISOString()
      });
    };

    return (
      <form onSubmit={handleSubmit} className="bg-[#1a2332] p-6 rounded-lg border border-gray-700 mb-6 text-white">
        <h3 className="text-lg font-semibold mb-4 text-white">Schedule New Meeting</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Meeting Title *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          <Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          <Input placeholder="Attendees" value={formData.attendees} onChange={(e) => setFormData({ ...formData, attendees: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
        </div>
        <Input placeholder="Purpose" value={formData.purpose} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="w-full mt-4 bg-[#0f1419] border-gray-600 text-white" />
        <Textarea placeholder="Agenda" value={formData.agenda} onChange={(e) => setFormData({ ...formData, agenda: e.target.value })} className="w-full mt-4 bg-[#0f1419] border-gray-600 text-white" rows="3" />
        <Textarea placeholder="Notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full mt-4 bg-[#0f1419] border-gray-600 text-white" rows="3" />
        <Textarea placeholder="Action Items" value={formData.actionItems} onChange={(e) => setFormData({ ...formData, actionItems: e.target.value })} className="w-full mt-4 bg-[#0f1419] border-gray-600 text-white" rows="2" />
        <div className="flex gap-3 mt-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Add Meeting</Button>
          <Button type="button" variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300 hover:bg-gray-800">Cancel</Button>
        </div>
      </form>
    );
  };

  const TaskForm = ({ onCancel }) => {
    const [formData, setFormData] = useState({
      title: '', description: '', deadline: '', priority: 'Medium',
      status: 'Pending', assignedTo: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      createTask.mutate(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="bg-[#1a2332] p-6 rounded-lg border border-gray-700 mb-6 text-white">
        <h3 className="text-lg font-semibold mb-4 text-white">Add New Task</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Task Title *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          <Input type="date" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
          
          <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
            <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
            <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <Input placeholder="Assigned To" value={formData.assignedTo} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white" />
        </div>
        <Textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full mt-4 bg-[#0f1419] border-gray-600 text-white" rows="3" />
        <div className="flex gap-3 mt-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Add Task</Button>
          <Button type="button" variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300 hover:bg-gray-800">Cancel</Button>
        </div>
      </form>
    );
  };

  const DocumentForm = ({ onCancel }) => {
    const [formData, setFormData] = useState({
      title: '', type: 'Email Template', content: '', tags: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      createDocument.mutate(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="bg-[#1a2332] p-6 rounded-lg border border-gray-700 mb-6 text-white">
        <h3 className="text-lg font-semibold mb-4 text-white">Add New Document</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input placeholder="Document Title *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required className="bg-[#0f1419] border-gray-600 text-white" />
          
          <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
            <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Email Template">Email Template</SelectItem>
              <SelectItem value="Press Release">Press Release</SelectItem>
              <SelectItem value="Talking Points">Talking Points</SelectItem>
              <SelectItem value="Media Kit">Media Kit</SelectItem>
              <SelectItem value="Meeting Notes">Meeting Notes</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Input placeholder="Tags (comma-separated)" value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} className="bg-[#0f1419] border-gray-600 text-white md:col-span-2" />
        </div>
        <Textarea placeholder="Content *" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} className="w-full mt-4 bg-[#0f1419] border-gray-600 text-white" rows="6" required />
        <div className="flex gap-3 mt-4">
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Document</Button>
          <Button type="button" variant="outline" onClick={onCancel} className="border-gray-600 text-gray-300 hover:bg-gray-800">Cancel</Button>
        </div>
      </form>
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'Low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Replied':
      case 'Meeting Scheduled':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Follow-up Needed':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'No Response':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const filteredContacts = contacts.filter(contact =>
    (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.outlet || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.topics || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.region || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-pink-500" />
            SafeNestt PR Assistant
          </h1>
          <p className="text-gray-400 mt-1">Manage media relations, meetings, and tasks</p>
        </div>
        <Button 
          onClick={() => setShowAIAssistant(true)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI Assistant
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#1a2332] border border-gray-700 p-1">
          <TabsTrigger value="media" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Users className="w-4 h-4 mr-2" /> Media Contacts
          </TabsTrigger>
          <TabsTrigger value="meetings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Calendar className="w-4 h-4 mr-2" /> Meetings
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <CheckCircle className="w-4 h-4 mr-2" /> Tasks
          </TabsTrigger>
          <TabsTrigger value="documents" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" /> Documents
          </TabsTrigger>
        </TabsList>

        {/* MEDIA CONTACTS TAB */}
        <TabsContent value="media" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search contacts..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#1a2332] border-gray-700 text-white w-full"
              />
            </div>
            <Button onClick={() => setShowContactForm(!showContactForm)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add Contact
            </Button>
          </div>

          {(showContactForm || editingContact) && (
            <MediaContactForm 
              contact={editingContact} 
              onCancel={() => {
                setEditingContact(null);
                setShowContactForm(false);
              }} 
            />
          )}

          <div className="grid gap-4">
            {filteredContacts.map(contact => (
              <Card key={contact.id} className="bg-[#1a2332] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{contact.name}</h3>
                        <Badge className={getPriorityColor(contact.priority)} variant="outline">
                          {contact.priority}
                        </Badge>
                        {getStatusIcon(contact.status)}
                        <span className="text-sm text-gray-400">{contact.status}</span>
                      </div>
                      <p className="text-gray-300 font-medium mb-1">{contact.outlet} {contact.role && `• ${contact.role}`}</p>
                      <div className="text-sm text-gray-400 space-y-1">
                        {contact.email && <p>Email: {contact.email}</p>}
                        {contact.phone && <p>Phone: {contact.phone}</p>}
                        {contact.topics && <p>Topics: {contact.topics}</p>}
                        {contact.region && <p>Region: {contact.region}</p>}
                      </div>
                      {contact.notes && (
                        <div className="mt-3 p-3 bg-[#0f1419] rounded border border-gray-800 text-sm text-gray-400">
                          {contact.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setEditingContact(contact)} className="text-blue-400 hover:bg-blue-500/10">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteContact.mutate(contact.id)} className="text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredContacts.length === 0 && (
              <div className="text-center py-12 text-gray-500">No contacts found</div>
            )}
          </div>
        </TabsContent>

        {/* MEETINGS TAB */}
        <TabsContent value="meetings" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowMeetingForm(!showMeetingForm)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Schedule Meeting
            </Button>
          </div>

          {showMeetingForm && <MeetingForm onCancel={() => setShowMeetingForm(false)} />}

          <div className="grid gap-4">
            {meetings.map(meeting => (
              <Card key={meeting.id} className="bg-[#1a2332] border-gray-700">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{meeting.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(meeting.date).toLocaleDateString()}
                        </div>
                        {meeting.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {meeting.time}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {meeting.attendees && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-1">Attendees</h4>
                        <p className="text-gray-200">{meeting.attendees}</p>
                      </div>
                    )}
                    {meeting.purpose && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-1">Purpose</h4>
                        <p className="text-gray-200">{meeting.purpose}</p>
                      </div>
                    )}
                  </div>

                  {(meeting.agenda || meeting.notes) && <div className="my-4 border-t border-gray-700" />}
                  
                  {meeting.agenda && (
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-400 mb-1">Agenda</h4>
                      <p className="text-gray-300 whitespace-pre-wrap">{meeting.agenda}</p>
                    </div>
                  )}
                  
                  {meeting.notes && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-400 mb-1">Notes</h4>
                      <p className="text-gray-300 whitespace-pre-wrap">{meeting.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {meetings.length === 0 && (
               <div className="text-center py-12 text-gray-500">No meetings scheduled</div>
            )}
          </div>
        </TabsContent>

        {/* TASKS TAB */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowTaskForm(!showTaskForm)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </div>

          {showTaskForm && <TaskForm onCancel={() => setShowTaskForm(false)} />}

          <div className="grid gap-4">
            {tasks.map(task => (
              <Card key={task.id} className="bg-[#1a2332] border-gray-700">
                <CardContent className="p-6 flex items-start gap-4">
                   <div className="mt-1">
                    {task.status === 'Completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Clock className="w-6 h-6 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className={`text-lg font-semibold ${task.status === 'Completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {task.title}
                      </h3>
                      <Badge className={getPriorityColor(task.priority)} variant="outline">{task.priority}</Badge>
                    </div>
                    {task.description && <p className="text-gray-400 mt-1">{task.description}</p>}
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      {task.deadline && <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>}
                      {task.assignedTo && <span>Assigned to: {task.assignedTo}</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {tasks.length === 0 && (
               <div className="text-center py-12 text-gray-500">No tasks found</div>
            )}
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowDocumentForm(!showDocumentForm)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Add Document
            </Button>
          </div>

          {showDocumentForm && <DocumentForm onCancel={() => setShowDocumentForm(false)} />}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map(doc => (
              <Card key={doc.id} className="bg-[#1a2332] border-gray-700 hover:border-blue-500/50 transition-all group">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <FileText className="w-8 h-8 text-blue-400 mb-2" />
                    <Badge variant="outline" className="border-gray-600 text-gray-400">{doc.type}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">{doc.title}</h3>
                  <p className="text-sm text-gray-400 line-clamp-3 mb-4">{doc.content}</p>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-xs text-gray-500">
                      {new Date(doc.created_date).toLocaleDateString()}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(doc.content);
                        toast.success('Content copied to clipboard');
                      }}
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      <Copy className="w-4 h-4 mr-2" /> Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {documents.length === 0 && (
               <div className="col-span-full text-center py-12 text-gray-500">No documents saved</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] rounded-lg border border-gray-700 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#0f1419]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                AI PR Assistant
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAIAssistant(false)} className="text-gray-400 hover:text-white">
                <Trash2 className="w-5 h-5 rotate-45" /> {/* Using Trash icon temporarily as close, rotated */}
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-3">Quick Templates</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Draft Outreach Email', 'Generate Meeting Agenda', 'Write Follow-up Email',
                    'Create Talking Points', 'Suggest Media Targets'
                  ].map((label, index) => (
                    <button
                      key={index}
                      onClick={() => setAiPrompt(`Help me ${label.toLowerCase()}...`)}
                      className="px-3 py-1.5 bg-[#0f1419] hover:bg-blue-900/30 border border-gray-700 hover:border-blue-500/50 rounded-full text-sm text-gray-300 hover:text-white transition-all"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2">Custom Prompt</label>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask the AI to draft emails, create agendas, or generate ideas..."
                  className="bg-[#0f1419] border-gray-600 text-white min-h-[100px]"
                />
              </div>

              <Button
                onClick={() => generateAIResponse(aiPrompt)}
                disabled={!aiPrompt || isGenerating}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </Button>

              {aiResponse && (
                <div className="mt-6 p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
                    <h3 className="font-semibold text-blue-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> AI Response
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(aiResponse);
                        toast.success('Copied to clipboard!');
                      }}
                      className="text-gray-400 hover:text-white h-8"
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}