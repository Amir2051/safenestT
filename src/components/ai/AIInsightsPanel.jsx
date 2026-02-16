import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIInsightsPanel({ caseData, onUpdate }) {
    const [analyzing, setAnalyzing] = useState(false);
    const [insights, setInsights] = useState(null);

    const runAnalysis = async () => {
        setAnalyzing(true);
        try {
            const { data } = await base44.functions.invoke('aiCaseAnalysis', {
                action: 'full_analysis',
                caseId: caseData.id,
                caseData: {
                    scammer_wallet: caseData.scammer_wallet,
                    victim_wallet: caseData.victim_wallet,
                    blockchain: caseData.blockchain,
                    description: caseData.description,
                    linked_case_ids: caseData.linked_case_ids || []
                }
            });

            if (data.success) {
                setInsights(data.results);
                toast.success('AI analysis completed');
                if (onUpdate) onUpdate();
            } else {
                toast.error('Analysis failed');
            }
        } catch (err) {
            console.error('Analysis error:', err);
            toast.error('Analysis failed: ' + err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    const walletAnalysis = insights?.wallet_analysis?.analysis;
    const patternAnalysis = insights?.pattern_analysis?.patterns;
    const summary = insights?.summary?.summary;

    return (
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        <CardTitle className="text-white">AI Insights</CardTitle>
                    </div>
                    <Button
                        onClick={runAnalysis}
                        disabled={analyzing}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {analyzing ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Run Analysis
                            </>
                        )}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Existing Analysis */}
                {caseData.ai_analysis && !insights && (
                    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <p className="text-sm text-gray-300">{caseData.ai_analysis}</p>
                    </div>
                )}

                {/* Wallet Analysis */}
                {walletAnalysis && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                            <h4 className="text-sm font-semibold text-white">Wallet Risk Analysis</h4>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <div className="text-3xl font-bold text-red-400">
                                {walletAnalysis.risk_score}/100
                            </div>
                            <Badge className={
                                walletAnalysis.risk_level === 'critical' ? 'bg-red-500' :
                                walletAnalysis.risk_level === 'high' ? 'bg-orange-500' :
                                walletAnalysis.risk_level === 'medium' ? 'bg-yellow-500' :
                                'bg-green-500'
                            }>
                                {walletAnalysis.risk_level?.toUpperCase()}
                            </Badge>
                        </div>

                        {walletAnalysis.indicators?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400">Risk Indicators:</p>
                                {walletAnalysis.indicators.map((indicator, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                        <span className="text-red-400">•</span>
                                        <span>{indicator}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {walletAnalysis.recommendations?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400">Recommendations:</p>
                                {walletAnalysis.recommendations.map((rec, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-blue-300">
                                        <span className="text-blue-400">→</span>
                                        <span>{rec}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {walletAnalysis.investigative_leads?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400">Investigative Leads:</p>
                                {walletAnalysis.investigative_leads.map((lead, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-cyan-300">
                                        <span className="text-cyan-400">🔍</span>
                                        <span>{lead}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Pattern Analysis */}
                {patternAnalysis && (
                    <div className="space-y-2 p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <h4 className="text-sm font-semibold text-white">Pattern Detection</h4>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <p className="text-gray-400">Campaign Type</p>
                                <p className="text-white font-semibold">{patternAnalysis.campaign_type}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Cases Analyzed</p>
                                <p className="text-white font-semibold">{patternAnalysis.total_cases}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Total Loss</p>
                                <p className="text-white font-semibold">${patternAnalysis.total_loss?.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Risk Level</p>
                                <Badge className="bg-red-500">{patternAnalysis.risk_level?.toUpperCase()}</Badge>
                            </div>
                        </div>

                        {patternAnalysis.tactics?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400">Common Tactics:</p>
                                {patternAnalysis.tactics.map((tactic, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                        <span className="text-yellow-400">⚠</span>
                                        <span>{tactic}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {patternAnalysis.target_profile && (
                            <div>
                                <p className="text-xs text-gray-400">Target Profile:</p>
                                <p className="text-xs text-white">{patternAnalysis.target_profile}</p>
                            </div>
                        )}

                        {patternAnalysis.leads?.length > 0 && (
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400">Investigative Leads:</p>
                                {patternAnalysis.leads.map((lead, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-green-300">
                                        <span className="text-green-400">✓</span>
                                        <span>{lead}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* AI Summary */}
                {summary && (
                    <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">AI-Generated Summary:</p>
                        <p className="text-sm text-white">{summary}</p>
                    </div>
                )}

                {!insights && !caseData.ai_analysis && (
                    <div className="text-center py-6 text-gray-400">
                        <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Run AI analysis to get insights</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}