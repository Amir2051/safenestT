import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Send, Bot, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageBubble from "@/components/shared/AdvisorMessageBubble";

const DAILY_PROMPTS = [
  "What are my biggest privacy risks right now?",
  "Do I have any critical breaches I should act on today?",
  "What's the most important privacy step I can take this week?",
  "Explain what data was exposed in my breaches",
  "How do I protect myself after a password breach?",
];

export default function PrivacyAdvisor() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: "privacy_advisor",
        metadata: { name: "Daily Privacy Check-In" },
      });
      setConversation(conv);
      setMessages(conv.messages || []);

      // Auto-send a daily briefing greeting
      if (!conv.messages?.length) {
        await sendMessage(conv, "Give me my personalized daily privacy briefing based on my breach monitor data.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (conv, text) => {
    const activeConv = conv || conversation;
    if (!activeConv || !text.trim()) return;
    setSending(true);
    try {
      const updated = await base44.agents.addMessage(activeConv, { role: "user", content: text });
      setMessages(updated.messages || []);

      // Subscribe to streaming
      const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
        setMessages(data.messages || []);
      });
      setTimeout(() => unsub(), 30000);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    sendMessage(null, text);
  };

  const handlePrompt = (prompt) => {
    setInput(prompt);
  };

  const handleNewSession = async () => {
    setLoading(true);
    setMessages([]);
    setConversation(null);
    await initConversation();
  };

  return (
    <div className="min-h-screen flex flex-col p-4 lg:p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Privacy Advisor
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            </h1>
            <p className="text-gray-500 text-xs">Daily breach analysis & actionable privacy advice</p>
          </div>
        </div>
        <Button onClick={handleNewSession} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
          <RefreshCw className="w-4 h-4 mr-1" /> New Session
        </Button>
      </div>

      {/* Quick Prompts */}
      {!loading && messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {DAILY_PROMPTS.map(p => (
            <button key={p} onClick={() => handlePrompt(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 hover:bg-cyan-500/15 transition-colors">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-[400px]">
        {loading && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
            <div className="w-6 h-6 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-cyan-400 text-sm">Analyzing your breach data...</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Ask about your breaches or privacy risks..."
          className="bg-gray-900 border-gray-700 text-white placeholder-gray-500"
          disabled={sending || loading}
        />
        <Button onClick={handleSend} disabled={sending || loading || !input.trim()}
          className="bg-cyan-600 hover:bg-cyan-700 text-white flex-shrink-0">
          {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}