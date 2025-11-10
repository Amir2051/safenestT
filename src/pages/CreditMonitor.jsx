import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Shield, AlertTriangle, Clock, CheckCircle,
  FileText, Lock, Loader2, CreditCard, Calendar, Scale
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CreditMonitor() {
  const [user, setUser] = useState(null);
  const [showConsentForm, setShowConsentForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [disclosureAcknowledged, setDisclosureAcknowledged] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: consent, isLoading: consentLoading } = useQuery({
    queryKey: ['credit-consent'],
    queryFn: async () => {
      const response = await base44.functions.invoke('creditService', {
        endpoint: 'consent'
      });
      return response.data;
    },
    enabled: !!user
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['credit-reports'],
    queryFn: async () => {
      const response = await base44.functions.invoke('creditService', {
        endpoint: 'reports'
      });
      return response.data;
    },
    enabled: !!user && consent?.has_consent
  });

  const giveConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('creditService', {
        endpoint: 'give-consent',
        explicit_consent: consentGiven,
        disclosure_acknowledged: disclosureAcknowledged
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-consent'] });
      toast.success('✅ Consent granted! You can now request credit reports.');
      setShowConsentForm(false);
      setConsentGiven(false);
      setDisclosureAcknowledged(false);
    },
    onError: (error) => {
      toast.error('Failed to give consent: ' + error.message);
    }
  });

  const requestReportMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await base44.functions.invoke('creditService', {
        endpoint: 'request-report',
        ...formData,
        consent_id: consent.consent_id
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['credit-reports'] });
      toast.success('📊 ' + data.message, { duration: 5000 });
      setShowRequestForm(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to request report');
    }
  });

  const revokeConsentMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('creditService', {
        endpoint: 'revoke-consent',
        consent_id: consent.consent_id
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-consent'] });
      toast.success('Consent revoked');
    },
    onError: (error) => {
      toast.error('Failed to revoke consent: ' + error.message);
    }
  });

  const handleRequestReport = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    requestReportMutation.mutate({
      ssn: formData.get('ssn'),
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      dob: formData.get('dob'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      zip: formData.get('zip')
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const reports = reportsData?.reports || [];
  const latestReport = reports.find(r => r.status === 'completed');
  const canRequestReport = !latestReport || 
    (latestReport.next_allowed_date && new Date(latestReport.next_allowed_date) < new Date());

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-purple-400" />
          Credit Monitor
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-none">
            FCRA Compliant
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Monitor your credit score • Soft pulls only • AES-256 encryption
        </p>
      </div>

      {/* FCRA Compliance Banner */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Scale className="w-6 h-6 text-green-400 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-1">FCRA Compliant Credit Monitoring</p>
              <ul className="text-green-300 text-sm space-y-1">
                <li>• <strong>Soft Pull Only:</strong> Won't affect your credit score</li>
                <li>• <strong>AES-256 Encryption:</strong> All PII encrypted before storage</li>
                <li>• <strong>Rate Limited:</strong> 1 report every 30 days</li>
                <li>• <strong>7-Year Retention:</strong> Per FCRA requirements</li>
                <li>• <strong>Dispute Rights:</strong> Contact bureau if info is inaccurate</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No Consent State */}
      {!consentLoading && !consent?.has_consent && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              Credit Monitoring Consent Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showConsentForm ? (
              <div className="space-y-4">
                <p className="text-gray-300">
                  To monitor your credit score, you must first provide consent as required by the 
                  Fair Credit Reporting Act (FCRA).
                </p>
                <Button
                  onClick={() => setShowConsentForm(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  Review & Give Consent
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-[#0f1419] rounded-lg border border-purple-500/20 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                    {consent?.consent_text || 'Loading...'}
                  </pre>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="disclosure"
                      checked={disclosureAcknowledged}
                      onCheckedChange={setDisclosureAcknowledged}
                    />
                    <label htmlFor="disclosure" className="text-sm text-gray-300 cursor-pointer">
                      I have read and acknowledge the FCRA disclosure above
                    </label>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="consent"
                      checked={consentGiven}
                      onCheckedChange={setConsentGiven}
                    />
                    <label htmlFor="consent" className="text-sm text-gray-300 cursor-pointer">
                      I authorize SafeNest to obtain my consumer credit report for credit monitoring purposes
                    </label>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowConsentForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => giveConsentMutation.mutate()}
                    disabled={!consentGiven || !disclosureAcknowledged || giveConsentMutation.isPending}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    {giveConsentMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Give Consent'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Has Consent - Main Dashboard */}
      {consent?.has_consent && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Credit Score</p>
                    <p className="text-3xl font-bold text-purple-400">
                      {latestReport?.credit_score || '---'}
                    </p>
                  </div>
                </div>
                {latestReport?.score_change && (
                  <div className={`flex items-center gap-1 text-sm ${
                    latestReport.score_change > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {latestReport.score_change > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(latestReport.score_change)} points</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-8 h-8 text-cyan-400" />
                  <div>
                    <p className="text-xs text-gray-400">Total Reports</p>
                    <p className="text-3xl font-bold text-cyan-400">{reports.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Calendar className="w-8 h-8 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400">Last Updated</p>
                    <p className="text-sm font-semibold text-green-400">
                      {latestReport?.completed_date 
                        ? format(new Date(latestReport.completed_date), 'MMM dd, yyyy')
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Request New Report */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                  Request Credit Report
                </span>
                {!canRequestReport && latestReport && (
                  <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">
                    Next: {format(new Date(latestReport.next_allowed_date), 'MMM dd')}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!canRequestReport && latestReport ? (
                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-orange-400 mt-0.5" />
                    <div>
                      <p className="text-orange-300 font-semibold mb-1">Rate Limit Active</p>
                      <p className="text-sm text-gray-400">
                        You can request 1 credit report every 30 days. Your next report will be available on{' '}
                        <strong>{format(new Date(latestReport.next_allowed_date), 'MMMM dd, yyyy')}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : !showRequestForm ? (
                <Button
                  onClick={() => setShowRequestForm(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Request New Report
                </Button>
              ) : (
                <form onSubmit={handleRequestReport} className="space-y-4">
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-cyan-400 mt-0.5" />
                      <p className="text-xs text-cyan-300">
                        All information is encrypted with AES-256-GCM before storage. 
                        Encryption keys are never stored with your data.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">First Name</Label>
                      <Input name="first_name" required className="bg-[#0f1419] border-purple-500/20" />
                    </div>
                    <div>
                      <Label className="text-gray-300">Last Name</Label>
                      <Input name="last_name" required className="bg-[#0f1419] border-purple-500/20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">SSN (XXX-XX-XXXX)</Label>
                      <Input 
                        name="ssn" 
                        type="password"
                        placeholder="XXX-XX-XXXX"
                        required 
                        className="bg-[#0f1419] border-purple-500/20" 
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Date of Birth</Label>
                      <Input name="dob" type="date" required className="bg-[#0f1419] border-purple-500/20" />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Street Address</Label>
                    <Input name="address" required className="bg-[#0f1419] border-purple-500/20" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">City</Label>
                      <Input name="city" required className="bg-[#0f1419] border-purple-500/20" />
                    </div>
                    <div>
                      <Label className="text-gray-300">State</Label>
                      <Input name="state" placeholder="NY" required className="bg-[#0f1419] border-purple-500/20" />
                    </div>
                    <div>
                      <Label className="text-gray-300">ZIP Code</Label>
                      <Input name="zip" required className="bg-[#0f1419] border-purple-500/20" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      onClick={() => setShowRequestForm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={requestReportMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                    >
                      {requestReportMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Requesting...
                        </>
                      ) : (
                        'Request Report'
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Reports History */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-white">Report History</CardTitle>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No reports yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={
                              report.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              report.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                              report.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }>
                              {report.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {report.status}
                            </Badge>
                            {report.significant_change && (
                              <Badge className="bg-orange-500/20 text-orange-400">
                                Significant Change
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-400 text-sm">
                            Requested: {format(new Date(report.request_date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        {report.status === 'completed' && (
                          <div className="text-right">
                            <p className="text-3xl font-bold text-purple-400">
                              {report.credit_score}
                            </p>
                            {report.score_change !== 0 && (
                              <p className={`text-sm flex items-center gap-1 justify-end ${
                                report.score_change > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {report.score_change > 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {report.score_change > 0 ? '+' : ''}{report.score_change}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consent Management */}
          <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
            <CardHeader>
              <CardTitle className="text-white">Consent Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg">
                  <div>
                    <p className="text-white font-semibold">FCRA Consent Active</p>
                    <p className="text-xs text-gray-400">
                      Expires: {format(new Date(consent.expires_at), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <Button
                  onClick={() => revokeConsentMutation.mutate()}
                  disabled={revokeConsentMutation.isPending}
                  variant="outline"
                  className="border-orange-500/20 text-orange-400"
                >
                  {revokeConsentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Revoking...
                    </>
                  ) : (
                    'Revoke Consent'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}