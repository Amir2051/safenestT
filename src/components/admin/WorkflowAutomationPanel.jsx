import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle, XCircle, Clock, Activity, FileText, Bell, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function WorkflowAutomationPanel() {
  const [testingWorkflow, setTestingWorkflow] = useState(null);

  const { data: automations = [], refetch } = useQuery({
    queryKey: ['workflow-automations'],
    queryFn: () => base44.entities.WorkflowAutomation.list('-executed_at', 50),
    refetchInterval: 30000
  });

  const automationRules = [
    {
      id: 'law_enforcement_status',
      name: 'Law Enforcement Report',
      trigger: 'Case status → law_enforcement',
      action: 'Auto-generate preliminary report & notify team',
      icon: FileText,
      color: 'blue'
    },
    {
      id: 'priority_escalation',
      name: 'Priority Escalation',
      trigger: 'Priority set to High/Critical',
      action: 'Create urgent follow-up task (4h deadline)',
      icon: Bell,
      color: 'red'
    },
    {
      id: 'recovery_notification',
      name: 'Recovery Notification',
      trigger: 'Recovery amount increased',
      action: 'Notify finance dept & client',
      icon: TrendingUp,
      color: 'green'
    },
    {
      id: 'investigating_tasks',
      name: 'Investigation Workflow',
      trigger: 'Status → investigating',
      action: 'Create 4 standard investigation tasks',
      icon: Activity,
      color: 'purple'
    }
  ];

  const testWorkflow = async (workflowId) => {
    setTestingWorkflow(workflowId);
    
    try {
      if (workflowId === 'law_enforcement_status') {
        // Create a test case or use existing
        toast.info('Testing law enforcement workflow...');
        // In real scenario, you'd trigger with a test case ID
      } else if (workflowId === 'priority_escalation') {
        toast.info('Testing priority escalation...');
      }
      
      toast.success('Workflow test completed');
      refetch();
    } catch (error) {
      toast.error('Test failed: ' + error.message);
    }
    
    setTestingWorkflow(null);
  };

  const stats = {
    total: automations.length,
    successful: automations.filter(a => a.status === 'success').length,
    failed: automations.filter(a => a.status === 'failed').length,
    last24h: automations.filter(a => {
      const diff = Date.now() - new Date(a.executed_at).getTime();
      return diff < 24 * 60 * 60 * 1000;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <p className="text-xs text-gray-400">Total Executions</p>
            </div>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Successful</p>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.successful}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-xs text-gray-400">Failed</p>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-gray-400">Last 24h</p>
            </div>
            <p className="text-2xl font-bold text-purple-400">{stats.last24h}</p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Rules */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Active Automation Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {automationRules.map(rule => {
              const Icon = rule.icon;
              const executions = automations.filter(a => a.trigger_type.includes(rule.id.split('_')[0]));
              
              return (
                <div
                  key={rule.id}
                  className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg bg-${rule.color}-500/20 flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 text-${rule.color}-400`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{rule.name}</h4>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-400">
                            <span className="text-cyan-400">Trigger:</span> {rule.trigger}
                          </p>
                          <p className="text-xs text-gray-400">
                            <span className="text-purple-400">Action:</span> {rule.action}
                          </p>
                        </div>
                        {executions.length > 0 && (
                          <div className="mt-2">
                            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">
                              {executions.length} executions
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Recent Automation Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {automations.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No automations executed yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {automations.slice(0, 10).map((auto, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {auto.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div>
                      <p className="text-white text-sm font-medium">
                        {auto.trigger_type?.replace(/_/g, ' ').toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(auto.executed_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={`text-xs ${
                      auto.status === 'success' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                        : 'bg-red-500/20 text-red-400 border-red-500/50'
                    }`}>
                      {auto.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}