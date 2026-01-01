import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, Loader2, Database, Eye, Shield, 
  RefreshCw, CheckCircle, XCircle, Search, Wrench
} from "lucide-react";
import { toast } from "sonner";

export default function P0IncidentPanel() {
  const [auditing, setAuditing] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userCheckResult, setUserCheckResult] = useState(null);

  const runFullAudit = async () => {
    setAuditing(true);
    try {
      const response = await base44.functions.invoke('p0IncidentResponse', {
        action: 'full_audit'
      });
      
      setAuditResults(response.data);
      
      if (response.data.severity === 'CRITICAL') {
        toast.error(`CRITICAL: ${response.data.audit_results.cases_with_issues} cases have visibility issues!`);
      } else {
        toast.success('Audit complete - no critical issues found');
      }
    } catch (error) {
      toast.error('Audit failed: ' + error.message);
    }
    setAuditing(false);
  };

  const forceFixAll = async () => {
    if (!confirm('FORCE FIX ALL CASES? This will update ownership and visibility for ALL cases in the database. Continue?')) {
      return;
    }

    setFixing(true);
    try {
      const response = await base44.functions.invoke('p0IncidentResponse', {
        action: 'force_fix_all'
      });
      
      toast.success(`✅ Fixed ${response.data.results.cases_fixed} cases!`);
      
      // Re-run audit
      await runFullAudit();
    } catch (error) {
      toast.error('Fix failed: ' + error.message);
    }
    setFixing(false);
  };

  const checkUserVisibility = async () => {
    if (!userEmail) return;
    
    try {
      const response = await base44.functions.invoke('p0IncidentResponse', {
        action: 'verify_user_visibility',
        user_email: userEmail
      });
      
      setUserCheckResult(response.data);
      toast.success(`Found ${response.data.total_cases_for_user} cases for ${userEmail}`);
    } catch (error) {
      toast.error('User check failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert className="bg-red-950/50 border-red-500">
        <AlertTriangle className="h-5 w-5 text-red-400" />
        <AlertDescription className="text-red-200">
          <strong className="text-red-300">P0 PRODUCTION INCIDENT</strong> - Case visibility failure. 
          Use this panel to diagnose and recover missing data.
        </AlertDescription>
      </Alert>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Emergency Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={runFullAudit}
              disabled={auditing}
              className="h-20 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            >
              {auditing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Running Audit...
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Run Full System Audit
                </>
              )}
            </Button>

            <Button
              onClick={forceFixAll}
              disabled={fixing || !auditResults}
              className="h-20 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
            >
              {fixing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Fixing Cases...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5 mr-2" />
                  Force Fix ALL Cases
                </>
              )}
            </Button>
          </div>

          {/* User-Specific Check */}
          <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
            <Label className="text-white mb-2 block">Check Specific User</Label>
            <div className="flex gap-2">
              <Input
                placeholder="user@email.com"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="bg-black/20 border-gray-700 text-white"
              />
              <Button
                onClick={checkUserVisibility}
                variant="outline"
                className="border-cyan-500/30 text-cyan-400"
              >
                <Search className="w-4 h-4 mr-2" />
                Check
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Results */}
      {auditResults && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-cyan-400" />
                Audit Results
              </span>
              <Badge className={
                auditResults.severity === 'CRITICAL' 
                  ? 'bg-red-500/20 text-red-400 border-red-500/50'
                  : 'bg-green-500/20 text-green-400 border-green-500/50'
              }>
                {auditResults.severity}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-1">Total Cases (DB)</p>
                <p className="text-2xl font-bold text-white">
                  {auditResults.audit_results.total_cases_in_db}
                </p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg border border-green-500/10">
                <p className="text-xs text-gray-400 mb-1">Admin Visible</p>
                <p className="text-2xl font-bold text-green-400">
                  {auditResults.audit_results.admin_visible_cases}
                </p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg border border-red-500/10">
                <p className="text-xs text-gray-400 mb-1">Hidden Cases</p>
                <p className="text-2xl font-bold text-red-400">
                  {auditResults.audit_results.visibility_gap}
                </p>
              </div>

              <div className="p-4 bg-[#0f1419] rounded-lg border border-orange-500/10">
                <p className="text-xs text-gray-400 mb-1">Total Losses</p>
                <p className="text-2xl font-bold text-orange-400">
                  ${auditResults.audit_results.total_reported_losses.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Issues List */}
            {auditResults.audit_results.cases_with_issues > 0 && (
              <div className="space-y-2">
                <h4 className="text-white font-semibold mb-3">
                  Cases with Issues ({auditResults.audit_results.cases_with_issues})
                </h4>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {auditResults.audit_results.issues.map((issue, idx) => (
                    <div key={idx} className="p-3 bg-red-950/20 rounded border border-red-500/20">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-white font-mono text-sm">
                          {issue.case_number || issue.case_id}
                        </span>
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          ${issue.amount?.toLocaleString()}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {issue.problems.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-red-400/30 text-red-300">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* User Check Results */}
      {userCheckResult && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-400" />
              User Cases: {userCheckResult.user_email}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white mb-4">
              Found <strong>{userCheckResult.total_cases_for_user}</strong> cases
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {userCheckResult.cases.map(c => (
                <div key={c.id} className="p-3 bg-[#0f1419] rounded border border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-mono">{c.case_number}</span>
                    <Badge className="bg-cyan-500/20 text-cyan-400">{c.status}</Badge>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">${c.amount?.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}