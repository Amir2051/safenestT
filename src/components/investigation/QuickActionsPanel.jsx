import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Zap, AlertTriangle, Send, Search, Eye, FileText, ArrowUpCircle, 
    RefreshCw, Shield, Link2 
} from "lucide-react";
import { toast } from "sonner";

export default function QuickActionsPanel({ caseData, onUpdate, onOpenResponse, onOpenTracking }) {
    const [loading, setLoading] = useState(false);

    const handleEscalate = async () => {
        setLoading(true);
        try {
            await base44.functions.invoke('caseManagement', {
                action: 'update',
                data: {
                    id: caseData.id,
                    entityName: caseData._entityName || 'MyCase',
                    updates: {
                        priority: 'critical',
                        status: 'investigating',
                        last_activity: new Date().toISOString()
                    }
                }
            });
            
            // Log timeline event
            await base44.asServiceRole.entities.CaseTimelineEvent.create({
                case_id: caseData.id,
                event_type: 'status_change',
                description: 'Case escalated to CRITICAL by investigator via Quick Actions',
                performed_by: 'Investigator',
                timestamp: new Date().toISOString()
            });

            toast.success("Case escalated to Critical");
            if (onUpdate) onUpdate();
        } catch (e) {
            toast.error("Failed to escalate case");
        }
        setLoading(false);
    };

    const handleRunAnalysis = async () => {
        setLoading(true);
        const toastId = toast.loading("Running full analysis...");
        try {
            await base44.functions.invoke('caseSummary', { 
                caseId: caseData.id, 
                entityName: caseData._entityName || 'MyCase' 
            });
            await base44.functions.invoke('blockchainMonitor', { caseId: caseData.id });
            toast.success("Analysis complete", { id: toastId });
            if (onUpdate) onUpdate();
        } catch (e) {
            toast.error("Analysis failed", { id: toastId });
        }
        setLoading(false);
    };

    return (
        <Card className="bg-[#0f1419] border-cyan-500/20 mb-4">
            <CardHeader className="py-3 border-b border-cyan-500/10">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onOpenResponse}
                        className="bg-[#1a2332] border-cyan-500/20 hover:bg-cyan-500/10 text-cyan-400 flex flex-col items-center h-auto py-2 gap-1"
                    >
                        <Send className="w-4 h-4" />
                        <span className="text-[10px]">Deploy Response</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={onOpenTracking}
                        className="bg-[#1a2332] border-purple-500/20 hover:bg-purple-500/10 text-purple-400 flex flex-col items-center h-auto py-2 gap-1"
                    >
                        <Eye className="w-4 h-4" />
                        <span className="text-[10px]">Monitor Wallet</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleRunAnalysis}
                        disabled={loading}
                        className="bg-[#1a2332] border-blue-500/20 hover:bg-blue-500/10 text-blue-400 flex flex-col items-center h-auto py-2 gap-1"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span className="text-[10px]">Full Analysis</span>
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleEscalate}
                        disabled={loading || caseData.priority === 'critical'}
                        className="bg-[#1a2332] border-red-500/20 hover:bg-red-500/10 text-red-400 flex flex-col items-center h-auto py-2 gap-1"
                    >
                        <ArrowUpCircle className="w-4 h-4" />
                        <span className="text-[10px]">Escalate Case</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}