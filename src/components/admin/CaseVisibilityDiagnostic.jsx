import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, AlertCircle, CheckCircle, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";

export default function CaseVisibilityDiagnostic() {
  const [email, setEmail] = useState("");
  const [diagnostic, setDiagnostic] = useState(null);
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);

  const runDiagnostic = async () => {
    if (!email) {
      toast.error("Please enter a user email");
      return;
    }

    setChecking(true);
    try {
      // Fetch user
      const users = await base44.entities.User.list(null, 1000);
      const targetUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!targetUser) {
        toast.error("User not found");
        setChecking(false);
        return;
      }

      // Fetch all cases
      const allCases = await base44.entities.MyCase.list(null, 5000);

      // Find cases that SHOULD belong to this user
      const matchingCases = allCases.filter(c => {
        const cEmail = (c.client_email || c.created_by || c.created_by_email || '').toLowerCase().trim();
        const tEmail = targetUser.email.toLowerCase().trim();
        return cEmail === tEmail || c.user_id === targetUser.id;
      });

      // Check visibility issues
      const issues = [];
      for (const c of matchingCases) {
        const problems = [];
        
        if (c.user_id !== targetUser.id) {
          problems.push(`user_id mismatch (${c.user_id} !== ${targetUser.id})`);
        }
        if (c.created_by !== targetUser.email) {
          problems.push(`created_by mismatch (${c.created_by})`);
        }
        if (c.client_email !== targetUser.email) {
          problems.push(`client_email mismatch (${c.client_email})`);
        }
        if (c.created_by_email !== targetUser.email) {
          problems.push(`created_by_email mismatch (${c.created_by_email})`);
        }

        if (problems.length > 0) {
          issues.push({
            case_id: c.id,
            case_number: c.case_number,
            problems
          });
        }
      }

      setDiagnostic({
        user: targetUser,
        total_cases: matchingCases.length,
        cases_with_issues: issues.length,
        issues
      });

      if (issues.length === 0) {
        toast.success("No visibility issues found!");
      } else {
        toast.warning(`Found ${issues.length} cases with visibility issues`);
      }
    } catch (error) {
      toast.error("Diagnostic failed: " + error.message);
    }
    setChecking(false);
  };

  const runFix = async () => {
    setFixing(true);
    try {
      const res = await base44.functions.invoke('caseManagement', {
        action: 'recover_access'
      });

      if (res.data.success) {
        toast.success(res.data.message);
        if (diagnostic) {
          runDiagnostic(); // Re-run diagnostic
        }
      } else {
        toast.error(res.data.error || "Fix failed");
      }
    } catch (error) {
      toast.error("Fix failed: " + error.message);
    }
    setFixing(false);
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-400" />
          Case Visibility Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter user email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#0f1419] border-cyan-500/30 text-white"
          />
          <Button
            onClick={runDiagnostic}
            disabled={checking}
            className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
          >
            {checking ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        <Button
          onClick={runFix}
          disabled={fixing}
          className="w-full bg-green-500/20 text-green-400 hover:bg-green-500/30"
        >
          {fixing ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Fixing All Cases...</>
          ) : (
            <><Shield className="w-4 h-4 mr-2" />Fix All Case Visibility Issues</>
          )}
        </Button>

        {diagnostic && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <p className="text-white font-medium mb-2">{diagnostic.user.full_name}</p>
              <p className="text-gray-400 text-sm">{diagnostic.user.email}</p>
              <div className="mt-3 flex gap-2">
                <Badge className="bg-cyan-500/20 text-cyan-400">
                  {diagnostic.total_cases} total cases
                </Badge>
                <Badge className={diagnostic.cases_with_issues > 0 
                  ? "bg-red-500/20 text-red-400 border-red-500/50" 
                  : "bg-green-500/20 text-green-400 border-green-500/50"
                }>
                  {diagnostic.cases_with_issues === 0 ? (
                    <><CheckCircle className="w-3 h-3 mr-1" />All visible</>
                  ) : (
                    <><AlertCircle className="w-3 h-3 mr-1" />{diagnostic.cases_with_issues} issues</>
                  )}
                </Badge>
              </div>
            </div>

            {diagnostic.issues.length > 0 && (
              <div className="space-y-2">
                <p className="text-white font-medium text-sm">Cases with Issues:</p>
                {diagnostic.issues.slice(0, 5).map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-red-500/10 rounded border border-red-500/20"
                  >
                    <p className="text-red-400 font-mono text-xs mb-1">
                      {issue.case_number || issue.case_id}
                    </p>
                    {issue.problems.map((prob, i) => (
                      <p key={i} className="text-gray-400 text-xs">• {prob}</p>
                    ))}
                  </div>
                ))}
                {diagnostic.issues.length > 5 && (
                  <p className="text-gray-500 text-xs">
                    +{diagnostic.issues.length - 5} more issues
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}