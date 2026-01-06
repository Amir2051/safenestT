import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, Wrench, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function CaseVisibilityFixer() {
  const [loading, setLoading] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [diagnosticResult, setDiagnosticResult] = useState(null);

  const runDiagnostic = async () => {
    if (!userEmail.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    setDiagnosing(true);
    try {
      const response = await base44.functions.invoke('fixCaseVisibility', {
        action: 'diagnose',
        target_user_email: userEmail.trim()
      });

      setDiagnosticResult(response.data);
      
      if (response.data.broken_cases_count > 0) {
        toast.warning(`Found ${response.data.broken_cases_count} cases with visibility issues`);
      } else {
        toast.success('All cases have correct visibility');
      }
    } catch (error) {
      toast.error('Diagnostic failed: ' + error.message);
      setDiagnosticResult(null);
    }
    setDiagnosing(false);
  };

  const repairUser = async () => {
    if (!userEmail.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    if (!confirm(`Repair all cases for ${userEmail}?\n\nThis will update user_id and email fields to ensure proper visibility.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('fixCaseVisibility', {
        action: 'repair_user',
        target_user_email: userEmail.trim()
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Re-run diagnostic
        await runDiagnostic();
      } else {
        toast.error(response.data.error);
      }
    } catch (error) {
      toast.error('Repair failed: ' + error.message);
    }
    setLoading(false);
  };

  const repairAll = async () => {
    if (!confirm('⚠️ REPAIR ALL CASES IN DATABASE?\n\nThis will:\n- Fix user_id for ALL cases\n- Sync email fields\n- Restore visibility\n\nContinue?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('fixCaseVisibility', {
        action: 'repair_all'
      });

      if (response.data.success) {
        toast.success(response.data.message, { duration: 10000 });
      } else {
        toast.error(response.data.error);
      }
    } catch (error) {
      toast.error('Global repair failed: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <Card className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-orange-400" />
          Case Visibility Repair Tool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-orange-950/30 border-orange-500/50">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <AlertDescription className="text-orange-200 text-sm">
            Use this tool to diagnose and fix cases that aren't visible to their owners
          </AlertDescription>
        </Alert>

        {/* User-Specific Repair */}
        <div className="space-y-3 p-4 bg-black/20 rounded-lg border border-orange-500/20">
          <Label className="text-gray-300">Diagnose Specific User</Label>
          <div className="flex gap-2">
            <Input
              placeholder="user@email.com"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="bg-[#0f1419] border-gray-700 text-white"
            />
            <Button
              onClick={runDiagnostic}
              disabled={diagnosing || !userEmail.trim()}
              variant="outline"
              className="border-cyan-500/30 text-cyan-400"
            >
              {diagnosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Diagnostic Results */}
        {diagnosticResult && (
          <div className="p-4 bg-black/30 rounded-lg border border-cyan-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-semibold">Diagnostic Results</h4>
              {diagnosticResult.broken_cases_count === 0 ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  All Good
                </Badge>
              ) : (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Issues Found
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
                <p className="text-gray-400 text-xs">User</p>
                <p className="text-white font-semibold">{diagnosticResult.target_user.email}</p>
              </div>
              <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                <p className="text-gray-400 text-xs">Total Cases</p>
                <p className="text-white font-bold text-lg">{diagnosticResult.total_cases_found}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-gray-400 text-xs">Working</p>
                <p className="text-green-400 font-bold text-lg">{diagnosticResult.working_cases_count}</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                <p className="text-gray-400 text-xs">Broken</p>
                <p className="text-red-400 font-bold text-lg">{diagnosticResult.broken_cases_count}</p>
              </div>
            </div>

            {diagnosticResult.broken_cases_count > 0 && (
              <>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {diagnosticResult.issues.slice(0, 5).map((issue, idx) => (
                    <div key={idx} className="p-2 bg-red-950/20 rounded border border-red-500/20 text-xs">
                      <p className="text-white font-mono">{issue.case_number || issue.case_id}</p>
                      <p className="text-red-400">{issue.problem}</p>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={repairUser}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Repairing...
                    </>
                  ) : (
                    <>
                      <Wrench className="w-4 h-4 mr-2" />
                      Repair {diagnosticResult.broken_cases_count} Cases
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Global Repair */}
        <div className="pt-4 border-t border-orange-500/20">
          <Button
            onClick={repairAll}
            disabled={loading}
            variant="outline"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Global Repair...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4 mr-2" />
                Repair ALL Cases (Database-Wide)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}