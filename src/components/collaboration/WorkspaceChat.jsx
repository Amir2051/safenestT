
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Send, Paperclip, Image as ImageIcon, 
  FileText, Check, CheckCheck, Smile, Reply, User
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function WorkspaceChat({ workspace, currentUser }) {
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', workspace.id],
    queryFn: () => base44.entities.ChatMessage.filter({ workspace_id: workspace.id }, 'timestamp'),
    enabled: !!workspace.id,
    initialData: [],
    refetchInterval: 3000, // Poll every 3 seconds for real-time feel
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData) => {
      const msg = await base44.entities.ChatMessage.create({
        workspace_id: workspace.id,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        sender_role: workspace.owner_email === currentUser.email ? 'owner' : 'attorney',
        message_content: messageData.content,
        message_type: messageData.type || 'text',
        timestamp: new Date().toISOString(),
        reply_to: messageData.reply_to,
        attachments: messageData.attachments || []
      });

      // Update workspace last activity
      await base44.entities.CollaborationWorkspace.update(workspace.id, {
        last_activity: new Date().toISOString()
      });

      // Determine recipient
      const recipient = workspace.owner_email === currentUser.email 
        ? workspace.attorney_email 
        : workspace.owner_email;

      // TRIGGER WORKFLOW: Attorney sent message - notify user
      const isAttorney = workspace.attorney_email === currentUser.email;
      if (isAttorney) {
        try {
          await base44.functions.invoke('workflowAutomation', {
            trigger_type: 'attorney_message_sent',
            trigger_data: {
              workspace_id: workspace.id,
              entity_type: 'ChatMessage',
              entity_id: msg.id,
              attorney_email: currentUser.email
            }
          });
        } catch (error) {
          console.error('Failed to trigger notification workflow:', error);
        }
      } else {
        // Regular email notification for user messages
        if (recipient) {
          await base44.integrations.Core.SendEmail({
            to: recipient,
            subject: `💬 New Message in ${workspace.workspace_name}`,
            body: `${currentUser.full_name} sent you a message:\n\n"${messageData.content}"\n\nView and reply: [App URL]/collaboration/${workspace.id}\n\nSafeNest Legal Collaboration`
          });
        }
      }

      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', workspace.id] });
      setMessage('');
      setReplyTo(null);
      scrollToBottom();
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg || msg.sender_email === currentUser.email) return;

      const readBy = msg.read_by || [];
      if (!readBy.find(r => r.email === currentUser.email)) {
        await base44.entities.ChatMessage.update(messageId, {
          is_read: true,
          read_by: [...readBy, {
            email: currentUser.email,
            read_at: new Date().toISOString()
          }]
        });
      }
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    
    sendMessageMutation.mutate({
      content: message,
      type: 'text',
      reply_to: replyTo?.id
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const uploadResult = await base44.integrations.Core.UploadPrivateFile({ file });
      
      sendMessageMutation.mutate({
        content: `Shared file: ${file.name}`,
        type: 'file',
        attachments: [{
          file_name: file.name,
          file_url: uploadResult.file_uri,
          file_size: file.size,
          file_type: file.type
        }]
      });
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    // Mark visible messages as read
    messages.forEach(msg => {
      if (msg.sender_email !== currentUser.email && !msg.is_read) {
        markAsReadMutation.mutate(msg.id);
      }
    });
  }, [messages]);

  const isOwnMessage = (msg) => msg.sender_email === currentUser.email;

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 flex flex-col h-[600px]">
      <CardHeader className="border-b border-cyan-500/10">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-400" />
            Chat
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = isOwnMessage(msg);
            const replyToMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;

            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {/* Reply preview */}
                  {replyToMsg && (
                    <div className="text-xs text-gray-500 mb-1 p-2 bg-gray-700/30 rounded">
                      <Reply className="w-3 h-3 inline mr-1" />
                      Replying to: {replyToMsg.message_content.substring(0, 50)}...
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className={`rounded-2xl p-3 ${
                    isOwn 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' 
                      : 'bg-[#0f1419] text-white border border-cyan-500/10'
                  }`}>
                    {!isOwn && (
                      <p className="text-xs text-cyan-400 font-semibold mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {msg.sender_name}
                      </p>
                    )}
                    
                    <p className="text-sm break-words">{msg.message_content}</p>

                    {/* Attachments */}
                    {msg.attachments?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.attachments.map((att, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-white/10 rounded">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs">{att.file_name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                      <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                      {isOwn && (
                        <span>
                          {msg.read_by?.length > 1 ? (
                            <CheckCheck className="w-3 h-3 text-green-400" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isOwn && (
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 flex items-center gap-1"
                    >
                      <Reply className="w-3 h-3" />
                      Reply
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input area */}
      <div className="p-4 border-t border-cyan-500/10">
        {replyTo && (
          <div className="mb-2 p-2 bg-cyan-500/10 rounded flex items-center justify-between">
            <span className="text-xs text-cyan-400">
              Replying to: {replyTo.message_content.substring(0, 40)}...
            </span>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white">
              ×
            </button>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            type="file"
            id="chat-file"
            className="hidden"
            onChange={handleFileUpload}
          />
          <label htmlFor="chat-file">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
              asChild
            >
              <div>
                <Paperclip className="w-4 h-4" />
              </div>
            </Button>
          </label>

          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="bg-[#0f1419] border-cyan-500/20 text-white flex-1"
          />

          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
