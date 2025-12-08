import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MessageSquare, Lock, Shield, Phone, FileText } from "lucide-react";
import { toast } from "sonner";

export default function InvestigationNotes({ caseId, caseData: initialCaseData, onUpdate }) {
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("investigation");
  const [isConfidential, setIsConfidential] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: latestCaseData } = useQuery({
    queryKey: ['case-notes-live', caseId],
    queryFn: async () => {
       try {
         return await base44.entities.InvestigationCase.get(caseId);
       } catch (e) {
         return initialCaseData;
       }
    },
    initialData: initialCaseData,
    refetchInterval: 5000,
    enabled: !!caseId
  });

  const caseData = latestCaseData || initialCaseData;

  const addNoteMutation = useMutation({
    mutationFn: async ({ note, type, confidential }) => {
      const notes = caseData.case_notes ? [...caseData.case_notes] : [];
      
      let userRole = 'User';
      if (currentUser?.role === 'admin') userRole = 'Admin';
      else if (currentUser?.job_title === 'Fraud Specialist' || currentUser?.role === 'investigator') userRole = 'Investigator';
      
      const authorName = currentUser?.full_name || currentUser?.email || 'User';

      notes.push({
        timestamp: new Date().toISOString(),
        author: authorName,
        role: userRole,
        note,
        type,
        confidential
      });

      // Use backend function for reliability
      const response = await base44.functions.invoke('caseManagement', {
        action: 'update',
        data: {
          id: caseId,
          entityName: caseData._entityName || 'InvestigationCase',
          updates: {
            case_notes: notes,
            last_activity: new Date().toISOString()
          }
        }
      });
      
      if (response.data.error) throw new Error(response.data.error);
      return response.data.case;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['case-notes-live', caseId]);
      if (onUpdate) onUpdate();
      toast.success("Note added successfully");
      setNoteText("");
      setNoteType("investigation");
      setIsConfidential(false);
    },
    onError: (err) => {
      toast.error("Failed to add note: " + err.message);
    }
  });

  const handleAddNote = () => {
    if (!noteText.trim()) {
      toast.error("Please enter a note");
      return;
    }
    addNoteMutation.mutate({
      note: noteText,
      type: noteType,
      confidential: isConfidential
    });
  };

  const getNoteIcon = (type) => {
    switch(type) {
      case 'investigation': return Shield;
      case 'contact': return Phone;
      case 'evidence': return FileText;
      case 'reminder': return MessageSquare;
      default: return MessageSquare;
    }
  };

  const getNoteColor = (type) => {
    switch(type) {
      case 'investigation': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
      case 'contact': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'evidence': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'reminder': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const notes = caseData.case_notes || [];

  return (
    <div className="space-y-6">
      {/* Add Note Form */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Add Investigation Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter investigation notes..."
            className="bg-[#0f1419] border-cyan-500/30 text-white h-32"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm mb-2 block">Note Type</label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a2332] border-cyan-500/20">
                  <SelectItem value="investigation">Investigation</SelectItem>
                  <SelectItem value="contact">Contact</SelectItem>
                  <SelectItem value="evidence">Evidence</SelectItem>
                  <SelectItem value="reminder">Reminder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-white text-sm flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  Confidential
                </span>
              </label>
            </div>
          </div>

          <Button 
            onClick={handleAddNote}
            disabled={addNoteMutation.isPending}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">Case Notes ({notes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.slice().reverse().map((note, idx) => {
                const Icon = getNoteIcon(note.type);
                return (
                  <div key={idx} className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={getNoteColor(note.type)}>
                          <Icon className="w-3 h-3 mr-1" />
                          {note.type}
                        </Badge>
                        {/* Display Role Badge */}
                        <Badge variant="outline" className={`text-xs ${note.role === 'Admin' || note.role === 'Investigator' ? 'border-purple-500 text-purple-400' : 'border-gray-500 text-gray-400'}`}>
                           {note.role || (note.author === 'system' ? 'System' : 'User')}
                        </Badge>
                        {note.confidential && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                            <Lock className="w-3 h-3 mr-1" />
                            Confidential
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-300">
                        {new Date(note.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-white text-sm leading-relaxed">{note.note}</p>
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">By: {note.author}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}