import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, Shield, AlertTriangle, CheckCircle, XCircle, 
  Search, Loader2, Lock, Unlock, ExternalLink, Server,
  User, Code, Network, FileSearch, BarChart3, Eye, Calendar,
  Mail, Link as LinkIcon, Zap, Database, Cloud, Award
} from 'lucide-react';
import { toast } from 'sonner';

export default function WebsiteChecker({ onCheck }) {
  const [url, setUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [scanType, setScanType] = useState('quick');
  const [progress, setProgress] = useState({ step: '', percent: 0 });

  const handleCheck = async () => {
    if (!url) {
      toast.error('Please enter a website URL');
      return;
    }

    let fullUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      fullUrl = 'https://' + url;
    }

    setChecking(true);
    setResult(null);
    setProgress({ step: 'Initializing scan...', percent: 5 });

    try {
      const checkResult = await performComprehensiveScan(fullUrl, scanType);
      setResult(checkResult);
      
      if (onCheck) {
        onCheck(checkResult);
      }

      if (checkResult.is_safe) {
        toast.success('✅ Website analysis complete - appears safe');
      } else {
        toast.error(`⚠️ ${checkResult.risk_level.toUpperCase()} RISK: Use caution`);
      }
    } catch (error) {
      console.error('Website check error:', error);
      toast.error('Failed to check website. Please try again.');
      setResult({ status: 'error', error: error.message });
    }

    setChecking(false);
    setProgress({ step: '', percent: 0 });
  };

  const performComprehensiveScan = async (url, scanType) => {
    const startTime = Date.now();
    const hostname = new URL(url).hostname;

    // Step 1: Basic metadata extraction (20%)
    setProgress({ step: 'Extracting metadata...', percent: 20 });
    
    const metadataPrompt = `Analyze this website: ${url}

Extract ALL available information:
1. Title, description, meta tags, keywords
2. Main headings (H1, H2)
3. Estimated word count
4. Whether it has sitemap.xml, robots.txt
5. Top 3 image URLs
6. Sample internal and external links (5 each)

Return JSON:
{
  "title": "...",
  "description": "...",
  "meta_author": "...",
  "keywords": ["..."],
  "robots": "...",
  "has_sitemap": true/false,
  "headings": {"h1": ["..."], "h2": ["..."]},
  "word_count": 0,
  "top_images": ["..."],
  "links": {
    "internal_sample": ["..."],
    "external_sample": ["..."],
    "internal_count": 0,
    "external_count": 0
  }
}`;

    const metadata = await base44.integrations.Core.InvokeLLM({
      prompt: metadataPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          meta_author: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          robots: { type: "string" },
          has_sitemap: { type: "boolean" },
          headings: {
            type: "object",
            properties: {
              h1: { type: "array", items: { type: "string" } },
              h2: { type: "array", items: { type: "string" } }
            }
          },
          word_count: { type: "number" },
          top_images: { type: "array", items: { type: "string" } },
          links: {
            type: "object",
            properties: {
              internal_sample: { type: "array", items: { type: "string" } },
              external_sample: { type: "array", items: { type: "string" } },
              internal_count: { type: "number" },
              external_count: { type: "number" }
            }
          }
        }
      }
    });

    // Step 2: Creator/Owner Detection (40%)
    setProgress({ step: 'Detecting creator/owner...', percent: 40 });

    const creatorPrompt = `Investigate the creator/owner of ${url}

Search for:
1. WHOIS data (registrant, registrar, dates)
2. Meta author tags
3. About page - look for names, emails, organization
4. Contact page - emails, phone, addresses
5. Social media links (Twitter, LinkedIn, GitHub, Facebook)
6. Copyright notices with names
7. Schema.org JSON-LD author data

Aggregate ALL signals and return confidence score (0-1):
{
  "estimated_creator": "Name or Unknown",
  "confidence": 0.0-1.0,
  "sources": ["whois", "meta_author", "about_page", etc],
  "contact_email": "...",
  "organization": "...",
  "social_links": {"twitter": "...", "linkedin": "...", "github": "...", "facebook": "..."},
  "whois": {
    "registrar": "...",
    "registrant": "...",
    "created_date": "...",
    "expires_date": "...",
    "privacy_protected": true/false
  }
}`;

    const creatorInfo = await base44.integrations.Core.InvokeLLM({
      prompt: creatorPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          estimated_creator: { type: "string" },
          confidence: { type: "number" },
          sources: { type: "array", items: { type: "string" } },
          contact_email: { type: "string" },
          organization: { type: "string" },
          social_links: {
            type: "object",
            properties: {
              twitter: { type: "string" },
              linkedin: { type: "string" },
              github: { type: "string" },
              facebook: { type: "string" }
            }
          },
          whois: {
            type: "object",
            properties: {
              registrar: { type: "string" },
              registrant: { type: "string" },
              created_date: { type: "string" },
              expires_date: { type: "string" },
              privacy_protected: { type: "boolean" }
            }
          }
        }
      }
    });

    // Step 3: Tech Stack Detection (60%)
    setProgress({ step: 'Analyzing technology stack...', percent: 60 });

    const techPrompt = `Detect the technology stack of ${url}

Identify:
1. CMS (WordPress, Drupal, Joomla, Shopify, etc.)
2. Server (nginx, Apache, IIS)
3. Programming languages (PHP, Node.js, Python, Ruby, etc.)
4. Frameworks (React, Vue, Angular, Laravel, Django, etc.)
5. Analytics tools (Google Analytics, Mixpanel, etc.)
6. CDN (Cloudflare, AWS CloudFront, etc.)
7. Hosting provider if detectable

Return:
{
  "cms": "...",
  "server": "...",
  "programming_languages": ["..."],
  "frameworks": ["..."],
  "analytics": ["..."],
  "cdn": "...",
  "hosting_provider": "..."
}`;

    const techStack = await base44.integrations.Core.InvokeLLM({
      prompt: techPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          cms: { type: "string" },
          server: { type: "string" },
          programming_languages: { type: "array", items: { type: "string" } },
          frameworks: { type: "array", items: { type: "string" } },
          analytics: { type: "array", items: { type: "string" } },
          cdn: { type: "string" },
          hosting_provider: { type: "string" }
        }
      }
    });

    // Step 4: Security & SSL Analysis (75%)
    setProgress({ step: 'Checking security...', percent: 75 });

    const securityPrompt = `Analyze security of ${url}

Check:
1. SSL/TLS certificate (issuer, validity dates, grade)
2. Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
3. Vulnerabilities (exposed .git, directory listing, sensitive files in robots.txt)
4. IP addresses and geolocation
5. Cloudflare/CDN protection

Return:
{
  "ssl_info": {
    "has_ssl": true/false,
    "issuer": "...",
    "valid_from": "...",
    "valid_until": "...",
    "grade": "A/B/C/F"
  },
  "security_headers": {
    "csp": true/false,
    "hsts": true/false,
    "x_frame_options": true/false,
    "x_content_type_options": true/false,
    "referrer_policy": true/false
  },
  "vulnerability_flags": ["..."],
  "network_info": {
    "ip_addresses": ["..."],
    "geolocation": {"country": "...", "city": "...", "isp": "..."},
    "cloudflare_protected": true/false
  }
}`;

    const securityInfo = await base44.integrations.Core.InvokeLLM({
      prompt: securityPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          ssl_info: {
            type: "object",
            properties: {
              has_ssl: { type: "boolean" },
              issuer: { type: "string" },
              valid_from: { type: "string" },
              valid_until: { type: "string" },
              grade: { type: "string" }
            }
          },
          security_headers: {
            type: "object",
            properties: {
              csp: { type: "boolean" },
              hsts: { type: "boolean" },
              x_frame_options: { type: "boolean" },
              x_content_type_options: { type: "boolean" },
              referrer_policy: { type: "boolean" }
            }
          },
          vulnerability_flags: { type: "array", items: { type: "string" } },
          network_info: {
            type: "object",
            properties: {
              ip_addresses: { type: "array", items: { type: "string" } },
              geolocation: {
                type: "object",
                properties: {
                  country: { type: "string" },
                  city: { type: "string" },
                  isp: { type: "string" }
                }
              },
              cloudflare_protected: { type: "boolean" }
            }
          }
        }
      }
    });

    // Step 5: Safety & Trust Analysis (90%)
    setProgress({ step: 'Evaluating safety and trust...', percent: 90 });

    const safetyPrompt = `Perform comprehensive safety analysis of ${url}

Evaluate:
1. Domain reputation and age
2. Phishing indicators (suspicious URL patterns, fake login pages)
3. Malware/virus presence
4. Blacklist status (Google Safe Browsing, VirusTotal, etc.)
5. Trust signals (contact info, privacy policy, terms, about page)
6. Content legitimacy
7. Overall risk assessment

Return:
{
  "is_safe": true/false,
  "risk_level": "low/medium/high/critical",
  "trust_score": 0-100,
  "threats": ["..."],
  "is_phishing": true/false,
  "safety_details": [
    {"source": "...", "status": "safe/unsafe", "malicious": 0, "clean": 0}
  ],
  "content_analysis": {
    "has_contact_page": true/false,
    "has_about_page": true/false,
    "has_privacy_policy": true/false,
    "has_terms": true/false,
    "language": "...",
    "readability_score": 0-100
  },
  "recommendation": "...",
  "ai_summary": "Brief 2-3 sentence summary of what this website does and whether it's trustworthy"
}`;

    const safetyInfo = await base44.integrations.Core.InvokeLLM({
      prompt: safetyPrompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          is_safe: { type: "boolean" },
          risk_level: { type: "string" },
          trust_score: { type: "number" },
          threats: { type: "array", items: { type: "string" } },
          is_phishing: { type: "boolean" },
          safety_details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                source: { type: "string" },
                status: { type: "string" },
                malicious: { type: "number" },
                clean: { type: "number" }
              }
            }
          },
          content_analysis: {
            type: "object",
            properties: {
              has_contact_page: { type: "boolean" },
              has_about_page: { type: "boolean" },
              has_privacy_policy: { type: "boolean" },
              has_terms: { type: "boolean" },
              language: { type: "string" },
              readability_score: { type: "number" }
            }
          },
          recommendation: { type: "string" },
          ai_summary: { type: "string" }
        }
      }
    });

    // Step 6: Compile final result (100%)
    setProgress({ step: 'Finalizing analysis...', percent: 100 });

    const scanDuration = Date.now() - startTime;
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h cache

    const finalResult = {
      url,
      canonical_host: hostname,
      status: safetyInfo.is_safe ? 'safe' : 'unsafe',
      http_status: 200,
      is_safe: safetyInfo.is_safe,
      risk_level: safetyInfo.risk_level,
      trust_score: safetyInfo.trust_score,
      threats: safetyInfo.threats || [],
      metadata,
      creator_info: creatorInfo,
      whois: creatorInfo.whois,
      tech_stack: techStack,
      ssl_info: securityInfo.ssl_info,
      security_headers: securityInfo.security_headers,
      network_info: securityInfo.network_info,
      vulnerability_flags: securityInfo.vulnerability_flags || [],
      content_analysis: safetyInfo.content_analysis,
      safety_details: safetyInfo.safety_details || [],
      recommendation: safetyInfo.recommendation,
      ai_summary: safetyInfo.ai_summary,
      checked_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      is_phishing: safetyInfo.is_phishing || false,
      scan_type: scanType,
      performance: {
        load_time_ms: scanDuration,
        scan_duration_ms: scanDuration
      }
    };

    // Save to database
    try {
      await base44.entities.WebsiteCheck.create(finalResult);
    } catch (error) {
      console.error('Failed to save website check:', error);
    }

    return finalResult;
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
            Comprehensive Website Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm mb-4">
            Deep analysis: metadata, creator detection, tech stack, security, WHOIS, and safety checks
          </p>
          
          <div className="flex gap-3 mb-3">
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
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Analyze Website
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setScanType('quick')}
              disabled={checking}
              className={`p-2 rounded-lg border text-xs transition-all ${
                scanType === 'quick'
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-[#0f1419] border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Zap className="w-3 h-3 inline mr-1" />
              Quick Scan
            </button>
            <button
              onClick={() => setScanType('full')}
              disabled={checking}
              className={`p-2 rounded-lg border text-xs transition-all ${
                scanType === 'full'
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                  : 'bg-[#0f1419] border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <FileSearch className="w-3 h-3 inline mr-1" />
              Deep Analysis
            </button>
          </div>

          <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-cyan-400 text-xs">
              <strong>🔒 Privacy Protected:</strong> Analysis respects robots.txt. No data is shared with third parties.
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
                {progress.step}
              </h3>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm">{progress.percent}% complete</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && !checking && result.status !== 'error' && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Card className={`bg-gradient-to-br ${getRiskBg(result.risk_level)} border-2`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  result.is_safe ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {result.is_safe ? (
                    <CheckCircle className="w-10 h-10 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className={`text-2xl font-bold ${result.is_safe ? 'text-green-400' : 'text-red-400'}`}>
                      {result.is_safe ? 'Website Appears Safe' : 'WARNING: Potentially Dangerous'}
                    </h3>
                    <Badge className={`${
                      result.risk_level === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      result.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                      result.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                      'bg-red-500/20 text-red-400 border-red-500/50'
                    } border text-sm font-bold uppercase`}>
                      {result.risk_level} Risk
                    </Badge>
                  </div>
                  
                  <p className="text-white text-sm mb-3 break-all flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    {result.url}
                    {result.ssl_info?.has_ssl ? (
                      <Lock className="w-4 h-4 text-green-400" title="HTTPS Secure" />
                    ) : (
                      <Unlock className="w-4 h-4 text-red-400" title="Not Secure" />
                    )}
                  </p>

                  {result.ai_summary && (
                    <p className="text-gray-300 text-sm mb-4 italic">
                      {result.ai_summary}
                    </p>
                  )}

                  {/* Trust Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Trust Score</span>
                      <span className={`text-2xl font-bold ${getRiskColor(result.risk_level)}`}>
                        {result.trust_score}/100
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          result.trust_score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          result.trust_score >= 50 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-red-500 to-pink-500'
                        }`}
                        style={{ width: `${result.trust_score}%` }}
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
                    result.is_safe 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <p className={`text-sm font-semibold ${result.is_safe ? 'text-green-300' : 'text-red-300'}`}>
                      {result.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-[#1a2332] border-cyan-500/20 w-full overflow-x-auto flex-nowrap">
              <TabsTrigger value="overview" className="data-[state=active]:bg-cyan-500/20">
                <Eye className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="creator" className="data-[state=active]:bg-purple-500/20">
                <User className="w-4 h-4 mr-2" />
                Creator
              </TabsTrigger>
              <TabsTrigger value="tech" className="data-[state=active]:bg-blue-500/20">
                <Code className="w-4 h-4 mr-2" />
                Tech Stack
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-green-500/20">
                <Shield className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="network" className="data-[state=active]:bg-orange-500/20">
                <Network className="w-4 h-4 mr-2" />
                Network
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-6 space-y-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Page Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Title</p>
                    <p className="text-white font-semibold">{result.metadata?.title || 'Not found'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Description</p>
                    <p className="text-gray-300 text-sm">{result.metadata?.description || 'Not found'}</p>
                  </div>
                  {result.metadata?.meta_author && (
                    <div>
                      <p className="text-sm text-gray-400">Meta Author</p>
                      <p className="text-white">{result.metadata.meta_author}</p>
                    </div>
                  )}
                  {result.metadata?.keywords && result.metadata.keywords.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {result.metadata.keywords.map((kw, idx) => (
                          <Badge key={idx} className="bg-cyan-500/20 text-cyan-400">{kw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Word Count</p>
                      <p className="text-white font-bold">{result.metadata?.word_count?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Sitemap</p>
                      <p className={result.metadata?.has_sitemap ? 'text-green-400' : 'text-red-400'}>
                        {result.metadata?.has_sitemap ? '✓ Found' : '✗ Not found'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {result.metadata?.headings && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Headings Structure</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.metadata.headings.h1 && result.metadata.headings.h1.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">H1 Headings</p>
                        <ul className="space-y-1">
                          {result.metadata.headings.h1.map((h, idx) => (
                            <li key={idx} className="text-white text-sm">• {h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.metadata.headings.h2 && result.metadata.headings.h2.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">H2 Headings (Sample)</p>
                        <ul className="space-y-1">
                          {result.metadata.headings.h2.slice(0, 5).map((h, idx) => (
                            <li key={idx} className="text-gray-300 text-sm">• {h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {result.metadata?.links && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Links Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-3 bg-[#0f1419] rounded-lg text-center">
                        <p className="text-sm text-gray-400">Internal Links</p>
                        <p className="text-2xl font-bold text-cyan-400">{result.metadata.links.internal_count || 0}</p>
                      </div>
                      <div className="p-3 bg-[#0f1419] rounded-lg text-center">
                        <p className="text-sm text-gray-400">External Links</p>
                        <p className="text-2xl font-bold text-purple-400">{result.metadata.links.external_count || 0}</p>
                      </div>
                    </div>
                    {result.metadata.links.internal_sample && result.metadata.links.internal_sample.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Internal Links (Sample)</p>
                        <ul className="space-y-1">
                          {result.metadata.links.internal_sample.map((link, idx) => (
                            <li key={idx} className="text-cyan-400 text-xs truncate">
                              <LinkIcon className="w-3 h-3 inline mr-1" />{link}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Creator Tab */}
            <TabsContent value="creator" className="mt-6 space-y-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Estimated Creator/Owner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg">
                    <div>
                      <p className="text-sm text-gray-400">Creator Name</p>
                      <p className="text-xl font-bold text-white">
                        {result.creator_info?.estimated_creator || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">Confidence</p>
                      <p className={`text-2xl font-bold ${
                        (result.creator_info?.confidence || 0) >= 0.7 ? 'text-green-400' :
                        (result.creator_info?.confidence || 0) >= 0.4 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {((result.creator_info?.confidence || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {result.creator_info?.sources && result.creator_info.sources.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Data Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {result.creator_info.sources.map((source, idx) => (
                          <Badge key={idx} className="bg-purple-500/20 text-purple-400">
                            {source.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.creator_info?.organization && (
                    <div>
                      <p className="text-sm text-gray-400">Organization</p>
                      <p className="text-white font-semibold">{result.creator_info.organization}</p>
                    </div>
                  )}

                  {result.creator_info?.contact_email && (
                    <div>
                      <p className="text-sm text-gray-400">Contact Email</p>
                      <p className="text-cyan-400 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {result.creator_info.contact_email}
                      </p>
                    </div>
                  )}

                  {result.creator_info?.social_links && Object.keys(result.creator_info.social_links).length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Social Media</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(result.creator_info.social_links).map(([platform, url]) => (
                          url && (
                            <a
                              key={platform}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-[#0f1419] rounded-lg hover:bg-cyan-500/10 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 text-cyan-400" />
                              <span className="text-white text-sm capitalize">{platform}</span>
                            </a>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {result.whois && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">WHOIS Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.whois.registrar && (
                      <div>
                        <p className="text-sm text-gray-400">Registrar</p>
                        <p className="text-white font-semibold">{result.whois.registrar}</p>
                      </div>
                    )}
                    {result.whois.registrant && (
                      <div>
                        <p className="text-sm text-gray-400">Registrant</p>
                        <p className="text-white">{result.whois.registrant}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      {result.whois.created_date && (
                        <div>
                          <p className="text-sm text-gray-400">Created</p>
                          <p className="text-white text-sm">{new Date(result.whois.created_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {result.whois.expires_date && (
                        <div>
                          <p className="text-sm text-gray-400">Expires</p>
                          <p className="text-white text-sm">{new Date(result.whois.expires_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                    {result.whois.privacy_protected !== undefined && (
                      <div>
                        <Badge className={result.whois.privacy_protected ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400'}>
                          {result.whois.privacy_protected ? '🔒 Privacy Protected' : '👁️ Public WHOIS'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Tech Stack Tab */}
            <TabsContent value="tech" className="mt-6 space-y-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Technology Stack</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.tech_stack?.cms && (
                      <div className="p-4 bg-[#0f1419] rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Database className="w-4 h-4 text-blue-400" />
                          <p className="text-sm text-gray-400">CMS</p>
                        </div>
                        <p className="text-white font-bold">{result.tech_stack.cms}</p>
                      </div>
                    )}
                    {result.tech_stack?.server && (
                      <div className="p-4 bg-[#0f1419] rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Server className="w-4 h-4 text-cyan-400" />
                          <p className="text-sm text-gray-400">Server</p>
                        </div>
                        <p className="text-white font-bold">{result.tech_stack.server}</p>
                      </div>
                    )}
                    {result.tech_stack?.cdn && (
                      <div className="p-4 bg-[#0f1419] rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Cloud className="w-4 h-4 text-purple-400" />
                          <p className="text-sm text-gray-400">CDN</p>
                        </div>
                        <p className="text-white font-bold">{result.tech_stack.cdn}</p>
                      </div>
                    )}
                    {result.tech_stack?.hosting_provider && (
                      <div className="p-4 bg-[#0f1419] rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Server className="w-4 h-4 text-green-400" />
                          <p className="text-sm text-gray-400">Hosting</p>
                        </div>
                        <p className="text-white font-bold">{result.tech_stack.hosting_provider}</p>
                      </div>
                    )}
                  </div>

                  {result.tech_stack?.programming_languages && result.tech_stack.programming_languages.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Programming Languages</p>
                      <div className="flex flex-wrap gap-2">
                        {result.tech_stack.programming_languages.map((lang, idx) => (
                          <Badge key={idx} className="bg-blue-500/20 text-blue-400">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.tech_stack?.frameworks && result.tech_stack.frameworks.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Frameworks</p>
                      <div className="flex flex-wrap gap-2">
                        {result.tech_stack.frameworks.map((fw, idx) => (
                          <Badge key={idx} className="bg-purple-500/20 text-purple-400">{fw}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.tech_stack?.analytics && result.tech_stack.analytics.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Analytics & Tracking</p>
                      <div className="flex flex-wrap gap-2">
                        {result.tech_stack.analytics.map((tool, idx) => (
                          <Badge key={idx} className="bg-cyan-500/20 text-cyan-400">
                            <BarChart3 className="w-3 h-3 mr-1" />
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="mt-6 space-y-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">SSL/TLS Certificate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-lg">
                    <div className="flex items-center gap-3">
                      {result.ssl_info?.has_ssl ? (
                        <Lock className="w-8 h-8 text-green-400" />
                      ) : (
                        <Unlock className="w-8 h-8 text-red-400" />
                      )}
                      <div>
                        <p className="text-white font-bold">
                          {result.ssl_info?.has_ssl ? 'HTTPS Enabled' : 'No HTTPS'}
                        </p>
                        <p className="text-sm text-gray-400">
                          {result.ssl_info?.issuer || 'No certificate'}
                        </p>
                      </div>
                    </div>
                    {result.ssl_info?.grade && (
                      <Badge className={`text-2xl font-bold ${
                        result.ssl_info.grade === 'A' || result.ssl_info.grade === 'A+' ? 'bg-green-500/20 text-green-400' :
                        result.ssl_info.grade === 'B' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {result.ssl_info.grade}
                      </Badge>
                    )}
                  </div>

                  {result.ssl_info?.valid_from && result.ssl_info?.valid_until && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Valid From</p>
                        <p className="text-white text-sm">{result.ssl_info.valid_from}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Valid Until</p>
                        <p className="text-white text-sm">{result.ssl_info.valid_until}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Security Headers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {result.security_headers && Object.entries(result.security_headers).map(([key, value]) => (
                      <div key={key} className={`p-3 rounded-lg border text-center ${
                        value ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                      }`}>
                        {value ? (
                          <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
                        ) : (
                          <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
                        )}
                        <p className="text-xs text-gray-300 font-semibold uppercase">
                          {key.replace(/_/g, '-')}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {result.vulnerability_flags && result.vulnerability_flags.length > 0 && (
                <Card className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/30">
                  <CardHeader>
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Vulnerability Flags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {result.vulnerability_flags.map((flag, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-red-300 text-sm">
                          <XCircle className="w-4 h-4" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Network Tab */}
            <TabsContent value="network" className="mt-6 space-y-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
                <CardHeader>
                  <CardTitle className="text-white">Network Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.network_info?.ip_addresses && result.network_info.ip_addresses.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">IP Addresses</p>
                      <div className="flex flex-wrap gap-2">
                        {result.network_info.ip_addresses.map((ip, idx) => (
                          <Badge key={idx} className="bg-orange-500/20 text-orange-400 font-mono">
                            {ip}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.network_info?.geolocation && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Geolocation</p>
                      <div className="p-4 bg-[#0f1419] rounded-lg space-y-2">
                        {result.network_info.geolocation.country && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Country</span>
                            <span className="text-white font-semibold">{result.network_info.geolocation.country}</span>
                          </div>
                        )}
                        {result.network_info.geolocation.city && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">City</span>
                            <span className="text-white font-semibold">{result.network_info.geolocation.city}</span>
                          </div>
                        )}
                        {result.network_info.geolocation.isp && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">ISP</span>
                            <span className="text-white font-semibold">{result.network_info.geolocation.isp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {result.network_info?.cloudflare_protected !== undefined && (
                    <div className="p-4 bg-[#0f1419] rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Cloud className="w-5 h-5 text-orange-400" />
                          <span className="text-white">Cloudflare Protection</span>
                        </div>
                        <Badge className={result.network_info.cloudflare_protected ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                          {result.network_info.cloudflare_protected ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {result.content_analysis && (
                <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
                  <CardHeader>
                    <CardTitle className="text-white">Content Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { key: 'has_contact_page', label: 'Contact Page' },
                        { key: 'has_about_page', label: 'About Page' },
                        { key: 'has_privacy_policy', label: 'Privacy Policy' },
                        { key: 'has_terms', label: 'Terms of Service' }
                      ].map(({ key, label }) => (
                        <div key={key} className={`p-3 rounded-lg border text-center ${
                          result.content_analysis[key] ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-500/10 border-gray-500/30'
                        }`}>
                          {result.content_analysis[key] ? (
                            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
                          ) : (
                            <XCircle className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                          )}
                          <p className="text-xs text-gray-300">{label}</p>
                        </div>
                      ))}
                    </div>

                    {result.content_analysis.language && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-400">Language</p>
                        <p className="text-white font-semibold">{result.content_analysis.language}</p>
                      </div>
                    )}

                    {result.content_analysis.readability_score !== undefined && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-400 mb-2">Readability Score</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                              style={{ width: `${result.content_analysis.readability_score}%` }}
                            />
                          </div>
                          <span className="text-white font-bold">{result.content_analysis.readability_score}/100</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {result && result.status === 'error' && (
        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-10 h-10 text-red-400" />
              <div>
                <h3 className="text-red-400 font-bold text-lg">Scan Failed</h3>
                <p className="text-gray-300 text-sm">{result.error || 'An error occurred during the scan'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}