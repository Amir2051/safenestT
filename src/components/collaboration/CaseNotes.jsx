import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { StickyNote, Plus, Lock } from "lucide-react";

export default function CaseNotes({ caseId, user }) {
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['case-notes', caseId],
    queryFn: () => base44.entities.CaseNote.filter({ case_id: caseId }, '-created_date'),
    enabled: !!caseId
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.CaseNote.create({
        case_id: caseId,
        content: newNote,
        type: noteType,
        is_private: isPrivate,
        author_email: user.email,
        author_name: user.full_name || user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['case-notes', caseId]);
      setNewNote("");
      setIsAdding(false);
    }
  });

  const filteredNotes = notes.filter(note => 
    !note.is_private || note.author_email === user.email
  );

  const typeColors = {
    general: "bg-gray-500/20 text-gray-300",
    evidence: "bg-blue-500/20 text-blue-300",
    legal: "bg-purple-500/20 text-purple-300",
    technical: "bg-orange-500/20 text-orange-300"
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Shared Notes</h3>
        <Button 
          size="sm" 
          variant={isAdding ? "secondary" : "outline"}
          onClick={() => setIsAdding(!isAdding)}
          className="border-gray-700"
        >
          {isAdding ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Add Note</>}
        </Button>
      </div>

      {isAdding && (
        <div className="p-4 bg-[#1a2332] rounded-lg border border-gray-800 space-y-3 animate-in fade-in slide-in-from-top-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write your observation..."
            className="bg-[#0f1419] border-gray-700 min-h-[100px]"
          />
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger className="w-[120px] bg-[#0f1419] border-gray-700 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="evidence">Evidence</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`h-8 text-xs ${isPrivate ? 'text-yellow-400 bg-yellow-500/10' : 'text-gray-400'}`}
              >
                <Lock className="w-3 h-3 mr-1" /> Private
              </Button>
            </div>
            <Button 
              size="sm" 
              onClick={() => createNoteMutation.mutate()}
              disabled={!newNote.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              Save Note
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredNotes.map(note => (
          <div key={note.id} className="p-4 bg-[#0f1419] rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm">{note.author_name}</span>
                <span className="text-xs text-gray-500">{format(new Date(note.created_date), 'MMM d, HH:mm')}</span>
                {note.is_private && <Lock className="w-3 h-3 text-yellow-500" />}
              </div>
              <Badge className={`${typeColors[note.type]} capitalize`}>
                {note.type}
              </Badge>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
          </div>
        ))}
        {filteredNotes.length === 0 && (
          <div className="text-center py-10">
            <StickyNote className="w-12 h-12 text-gray-700 mx-auto mb-2" />
            <p className="text-gray-500">No notes recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}