import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { format } from "date-fns";

export default function CaseChat({ caseId, user }) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['case-chat', caseId],
    queryFn: () => base44.entities.CaseChat.filter({ case_id: caseId }, 'created_date'),
    refetchInterval: 3000,
    enabled: !!caseId
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      return await base44.entities.CaseChat.create({
        case_id: caseId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        message: text,
        attachments: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['case-chat', caseId]);
      setMessage("");
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-cyan-400" /></div>;

  return (
    <div className="flex flex-col h-[500px] bg-[#0f1419] rounded-lg border border-gray-800">
      <div className="p-3 border-b border-gray-800 bg-[#1a2332] rounded-t-lg">
        <h3 className="text-white font-semibold flex items-center gap-2">
          Secure Team Chat
          <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
            Encrypted
          </span>
        </h3>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isMe = msg.sender_email === user.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  isMe ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-200'
                }`}>
                  {!isMe && <p className="text-xs text-gray-400 mb-1">{msg.sender_name}</p>}
                  <p className="text-sm">{msg.message}</p>
                  <p className="text-[10px] opacity-70 mt-1 text-right">
                    {format(new Date(msg.created_date), 'HH:mm')}
                  </p>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-10">No messages yet. Start the secure conversation.</p>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="p-3 border-t border-gray-800 flex gap-2 bg-[#1a2332] rounded-b-lg">
        <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Paperclip className="w-4 h-4" />
        </Button>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a secure message..."
          className="flex-1 bg-[#0f1419] border-gray-700 text-white focus-visible:ring-cyan-500"
        />
        <Button 
          type="submit" 
          disabled={sendMessageMutation.isPending || !message.trim()}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}