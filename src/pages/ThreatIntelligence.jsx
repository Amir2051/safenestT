import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Search, Globe, AlertTriangle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ThreatIntelligence() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("email");

  const handleScan = async () => {
    if (!query) return;
    setLoading(true);
    setResult(null);
    
    // Simulation of threat intelligence checks
    setTimeout(() => {
      setLoading(false);
      
      // Mock results based on tab
      if (activeTab === 'email') {
        setResult({
            status: 'risk',
            source: 'HaveIBeenPwned',
            breaches: 3,
            details: ['LinkedIn (2019)', 'Adobe (2013)', 'Dropbox (2012)'],
            score: 45
        });
      } else if (activeTab === 'ip') {
         setResult({
            status: 'clean',
            source: 'AbuseIPDB',
            country: 'US',
            isp: 'Google Cloud',
            score: 0
        });
      } else {
         setResult({
            status: 'warning',
            source: 'VirusTotal',
            malicious: 2,
            harmless: 85,
            details: 'Suspicious pattern detected in URL parameters'
        });
      }
      toast.success("Scan completed");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f1419] p-6 lg:p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-purple-400">
          <Globe className="w-8 h-8" />
          Threat Intelligence Center
        </h1>
        <p className="text-gray-400 mt-1">
            Global threat data lookup for emails, IPs, and URLs.
        </p>
      </div>

      <Card className="bg-[#1a2332] border-gray-700 max-w-4xl">
        <CardHeader>
            <CardTitle className="text-white">Intelligence Lookup</CardTitle>
        </CardHeader>
        <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-[#0f1419] border border-gray-700">
                    <TabsTrigger value="email">Email Breach Check</TabsTrigger>
                    <TabsTrigger value="ip">IP Reputation</TabsTrigger>
                    <TabsTrigger value="url">URL Scanner</TabsTrigger>
                </TabsList>

                <div className="flex gap-4">
                    <Input 
                        placeholder={
                            activeTab === 'email' ? "Enter email address..." : 
                            activeTab === 'ip' ? "Enter IP address..." : "Enter URL..."
                        }
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-[#0f1419] border-gray-600 text-white"
                    />
                    <Button 
                        onClick={handleScan} 
                        disabled={loading || !query}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        Scan
                    </Button>
                </div>

                {result && (
                    <div className={`p-6 rounded-lg border ${
                        result.status === 'clean' ? 'bg-green-500/10 border-green-500/30' : 
                        result.status === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' : 
                        'bg-red-500/10 border-red-500/30'
                    }`}>
                        <div className="flex items-start gap-4">
                            {result.status === 'clean' ? <CheckCircle className="w-8 h-8 text-green-400" /> : 
                             result.status === 'warning' ? <AlertTriangle className="w-8 h-8 text-yellow-400" /> :
                             <XCircle className="w-8 h-8 text-red-400" />}
                            
                            <div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    {result.status === 'clean' ? 'No Threats Detected' : 
                                     result.status === 'warning' ? 'Suspicious Activity Detected' : 'High Risk Detected'}
                                </h3>
                                
                                <div className="space-y-1 text-gray-300">
                                    <p><span className="text-gray-500">Source:</span> {result.source}</p>
                                    {result.breaches !== undefined && <p><span className="text-gray-500">Breaches Found:</span> {result.breaches}</p>}
                                    {result.details && Array.isArray(result.details) ? (
                                        <div className="mt-2">
                                            <p className="text-gray-500 text-sm mb-1">Involved in:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {result.details.map((d, i) => (
                                                    <Badge key={i} variant="outline" className="border-red-500/30 text-red-400">{d}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-2 text-sm">{result.details}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}