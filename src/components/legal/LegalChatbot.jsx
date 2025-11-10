import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Send, Scale, Sparkles, User, 
  Bot, FileText, AlertTriangle, CheckCircle, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

const QUICK_QUESTIONS = [
  "What is title fraud and how does it happen?",
  "How do I file a dispute notice in NYC?",
  "What should I do if I receive a suspicious filing alert?",
  "Explain what a deed is in simple terms",
  "How does Title Lock protect my property?",
  "What are my rights as a NYC property owner?"
];

export default function LegalChatbot({ user, properties = [], alerts = [] }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Create or load conversation
    const initConversation = async () => {
      try {
        const existingConvos = await base44.agents.listConversations({
          agent_name: 'legal_assistant'
        });

        if (existingConvos.length > 0) {
          const convo = await base44.agents.getConversation(existingConvos[0].id);
          setConversation(convo);
          setMessages(convo.messages || []);
        } else {
          const newConvo = await base44.agents.createConversation({
            agent_name: 'legal_assistant',
            metadata: {
              name: 'Legal Support Chat',
              description: 'NYC Property Law & Title Fraud Assistance'
            }
          });
          setConversation(newConvo);
          setMessages([]);
        }
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      }
    };

    if (user) {
      initConversation();
    }
  }, [user]);

  useEffect(() => {
    if (!conversation) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !conversation) return;

    setIsLoading(true);
    setInputMessage('');

    try {
      // Add context about user's properties and alerts
      let contextInfo = '';
      if (properties.length > 0) {
        contextInfo += `\n\n[User Context - Properties: ${properties.length} property(ies) monitored`;
        if (alerts.length > 0) {
          contextInfo += `, ${alerts.length} active alert(s)`;
        }
        contextInfo += ']';
      }

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageText + contextInfo
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question) => {
    handleSendMessage(question);
  };

  if (!user || !conversation) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20 flex flex-col h-[700px]">
      <CardHeader className="border-b border-purple-500/10">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold">Lex - AI Legal Assistant</h3>
              <p className="text-xs text-purple-300">NYC Property Law Specialist</p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Quick Questions */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-purple-500/10">
          <p className="text-sm text-gray-400 mb-3">Quick questions to get started:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {QUICK_QUESTIONS.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickQuestion(question)}
                className="text-left p-3 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/20 hover:border-purple-500/40 transition-all text-sm text-purple-300"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Scale className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">👋 Hi, I'm Lex!</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
              I'm your AI legal assistant specializing in NYC property law and title fraud. 
              I can answer questions, explain legal terms, guide you through documents, and help assess your case.
            </p>
            <div className="flex gap-3 justify-center">
              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                🏛️ NYC Law Expert
              </Badge>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                📄 Document Guide
              </Badge>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                🤖 24/7 Available
              </Badge>
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            
            return (
              <div key={idx} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`rounded-2xl p-4 ${
                    isUser 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' 
                      : 'bg-[#0f1419] text-white border border-purple-500/20'
                  }`}>
                    {isUser ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <ReactMarkdown 
                        className="text-sm prose prose-sm prose-invert max-w-none"
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="text-purple-300">{children}</strong>,
                          h3: ({ children }) => <h3 className="font-bold text-lg mb-2 text-purple-300">{children}</h3>,
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                  
                  {/* Tool calls indicator */}
                  {msg.tool_calls && msg.tool_calls.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.tool_calls.map((tool, toolIdx) => (
                        <Badge key={toolIdx} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          {tool.name?.split('.').pop() || 'Action'}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            );
          })
        )}
        
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-[#0f1419] rounded-2xl p-4 border border-purple-500/20">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input Area */}
      <div className="p-4 border-t border-purple-500/10">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage(inputMessage)}
            placeholder="Ask a legal question..."
            disabled={isLoading}
            className="bg-[#0f1419] border-purple-500/20 text-white flex-1"
          />
          <Button
            onClick={() => handleSendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isLoading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2 text-center">
          ⚖️ AI Legal Assistant • Not a licensed attorney • For informational purposes only
        </p>
      </div>
    </Card>
  );
}