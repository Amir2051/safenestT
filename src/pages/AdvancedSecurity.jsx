
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield, AlertTriangle, Activity, FileText, BookOpen,
  History, Loader2, Eye, Lock, Zap, ExternalLink, Phone
} from "lucide-react";

import AdvancedThreatScanner from "../components/security/AdvancedThreatScanner.jsx";
import RealSpywareDetector from "../components/security/RealSpywareDetector.jsx";
import SecureCallInterface from "../components/security/SecureCallInterface.jsx";

export default function AdvancedSecurity() {
  const [user, setUser] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showCallInterface, setShowCallInterface] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: scanHistory = [], isLoading } = useQuery({
    queryKey: ['security-scans'],
    queryFn: async () => {
      const response = await base44.functions.invoke('spywareDefenseService', {
        endpoint: 'get-scan-history',
        limit: 10
      });
      return response.data.scans || [];
    },
    enabled: !!user
  });

  const { data: callHistory = [], isLoading: isLoadingCalls } = useQuery({
    queryKey: ['secure-calls'],
    queryFn: async () => {
      // Assuming 'SecureCall' is an entity type in base44 and has a list method
      const calls = await base44.entities.SecureCall.list({
        sort: '-created_date',
        limit: 10
      });
      return calls;
    },
    enabled: !!user
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const getThreatColor = (level) => {
    switch (level) {
      case 'secure': return 'text-green-400';
      case 'low': return 'text-blue-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-purple-400" />
            Advanced Security Defense
            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
              Anti-Spyware
            </Badge>
          </h1>
          <p className="text-gray-400 mt-1">
            Real spyware detection + End-to-end encrypted calls
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                🛡️ Real Protection Against Pegasus & Advanced Spyware
              </h3>
              <p className="text-purple-200 text-sm mb-2">
                <strong>REAL Detection:</strong> Uses actual browser APIs (Battery, Memory, Network, WebRTC, Canvas) to detect surveillance software.
                <br />
                <strong>SECURE Calls:</strong> WebRTC with DTLS-SRTP encryption - verified end-to-end security.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  ✓ Real Battery Analysis
                </Badge>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  ✓ Memory Monitoring
                </Badge>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  ✓ Network Interception Detection
                </Badge>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/50">
                  ✓ E2E Encrypted Calls
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="real-detector" className="w-full">
        <TabsList className="bg-[#1a2332] border border-cyan-500/20">
          <TabsTrigger value="real-detector">
            <Activity className="w-4 h-4 mr-2" />
            Real Detector
          </TabsTrigger>
          <TabsTrigger value="secure-calls">
            <Phone className="w-4 h-4 mr-2" />
            Secure Calls
          </TabsTrigger>
          <TabsTrigger value="scanner">
            <Zap className="w-4 h-4 mr-2" />
            Advanced Scanner
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="education">
            <BookOpen className="w-4 h-4 mr-2" />
            Education
          </TabsTrigger>
        </TabsList>

        {/* Real Detector Tab */}
        <TabsContent value="real-detector" className="mt-6">
          <RealSpywareDetector />
        </TabsContent>

        {/* Secure Calls Tab */}
        <TabsContent value="secure-calls" className="mt-6 space-y-6">
          {!showCallInterface ? (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-cyan-400" />
                  End-to-End Encrypted Calls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-green-400 mt-0.5" />
                    <div>
                      <p className="text-green-300 font-semibold text-sm mb-1">
                        Military-Grade Encryption
                      </p>
                      <p className="text-green-200 text-xs">
                        All calls use WebRTC with DTLS-SRTP encryption. Voice and video data is encrypted
                        end-to-end - even SafeNest cannot decrypt your conversations.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="recipient-email" className="text-white">Recipient Email</Label>
                  <Input
                    id="recipient-email"
                    type="email"
                    placeholder="friend@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="mt-2 bg-[#0f1419] border-cyan-500/20 text-white"
                  />
                </div>

                <Button
                  onClick={() => setShowCallInterface(true)}
                  disabled={!recipientEmail}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 h-14 text-lg"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Start Encrypted Call
                </Button>

                {/* Recent Calls */}
                <div className="mt-6">
                  <h4 className="text-white font-semibold mb-3">Recent Secure Calls</h4>
                  {isLoadingCalls ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                    </div>
                  ) : callHistory.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No calls yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {callHistory.slice(0, 5).map((call) => (
                        <div
                          key={call.id}
                          className="p-3 bg-[#0f1419] rounded border border-cyan-500/10"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white text-sm font-semibold">
                                {call.caller_email === user.email ? call.callee_email : call.caller_email}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(call.created_date).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge className={`${
                                call.security_verification?.end_to_end_encrypted
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {call.security_verification?.end_to_end_encrypted ? '🔐 Encrypted' : 'Unknown'}
                              </Badge>
                              <p className="text-xs text-gray-400 mt-1">
                                {call.duration_seconds ? `${Math.round(call.duration_seconds)}s` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <SecureCallInterface
                recipientEmail={recipientEmail}
                onCallEnd={() => setShowCallInterface(false)}
              />
              <Button
                onClick={() => setShowCallInterface(false)}
                variant="outline"
                className="w-full border-cyan-500/20"
              >
                Back to Call List
              </Button>
            </>
          )}
        </TabsContent>

        {/* Advanced Scanner Tab */}
        <TabsContent value="scanner" className="mt-6">
          <AdvancedThreatScanner />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <History className="w-5 h-5 text-cyan-400" />
                Recent Security Scans
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                </div>
              ) : scanHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-white font-semibold mb-2">No scans yet</p>
                  <p className="text-gray-400 text-sm">
                    Run your first security scan to detect threats
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scanHistory.map((scan) => (
                    <div
                      key={scan.id}
                      className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            scan.threat_level === 'secure' ? 'bg-green-500/20' :
                            scan.threat_level === 'critical' ? 'bg-red-500/20' :
                            'bg-yellow-500/20'
                          }`}>
                            {scan.threat_level === 'secure' ? (
                              <Shield className="w-5 h-5 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-orange-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-semibold">
                              {scan.scan_type.replace('_', ' ').toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(scan.created_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${getThreatColor(scan.threat_level)}`}>
                          {scan.threat_level}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="p-2 bg-[#1a2332] rounded">
                          <p className="text-gray-400">Anomalies</p>
                          <p className="text-white font-semibold">
                            {scan.anomalies_detected?.length || 0}
                          </p>
                        </div>
                        <div className="p-2 bg-[#1a2332] rounded">
                          <p className="text-gray-400">Duration</p>
                          <p className="text-white font-semibold">
                            {scan.duration_seconds?.toFixed(1)}s
                          </p>
                        </div>
                        <div className="p-2 bg-[#1a2332] rounded">
                          <p className="text-gray-400">Report</p>
                          <p className="text-white font-semibold">
                            {scan.forensic_report_uri ? '✓' : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="mt-6 space-y-6">
          {/* Existing education content */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Understanding Advanced Spyware Threats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pegasus Overview */}
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <h3 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Pegasus & Advanced Spyware
                </h3>
                <p className="text-red-200 text-sm mb-3">
                  Pegasus is nation-state spyware developed by NSO Group. It can:
                </p>
                <ul className="text-red-200 text-sm space-y-1 ml-4">
                  <li>• Extract messages, emails, and call logs</li>
                  <li>• Record audio and video using device cameras/mics</li>
                  <li>• Track GPS location in real-time</li>
                  <li>• Access encrypted messaging apps (WhatsApp, Signal, etc.)</li>
                  <li>• Operate silently without user knowledge</li>
                </ul>
              </div>

              {/* How SafeNest Protects */}
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  How SafeNest Protects You
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-green-300 font-semibold">1. Battery Drain Detection</p>
                    <p className="text-green-200 text-xs">
                      Spyware constantly records and transmits data, causing unusual battery consumption.
                      SafeNest monitors drain patterns.
                    </p>
                  </div>
                  <div>
                    <p className="text-green-300 font-semibold">2. Network Activity Analysis</p>
                    <p className="text-green-200 text-xs">
                      Detects suspicious data exfiltration and connections to command & control servers.
                    </p>
                  </div>
                  <div>
                    <p className="text-green-300 font-semibold">3. System Integrity Checks</p>
                    <p className="text-green-200 text-xs">
                      Validates that system files haven't been tampered with or modified.
                    </p>
                  </div>
                  <div>
                    <p className="text-green-300 font-semibold">4. Encrypted Forensic Reports</p>
                    <p className="text-green-200 text-xs">
                      Generate professional diagnostic reports for expert analysis (AES-256 encrypted).
                    </p>
                  </div>
                </div>
              </div>

              {/* What To Do If Infected */}
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  If You Suspect Infection
                </h3>
                <ol className="text-orange-200 text-sm space-y-2 ml-4">
                  <li><strong>1. Isolate Device:</strong> Enable airplane mode immediately</li>
                  <li><strong>2. Don't Factory Reset Yet:</strong> This destroys forensic evidence</li>
                  <li><strong>3. Run SafeNest Deep Scan:</strong> Generate forensic report</li>
                  <li><strong>4. Use MVT (Mobile Verification Toolkit):</strong> Open-source forensic tool</li>
                  <li><strong>5. Contact Experts:</strong> Certified mobile forensic analysts</li>
                  <li><strong>6. Document Everything:</strong> Screenshots, timestamps, suspicious behavior</li>
                  <li><strong>7. Get New Device:</strong> Consider a fresh, secure device</li>
                </ol>
              </div>

              {/* External Resources */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-purple-400 font-bold mb-3">
                  🔗 External Resources
                </h3>
                <div className="space-y-2">
                  <a
                    href="https://github.com/mvt-project/mvt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-[#0f1419] rounded hover:bg-[#1a2332] transition-all"
                  >
                    <span className="text-cyan-400 text-sm">MVT - Mobile Verification Toolkit</span>
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                  </a>
                  <a
                    href="https://citizenlab.ca/category/research/targeted-threats/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-[#0f1419] rounded hover:bg-[#1a2332] transition-all"
                  >
                    <span className="text-cyan-400 text-sm">Citizen Lab Research</span>
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                  </a>
                  <a
                    href="https://www.amnesty.org/en/latest/research/2021/07/forensic-methodology-report-how-to-catch-nso-groups-pegasus/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-2 bg-[#0f1419] rounded hover:bg-[#1a2332] transition-all"
                  >
                    <span className="text-cyan-400 text-sm">Amnesty International - Pegasus Detection</span>
                    <ExternalLink className="w-4 h-4 text-cyan-400" />
                  </a>
                </div>
              </div>

              {/* Who Should Use This */}
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <h3 className="text-yellow-400 font-bold mb-2">
                  ⚠️ High-Risk Individuals
                </h3>
                <p className="text-yellow-200 text-sm mb-2">
                  Advanced spyware typically targets:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Badge className="bg-yellow-500/20 text-yellow-300 justify-start">
                    👨‍💼 Journalists
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-300 justify-start">
                    ⚖️ Human Rights Activists
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-300 justify-start">
                    🗳️ Political Dissidents
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-300 justify-start">
                    💼 Business Executives
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-300 justify-start">
                    👨‍⚖️ Lawyers
                  </Badge>
                  <Badge className="bg-yellow-500/20 text-yellow-300 justify-start">
                    🔬 Researchers
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                How Real Detection Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h3 className="text-green-400 font-bold mb-2">✓ Real Browser-Based Detection</h3>
                <div className="space-y-2 text-sm text-green-200">
                  <p><strong>1. Battery API:</strong> Measures actual drain rate over 5 seconds</p>
                  <p><strong>2. Memory API:</strong> Tracks real heap usage via performance.memory</p>
                  <p><strong>3. Network Timing:</strong> Detects latency anomalies (MITM attacks)</p>
                  <p><strong>4. WebRTC Leaks:</strong> Discovers IP addresses exposed</p>
                  <p><strong>5. Canvas Fingerprinting:</strong> Detects browser tampering</p>
                  <p><strong>6. Service Workers:</strong> Finds unauthorized background scripts</p>
                  <p><strong>7. Media Devices:</strong> Checks camera/mic access permissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                Secure Call Encryption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <h3 className="text-purple-400 font-bold mb-2">🔐 Secure Call Encryption</h3>
                <div className="space-y-2 text-sm text-purple-200">
                  <p><strong>DTLS:</strong> Datagram Transport Layer Security for key exchange</p>
                  <p><strong>SRTP:</strong> Secure Real-time Transport Protocol for media</p>
                  <p><strong>WebRTC:</strong> Peer-to-peer connection with automatic encryption</p>
                  <p><strong>Verification:</strong> Real-time checks for DTLS & SRTP status</p>
                  <p><strong>No Server Access:</strong> Media never touches our servers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
