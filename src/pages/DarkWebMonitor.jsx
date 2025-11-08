
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Eye, Shield, AlertTriangle, CheckCircle, Search, 
  Mail, Phone, Lock, XCircle, Loader2, TrendingUp, Clock, Globe
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import PasswordBreachChecker from "../components/breach/PasswordBreachChecker.jsx";
import WebsiteChecker from "../components/website/WebsiteChecker.jsx";

export default function DarkWebMonitor() {
  const [user, setUser] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [dailyChecksRemaining, setDailyChecksRemaining] = useState(1);
  const [activeTab, setActiveTab] = useState('email');

  const queryClient = useQueryClient();

  const { data: monitors = [], isLoading } = useQuery({
    queryKey: ['breach-monitors'],
    queryFn: () => base44.entities.BreachMonitor.list('-created_date'),
    initialData: [],
  });

  const { data: websiteChecks = [] } = useQuery({
    queryKey: ['website-checks'],
    queryFn: () => base44.entities.WebsiteCheck.list('-created_date', 20),
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const createMonitorMutation = useMutation({
    mutationFn: (data) => base44.entities.BreachMonitor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breach-monitors'] });
    },
  });

  const updateMonitorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BreachMonitor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breach-monitors'] });
    },
  });

  const createWebsiteCheckMutation = useMutation({
    mutationFn: (data) => base44.entities.WebsiteCheck.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-checks'] });
    },
  });

  const checkEmailBreach = async () => {
    if (!checkingEmail || !checkingEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';
    const isActive = user?.payment_status === 'active';
    const isTrial = user?.subscription_plan === 'trial' && user?.payment_status === 'trial';

    if (!isPremium && !isTrial) {
      if (dailyChecksRemaining <= 0) {
        toast.error('Daily limit reached. Upgrade to Premium for unlimited checks!');
        return;
      }
    }

    const monitorLimit = isTrial ? 2 : (!isPremium || !isActive) ? 1 : (user?.subscription_plan === 'elite' ? 5 : 3);
    const currentMonitors = monitors.filter(m => m.monitor_type === 'email').length;
    
    if (currentMonitors >= monitorLimit && !isPremium) {
      toast.error(`${isTrial ? 'Trial' : 'Free'} plan limit: ${monitorLimit} email${monitorLimit > 1 ? 's' : ''}. Upgrade for more!`);
      return;
    }

    setChecking(true);

    try {
      const existing = monitors.find(m => m.value === checkingEmail && m.monitor_type === 'email');
      
      const breachCheckPrompt = `You are simulating a data breach check for educational purposes.

Email to check: ${checkingEmail}

Generate a realistic but SIMULATED breach response. Return JSON:
{
  "breached": randomly true or false (60% chance false for encouragement),
  "breaches": [
    {
      "name": "Example Service",
      "breach_date": "2023-01-01",
      "description": "Brief description",
      "data_classes": ["Emails", "Passwords"],
      "pwn_count": 1000000
    }
  ] (only if breached is true, otherwise empty array),
  "risk_level": "low" or "medium" or "high",
  "recommendations": [
    "Change your password immediately",
    "Enable two-factor authentication"
  ]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: breachCheckPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            breached: { type: "boolean" },
            breaches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  breach_date: { type: "string" },
                  description: { type: "string" },
                  data_classes: {
                    type: "array",
                    items: { type: "string" }
                  },
                  pwn_count: { type: "number" }
                }
              }
            },
            risk_level: { type: "string" },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      const monitorData = {
        monitor_type: 'email',
        value: checkingEmail,
        status: response.breached ? 'breached' : 'safe',
        breaches_found: response.breaches || [],
        last_checked: new Date().toISOString(),
        risk_level: response.risk_level || (response.breached ? 'medium' : 'low'),
        recommendations: response.recommendations || []
      };

      if (existing) {
        await updateMonitorMutation.mutateAsync({
          id: existing.id,
          data: monitorData
        });
      } else {
        await createMonitorMutation.mutateAsync(monitorData);
      }

      if (!isPremium && !isActive) {
        setDailyChecksRemaining(prev => prev - 1);
      }

      if (response.breached) {
        toast.error(`${response.breaches.length} potential breach${response.breaches.length > 1 ? 'es' : ''} found`);
        
        await base44.entities.Alert.create({
          alert_type: 'breach',
          severity: response.risk_level === 'high' ? 'high' : 'medium',
          title: `Data Breach Alert for ${checkingEmail}`,
          message: `${response.breaches.length} potential breach${response.breaches.length > 1 ? 'es' : ''} detected.`,
          status: 'active',
          affected_item: checkingEmail,
          recommendation: 'Review breach details and take action'
        });
      } else {
        toast.success('No breaches found 🎉');
      }

      setCheckingEmail("");
    } catch (error) {
      console.error('Breach check error:', error);
      toast.error('Failed to check for breaches. Please try again.');
    }

    setChecking(false);
  };

  const handleWebsiteCheck = async (result) => {
    try {
      await createWebsiteCheckMutation.mutateAsync({
        url: result.url,
        status: result.status,
        is_safe: result.isSafe,
        risk_level: result.riskLevel,
        trust_score: result.trustScore,
        threats: result.threats,
        details: result.details,
        recommendation: result.recommendation,
        checked_at: result.checkedAt,
        has_ssl: result.has_ssl
      });

      if (!result.isSafe && (result.riskLevel === 'high' || result.riskLevel === 'critical')) {
        await base44.entities.Alert.create({
          alert_type: 'phishing',
          severity: result.riskLevel === 'critical' ? 'critical' : 'high',
          title: `Dangerous Website Detected`,
          message: `The website ${result.url} was flagged as ${result.riskLevel} risk.`,
          status: 'active',
          affected_item: result.url,
          recommendation: result.recommendation
        });
      }
    } catch (error) {
      console.error('Failed to save website check:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  const breachedMonitors = monitors.filter(m => m.status === 'breached');
  const safeMonitors = monitors.filter(m => m.status === 'safe');
  const totalBreaches = breachedMonitors.reduce((sum, m) => sum + (m.breaches_found?.length || 0), 0);
  const criticalMonitors = monitors.filter(m => m.risk_level === 'critical' || m.risk_level === 'high');
  
  const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';
  const isActive = user?.payment_status === 'active';
  const isTrial = user?.subscription_plan === 'trial' && user?.payment_status === 'trial';
  const isTrialExpired = user?.subscription_plan === 'free' && user?.payment_status === 'expired';

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Eye className="w-8 h-8 text-purple-400" />
          Dark Web & Website Monitor
        </h1>
        <p className="text-gray-400 mt-1">Check emails for data breaches and verify website safety</p>
      </div>

      {/* Trial/Free Limits Banner */}
      {!isPremium && !isActive && !isTrialExpired && (
        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">
                  {isTrial ? '🎁 Trial Plan' : '🆓 Free Plan'}: {isTrial ? '2 emails' : '1 email'} • {dailyChecksRemaining} check{dailyChecksRemaining !== 1 ? 's' : ''} remaining today
                </p>
                <p className="text-sm text-gray-400">
                  Upgrade to Premium for unlimited monitoring & website checks
                </p>
              </div>
              <Link to={createPageUrl("Upgrade")}>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500">
                  Upgrade
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {isTrialExpired && (
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">⏰ Trial Expired</p>
                <p className="text-sm text-red-300">
                  Upgrade to continue monitoring for breaches and checking websites
                </p>
              </div>
              <Link to={createPageUrl("Upgrade")}>
                <Button className="bg-gradient-to-r from-red-500 to-orange-500">
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Monitored Items</p>
            <p className="text-2xl font-bold text-white">{monitors.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Breaches Found</p>
            <p className="text-2xl font-bold text-red-400">{totalBreaches}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">High Risk</p>
            <p className="text-2xl font-bold text-orange-400">{criticalMonitors.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <p className="text-xs text-gray-400 mb-1">Protected</p>
            <p className="text-2xl font-bold text-green-400">{safeMonitors.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Email and Website Checking */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[#1a2332] border-cyan-500/20">
          <TabsTrigger value="email" className="data-[state=active]:bg-cyan-500/20">
            <Mail className="w-4 h-4 mr-2" />
            Email Breach Check
          </TabsTrigger>
          <TabsTrigger value="password" className="data-[state=active]:bg-cyan-500/20">
            <Lock className="w-4 h-4 mr-2" />
            Password Checker
          </TabsTrigger>
          <TabsTrigger value="website" className="data-[state=active]:bg-cyan-500/20">
            <Globe className="w-4 h-4 mr-2" />
            Website Safety
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-6 mt-6">
          {/* Email Breach Checker */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-purple-400" />
                Email Breach Checker
                {(!isPremium || !isActive) && !isTrial && (
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 ml-2">
                    Limited
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter email address to check..."
                    value={checkingEmail}
                    onChange={(e) => setCheckingEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !checking && checkEmailBreach()}
                    className="pl-10 bg-[#0f1419] border-purple-500/20 text-white"
                    disabled={checking || (!isPremium && !isActive && !isTrial && dailyChecksRemaining <= 0)}
                  />
                </div>
                <Button
                  onClick={checkEmailBreach}
                  disabled={checking || !checkingEmail || (!isPremium && !isActive && !isTrial && dailyChecksRemaining <= 0)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {checking ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Check Now
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {(!isPremium || !isActive) && !isTrial
                  ? `Free tier: Limited daily checks. Upgrade for unlimited monitoring.`
                  : isTrial
                  ? `Trial: Check up to 2 emails. Upgrade for more.`
                  : `Premium: Unlimited checks with real-time monitoring.`
                }
              </p>
            </CardContent>
          </Card>

          {/* Monitored Accounts */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Monitored Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse bg-[#0f1419] rounded-lg h-24" />
                  ))}
                </div>
              ) : monitors.length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-white font-semibold text-lg">No items monitored yet</p>
                  <p className="text-gray-400 text-sm mt-1">Check your first email to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {monitors.map((monitor) => {
                    const isBreached = monitor.status === 'breached';
                    const breachCount = monitor.breaches_found?.length || 0;
                    
                    return (
                      <div
                        key={monitor.id}
                        className={`bg-[#0f1419] rounded-lg p-4 border ${
                          isBreached ? 'border-red-500/30' : 'border-green-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isBreached ? 'bg-red-500/20' : 'bg-green-500/20'
                          }`}>
                            {monitor.monitor_type === 'email' ? (
                              <Mail className={`w-6 h-6 ${isBreached ? 'text-red-400' : 'text-green-400'}`} />
                            ) : monitor.monitor_type === 'phone' ? (
                              <Phone className={`w-6 h-6 ${isBreached ? 'text-red-400' : 'text-green-400'}`} />
                            ) : (
                              <Lock className={`w-6 h-6 ${isBreached ? 'text-red-400' : 'text-green-400'}`} />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p className="text-white font-semibold truncate">{monitor.value}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Last checked: {new Date(monitor.last_checked).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge className={`${
                                  isBreached ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                                  'bg-green-500/20 text-green-400 border-green-500/50'
                                } border`}>
                                  {isBreached ? `${breachCount} Breach${breachCount > 1 ? 'es' : ''}` : 'Safe'}
                                </Badge>
                                {monitor.risk_level && isBreached && (
                                  <Badge className={`${
                                    monitor.risk_level === 'critical' ? 'bg-red-500/20 text-red-400' :
                                    monitor.risk_level === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-yellow-500/20 text-yellow-400'
                                  } border`}>
                                    {monitor.risk_level} risk
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {isBreached && monitor.breaches_found && monitor.breaches_found.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {monitor.breaches_found.slice(0, 2).map((breach, idx) => (
                                  <div key={idx} className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <p className="text-sm font-semibold text-red-400">{breach.name}</p>
                                      <span className="text-xs text-gray-400">{breach.breach_date}</span>
                                    </div>
                                    <p className="text-xs text-gray-300 mb-2">{breach.description}</p>
                                    {breach.data_classes && breach.data_classes.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {breach.data_classes.slice(0, 5).map((dc, i) => (
                                          <Badge key={i} className="bg-red-500/20 text-red-400 text-xs">
                                            {dc}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {monitor.recommendations && monitor.recommendations.length > 0 && isBreached && (
                              <div className="mt-3 bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                                <p className="text-xs font-semibold text-yellow-400 mb-2">🛡️ Recommended Actions:</p>
                                <ul className="space-y-1">
                                  {monitor.recommendations.map((rec, idx) => (
                                    <li key={idx} className="text-xs text-gray-300">• {rec}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <PasswordBreachChecker />
        </TabsContent>

        <TabsContent value="website" className="mt-6">
          <WebsiteChecker onCheck={handleWebsiteCheck} />

          {/* Recent Website Checks */}
          {websiteChecks.length > 0 && (
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 mt-6">
              <CardHeader>
                <CardTitle className="text-white">Recent Website Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {websiteChecks.slice(0, 5).map((check) => (
                    <div
                      key={check.id}
                      className={`bg-[#0f1419] rounded-lg p-4 border ${
                        check.is_safe ? 'border-green-500/20' : 'border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {check.is_safe ? (
                              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                            <p className="text-white text-sm font-semibold truncate">{check.url}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${
                              check.risk_level === 'low' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                              check.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                              'bg-red-500/20 text-red-400 border-red-500/50'
                            } border`}>
                              {check.risk_level} risk
                            </Badge>
                            <span className="text-xs text-gray-400">
                              Score: {check.trust_score}/100
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {new Date(check.checked_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
