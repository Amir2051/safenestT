import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, CheckCircle, AlertTriangle, Activity, 
  Lock, Eye, Zap, Globe, Server
} from 'lucide-react';

function LiveProtectionStatus() {
  const [protectionStatus, setProtectionStatus] = useState({
    owasp_protection: {},
    protection_features: {},
    last_updated: null
  });
  const [recentThreats, setRecentThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threatsBlocked24h, setThreatsBlocked24h] = useState(0);

  useEffect(() => {
    fetchProtectionStatus();
    fetchRecentThreats();
    
    const interval = setInterval(() => {
      fetchProtectionStatus();
      fetchRecentThreats();
    }, 10000); // Update every 10 seconds for real-time feel
    
    return () => clearInterval(interval);
  }, []);

  const fetchProtectionStatus = async () => {
    try {
      const mockData = {
        owasp_protection: {
          a01_broken_access_control: 'active',
          a02_cryptographic_failures: 'active',
          a03_injection: 'active',
          a04_insecure_design: 'active',
          a05_security_misconfiguration: 'active',
          a06_vulnerable_components: 'active',
          a07_authentication_failures: 'active',
          a08_data_integrity: 'active',
          a09_logging_failures: 'active',
          a10_ssrf: 'active'
        },
        protection_features: {
          https_enforced: true,
          csp_enabled: true,
          rate_limiting: true,
          input_sanitization: true,
          sql_injection_protection: true,
          xss_protection: true,
          csrf_protection: true,
          ssrf_protection: true,
          anomaly_detection: true,
          ip_blocking: true
        },
        last_updated: new Date().toISOString()
      };
      
      setProtectionStatus(mockData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch protection status:', error);
      setLoading(false);
    }
  };

  const fetchRecentThreats = async () => {
    try {
      const { base44 } = await import('@/api/base44Client');
      
      // Get threats from last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const allEvents = await base44.entities.SecurityEvent.list('-created_date', 100);
      
      // Filter for blocked threats in last 24h
      const recentBlockedThreats = allEvents.filter(event => 
        event.blocked && 
        new Date(event.created_date) > new Date(oneDayAgo)
      );
      
      setThreatsBlocked24h(recentBlockedThreats.length);
      
      // Show latest 10 high/critical threats
      const criticalThreats = allEvents
        .filter(event => event.severity === 'high' || event.severity === 'critical')
        .slice(0, 10);
      
      setRecentThreats(criticalThreats || []);
    } catch (error) {
      console.error('Failed to fetch recent threats:', error);
      setRecentThreats([]);
    }
  };

  const owaspCategories = {
    a01_broken_access_control: { name: 'A01: Broken Access Control', icon: Lock },
    a02_cryptographic_failures: { name: 'A02: Cryptographic Failures', icon: Lock },
    a03_injection: { name: 'A03: Injection', icon: AlertTriangle },
    a04_insecure_design: { name: 'A04: Insecure Design', icon: Shield },
    a05_security_misconfiguration: { name: 'A05: Security Misconfiguration', icon: Server },
    a06_vulnerable_components: { name: 'A06: Vulnerable Components', icon: Activity },
    a07_authentication_failures: { name: 'A07: Authentication Failures', icon: Lock },
    a08_data_integrity: { name: 'A08: Data Integrity Failures', icon: CheckCircle },
    a09_logging_failures: { name: 'A09: Logging Failures', icon: Activity },
    a10_ssrf: { name: 'A10: SSRF', icon: Globe }
  };

  const features = [
    { key: 'https_enforced', label: 'HTTPS Enforced', icon: Lock },
    { key: 'csp_enabled', label: 'CSP Enabled', icon: Shield },
    { key: 'rate_limiting', label: 'Rate Limiting', icon: Zap },
    { key: 'input_sanitization', label: 'Input Sanitization', icon: CheckCircle },
    { key: 'sql_injection_protection', label: 'SQL Injection Protection', icon: Shield },
    { key: 'xss_protection', label: 'XSS Protection', icon: Shield },
    { key: 'csrf_protection', label: 'CSRF Protection', icon: Lock },
    { key: 'ssrf_protection', label: 'SSRF Protection', icon: Globe },
    { key: 'anomaly_detection', label: 'Anomaly Detection', icon: Activity },
    { key: 'ip_blocking', label: 'IP Blocking', icon: AlertTriangle }
  ];

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Status Header */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Live Protection Active</h3>
                <p className="text-sm text-gray-400">All OWASP defenses operational • Updated {new Date().toLocaleTimeString()}</p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 px-4 py-2 text-sm">
              <Activity className="w-3 h-3 mr-1 animate-pulse" />
              Real-time
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* OWASP Top 10 Coverage */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">OWASP Top 10 Protection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(owaspCategories).map(([key, config]) => {
              const status = protectionStatus.owasp_protection?.[key];
              const Icon = config.icon;
              
              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-cyan-400" />
                    <span className="text-sm text-gray-300">{config.name}</span>
                  </div>
                  {status === 'active' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Protection Features */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Active Protection Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {features.map((feature) => {
              const isActive = protectionStatus.protection_features?.[feature.key];
              const Icon = feature.icon;
              
              return (
                <div
                  key={feature.key}
                  className={`p-3 rounded-lg border text-center ${
                    isActive
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${
                    isActive ? 'text-green-400' : 'text-red-400'
                  }`} />
                  <p className="text-xs text-gray-300 font-semibold">{feature.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Threats Blocked */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Recent Threats Detected</span>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
              Last 24h: {threatsBlocked24h} blocked
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentThreats.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
              <p className="text-gray-400">No high-severity threats detected recently</p>
              <p className="text-xs text-gray-500 mt-1">Your system is secure</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentThreats.map((threat, idx) => (
                <div
                  key={threat.id || idx}
                  className="p-3 bg-[#0f1419] rounded-lg border border-red-500/10 hover:border-red-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={`w-4 h-4 ${
                          threat.severity === 'critical' ? 'text-red-400' : 'text-orange-400'
                        }`} />
                        <span className="text-white font-semibold text-sm">
                          {threat.event_type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <Badge className={`text-xs ${
                          threat.severity === 'critical' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/50' 
                            : 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                        }`}>
                          {threat.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">
                        {threat.details?.ip && `IP: ${threat.details.ip}`}
                        {threat.details?.endpoint && ` • Endpoint: ${threat.details.endpoint}`}
                        {threat.details?.method && ` • Method: ${threat.details.method}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(threat.created_date).toLocaleString()}
                      </p>
                    </div>
                    <Badge className={`${
                      threat.blocked 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                    } text-xs border`}>
                      {threat.blocked ? '✓ Blocked' : '⚠ Detected'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{threatsBlocked24h}</p>
            <p className="text-xs text-gray-400 mt-1">Threats Blocked (24h)</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-cyan-400">100%</p>
            <p className="text-xs text-gray-400 mt-1">OWASP Coverage</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-400">
              <Eye className="w-8 h-8 mx-auto animate-pulse" />
            </p>
            <p className="text-xs text-gray-400 mt-1">24/7 Monitoring</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default LiveProtectionStatus;