import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Mic, Paperclip, Sparkles, User } from "lucide-react";
import MessageBubble from "@/components/collaboration/WorkspaceChat"; // Reuse or generic bubble
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
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const scrollRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
        const u = await base44.auth.me();
        setUser(u);
        // Create or get conversation
        try {
            // List conversations to see if one exists for this user + agent
            const convs = await base44.agents.listConversations({ agent_name: 'media_director_assistant' });
            if (convs && convs.length > 0) {
                setConversationId(convs[0].id);
                // subscribe to it
            } else {
                const newConv = await base44.agents.createConversation({
                    agent_name: 'media_director_assistant',
                    metadata: { name: `Media Chat - ${u.full_name}` }
                });
                setConversationId(newConv.id);
            }
        } catch (e) {
            console.error("Failed to init chat", e);
        }
    };
    init();
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
        setMessages(data.messages);
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    });
    return () => unsubscribe();
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;
    const msg = input;
    setInput("");
    setLoading(true);
    try {
        await base44.agents.addMessage(conversationId, {
            role: "user",
            content: msg
        });
    } catch (e) {
        toast.error("Failed to send message");
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