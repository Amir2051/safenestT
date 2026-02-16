import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, caseId, caseData } = await req.json();

        if (action === 'analyze_wallet') {
            const { wallet_address, blockchain, wallet_type } = caseData;
            
            if (!wallet_address || !blockchain) {
                return Response.json({ error: 'Missing wallet data' }, { status: 400 });
            }

            // Get blockchain intelligence
            let walletIntel = {};
            try {
                const intelRes = await base44.asServiceRole.functions.invoke('blockchainIntelligence', {
                    action: 'track-wallet',
                    data: { 
                        wallet_address, 
                        blockchain,
                        fraud_case_id: caseId,
                        wallet_type: wallet_type || 'scammer'
                    }
                });
                
                if (intelRes.data?.success) {
                    walletIntel = intelRes.data.data;
                }
            } catch (e) {
                console.error('Blockchain intel failed:', e);
            }

            // AI-Enhanced Risk Analysis
            const aiPrompt = `Analyze this cryptocurrency wallet for fraud risk:

Wallet: ${wallet_address}
Blockchain: ${blockchain}
Type: ${wallet_type}

Transaction Data:
- Total Transactions: ${walletIntel.transactions?.length || 0}
- Balance: ${walletIntel.balance?.amount || 'Unknown'}
- First Activity: ${walletIntel.firstTransaction?.date || 'Unknown'}
- Last Activity: ${walletIntel.lastTransaction?.date || 'Unknown'}

Provide a detailed risk assessment including:
1. Risk Score (0-100)
2. Key Risk Indicators (specific behaviors detected)
3. Recommended Actions
4. Investigative Leads (exchanges, mixers, patterns)

Format as JSON with: risk_score, risk_level, indicators (array), recommendations (array), investigative_leads (array)`;

            const aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: aiPrompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: "object",
                    properties: {
                        risk_score: { type: "number" },
                        risk_level: { type: "string" },
                        indicators: { type: "array", items: { type: "string" } },
                        recommendations: { type: "array", items: { type: "string" } },
                        investigative_leads: { type: "array", items: { type: "string" } }
                    }
                }
            });

            const analysis = {
                wallet_address,
                blockchain,
                wallet_type,
                ...aiAnalysis,
                raw_intel: walletIntel,
                analyzed_at: new Date().toISOString()
            };

            // Update case with analysis
            if (caseId) {
                await base44.asServiceRole.entities.MyCase.update(caseId, {
                    wallet_analysis: analysis,
                    ai_analysis: `Wallet Risk: ${analysis.risk_score}/100 (${analysis.risk_level}). ${analysis.indicators?.join(', ')}`
                });
            }

            return Response.json({ success: true, analysis });
        }

        if (action === 'detect_patterns') {
            const linkedCaseIds = caseData.linked_case_ids || [];
            
            if (linkedCaseIds.length < 2) {
                return Response.json({ 
                    success: true, 
                    patterns: { message: 'Need at least 2 linked cases for pattern detection' }
                });
            }

            // Fetch all linked cases
            const linkedCases = await Promise.all(
                linkedCaseIds.map(id => base44.asServiceRole.entities.MyCase.get(id).catch(() => null))
            );
            const validCases = linkedCases.filter(c => c);

            // Extract pattern data
            const wallets = new Set();
            const amounts = [];
            const dates = [];
            const classifications = [];

            validCases.forEach(c => {
                if (c.scammer_wallet) wallets.add(c.scammer_wallet);
                if (c.victim_wallet) wallets.add(c.victim_wallet);
                if (c.amount_lost) amounts.push(c.amount_lost);
                if (c.created_date) dates.push(c.created_date);
                if (c.incident_classification) classifications.push(c.incident_classification);
            });

            // AI Pattern Analysis
            const patternPrompt = `Analyze ${validCases.length} linked fraud cases for criminal patterns:

Cases Summary:
${validCases.map((c, i) => `Case ${i+1}: ${c.incident_classification || c.issue_type} - $${c.amount_lost || 0} - ${new Date(c.created_date).toDateString()}`).join('\n')}

Unique Wallets: ${Array.from(wallets).slice(0, 5).join(', ')}
Amount Range: $${Math.min(...amounts)} - $${Math.max(...amounts)}
Date Range: ${new Date(Math.min(...dates.map(d => new Date(d)))).toDateString()} to ${new Date(Math.max(...dates.map(d => new Date(d)))).toDateString()}

Identify:
1. Common Tactics (modus operandi)
2. Campaign Assessment (organized vs isolated)
3. Target Profile (who they're targeting)
4. Investigative Leads (actionable next steps)
5. Risk Level (low/medium/high/critical)

Format as JSON with: tactics (array), campaign_type, target_profile, leads (array), risk_level, confidence_score`;

            const patternAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: patternPrompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: "object",
                    properties: {
                        tactics: { type: "array", items: { type: "string" } },
                        campaign_type: { type: "string" },
                        target_profile: { type: "string" },
                        leads: { type: "array", items: { type: "string" } },
                        risk_level: { type: "string" },
                        confidence_score: { type: "number" }
                    }
                }
            });

            // Update case with pattern insights
            if (caseId) {
                const summary = `Pattern Analysis: ${patternAnalysis.campaign_type}. Tactics: ${patternAnalysis.tactics?.slice(0, 3).join(', ')}. ${patternAnalysis.leads?.length || 0} investigative leads identified.`;
                
                await base44.asServiceRole.entities.MyCase.update(caseId, {
                    ai_analysis: (caseData.current_analysis || '') + '\n' + summary,
                    linked_case_ids: linkedCaseIds
                });
            }

            return Response.json({ 
                success: true, 
                patterns: {
                    ...patternAnalysis,
                    total_cases: validCases.length,
                    total_loss: amounts.reduce((a, b) => a + b, 0),
                    unique_wallets: wallets.size
                }
            });
        }

        if (action === 'generate_summary') {
            const description = caseData.description;
            
            if (!description || description.length < 50) {
                return Response.json({ 
                    success: true, 
                    summary: description 
                });
            }

            // AI Summary Generation
            const summaryPrompt = `Summarize this fraud case description into a clear, factual 2-3 sentence summary for law enforcement:

Original Description:
${description}

Requirements:
- Focus on key facts: what happened, how much was lost, key evidence
- Professional tone
- No speculation
- Actionable for investigators`;

            const summary = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: summaryPrompt,
                add_context_from_internet: false
            });

            // Update case with summary
            if (caseId) {
                await base44.asServiceRole.entities.MyCase.update(caseId, {
                    ai_analysis: summary.text
                });
            }

            return Response.json({ 
                success: true, 
                summary: summary.text 
            });
        }

        if (action === 'full_analysis') {
            // Run all analyses
            const results = {};

            // 1. Wallet Analysis
            if (caseData.scammer_wallet) {
                try {
                    const walletRes = await base44.asServiceRole.functions.invoke('aiCaseAnalysis', {
                        action: 'analyze_wallet',
                        caseId,
                        caseData: {
                            wallet_address: caseData.scammer_wallet,
                            blockchain: caseData.blockchain || 'ethereum',
                            wallet_type: 'scammer'
                        }
                    });
                    results.wallet_analysis = walletRes.data;
                } catch (e) {
                    console.error('Wallet analysis failed:', e);
                }
            }

            // 2. Pattern Detection
            if (caseData.linked_case_ids?.length > 0) {
                try {
                    const patternRes = await base44.asServiceRole.functions.invoke('aiCaseAnalysis', {
                        action: 'detect_patterns',
                        caseId,
                        caseData: {
                            linked_case_ids: caseData.linked_case_ids,
                            current_analysis: results.wallet_analysis?.analysis?.ai_analysis || ''
                        }
                    });
                    results.pattern_analysis = patternRes.data;
                } catch (e) {
                    console.error('Pattern detection failed:', e);
                }
            }

            // 3. Summary Generation
            if (caseData.description) {
                try {
                    const summaryRes = await base44.asServiceRole.functions.invoke('aiCaseAnalysis', {
                        action: 'generate_summary',
                        caseId,
                        caseData: {
                            description: caseData.description
                        }
                    });
                    results.summary = summaryRes.data;
                } catch (e) {
                    console.error('Summary generation failed:', e);
                }
            }

            return Response.json({ success: true, results });
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('AI Analysis Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});