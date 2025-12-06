import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Paperclip, X, User, Shield, CheckCheck, Bot, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function SupportChatWindow({ chat, onClose, isUser = true }) {
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Poll for messages
  const { data: messages = [] } = useQuery({
    queryKey: ['support-messages', chat.id],
    queryFn: () => base44.entities.SupportMessage.filter({ chat_id: chat.id }, 'created_date', 100),
    refetchInterval: 3000, // 3s polling for "real-time"
  });

  // Mark as read on mount and when messages change
  useEffect(() => {
    if (chat.id) {
        base44.functions.invoke('supportService', { 
            endpoint: 'mark_read', 
            chat_id: chat.id 
        }).catch(console.error);
    }
  }, [chat.id, messages.length]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
        return base44.functions.invoke('supportService', {
            endpoint: 'send_message',
            chat_id: chat.id,
            content
        });
    },
    onSuccess: () => {
        setNewMessage("");
        queryClient.invalidateQueries({ queryKey: ['support-messages', chat.id] });
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
    // Optimistic update or scroll could happen here
  };

  // Ensure we always scroll to bottom when chat opens
  useEffect(() => {
      const timeout = setTimeout(() => {
          if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
      }, 100); // Slight delay to ensure render
      return () => clearTimeout(timeout);
  }, [chat.id]);

  const closeChatMutation = useMutation({
      mutationFn: () => base44.functions.invoke('supportService', { endpoint: 'close_chat', chat_id: chat.id }),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['support-chats'] });
          if(onClose) onClose();
      }
  });

  // Group messages by sender to show continuous bubbles
  const sortedMessages = [...messages].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  return (
    <div className="flex flex-col h-full bg-[#1a2332] rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-[#0f1419] border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isUser ? 'bg-blue-600' : 'bg-gray-700'
            }`}>
                {isUser ? <Shield className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
            </div>
            <div>
                <h3 className="text-white font-semibold">
                    {isUser ? 'Support Agent' : chat.user_name || 'User'}
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    {chat.status === 'active' ? (
                        <span className="flex items-center gap-1 text-green-400">● Online</span>
                    ) : chat.status === 'waiting' ? (
                        <span className="flex items-center gap-1 text-yellow-400">● Waiting for agent</span>
                    ) : (
                        <span className="flex items-center gap-1 text-gray-400">● Closed</span>
                    )}
                    {chat.subject && ` • ${chat.subject}`}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            {chat.status !== 'closed' && (
                <Button variant="ghost" size="sm" onClick={() => closeChatMutation.mutate()} title="End Chat">
                    <LogOut className="w-4 h-4 text-gray-400 hover:text-red-400" />
                </Button>
            )}
            {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-5 h-5 text-gray-400" />
                </Button>
            )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {sortedMessages.map((msg, idx) => {
            const isMe = (isUser && msg.sender_role === 'user') || (!isUser && msg.sender_role === 'admin');
            const isSystem = msg.sender_role === 'system';
            
            if (isSystem) {
                return (
                    <div key={idx} className="flex justify-center my-4">
                        <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full border border-gray-700">
                            {msg.content}
                        </span>
                    </div>
                );
            }

            return (
                <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                        isMe 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-[#0f1419] border border-gray-700 text-gray-200 rounded-bl-none'
                    }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                            {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && msg.read && <CheckCheck className="w-3 h-3" />}
                        </div>
                    </div>
                </div>
            );
        })}
        {chat.status === 'closed' && (
             <div className="text-center py-4 text-gray-500 text-sm">
                 This conversation has ended.
             </div>
        )}
      </div>

      {/* Input Area */}
      {chat.status !== 'closed' ? (
          <form onSubmit={handleSend} className="p-4 bg-[#0f1419] border-t border-gray-700 flex gap-2">
            <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Paperclip className="w-5 h-5" />
            </Button>
            <Input 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-[#1a2332] border-gray-700 text-white"
            />
            <Button 
                type="submit" 
                disabled={sendMessageMutation.isPending || !newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
            >
                <Send className="w-4 h-4" />
            </Button>
          </form>
      ) : (
          <div className="p-4 bg-[#0f1419] border-t border-gray-700 text-center">
              <p className="text-gray-400 text-sm">Chat is closed.</p>
          </div>
      )}
    </div>
  );
}