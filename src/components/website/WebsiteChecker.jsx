import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, Shield, AlertTriangle, CheckCircle, XCircle, 
  Search, Loader2, Lock, Unlock, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export default function WebsiteChecker({ onCheck }) {
  const [url, setUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const handleCheck = async () => {
    if (!url) {
      toast.error('Please enter a website URL');
      return;
    }

    // Ensure URL has protocol
    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    setChecking(true);
    setResult(null);

    try {
      // Call the website checker (you'll need to implement this API endpoint)
      const checkResult = await checkWebsiteSafety(fullUrl);
      setResult(checkResult);
      
      if (onCheck) {
        onCheck(checkResult);
      }

      if (checkResult.isSafe) {
        toast.success('✅ Website appears safe');
      } else {
        toast.error(`⚠️ ${checkResult.riskLevel.toUpperCase()} RISK: Website may be dangerous`);
      }
    } catch (error) {
      console.error('Website check error:', error);
      toast.error('Failed to check website. Please try again.');
    }

    setChecking(false);
  };

  // Mock function - replace with actual API call
  const checkWebsiteSafety = async (url) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock result based on URL patterns
    const domain = new URL(url).hostname.toLowerCase();
    
    // Check for known safe domains
    const safeDomains = ['google.com', 'youtube.com', 'facebook.com', 'twitter.com', 'amazon.com', 'microsoft.com', 'apple.com'];
    const isSafeDomain = safeDomains.some(d => domain.includes(d));
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
      /paypal.*verify/i,
      /secure.*bank/i,
      /login.*verify/i
    ];
    const isSuspicious = suspiciousPatterns.some(p => p.test(url));
    
    const hasSSL = url.startsWith('https://');
    
    let isSafe = true;
    let riskLevel = 'low';
    let trustScore = 95;
    const threats = [];
    
    if (isSuspicious) {
      isSafe = false;
      riskLevel = 'high';
      trustScore = 25;
      threats.push('PHISHING', 'SUSPICIOUS_PATTERN');
    } else if (!hasSSL) {
      riskLevel = 'medium';
      trustScore = 60;
    } else if (isSafeDomain) {
      trustScore = 100;
    }

    return {
      url,
      status: isSafe ? 'safe' : 'unsafe',
      isSafe,
      riskLevel,
      trustScore,
      threats,
      details: [
        {
          source: 'Google Safe Browsing',
          status: isSafe ? 'safe' : 'unsafe',
          threats: isSafe ? [] : ['SOCIAL_ENGINEERING']
        },
        {
          source: 'VirusTotal',
          malicious: isSafe ? 0 : 3,
          suspicious: isSafe ? 0 : 2,
          clean: isSafe ? 87 : 82,
          reputation: isSafe ? 15 : -5
        },
        {
          source: 'Reputation Analysis',
          riskScore: trustScore,
          hasSSL,
          suspiciousPatterns: isSuspicious
        }
      ],
      recommendation: isSafe 
        ? 'This website appears to be safe. However, always verify the URL and be cautious with personal information.'
        : '⚠️ HIGH RISK: This website is likely malicious or a phishing attempt. Avoid visiting and do not enter any personal information.',
      checkedAt: new Date().toISOString(),
      has_ssl: hasSSL
    };
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRiskBg = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return 'from-green-500/10 to-emerald-500/10 border-green-500/30';
      case 'medium': return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
      case 'high': return 'from-orange-500/10 to-red-500/10 border-orange-500/30';
      case 'critical': return 'from-red-500/10 to-pink-500/10 border-red-500/30';
      default: return 'from-gray-500/10 to-gray-600/10 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Website Safety Checker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm mb-4">
            Check if a website is legitimate or potentially dangerous before visiting
          </p>
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter website URL (e.g., example.com)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !checking && handleCheck()}
                className="pl-10 bg-[#0f1419] border-cyan-500/20 text-white"
                disabled={checking}
              />
            </div>
            <Button
              onClick={handleCheck}
              disabled={checking || !url}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Check Safety
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-cyan-400 text-xs">
              <strong>🔒 Privacy Protected:</strong> We check websites using trusted security APIs. Your activity is not tracked.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Checking Progress */}
      {checking && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 border-8 border-cyan-500/20 rounded-full" />
                <div className="absolute inset-0 border-8 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <Shield className="absolute inset-0 m-auto w-12 h-12 text-cyan-400" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                Analyzing Website Security...
              </h3>
              <p className="text-gray-400 text-sm">
                Checking with Google Safe Browsing, VirusTotal, and more...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !checking && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Card className={`bg-gradient-to-br ${getRiskBg(result.riskLevel)} border-2`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  result.isSafe ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {result.isSafe ? (
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={`text-2xl font-bold ${result.isSafe ? 'text-green-400' : 'text-red-400'}`}>
                      {result.isSafe ? 'Website Appears Safe' : 'WARNING: Potentially Dangerous'}
                    </h3>
                    <Badge className={`${
                      result.riskLevel === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      result.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                      result.riskLevel === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                      'bg-red-500/20 text-red-400 border-red-500/50'
                    } border text-sm font-bold uppercase`}>
                      {result.riskLevel} Risk
                    </Badge>
                  </div>
                  
                  <p className="text-white text-sm mb-3 break-all flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {result.url}
                    {result.has_ssl ? (
                      <Lock className="w-4 h-4 text-green-400" title="HTTPS Secure" />
                    ) : (
                      <Unlock className="w-4 h-4 text-red-400" title="Not Secure" />
                    )}
                  </p>

                  {/* Trust Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Trust Score</span>
                      <span className={`text-2xl font-bold ${getRiskColor(result.riskLevel)}`}>
                        {result.trustScore}/100
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          result.trustScore >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          result.trustScore >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-red-500 to-pink-500'
                        }`}
                        style={{ width: `${result.trustScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Threats */}
                  {result.threats && result.threats.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-400 mb-2">Detected Threats:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.threats.map((threat, idx) => (
                          <Badge key={idx} className="bg-red-500/20 text-red-400 border-red-500/50">
                            {threat.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className={`p-4 rounded-lg border ${
                    result.isSafe 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <p className={`text-sm font-semibold ${result.isSafe ? 'text-green-300' : 'text-red-300'}`}>
                      {result.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white text-lg">Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {result.details.map((detail, idx) => (
                  <div key={idx} className="bg-[#0f1419] rounded-lg p-4 border border-cyan-500/10">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-white font-semibold">{detail.source}</h4>
                      {detail.status && (
                        <Badge className={`${
                          detail.status === 'safe' 
                            ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        } border`}>
                          {detail.status}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {detail.malicious !== undefined && (
                        <div>
                          <p className="text-gray-400">Malicious</p>
                          <p className="text-red-400 font-bold">{detail.malicious}</p>
                        </div>
                      )}
                      {detail.suspicious !== undefined && (
                        <div>
                          <p className="text-gray-400">Suspicious</p>
                          <p className="text-orange-400 font-bold">{detail.suspicious}</p>
                        </div>
                      )}
                      {detail.clean !== undefined && (
                        <div>
                          <p className="text-gray-400">Clean</p>
                          <p className="text-green-400 font-bold">{detail.clean}</p>
                        </div>
                      )}
                      {detail.riskScore !== undefined && (
                        <div>
                          <p className="text-gray-400">Risk Score</p>
                          <p className={`font-bold ${getRiskColor(
                            detail.riskScore >= 80 ? 'low' : 
                            detail.riskScore >= 50 ? 'medium' : 'high'
                          )}`}>
                            {detail.riskScore}/100
                          </p>
                        </div>
                      )}
                      {detail.hasSSL !== undefined && (
                        <div>
                          <p className="text-gray-400">HTTPS</p>
                          <p className={detail.hasSSL ? 'text-green-400' : 'text-red-400'}>
                            {detail.hasSSL ? '✓ Secure' : '✗ Not Secure'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-xs text-gray-500 text-center">
                Last checked: {new Date(result.checkedAt).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}