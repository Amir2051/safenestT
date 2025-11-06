import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, MessageCircle, ChevronRight } from 'lucide-react';
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MiaQuickChat({ user }) {
  const quickSuggestions = [
    "How can I improve my security score?",
    "What should I do about alerts?",
    "Check my passwords strength",
    "Tips for staying safe online"
  ];

  const getMessage = () => {
    const score = user?.risk_score || 85;
    if (score >= 90) return "Your security looks excellent! Want to learn more ways to stay protected?";
    if (score >= 70) return "You're doing well! I can help you reach an even higher security score.";
    return "I've noticed some security concerns. Let's work together to improve your protection!";
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-3xl" />
      
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <div className="relative">
            <Bot className="w-5 h-5 text-green-400" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
          Mia AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-4">
        {/* Mia's Message */}
        <div className="bg-[#0f1419] rounded-lg p-4 border border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-white mb-2">{getMessage()}</p>
              <Link to={createPageUrl('MiaAssistant')}>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Chat with Mia
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <p className="text-xs text-gray-400 mb-2 font-semibold">Quick Questions</p>
          <div className="space-y-2">
            {quickSuggestions.slice(0, 3).map((suggestion, idx) => (
              <Link key={idx} to={createPageUrl('MiaAssistant')}>
                <div className="bg-[#0f1419] rounded-lg p-2 border border-cyan-500/10 hover:border-cyan-500/30 transition-all cursor-pointer group">
                  <p className="text-xs text-gray-300 group-hover:text-cyan-400 transition-colors">
                    {suggestion}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}