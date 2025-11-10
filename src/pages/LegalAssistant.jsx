import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Scale, Sparkles, BookOpen, FileText, MessageSquare, 
  Users, AlertTriangle, CheckCircle, ExternalLink, Home
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import LegalChatbot from "../components/legal/LegalChatbot.jsx";

export default function LegalAssistant() {
  const [user, setUser] = useState(null);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.filter({ property_owner: user?.email }),
    enabled: !!user,
    initialData: [],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['title-alerts'],
    queryFn: () => base44.entities.TitleAlert.filter({ property_owner: user?.email, status: 'new' }),
    enabled: !!user,
    initialData: [],
  });

  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations'],
    queryFn: () => base44.entities.AttorneyConsultation.list('-requested_date'),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Scale className="w-8 h-8 text-purple-400" />
          Lex - AI Legal Assistant
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Your 24/7 virtual legal assistant for NYC property law and title fraud
        </p>
      </div>

      {/* Context Cards */}
      {(criticalAlerts > 0 || properties.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {criticalAlerts > 0 && (
            <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-400 animate-pulse" />
                  <div>
                    <p className="text-red-400 font-bold">{criticalAlerts} Critical Alert{criticalAlerts > 1 ? 's' : ''}</p>
                    <p className="text-xs text-gray-400">Ask Lex for guidance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Home className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-400 font-bold">{properties.length} Properties</p>
                  <p className="text-xs text-gray-400">Being monitored</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-purple-400 font-bold">{consultations.length} Consultations</p>
                  <p className="text-xs text-gray-400">Requested</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2">
          <LegalChatbot user={user} properties={properties} alerts={alerts} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Capabilities */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">What Lex Can Do</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">Answer Legal Questions</p>
                  <p className="text-xs text-gray-400">NYC property law, title fraud, ownership rights</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">Explain Legal Terms</p>
                  <p className="text-xs text-gray-400">Simplify jargon and complex concepts</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">Guide Documents</p>
                  <p className="text-xs text-gray-400">Step-by-step help with dispute notices</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">Assess Cases</p>
                  <p className="text-xs text-gray-400">Preliminary evaluation of your situation</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-semibold text-sm">Escalate to Attorneys</p>
                  <p className="text-xs text-gray-400">Connect with licensed NYC attorneys</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Knowledge Base */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Legal Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <a 
                href="https://www.nyc.gov/site/finance/index.page" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-cyan-500/10 rounded hover:bg-cyan-500/20 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-300">NYC Department of Finance</span>
              </a>

              <a 
                href="https://a836-acris.nyc.gov/DS/DocumentSearch/Index" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-cyan-500/10 rounded hover:bg-cyan-500/20 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-300">NYC ACRIS System</span>
              </a>

              <a 
                href="https://www.nycbar.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 bg-purple-500/10 rounded hover:bg-purple-500/20 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">NYC Bar Association</span>
              </a>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to={createPageUrl("LegalSupport")}>
                <Button 
                  variant="outline" 
                  className="w-full border-purple-500/20 text-purple-400 hover:bg-purple-500/10"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  Legal Support
                </Button>
              </Link>

              <Link to={createPageUrl("Collaboration")}>
                <Button 
                  variant="outline" 
                  className="w-full border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Collaboration
                </Button>
              </Link>

              <Link to={createPageUrl("ViewAlerts")}>
                <Button 
                  variant="outline" 
                  className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View Alerts ({alerts.length})
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-300 font-semibold text-sm mb-1">Legal Disclaimer</p>
                  <p className="text-xs text-gray-400">
                    Lex is an AI assistant providing general information only. 
                    This is not legal advice. For specific legal guidance, consult with a licensed NYC attorney.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-white font-bold mb-2">NYC Law Expert</h3>
            <p className="text-sm text-gray-400">
              Specialized knowledge of NYC property law, ACRIS system, and title fraud prevention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-white font-bold mb-2">Document Assistant</h3>
            <p className="text-sm text-gray-400">
              Step-by-step guidance for dispute notices, affidavits, and legal forms
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-white font-bold mb-2">Smart Escalation</h3>
            <p className="text-sm text-gray-400">
              Automatically recognizes complex cases and connects you with licensed attorneys
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}