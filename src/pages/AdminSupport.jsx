import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    MessageSquare, User, Clock, CheckCircle2, AlertCircle, 
    Search, Wifi, WifiOff, LogOut, ArrowRight 
} from "lucide-react";
import SupportChatWindow from "@/components/support/SupportChatWindow";

export default function AdminSupport() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [status, setStatus] = useState("all"); // all, waiting, active, closed
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Admin Status
  const { data: adminStatus } = useQuery({
    queryKey: ['admin-status'],
    queryFn: () => base44.entities.AdminStatus.filter({ admin_id: user?.email }, '-last_active', 1),
    enabled: !!user
  });
  
  const isOnline = adminStatus?.[0]?.is_online || false;

  const toggleStatusMutation = useMutation({
    mutationFn: async () => {
        return base44.functions.invoke('supportService', { 
            endpoint: 'set_admin_status', 
            is_online: !isOnline 
        });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin-status'] });
    }
  });

  // Fetch Chats
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['support-chats', status],
    queryFn: async () => {
        const filters = {};
        if (status !== 'all') filters.status = status;
        // In real app might want pagination
        return base44.entities.SupportChat.filter(filters, '-last_message_at', 50);
    },
    refetchInterval: 5000
  });

  const assignChatMutation = useMutation({
    mutationFn: (chatId) => base44.functions.invoke('supportService', { endpoint: 'assign_chat', chat_id: chatId }),
    onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ['support-chats'] });
        if (data.chat) setSelectedChat(data.chat);
    }
  });

  if (!user || (user.role !== 'admin' && !user.is_admin)) {
      return <div className="p-8 text-white">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-[#0f1419] p-4 lg:p-6 text-white flex flex-col h-screen">
        <div className="flex items-center justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-blue-500" />
                    Support Command Center
                </h1>
                <p className="text-gray-400 text-sm">Manage user support requests in real-time</p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-[#1a2332] px-3 py-1.5 rounded-lg border border-gray-700">
                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                    <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 ml-1"
                        onClick={() => toggleStatusMutation.mutate()}
                    >
                        {isOnline ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4 text-gray-400" />}
                    </Button>
                </div>
            </div>
        </div>

        <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Chat List */}
            <div className="w-full lg:w-1/3 flex flex-col bg-[#1a2332] rounded-lg border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {['all', 'waiting', 'active', 'closed'].map(s => (
                            <Button
                                key={s}
                                variant={status === s ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatus(s)}
                                className={`capitalize ${status === s ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}`}
                            >
                                {s}
                            </Button>
                        ))}
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {chats.map(chat => (
                        <div 
                            key={chat.id}
                            onClick={() => {
                                if (chat.status === 'waiting' && !chat.assigned_admin_id) {
                                    assignChatMutation.mutate(chat.id);
                                } else {
                                    setSelectedChat(chat);
                                }
                            }}
                            className={`p-3 rounded-lg cursor-pointer border transition-all ${
                                selectedChat?.id === chat.id 
                                ? 'bg-blue-600/20 border-blue-500/50' 
                                : 'bg-[#0f1419] border-gray-700 hover:border-gray-500'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-sm truncate">{chat.user_name}</h4>
                                <span className="text-xs text-gray-400">
                                    {new Date(chat.last_message_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                            <p className="text-xs text-blue-300 font-medium truncate mb-1">{chat.subject}</p>
                            <p className="text-xs text-gray-400 truncate">{chat.last_message}</p>
                            
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className={`text-[10px] px-1.5 py-0 ${
                                    chat.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
                                    chat.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                    {chat.status}
                                </Badge>
                                {chat.unread_count_admin > 0 && (
                                    <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0">
                                        {chat.unread_count_admin} new
                                    </Badge>
                                )}
                            </div>
                        </div>
                    ))}
                    {chats.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No chats found
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-[#1a2332] rounded-lg border border-gray-700 overflow-hidden">
                {selectedChat ? (
                    <SupportChatWindow 
                        chat={selectedChat} 
                        isUser={false}
                        onClose={() => setSelectedChat(null)} 
                    />
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                        <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                        <p>Select a chat to start responding</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}