import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Shield, RefreshCw, AlertTriangle, CheckCircle, 
    Search, UserX, CalendarX, AlertCircle, FileText, Lock
} from "lucide-react";
import { toast } from "sonner";

export default function CaseRecoveryPanel() {
    const [scanResult, setScanResult] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const scanMutation = useMutation({
        mutationFn: async () => {
            const res = await base44.functions.invoke('caseRecovery', { action: 'scan' });
            return res.data;
        },
        onSuccess: (data) => {
            setScanResult(data);
            // Auto-select all recoverable cases by default
            if (data.issues) {
                setSelectedIds(data.issues.map(i => i.id));
            }
            toast.success("Scan Complete", { description: `Found ${data.stats.recoverable} recoverable cases.` });
        },
        onError: (err) => {
            toast.error("Scan Failed: " + err.message);
        }
    });

    const recoverMutation = useMutation({
        mutationFn: async (ids) => {
            const res = await base44.functions.invoke('caseRecovery', { 
                action: 'recover', 
                targetIds: ids 
            });
            return res.data;
        },
        onSuccess: (data) => {
            toast.success("Recovery Successful", { 
                description: `Recovered ${data.results.recovered} cases. Failed: ${data.results.failed}` 
            });
            // Re-scan to show updated state
            scanMutation.mutate();
        },
        onError: (err) => {
            toast.error("Recovery Failed: " + err.message);
        }
    });

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(scanResult?.issues?.map(i => i.id) || []);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id, checked) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#1a2332] p-6 rounded-lg border border-red-500/20">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-red-400" />
                        Admin Case Recovery Tool
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Detect and fix hidden, orphaned, or corrupted cases. This tool re-links cases to users and fixes RLS visibility issues.
                    </p>
                </div>
                <Button 
                    onClick={() => scanMutation.mutate()} 
                    disabled={scanMutation.isPending || recoverMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 min-w-[140px]"
                >
                    {scanMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    {scanResult ? "Re-Scan System" : "Scan System"}
                </Button>
            </div>

            {scanResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-[#0f1419] border-gray-700">
                        <CardContent className="p-4 text-center">
                            <p className="text-gray-400 text-xs uppercase font-bold">Total Scanned</p>
                            <p className="text-2xl font-bold text-white">{scanResult.stats.total_cases}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#0f1419] border-red-500/30">
                        <CardContent className="p-4 text-center">
                            <p className="text-red-400 text-xs uppercase font-bold">Orphaned</p>
                            <p className="text-2xl font-bold text-red-400">{scanResult.stats.orphaned}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#0f1419] border-orange-500/30">
                        <CardContent className="p-4 text-center">
                            <p className="text-orange-400 text-xs uppercase font-bold">RLS Mismatch</p>
                            <p className="text-2xl font-bold text-orange-400">{scanResult.stats.mismatch}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#0f1419] border-green-500/30">
                        <CardContent className="p-4 text-center">
                            <p className="text-green-400 text-xs uppercase font-bold">Recoverable</p>
                            <p className="text-2xl font-bold text-green-400">{scanResult.stats.recoverable}</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {scanResult?.issues?.length > 0 && (
                <Card className="bg-[#0f1419] border-cyan-500/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold text-white">
                            Issues Found ({scanResult.issues.length})
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSelectedIds([])}
                                disabled={recoverMutation.isPending}
                            >
                                Deselect All
                            </Button>
                            <Button 
                                onClick={() => recoverMutation.mutate(selectedIds)}
                                disabled={recoverMutation.isPending || selectedIds.length === 0}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {recoverMutation.isPending ? (
                                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                )}
                                Recover Selected ({selectedIds.length})
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="bg-[#1a2332] rounded-lg overflow-hidden border border-gray-700">
                            <div className="grid grid-cols-12 gap-4 p-3 bg-gray-800/50 text-xs font-bold text-gray-400 border-b border-gray-700">
                                <div className="col-span-1 flex items-center justify-center">
                                    <Checkbox 
                                        checked={selectedIds.length === scanResult.issues.length}
                                        onCheckedChange={handleSelectAll}
                                    />
                                </div>
                                <div className="col-span-2">CASE ID</div>
                                <div className="col-span-3">OWNER (CURRENT)</div>
                                <div className="col-span-3">MATCHED USER</div>
                                <div className="col-span-3">ISSUES DETECTED</div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto">
                                {scanResult.issues.map((issue) => (
                                    <div key={issue.id} className="grid grid-cols-12 gap-4 p-3 border-b border-gray-700/50 text-sm hover:bg-gray-800/30 transition-colors items-center">
                                        <div className="col-span-1 flex items-center justify-center">
                                            <Checkbox 
                                                checked={selectedIds.includes(issue.id)}
                                                onCheckedChange={(c) => handleSelectOne(issue.id, c)}
                                            />
                                        </div>
                                        <div className="col-span-2 font-mono text-cyan-400 truncate">
                                            {issue.case_number || issue.id.slice(0, 8)}
                                        </div>
                                        <div className="col-span-3 text-gray-300 truncate" title={issue.current_owner}>
                                            {issue.current_owner || <span className="text-gray-600 italic">None</span>}
                                        </div>
                                        <div className="col-span-3 text-white truncate font-medium" title={issue.matched_user}>
                                            {issue.matched_user ? (
                                                <span className="text-green-400 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" /> {issue.matched_user}
                                                </span>
                                            ) : (
                                                <span className="text-red-400 flex items-center gap-1">
                                                    <UserX className="w-3 h-3" /> No Match
                                                </span>
                                            )}
                                        </div>
                                        <div className="col-span-3 flex flex-wrap gap-1">
                                            {issue.issues.map((type, idx) => (
                                                <Badge key={idx} variant="outline" className={`text-[10px] ${
                                                    type.includes('RLS') ? 'border-orange-500/50 text-orange-400' :
                                                    type.includes('Date') ? 'border-yellow-500/50 text-yellow-400' :
                                                    'border-red-500/50 text-red-400'
                                                }`}>
                                                    {type}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {scanResult && scanResult.issues.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 bg-[#0f1419] rounded-lg border border-green-500/20">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-xl font-bold text-white">System Healthy</h3>
                    <p className="text-gray-400">No orphaned or corrupted cases found. Great job!</p>
                </div>
            )}
        </div>
    );
}