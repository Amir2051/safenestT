import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, Shield, Search, AlertTriangle, CheckCircle2, 
  Info, FileText, Ban, Flag, Settings
} from "lucide-react";
import { toast } from "sonner";
import PhoneAnalysisResult from "../components/phone/PhoneAnalysisResult";
import SpamBlockingControl from "../components/phone/SpamBlockingControl";
import ReportSpamDialog from "../components/phone/ReportSpamDialog";
import BlockListManager from "../components/phone/BlockListManager";
import CallScreeningPanel from "../components/phone/CallScreeningPanel";

export default function PhoneIntelligence() {
  const [user, setUser] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('lookup'); // lookup, screening, blocking, blocklist

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: recentAnalyses } = useQuery({
    queryKey: ['phone-intelligence-recent'],
    queryFn: async () => {
      const analyses = await base44.entities.PhoneIntelligence.list('-created_date', 10);
      return analyses || [];
    },
    enabled: !!user
  });

  const handleAnalyze = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Please enter a phone number');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await base44.functions.invoke('phoneIntelligenceOSINT', {
        action: 'analyze',
        phone_number: phoneNumber,
        country_code: 'US'
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Analysis failed');
      }

      setAnalysisResult(response.data);
      toast.success('Analysis complete');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze phone number');
    } finally {
      setAnalyzing(false);
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Phone className="w-8 h-8 text-cyan-400" />
          Phone Intelligence
          <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-none">
            FORENSIC-GRADE
          </Badge>
        </h1>
        <p className="text-gray-400">
          OSINT-based phone number analysis • Spam detection • Call blocking
        </p>
      </div>

      {/* Forensic Disclaimer */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-white font-semibold mb-1">Forensic-Grade OSINT Analysis</p>
              <p className="text-blue-300 text-xs leading-relaxed">
                All analysis is based on <strong>publicly available open-source intelligence (OSINT)</strong>.
                No private databases, breach data, or personal records are accessed. 
                Results are evidence-based and suitable for investigative or legal documentation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
        <Button
          variant={activeTab === 'lookup' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('lookup')}
          className={activeTab === 'lookup' ? 'bg-cyan-600' : ''}
        >
          <Search className="w-4 h-4 mr-2" />
          Number Lookup
        </Button>
        <Button
          variant={activeTab === 'screening' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('screening')}
          className={activeTab === 'screening' ? 'bg-cyan-600' : ''}
        >
          <Phone className="w-4 h-4 mr-2" />
          Call Screening
        </Button>
        <Button
          variant={activeTab === 'blocking' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('blocking')}
          className={activeTab === 'blocking' ? 'bg-cyan-600' : ''}
        >
          <Shield className="w-4 h-4 mr-2" />
          Protection Layers
        </Button>
        <Button
          variant={activeTab === 'blocklist' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('blocklist')}
          className={activeTab === 'blocklist' ? 'bg-cyan-600' : ''}
        >
          <Ban className="w-4 h-4 mr-2" />
          Block List
        </Button>
      </div>

      {/* Number Lookup Tab */}
      {activeTab === 'lookup' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <Input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="Enter phone number (e.g., +1 555-123-4567)"
                  className="bg-[#0f1419] border-cyan-500/30 text-white flex-1"
                  disabled={analyzing}
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || !phoneNumber.trim()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500"
                >
                  {analyzing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Result */}
          {analysisResult && (
            <PhoneAnalysisResult 
              analysis={analysisResult} 
              onReport={() => setShowReportDialog(true)}
            />
          )}

          {/* Recent Analyses */}
          {!analysisResult && recentAnalyses && recentAnalyses.length > 0 && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Recent Analyses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentAnalyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      onClick={() => setAnalysisResult(analysis)}
                      className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-white font-mono">{analysis.phone_number}</span>
                          <Badge className={
                            analysis.risk_classification === 'LEGITIMATE' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                            analysis.risk_classification === 'USE_CAUTION' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                            'bg-red-500/20 text-red-400 border-red-500/50'
                          }>
                            {analysis.risk_classification === 'HIGH_RISK' ? '🔴 High Risk' :
                             analysis.risk_classification === 'USE_CAUTION' ? '🟡 Use Caution' :
                             '🟢 Likely Legitimate'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(analysis.created_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Call Screening Tab */}
      {activeTab === 'screening' && (
        <CallScreeningPanel user={user} />
      )}

      {/* Spam Blocking Tab */}
      {activeTab === 'blocking' && (
        <SpamBlockingControl user={user} />
      )}

      {/* Block List Tab */}
      {activeTab === 'blocklist' && (
        <BlockListManager user={user} />
      )}

      {/* Report Spam Dialog */}
      {showReportDialog && analysisResult && (
        <ReportSpamDialog
          phoneNumber={analysisResult.phone_number}
          open={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          user={user}
        />
      )}
    </div>
  );
}