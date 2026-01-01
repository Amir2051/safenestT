import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Database, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function EmergencyRecoveryPanel() {
    const [auditData, setAuditData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recovering, setRecovering] = useState(false);

    const runAudit = async () => {
        setLoading(true);
        try {
            const response = await base44.functions.invoke('emergencyDataRecovery', { action: 'audit' });
            
            if (response.data.error) throw new Error(response.data.error);
            
            setAuditData(response.data);
            toast.success('Audit completed');
        } catch (error) {
            toast.error('Audit failed: ' + error.message);
        }
        setLoading(false);
    };

    const runRecovery = async () => {
        if (!confirm('⚠️ This will recover and consolidate ALL case data. Continue?')) return;
        
        setRecovering(true);
        try {
            const response = await base44.functions.invoke('emergencyDataRecovery', { action: 'recover' });
            
            if (response.data.error) throw new Error(response.data.error);
            
            toast.success(`✅ Recovery Complete: ${response.data.stats.cases_recovered} cases recovered, ${response.data.stats.cases_updated} updated`);
            setAuditData(response.data);
            
            // Auto-refresh to show new data
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            toast.error('Recovery failed: ' + error.message);
        }
        setRecovering(false);
    };

    return (
        <Card className="bg-gradient-to-br from-red-950/20 to-orange-950/20 border-red-500/30">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    Emergency Data Recovery
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex gap-3">
                    <Button
                        onClick={runAudit}
                        disabled={loading}
                        variant="outline"
                        className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    >
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                        Run Full Audit
                    </Button>
                    
                    <Button
                        onClick={runRecovery}
                        disabled={recovering || !auditData}
                        className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
                    >
                        {recovering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Recover All Data
                    </Button>
                </div>

                {auditData && (
                    <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                                <p className="text-gray-400 text-xs">Total Cases</p>
                                <p className="text-white text-2xl font-bold">{auditData.summary?.total_cases_all_entities || auditData.final_state?.total_cases || 0}</p>
                            </div>
                            <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
                                <p className="text-gray-400 text-xs">Users</p>
                                <p className="text-white text-2xl font-bold">{auditData.summary?.users_with_submissions || auditData.final_state?.unique_users || 0}</p>
                            </div>
                            <div className="p-3 bg-[#0f1419] rounded-lg border border-red-500/20">
                                <p className="text-gray-400 text-xs">Total Losses</p>
                                <p className="text-white text-2xl font-bold">
                                    ${((auditData.summary?.total_reported_losses || auditData.final_state?.total_losses || 0) / 1).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-[#0f1419] rounded-lg border border-green-500/20">
                                <p className="text-gray-400 text-xs">Recovered</p>
                                <p className="text-green-400 text-2xl font-bold">{auditData.stats?.cases_recovered || 0}</p>
                            </div>
                        </div>

                        {/* Entity Breakdown */}
                        {auditData.breakdown && (
                            <div className="p-4 bg-[#0f1419] rounded-lg border border-gray-700">
                                <h4 className="text-white font-semibold mb-3">Data Distribution</h4>
                                <div className="space-y-2 text-sm">
                                    {Object.entries(auditData.breakdown).map(([entity, data]) => (
                                        <div key={entity} className="flex justify-between items-center">
                                            <span className="text-gray-300 capitalize">{entity.replace(/([A-Z])/g, ' $1')}</span>
                                            <div className="flex gap-3">
                                                <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
                                                    {data.count} cases
                                                </Badge>
                                                <Badge variant="outline" className="border-red-500/30 text-red-400">
                                                    ${data.total_loss?.toLocaleString() || 0}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {auditData.recommendations && auditData.recommendations.length > 0 && (
                            <div className="p-4 bg-orange-950/20 border border-orange-500/30 rounded-lg">
                                <h4 className="text-orange-400 font-semibold mb-2">⚠️ Actions Required</h4>
                                <ul className="space-y-1 text-sm">
                                    {auditData.recommendations.map((rec, idx) => (
                                        <li key={idx} className="text-gray-300">• {rec}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recovery Stats */}
                        {auditData.stats && (
                            <div className="p-4 bg-green-950/20 border border-green-500/30 rounded-lg">
                                <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Recovery Results
                                </h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-400">Recovered</p>
                                        <p className="text-green-400 text-xl font-bold">{auditData.stats.cases_recovered}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Updated</p>
                                        <p className="text-cyan-400 text-xl font-bold">{auditData.stats.cases_updated}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">Errors</p>
                                        <p className="text-red-400 text-xl font-bold">{auditData.stats.errors_count}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Error Details */}
                        {auditData.errors && auditData.errors.length > 0 && (
                            <details className="p-4 bg-red-950/20 border border-red-500/30 rounded-lg">
                                <summary className="text-red-400 font-semibold cursor-pointer">
                                    ❌ Errors ({auditData.errors.length})
                                </summary>
                                <ul className="mt-2 space-y-1 text-xs text-gray-400">
                                    {auditData.errors.map((err, idx) => (
                                        <li key={idx} className="font-mono">• {err}</li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}

                {!auditData && (
                    <div className="text-center py-8 text-gray-400">
                        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Click "Run Full Audit" to scan the database for lost cases</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}