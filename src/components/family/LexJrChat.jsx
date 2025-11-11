import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Sparkles, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function LexJrChat({ groupId, childEmail, childName, ageGroup }) {
  const [input, setInput] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['lexjr-conversations', groupId, childEmail],
    queryFn: async () => {
      const convs = await base44.entities.LexJrConversation.filter({
        group_id: groupId,
        child_email: childEmail
      }, '-last_message_at');
      return convs;
    },
    enabled: !!groupId && !!childEmail
  });

  const currentConversation = conversations.find(c => c.id === currentConversationId) || conversations[0];

  useEffect(() => {
    if (conversations.length > 0 && !currentConversationId) {
      setCurrentConversationId(conversations[0].id);
    }
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.LexJrConversation.create({
        group_id: groupId,
        child_email: childEmail,
        child_name: childName,
        conversation_title: 'New Chat with Lex Jr.',
        messages: [],
        age_group: ageGroup || '9-12',
        topics_discussed: [],
        safety_flags: [],
        parent_notifications_sent: [],
        parental_monitoring_enabled: true,
        last_message_at: new Date().toISOString()
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lexjr-conversations'] });
      setCurrentConversationId(data.id);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, conversationId }) => {
      const conversation = conversations.find(c => c.id === conversationId);
      
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        flagged: false
      };

      const updatedMessages = [...(conversation.messages || []), userMessage];
      
      await base44.entities.LexJrConversation.update(conversationId, {
        messages: updatedMessages,
        last_message_at: new Date().toISOString()
      });

      const context = `
You are chatting with ${childName}, who is in the ${ageGroup || '9-12'} age group.
Previous conversation context: ${updatedMessages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

Remember:
- Use age-appropriate language for ${ageGroup}
- Be encouraging and supportive
- If the question involves danger, immediately tell them to talk to a trusted adult
- Make cybersecurity fun and relatable
- Use emojis to keep it friendly
      `.trim();

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `${context}\n\nChild's question: ${message}\n\nYour response (as Lex Jr.):`,
        add_context_from_internet: false
      });

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        flagged: false
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      
      const safetyCheck = await checkForSafetyFlags(message, response);
      
      const updateData = {
        messages: finalMessages,
        last_message_at: new Date().toISOString()
      };

      if (safetyCheck.flagged) {
        updateData.safety_flags = [
          ...(conversation.safety_flags || []),
          {
            timestamp: new Date().toISOString(),
            flag_type: safetyCheck.flag_type,
            severity: safetyCheck.severity,
            content: message
          }
        ];
        
        if (safetyCheck.severity === 'high') {
          toast.warning('⚠️ This conversation has been flagged for parental review');
        }
      }

      await base44.entities.LexJrConversation.update(conversationId, updateData);
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lexjr-conversations'] });
      setInput('');
      setSending(false);
    },
    onError: (error) => {
      toast.error('Failed to send message');
      setSending(false);
    }
  });

  const checkForSafetyFlags = async (userMessage, aiResponse) => {
    const lowerMessage = userMessage.toLowerCase();
    
    const highRiskKeywords = ['meet', 'address', 'location', 'hurt', 'scared', 'bully', 'threatening'];
    const mediumRiskKeywords = ['password', 'credit card', 'personal info', 'stranger'];
    
    const hasHighRisk = highRiskKeywords.some(kw => lowerMessage.includes(kw));
    const hasMediumRisk = mediumRiskKeywords.some(kw => lowerMessage.includes(kw));
    
    if (hasHighRisk) {
      return { flagged: true, flag_type: 'safety_concern', severity: 'high' };
    } else if (hasMediumRisk) {
      return { flagged: true, flag_type: 'privacy_concern', severity: 'medium' };
    }
    
    return { flagged: false };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    setSending(true);

    if (!currentConversationId) {
      const newConv = await createConversationMutation.mutateAsync();
      sendMessageMutation.mutate({
        message: input,
        conversationId: newConv.id
      });
    } else {
      sendMessageMutation.mutate({
        message: input,
        conversationId: currentConversationId
      });
    }
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20 flex flex-col h-[600px]">
      <CardHeader className="border-b border-purple-500/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-400" />
            Lex Jr. - Safety Helper
          </CardTitle>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            Safe for Kids
          </Badge>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          Ask me anything about staying safe online! 🛡️
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {!currentConversation || currentConversation.messages?.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">
              Hey {childName}! 👋
            </h3>
            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              I'm Lex Jr., your friendly online safety helper! I can answer questions about:
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-purple-400 mb-1" />
                <p className="text-white text-sm font-semibold">Password Safety</p>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-cyan-400 mb-1" />
                <p className="text-white text-sm font-semibold">Online Gaming</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-green-400 mb-1" />
                <p className="text-white text-sm font-semibold">Social Media</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400 mb-1" />
                <p className="text-white text-sm font-semibold">Cyberbullying</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {currentConversation.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-[#0f1419] border border-purple-500/20 text-white'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown className="text-sm prose prose-invert max-w-none">
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                  
                  {msg.flagged && (
                    <Badge className="mt-2 bg-yellow-500/20 text-yellow-400 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Flagged for Review
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-[#0f1419] border border-purple-500/20 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            </div>
          </div>
        )}
      </CardContent>

      <div className="border-t border-purple-500/20 p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !sending && handleSend()}
            placeholder="Ask me anything about staying safe online..."
            className="bg-[#0f1419] border-purple-500/20 text-white"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          🔒 Parents can view this conversation • Always ask an adult if you're unsure
        </p>
      </div>
    </Card>
  );
}