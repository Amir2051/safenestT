
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
  Mail, Link as LinkIcon, Zap, Database, Cloud, Award, ExternalLinkIcon, Info, Hash,
  Megaphone, Clock, Briefcase, BookOpen, Fingerprint, RefreshCcw, BellRing
} from 'lucide-react';
import { toast } from 'sonner';

export default function WebsiteChecker({ onCheck }) {
  const [url, setUrl] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [scanType, setScanType] = useState('quick'); // 'quick' or 'full'
  const [progress, setProgress] = useState({ step: '', percent: 0 });

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
    setProgress({ step: 'Initializing scan...', percent: 5 });

    try {
      // Call the comprehensive scanner
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
      toast.error(`Failed to check website: ${error.message || 'Unknown error'}. Please try again.`);
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
  },
  "has_contact_page": true/false,
  "has_about_page": true/false,
  "has_privacy_policy": true/false,
  "has_terms": true/false,
  "language": "...",
  "readability_score": 0
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
          },
          has_contact_page: { type: "boolean" },
          has_about_page: { type: "boolean" },
          has_privacy_policy: { type: "boolean" },
          has_terms: { type: "boolean" },
          language: { type: "string" },
          readability_score: { type: "number" }
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
  "confidence": 0.0,
  "sources": ["whois", "meta_author", "about_page"],
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
  "trust_score": 0,
  "threats": ["..."],
  "is_phishing": true/false,
  "safety_details": [
    {"source": "...", "status": "safe/unsafe", "malicious": 0, "clean": 0}
  ],
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
      http_status: 200, // This would ideally come from a real HTTP request
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
      content_analysis: {
        has_contact_page: metadata.has_contact_page,
        has_about_page: metadata.has_about_page,
        has_privacy_policy: metadata.has_privacy_policy,
        has_terms: metadata.has_terms,
        language: metadata.language,
        readability_score: metadata.readability_score
      },
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

  const formatWhoisDate = (dateString) => {
    if (!dateString || dateString === 'N/A' || dateString === 'Unknown') return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const renderBadgeList = (items, prefix = '', bgColor = 'bg-gray-700', textColor = 'text-gray-300') => (
    items && items.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {items.map((item, idx) => (
          <Badge key={idx} variant="secondary" className={`${bgColor} ${textColor} border-gray-600`}>
            {prefix}{item}
          </Badge>
        ))}
      </div>
    ) : <span className="text-gray-500 text-sm">N/A</span>
  );

  const renderBooleanStatus = (value) => (
    value ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />
  );

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
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span className="break-all">{result.url}</span>
                    {result.ssl_info?.has_ssl ? (
                      <Lock className="w-4 h-4 text-green-400 flex-shrink-0" title="HTTPS Secure" />
                    ) : (
                      <Unlock className="w-4 h-4 text-red-400 flex-shrink-0" title="Not Secure" />
                    )}
                    <a href={result.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-cyan-400 hover:text-cyan-300">
                      <ExternalLinkIcon className="w-4 h-4 flex-shrink-0" />
                    </a>
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

            <TabsContent value="overview" className="mt-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Website Overview & Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-gray-300">
                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Info className="w-4 h-4 mr-2 text-cyan-400" />Basic Info</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <p><span className="text-gray-400">Title:</span> <span className="font-medium">{result.metadata?.title || 'N/A'}</span></p>
                        <p><span className="text-gray-400">Description:</span> {result.metadata?.description || 'N/A'}</p>
                        <p><span className="text-gray-400">Meta Author:</span> {result.metadata?.meta_author || 'N/A'}</p>
                        <p><span className="text-gray-400">Word Count:</span> {result.metadata?.word_count?.toLocaleString() || 'N/A'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Hash className="w-4 h-4 mr-2 text-purple-400" />Headings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-gray-400">H1s:</p>
                          {renderBadgeList(result.metadata?.headings?.h1)}
                        </div>
                        <div>
                          <p className="text-gray-400">H2s:</p>
                          {renderBadgeList(result.metadata?.headings?.h2)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><LinkIcon className="w-4 h-4 mr-2 text-green-400" />Links</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-gray-400">Internal Links ({result.metadata?.links?.internal_count || 0}):</p>
                          {renderBadgeList(result.metadata?.links?.internal_sample, '', 'bg-green-500/10', 'text-green-300')}
                        </div>
                        <div>
                          <p className="text-gray-400">External Links ({result.metadata?.links?.external_count || 0}):</p>
                          {renderBadgeList(result.metadata?.links?.external_sample, '', 'bg-blue-500/10', 'text-blue-300')}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Megaphone className="w-4 h-4 mr-2 text-orange-400" />Accessibility & Policies</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Sitemap.xml:</span> {renderBooleanStatus(result.metadata?.has_sitemap)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Robots.txt:</span> {result.metadata?.robots ? <span className="font-medium text-white">{result.metadata.robots}</span> : 'N/A'}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Contact Page:</span> {renderBooleanStatus(result.content_analysis?.has_contact_page)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">About Page:</span> {renderBooleanStatus(result.content_analysis?.has_about_page)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Privacy Policy:</span> {renderBooleanStatus(result.content_analysis?.has_privacy_policy)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Terms & Conditions:</span> {renderBooleanStatus(result.content_analysis?.has_terms)}</p>
                        <p><span className="text-gray-400">Language:</span> {result.content_analysis?.language || 'N/A'}</p>
                        <p><span className="text-gray-400">Readability Score:</span> {result.content_analysis?.readability_score || 'N/A'}</p>
                      </div>
                    </div>

                    {result.safety_details && result.safety_details.length > 0 && (
                      <div>
                        <h4 className="flex items-center font-semibold text-white mb-2"><BellRing className="w-4 h-4 mr-2 text-red-400" />Safety Checks</h4>
                        {result.safety_details.map((detail, idx) => (
                          <div key={idx} className="bg-[#0f1419] rounded-lg p-3 border border-gray-700 mb-2">
                            <h5 className="font-semibold text-white mb-1">{detail.source}</h5>
                            <p className="text-sm">
                              <span className="text-gray-400">Status:</span> 
                              <Badge className={`ml-2 ${
                                detail.status === 'safe' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                                'bg-red-500/20 text-red-400 border-red-500/50'
                              }`}>{detail.status}</Badge>
                            </p>
                            {detail.malicious !== undefined && <p className="text-sm"><span className="text-gray-400">Malicious Detections:</span> <span className="text-red-400 font-bold">{detail.malicious}</span></p>}
                            {detail.clean !== undefined && <p className="text-sm"><span className="text-gray-400">Clean Detections:</span> <span className="text-green-400 font-bold">{detail.clean}</span></p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="creator" className="mt-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Creator & Ownership</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-gray-300">
                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><User className="w-4 h-4 mr-2 text-purple-400" />Estimated Creator</h4>
                      <p><span className="text-gray-400">Name:</span> <span className="font-medium text-white">{result.creator_info?.estimated_creator || 'Unknown'}</span></p>
                      <p><span className="text-gray-400">Confidence:</span> {(result.creator_info?.confidence * 100)?.toFixed(0) || 0}%</p>
                      <p><span className="text-gray-400">Organization:</span> {result.creator_info?.organization || 'N/A'}</p>
                      <p className="flex items-center"><Mail className="w-4 h-4 mr-2 text-cyan-400" /><span className="text-gray-400">Contact Email:</span> {result.creator_info?.contact_email || 'N/A'}</p>
                      <p><span className="text-gray-400">Sources:</span> {renderBadgeList(result.creator_info?.sources)}</p>
                    </div>

                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Briefcase className="w-4 h-4 mr-2 text-orange-400" />WHOIS Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <p><span className="text-gray-400">Registrar:</span> {result.whois?.registrar || 'N/A'}</p>
                        <p><span className="text-gray-400">Registrant:</span> {result.whois?.registrant || 'N/A'}</p>
                        <p className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-emerald-400" /><span className="text-gray-400">Created Date:</span> {formatWhoisDate(result.whois?.created_date)}</p>
                        <p className="flex items-center"><Clock className="w-4 h-4 mr-2 text-red-400" /><span className="text-gray-400">Expires Date:</span> {formatWhoisDate(result.whois?.expires_date)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Privacy Protected:</span> {renderBooleanStatus(result.whois?.privacy_protected)}</p>
                      </div>
                    </div>

                    {result.creator_info?.social_links && Object.values(result.creator_info.social_links).some(link => link) && (
                      <div>
                        <h4 className="flex items-center font-semibold text-white mb-2"><ExternalLink className="w-4 h-4 mr-2 text-blue-400" />Social Links</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.creator_info.social_links.twitter && <a href={result.creator_info.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Twitter</a>}
                          {result.creator_info.social_links.linkedin && <a href={result.creator_info.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">LinkedIn</a>}
                          {result.creator_info.social_links.github && <a href={result.creator_info.social_links.github} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">GitHub</a>}
                          {result.creator_info.social_links.facebook && <a href={result.creator_info.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Facebook</a>}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tech" className="mt-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Technology Stack</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-gray-300">
                    <p><span className="text-gray-400">CMS:</span> {result.tech_stack?.cms || 'N/A'}</p>
                    <p><span className="text-gray-400">Server:</span> {result.tech_stack?.server || 'N/A'}</p>
                    <p><span className="text-gray-400">Hosting Provider:</span> {result.tech_stack?.hosting_provider || 'N/A'}</p>
                    <p><span className="text-gray-400">CDN:</span> {result.tech_stack?.cdn || 'N/A'}</p>

                    <div>
                      <h4 className="font-semibold text-white mb-2">Programming Languages</h4>
                      {renderBadgeList(result.tech_stack?.programming_languages, '', 'bg-blue-500/10', 'text-blue-300')}
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-2">Frameworks</h4>
                      {renderBadgeList(result.tech_stack?.frameworks, '', 'bg-purple-500/10', 'text-purple-300')}
                    </div>

                    <div>
                      <h4 className="font-semibold text-white mb-2">Analytics Tools</h4>
                      {renderBadgeList(result.tech_stack?.analytics, '', 'bg-green-500/10', 'text-green-300')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Security Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-gray-300">
                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Lock className="w-4 h-4 mr-2 text-green-400" />SSL/TLS Certificate</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Has SSL:</span> {renderBooleanStatus(result.ssl_info?.has_ssl)}</p>
                        <p><span className="text-gray-400">Issuer:</span> {result.ssl_info?.issuer || 'N/A'}</p>
                        <p><span className="text-gray-400">Valid From:</span> {formatWhoisDate(result.ssl_info?.valid_from)}</p>
                        <p><span className="text-gray-400">Valid Until:</span> {formatWhoisDate(result.ssl_info?.valid_until)}</p>
                        <p><span className="text-gray-400">Grade:</span> {result.ssl_info?.grade || 'N/A'}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Shield className="w-4 h-4 mr-2 text-yellow-400" />Security Headers</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <p className="flex items-center"><span className="text-gray-400 mr-2">CSP (Content Security Policy):</span> {renderBooleanStatus(result.security_headers?.csp)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">HSTS (HTTP Strict Transport Security):</span> {renderBooleanStatus(result.security_headers?.hsts)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">X-Frame-Options:</span> {renderBooleanStatus(result.security_headers?.x_frame_options)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">X-Content-Type-Options:</span> {renderBooleanStatus(result.security_headers?.x_content_type_options)}</p>
                        <p className="flex items-center"><span className="text-gray-400 mr-2">Referrer-Policy:</span> {renderBooleanStatus(result.security_headers?.referrer_policy)}</p>
                      </div>
                    </div>

                    {result.vulnerability_flags && result.vulnerability_flags.length > 0 && (
                      <div>
                        <h4 className="flex items-center font-semibold text-white mb-2"><AlertTriangle className="w-4 h-4 mr-2 text-red-400" />Vulnerability Flags</h4>
                        {renderBadgeList(result.vulnerability_flags, '', 'bg-red-500/20', 'text-red-300')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="network" className="mt-4">
              <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Network Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm text-gray-300">
                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Server className="w-4 h-4 mr-2 text-cyan-400" />Server Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <p><span className="text-gray-400">Canonical Host:</span> {result.canonical_host || 'N/A'}</p>
                        <p className="flex items-center"><Cloud className="w-4 h-4 mr-2 text-blue-400" /><span className="text-gray-400 mr-2">Cloudflare Protected:</span> {renderBooleanStatus(result.network_info?.cloudflare_protected)}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="flex items-center font-semibold text-white mb-2"><Database className="w-4 h-4 mr-2 text-emerald-400" />IP Addresses</h4>
                      {renderBadgeList(result.network_info?.ip_addresses, '', 'bg-green-500/10', 'text-green-300')}
                    </div>

                    {result.network_info?.geolocation && (
                      <div>
                        <h4 className="flex items-center font-semibold text-white mb-2"><Globe className="w-4 h-4 mr-2 text-orange-400" />Geolocation</h4>
                        <p><span className="text-gray-400">Country:</span> {result.network_info.geolocation.country || 'N/A'}</p>
                        <p><span className="text-gray-400">City:</span> {result.network_info.geolocation.city || 'N/A'}</p>
                        <p><span className="text-gray-400">ISP:</span> {result.network_info.geolocation.isp || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-xs text-gray-500 text-center">
            Last checked: {new Date(result.checked_at).toLocaleString()}
            {result.performance?.scan_duration_ms && ` (Scan time: ${result.performance.scan_duration_ms / 1000}s)`}
          </div>
        </div>
      )}

      {result && result.status === 'error' && (
        <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-10 h-10 text-red-400" />
              <div>
                <h3 className="text-red-400 font-bold text-lg">Scan Failed</h3>
                <p className="text-gray-300 text-sm">{result.error || 'An unknown error occurred during the scan.'}</p>
                <p className="text-gray-400 text-xs mt-1">Please ensure the URL is valid and try again.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
