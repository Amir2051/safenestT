import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Send, Paperclip, User, Shield, Clock, CheckCircle, Upload, X, Loader2, FileText
} from "lucide-react";
import { toast } from "sonner";

export default function SecureMessenger({ caseId, caseData, currentUser, isAdmin = false }) {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages with real-time updates
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['case-messages', caseId],
    queryFn: async () => {
      const caseObj = await base44.entities.MyCase.filter({ id: caseId });
      const notes = caseObj[0]?.case_notes || [];
      return notes
        .filter(n => n.type === 'message' || n.type === 'response')
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    },
    refetchInterval: 5000, // Poll every 5 seconds for new messages
    enabled: !!caseId
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ text, files }) => {
      const currentCase = await base44.entities.MyCase.filter({ id: caseId });
      const notes = currentCase[0]?.case_notes || [];
      
      const newMessage = {
        timestamp: new Date().toISOString(),
        author: isAdmin ? "investigator" : "client",
        author_email: currentUser?.email,
        author_name: currentUser?.full_name || "User",
        note: text,
        type: isAdmin ? "response" : "message",
        attachments: files || [],
        read: false
      };

      notes.push(newMessage);

      // Update case with new message
      const response = await base44.functions.invoke('caseManagement', {
        action: 'update',
        data: {
          id: caseId,
          entityName: 'MyCase',
          updates: {
            case_notes: notes,
            last_activity: new Date().toISOString()
          }
        }
      });

      if (response.data.error) throw new Error(response.data.error);

      // Log to timeline
      await base44.entities.CaseTimelineEvent.create({
        case_id: caseId,
        event_type: 'message_sent',
        event_title: isAdmin ? 'Investigator Response' : 'Client Message',
        event_description: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        severity: 'info',
        created_by_user: currentUser?.email,
        automated: false
      });

      // Send notification to recipient
      if (!isAdmin) {
        // Notify admin/investigator of new client message
        await base44.integrations.Core.SendEmail({
          to: caseData.assigned_to || 'forensic@safenestt.com',
          subject: `New Message: Case ${caseData.case_number}`,
          body: `Client has sent a new message on case ${caseData.case_number}.\n\nMessage: ${text}\n\nReply via the investigation portal.`
        });
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['case-messages', caseId]);
      setMessage("");
      setAttachments([]);
      toast.success("Message sent");
    },
    onError: (error) => {
      toast.error("Failed to send message: " + error.message);
    }
  });

  const handleFileAttach = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setAttachments(prev => [...prev, {
        name: file.name,
        url: response.file_url,
        type: file.type,
        size: file.size
      }]);
      toast.success("File attached");
    } catch (error) {
      toast.error("Failed to attach file");
    }
    setUploading(false);
  };

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) {
      toast.error("Please enter a message or attach a file");
      return;
    }

    sendMessageMutation.mutate({
      text: message,
      files: attachments
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20 mb-4 min-h-[400px] max-h-[500px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Shield className="w-12 h-12 text-gray-600 mb-3" />
            <p className="text-gray-400 font-medium">No messages yet</p>
            <p className="text-gray-500 text-sm mt-1">
              {isAdmin ? "Start a conversation with the client" : "Send a secure message to your investigator"}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isClient = msg.author === "client" || msg.type === "message";
              const isMyMessage = isAdmin ? !isClient : isClient;

              return (
                <div key={idx} className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isMyMessage ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {/* Author Info */}
                    <div className="flex items-center gap-2 px-2">
                      {isClient ? (
                        <User className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Shield className="w-3 h-3 text-purple-400" />
                      )}
                      <span className="text-xs text-gray-400">
                        {msg.author_name || (isClient ? "Client" : "Investigator")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`p-3 rounded-2xl ${
                        isMyMessage
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none'
                          : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.note}</p>

                      {/* Attachments */}
                      {msg.attachments?.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          {msg.attachments.map((file, i) => (
                            <a
                              key={i}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs hover:underline"
                            >
                              <FileText className="w-3 h-3" />
                              {file.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="px-2 text-[10px] text-gray-500">
                      {new Date(msg.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, idx) => (
            <Badge key={idx} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 pr-1">
              <FileText className="w-3 h-3 mr-1" />
              {file.name}
              <button
                onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                className="ml-2 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#0f1419] border border-cyan-500/20 rounded-lg p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a secure message..."
              className="bg-[#1a2332] border-gray-700 text-white resize-none"
              disabled={sendMessageMutation.isPending}
            />
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              End-to-end encrypted • Press Enter to send
            </p>
          </div>

          <input
            type="file"
            id="message-file"
            className="hidden"
            onChange={handleFileAttach}
            accept=".pdf,.docx,.jpg,.jpeg,.png"
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => document.getElementById('message-file').click()}
            disabled={uploading || sendMessageMutation.isPending}
            className="border-gray-700 shrink-0"
            title="Attach file"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Paperclip className="w-4 h-4 text-gray-400" />
            )}
          </Button>

          <Button
            onClick={handleSend}
            disabled={sendMessageMutation.isPending || (!message.trim() && attachments.length === 0)}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shrink-0"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Unread Indicator */}
      {messages.some(m => !m.read && m.author !== (isAdmin ? "investigator" : "client")) && (
        <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded text-center">
          <p className="text-xs text-cyan-400 flex items-center justify-center gap-2">
            <Clock className="w-3 h-3 animate-pulse" />
            New messages from {isAdmin ? "client" : "investigator"}
          </p>
        </div>
      )}
    </div>
  );
}