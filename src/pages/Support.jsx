import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, History } from "lucide-react";
import IntakeForm from "@/components/support/IntakeForm";
import SupportChatWindow from "@/components/support/SupportChatWindow";
import { Badge } from "@/components/ui/badge";

export default function Support() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("list"); // list, intake, chat
  const [selectedChat, setSelectedChat] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then((u) => {
        if (u?.role === 'admin' || u?.is_admin) {
            // Redirect admins to the Admin Support Dashboard
            window.location.href = '/admin-support'; 
            return;
        }
        setUser(u);
    });
  }, []);

  // Fetch User Chats
  const { data: chats = [] } = useQuery({
    queryKey: ['my-support-chats'],
    queryFn: () => base44.entities.SupportChat.filter({ user_id: user?.email }, '-last_message_at', 20),
    enabled: !!user,
    refetchInterval: 5000
  });

  const startChatMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('supportService', { 
        endpoint: 'start_chat', 
        subject: data.subject,
        initial_messages: data.initial_messages
    }),
    onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ['my-support-chats'] });
        setSelectedChat(res.data.chat);
        setView("chat");
    }
  });

  if (!user) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0f1419] p-4 lg:p-6 text-white max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <MessageSquare className="w-8 h-8 text-blue-500" />
                    Support Center
                </h1>
                <p className="text-gray-400 mt-1">Chat with our team for quick help</p>
            </div>
            {view === "list" && (
                <Button 
                    onClick={() => setView("intake")}
                    className="bg-blue-600 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4 mr-2" /> New Chat
                </Button>
            )}
            {view !== "list" && (
                 <Button variant="outline" onClick={() => { setView("list"); setSelectedChat(null); }}>
                    Back to History
                 </Button>
            )}
        </div>

        {view === "intake" && (
            <IntakeForm onSubmit={(data) => startChatMutation.mutate(data)} />
        )}

        {view === "chat" && selectedChat && (
            <div className="h-[600px]">
                <SupportChatWindow 
                    chat={selectedChat} 
                    isUser={true}
                    onClose={() => { setView("list"); setSelectedChat(null); }}
                />
            </div>
        )}

        {view === "list" && (
            <div className="grid gap-4">
                {chats.length > 0 ? chats.map(chat => (
                    <div 
                        key={chat.id}
                        onClick={() => { setSelectedChat(chat); setView("chat"); }}
                        className="bg-[#1a2332] p-4 rounded-lg border border-gray-700 hover:border-blue-500/50 cursor-pointer transition-all flex justify-between items-center group"
                    >
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                                    {chat.subject}
                                </h3>
                                <Badge className={`
                                    ${chat.status === 'active' ? 'bg-green-500/20 text-green-400' : 
                                      chat.status === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' : 
                                      'bg-gray-500/20 text-gray-400'}
                                `}>
                                    {chat.status}
                                </Badge>
                                {chat.unread_count_user > 0 && (
                                    <Badge className="bg-red-500 text-white">
                                        {chat.unread_count_user} new
                                    </Badge>
                                )}
                            </div>
                            <p className="text-gray-400 text-sm line-clamp-1">{chat.last_message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                {new Date(chat.last_message_at).toLocaleString()}
                            </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost">Open</Button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-16 bg-[#1a2332] rounded-lg border border-gray-700">
                        <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white">No support history</h3>
                        <p className="text-gray-400 mt-2 mb-6">You haven't started any support chats yet.</p>
                        <Button onClick={() => setView("intake")} className="bg-blue-600 hover:bg-blue-700">
                            Start a New Chat
                        </Button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}