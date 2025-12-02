import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Mic, Paperclip, Sparkles, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
import { toast } from "sonner";

// Simple Message Bubble component inline to avoid dependency issues if the other one is complex
const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isUser ? "bg-blue-600 text-white" : "bg-[#1e293b] text-gray-200 border border-gray-700"
      )}>
        <ReactMarkdown className="prose prose-invert text-sm">
          {message.content}
        </ReactMarkdown>
      </div>
       {isUser && (
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
};

export default function MediaDirectorAI() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  // Fetch messages from the new MediaMessage collection
  const { data: messages = [] } = useQuery({
    queryKey: ['media-messages'],
    queryFn: () => base44.entities.MediaMessage.list({ sort: { created_date: 1 }, limit: 50 }),
    refetchInterval: 2000 // Increased polling frequency for instant-feel updates
  });

  useEffect(() => {
    const init = async () => {
        const u = await base44.auth.me();
        setUser(u);
    };
    init();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const msgContent = input;
    
    // Optimistic update
    const tempUserMsg = { role: 'user', content: msgContent };
    queryClient.setQueryData(['media-messages'], old => [...(old || []), tempUserMsg]);
    
    setInput("");
    setLoading(true);
    
    try {
        // Call AI (backend handles saving both user and assistant messages)
        const history = messages.map(m => ({ role: m.role, content: m.content }));

        const response = await base44.functions.invoke('mediaAI', {
            endpoint: 'chat',
            message: msgContent,
            history: history.slice(-10)
        });

        if (response.data.reply) {
            // Optimistic update for reply
            const tempAssistantMsg = { role: 'assistant', content: response.data.reply };
            queryClient.setQueryData(['media-messages'], old => [...(old || []), tempAssistantMsg]);
            
            // Re-sync with server
            queryClient.invalidateQueries(['media-messages']);
        } else {
            toast.error("No response from AI");
        }
    } catch (e) {
        console.error(e);
        toast.error("Failed to send message: " + e.message);
        queryClient.invalidateQueries(['media-messages']); // Revert on error
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] p-4 lg:p-6 flex flex-col h-screen">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-400" />
            Media Director AI
        </h1>
        <p className="text-gray-400">Your strategic assistant for meetings, PR, and media planning.</p>
      </header>

      <Card className="flex-1 flex flex-col bg-[#111827] border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800 py-3">
            <CardTitle className="text-sm font-medium text-gray-300 flex items-center justify-between">
                <span>Chat Session</span>
                {user && <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded">{user.job_title === 'Media Director' ? 'Media Director Access' : 'Staff Access'}</span>}
            </CardTitle>
        </CardHeader>
        <div className="flex-1 overflow-hidden relative">
            <div 
                className="absolute inset-0 overflow-y-auto p-4" 
                ref={scrollRef}
            >
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                        <Bot className="w-16 h-16 mb-4" />
                        <p>Ask me to analyze a meeting or draft a press release...</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <ChatMessage key={i} message={m} />
                ))}
                {loading && (
                    <div className="flex gap-2 items-center text-gray-500 text-sm ml-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-75" />
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150" />
                    </div>
                )}
            </div>
        </div>
        <div className="p-4 bg-[#0f1419] border-t border-gray-800">
            <div className="flex gap-2">
                <Input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type your request..."
                    className="bg-[#1e293b] border-gray-700 text-white"
                />
                <Button 
                    onClick={handleSend} 
                    disabled={loading || !input.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                >
                    <Send className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
}