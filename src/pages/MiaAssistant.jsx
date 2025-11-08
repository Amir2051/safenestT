
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";

export default function MiaAssistant() {
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => base44.entities.Conversation.list('-updated_date'),
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (conversations.length > 0 && !conversation) {
      const latest = conversations[0];
      setConversation(latest);
      setMessages(latest.messages || []);
    }
  }, [conversations, conversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createConversationMutation = useMutation({
    mutationFn: () => base44.entities.Conversation.create({
      title: "Chat with Mia",
      messages: [],
      last_message_at: new Date().toISOString()
    }),
    onSuccess: (newConv) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setConversation(newConv);
      setMessages([]);
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conversation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageText = input.trim();
    const userMessage = {
      role: "user",
      content: userMessageText,
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Fetch context data
      const alertsData = await queryClient.fetchQuery({
        queryKey: ['alerts'],
        queryFn: () => base44.entities.Alert.filter({ status: 'active' }, '-created_date', 10),
      });

      const passwordsData = await queryClient.fetchQuery({
        queryKey: ['passwords'],
        queryFn: () => base44.entities.Password.list('-created_date', 50),
      });

      const alerts = alertsData || [];
      const passwords = passwordsData || [];

      // Get user's first name for personalization
      const userName = user?.full_name?.split(' ')[0] || 'there';

      // Build context-rich prompt with personalization
      const contextPrompt = `You are Mia, SafeNest's friendly and knowledgeable AI security assistant.

IMPORTANT: The user's name is ${userName}. Address them by name naturally throughout the conversation (e.g., "Hey ${userName}!", "Hi ${userName}", "${userName}, here's what I found"). Make the conversation feel personal and warm.

Current User Security Profile:
• Name: ${user?.full_name || 'User'}
• Security Score: ${user?.risk_score || 85}/100
• Total Active Alerts: ${alerts.length}
• Critical Alerts: ${alerts.filter(a => a.severity === 'critical').length}
• High Priority Alerts: ${alerts.filter(a => a.severity === 'high').length}
• Saved Passwords: ${passwords.length}
• Weak Passwords: ${passwords.filter(p => p.password_strength === 'weak' || p.password_strength === 'medium').length}
• VPN Status: ${user?.vpn_enabled ? '✅ Enabled' : '❌ Disabled'}
• 2FA Status: ${user?.two_factor_enabled ? '✅ Enabled' : '❌ Disabled'}
• Subscription: ${user?.subscription_plan === 'elite' ? '✨ Elite' : user?.subscription_plan === 'basic' ? '💎 Basic' : '🆓 Free'}
• Current Streak: ${user?.current_streak || 0} days
• Level: ${user?.level || 1}

${userName}'s Question: "${userMessageText}"

Please respond in a friendly, encouraging, and helpful manner. ALWAYS use ${userName}'s name in your response. Be conversational and supportive. Reference their specific security data when relevant. Use emojis sparingly (🛡️, ✅, 💡, 🚀). Always end with actionable advice or next steps. Make it feel like you know them personally.`;

      // Get AI response
      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt: contextPrompt,
      });

      const assistantMessage = {
        role: "assistant",
        content: aiResponse || "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save to database
      if (conversation) {
        await updateConversationMutation.mutateAsync({
          id: conversation.id,
          data: {
            messages: updatedMessages,
            last_message_at: new Date().toISOString()
          }
        });
      } else {
        const newConv = await createConversationMutation.mutateAsync();
        await updateConversationMutation.mutateAsync({
          id: newConv.id,
          data: {
            messages: updatedMessages,
            last_message_at: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try rephrasing your question or contact support if the issue persists.",
        timestamp: new Date().toISOString()
      };
      setMessages([...newMessages, errorMessage]);
      toast.error('Failed to get response from Mia');
    }

    setIsLoading(false);
    inputRef.current?.focus();
  };

  const startNewChat = () => {
    createConversationMutation.mutate();
    toast.success('Started new conversation');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f1419]">
      {/* Header */}
      <div className="border-b border-[#1a2332] p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-[#0f1419]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Mia AI Assistant</h1>
              <p className="text-sm text-gray-400">
                Your personal security advisor • Chatting with {user?.full_name?.split(' ')[0] || 'you'}
              </p>
            </div>
          </div>
          <Button
            onClick={startNewChat}
            variant="outline"
            className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bot className="w-12 h-12 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Hi {user?.full_name?.split(' ')[0] || 'there'}! I'm Mia 👋
              </h2>
              <p className="text-gray-400 mb-6">Your AI-powered security assistant. How can I help you today?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {[
                  "How can I improve my security score?",
                  "What are my critical alerts?",
                  "Check my password strength",
                  "Tips for staying safe online"
                ].map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(suggestion)}
                    className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border border-cyan-500/20 rounded-xl p-4 text-left hover:border-cyan-500/40 transition-all group"
                  >
                    <p className="text-sm text-gray-300 group-hover:text-cyan-400 transition-colors">
                      {suggestion}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' 
                        : 'bg-[#1a2332] border border-cyan-500/20 text-gray-100'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <ReactMarkdown 
                          className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                          components={{
                            p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                            ul: ({ children }) => <ul className="my-2 ml-4 list-disc">{children}</ul>,
                            ol: ({ children }) => <ol className="my-2 ml-4 list-decimal">{children}</ol>,
                            li: ({ children }) => <li className="my-0.5">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                            code: ({ children }) => <code className="px-1 py-0.5 rounded bg-gray-700 text-cyan-400 text-xs">{children}</code>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 px-2">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {user.full_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-[#1a2332] border border-cyan-500/20 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#1a2332] p-6 bg-[#0f1419]">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Mia anything about your security..."
              className="flex-1 bg-[#1a2332] border-cyan-500/20 text-white placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Mia is powered by AI and has access to your security data to provide personalized advice
          </p>
        </div>
      </div>
    </div>
  );
}
