import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    FileStack, Wallet, DollarSign, User, TrendingUp, 
    AlertCircle, CheckCircle, Loader2, Calendar, Scale 
} from "lucide-react";
import { toast } from "sonner";

export default function MergeCasesDialog({ open, onClose, selectedCaseIds, allCases }) {
    const [merging, setMerging] = useState(false);
    const [masterCaseTitle, setMasterCaseTitle] = useState("");
    const queryClient = useQueryClient();

    const selectedCases = allCases.filter(c => selectedCaseIds.includes(c.id));

    // Auto-aggregate data
    const aggregatedData = {
        totalLoss: selectedCases.reduce((sum, c) => sum + (c.amount_lost || c.amount || 0), 0),
        totalRecovered: selectedCases.reduce((sum, c) => sum + (c.recovery_amount || 0), 0),
        uniqueVictims: [...new Set(selectedCases.map(c => c.client_email || c.created_by_email).filter(Boolean))],
        scammerWallets: [...new Set(selectedCases.flatMap(c => {
            const wallets = [];
            if (c.scammer_wallet) wallets.push(c.scammer_wallet);
            if (c.scammer_info?.wallet_addresses) wallets.push(...c.scammer_info.wallet_addresses);
            if (c.monitored_wallets) wallets.push(...c.monitored_wallets);
            return wallets;
        }).filter(Boolean))],
        scammerInfo: {
            names: [...new Set(selectedCases.map(c => c.scammer_info?.name).filter(Boolean))],
            emails: [...new Set(selectedCases.flatMap(c => c.scammer_info?.known_emails || []).filter(Boolean))],
            phones: [...new Set(selectedCases.map(c => c.scammer_info?.phone).filter(Boolean))],
            locations: [...new Set(selectedCases.map(c => c.scammer_info?.location).filter(Boolean))],
        },
        dateRange: {
            earliest: selectedCases.reduce((earliest, c) => {
                const date = new Date(c.created_date || c.incident_date);
                return !earliest || date < earliest ? date : earliest;
            }, null),
            latest: selectedCases.reduce((latest, c) => {
                const date = new Date(c.created_date || c.incident_date);
                return !latest || date > latest ? date : latest;
            }, null)
        },
        evidence: selectedCases.flatMap(c => c.evidence_files || []),
        lawEnforcementAuthorized: selectedCases.some(c => c.law_enforcement_authorization?.authorized)
    };

    const handleMerge = async () => {
        if (!masterCaseTitle.trim()) {
            toast.error("Please enter a Master Case title");
            return;
        }

        setMerging(true);
        try {
            const res = await base44.functions.invoke('caseManagement', {
                action: 'merge_cases',
                data: {
                    case_ids: selectedCaseIds,
                    master_case_title: masterCaseTitle,
                    aggregated_data: aggregatedData
                }
            });

            if (res.data.success) {
                toast.success(`Master Case created: ${res.data.master_case.case_number}`);
                queryClient.invalidateQueries({ queryKey: ['my-cases'] });
                onClose();
            } else {
                toast.error(res.data.error || "Failed to merge cases");
            }
        } catch (error) {
            console.error('Merge error:', error);
            toast.error("Error merging cases: " + error.message);
        }
        setMerging(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <FileStack className="w-6 h-6 text-orange-400" />
                        Merge {selectedCaseIds.length} Cases into Master Case
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Master Case Title */}
                    <div>
                        <Label className="text-gray-300 mb-2 block">Master Case Title *</Label>
                        <Input
                            placeholder="e.g., Del Mar Energy Investment Scam - Multi-Victim Pattern"
                            value={masterCaseTitle}
                            onChange={(e) => setMasterCaseTitle(e.target.value)}
                            className="bg-[#0f1419] border-cyan-500/30 text-white"
                        />
                    </div>

                    {/* Aggregated Financial Data */}
                    <Card className="bg-[#0f1419] border-cyan-500/20">
                        <CardContent className="p-4">
                            <h3 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5" />
                                Aggregated Financial Impact
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                                    <div className="text-xs text-gray-400 mb-1">Total Loss</div>
                                    <div className="text-2xl font-bold text-red-400">
                                        ${aggregatedData.totalLoss.toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded">
                                    <div className="text-xs text-gray-400 mb-1">Total Recovered</div>
                                    <div className="text-2xl font-bold text-green-400">
                                        ${aggregatedData.totalRecovered.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Consolidated Scammer Information */}
                    <Card className="bg-[#0f1419] border-orange-500/20">
                        <CardContent className="p-4">
                            <h3 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Consolidated Scammer Intelligence
                            </h3>
                            <div className="space-y-3">
                                {aggregatedData.scammerWallets.length > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">
                                            <Wallet className="w-3 h-3 inline mr-1" />
                                            Identified Wallets ({aggregatedData.scammerWallets.length})
                                        </div>
                                        <div className="bg-black/20 p-2 rounded text-xs font-mono space-y-1">
                                            {aggregatedData.scammerWallets.slice(0, 5).map((w, i) => (
                                                <div key={i} className="text-cyan-300 truncate">{w}</div>
                                            ))}
                                            {aggregatedData.scammerWallets.length > 5 && (
                                                <div className="text-gray-500">+{aggregatedData.scammerWallets.length - 5} more...</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {aggregatedData.scammerInfo.names.length > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Known Names/Aliases</div>
                                        <div className="text-white text-sm">{aggregatedData.scammerInfo.names.join(', ')}</div>
                                    </div>
                                )}
                                {aggregatedData.scammerInfo.emails.length > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-400 mb-1">Email Addresses</div>
                                        <div className="text-white text-sm">{aggregatedData.scammerInfo.emails.join(', ')}</div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Victim Information */}
                    <Card className="bg-[#0f1419] border-purple-500/20">
                        <CardContent className="p-4">
                            <h3 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Affected Victims
                            </h3>
                            <div className="space-y-2">
                                <div className="text-sm text-gray-300">
                                    <strong className="text-purple-400">{aggregatedData.uniqueVictims.length}</strong> unique victim(s) identified
                                </div>
                                <div className="bg-black/20 p-2 rounded text-xs space-y-1">
                                    {aggregatedData.uniqueVictims.map((email, i) => (
                                        <div key={i} className="text-gray-300">{email}</div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card className="bg-[#0f1419] border-blue-500/20">
                        <CardContent className="p-4">
                            <h3 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                                <Calendar className="w-5 h-5" />
                                Incident Timeline
                            </h3>
                            <div className="flex justify-between text-sm">
                                <div>
                                    <div className="text-xs text-gray-400">First Incident</div>
                                    <div className="text-white">{aggregatedData.dateRange.earliest?.toLocaleDateString() || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400">Most Recent</div>
                                    <div className="text-white">{aggregatedData.dateRange.latest?.toLocaleDateString() || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-400">Total Evidence</div>
                                    <div className="text-white">{aggregatedData.evidence.length} files</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cases Being Merged */}
                    <Card className="bg-[#0f1419] border-gray-500/20">
                        <CardContent className="p-4">
                            <h3 className="text-gray-300 font-semibold mb-3">Cases Being Merged ({selectedCases.length})</h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedCases.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between p-2 bg-black/20 rounded text-xs">
                                        <span className="text-white font-mono">{c.case_number || c.id.slice(0, 8)}</span>
                                        <span className="text-gray-400">{c.client_name || 'Unknown'}</span>
                                        <span className="text-red-400">${(c.amount_lost || c.amount || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Law Enforcement Authorization */}
                    {aggregatedData.lawEnforcementAuthorized && (
                        <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                            <Scale className="w-5 h-5 text-purple-400" />
                            <span className="text-purple-300 text-sm">
                                Law enforcement authorization granted on at least one case
                            </span>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-cyan-500/20">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={merging}
                            className="border-gray-600 text-gray-400"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleMerge}
                            disabled={merging || !masterCaseTitle.trim()}
                            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                        >
                            {merging ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Merging Cases...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Create Master Case
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}