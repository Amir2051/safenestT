import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

/**
 * suggestCaseLinks
 * Analyzes a specific case against the database to find potential links.
 * Uses heuristics (wallets, contact info) and AI (text similarity).
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me().catch(() => null);
        
        if (!user || (user.role !== 'admin' && !user.is_admin)) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { caseId, entityName = 'MyCase' } = await req.json();

        // 1. Fetch Source Case
        const sourceCase = await base44.asServiceRole.entities[entityName].get(caseId);
        if (!sourceCase) {
            return Response.json({ error: 'Case not found' }, { status: 404 });
        }

        // 2. Fetch Candidates (Exclude current case)
        // Optimization: Fetch only active cases or recent ones to avoid OOM
        const allCases = await base44.asServiceRole.entities.MyCase.list('-created_date', 500);
        const candidates = allCases.filter(c => c.id !== caseId);

        const suggestions = [];
        const confirmed = [];

        // Helper to add suggestion
        const addSuggestion = (target, type, confidence, details) => {
            // Check if already linked
            if (sourceCase.linked_case_ids?.includes(target.id)) {
                // Already linked, maybe add to confirmed list for UI display?
                // The UI separates "Confirmed" (already linked) vs "Suggested"
                // So if already linked, we don't add to suggestions array.
                return; 
            }
            
            suggestions.push({
                case: {
                    id: target.id,
                    title: target.case_title || target.case_number,
                    case_number: target.case_number,
                    status: target.status,
                    fraud_type: target.issue_type || target.fraud_type,
                    amount_lost: target.amount_lost || target.amount_stolen_usd
                },
                reasons: [{ type, confidence, value: details, label: type.replace('_', ' ') }]
            });
        };

        // 3. Heuristic Analysis
        for (const target of candidates) {
            let isMatch = false;

            // A. Scammer Wallet Match (High Confidence)
            if (sourceCase.scammer_wallet && target.scammer_wallet) {
                if (sourceCase.scammer_wallet.toLowerCase() === target.scammer_wallet.toLowerCase()) {
                    addSuggestion(target, 'wallet', 'high', `Shared Scammer Wallet: ${sourceCase.scammer_wallet}`);
                    isMatch = true;
                }
            }

            // B. Client Email Match (High Confidence - Same Victim)
            // if (!isMatch && sourceCase.client_email && target.client_email) {
            //     if (sourceCase.client_email.toLowerCase() === target.client_email.toLowerCase()) {
            //         addSuggestion(target, 'email', 'high', `Same Client Email: ${sourceCase.client_email}`);
            //         isMatch = true;
            //     }
            // }

            // C. Monitored Wallet Cross-Match
            if (!isMatch && sourceCase.monitored_wallets?.length && target.monitored_wallets?.length) {
                const intersection = sourceCase.monitored_wallets.filter(w => target.monitored_wallets.includes(w));
                if (intersection.length > 0) {
                    addSuggestion(target, 'monitored_wallet', 'high', `Shared Monitored Wallets: ${intersection.join(', ')}`);
                    isMatch = true;
                }
            }

            // D. Suspect Info Match (Phone/Email)
            if (!isMatch) {
                const sInfo = sourceCase.scammer_info || {};
                const tInfo = target.scammer_info || {};
                
                if (sInfo.email && tInfo.email && sInfo.email === tInfo.email) {
                    addSuggestion(target, 'suspect', 'high', `Same Suspect Email: ${sInfo.email}`);
                    isMatch = true;
                }
            }
        }

        // 4. AI Text Similarity Analysis (Batch)
        // Select top 5 candidates that match fraud type but weren't matched by heuristics
        const textCandidates = candidates.filter(c => 
            !suggestions.find(s => s.case.id === c.id) && // Not already suggested
            (c.issue_type === sourceCase.issue_type || c.fraud_type === sourceCase.fraud_type) // Same type
        ).slice(0, 5); // Limit to 5 for token economy

        if (textCandidates.length > 0) {
            const prompt = `
                Act as a Criminal Intelligence Analyst. Compare the Source Case against Candidate Cases to identify hidden connections, criminal campaigns, or shared Modus Operandi (MO).
                
                SOURCE CASE:
                Title: ${sourceCase.case_title}
                Description: ${sourceCase.description}
                Notes: ${JSON.stringify(sourceCase.case_notes || [])}

                CANDIDATES:
                ${textCandidates.map(c => `
                    ID: ${c.id}
                    Title: ${c.case_title}
                    Description: ${c.description}
                `).join('\n')}

                TASK:
                Identify "Criminal Campaigns" or "MO Clusters". Look for:
                - Identical scripts or phrasing in scam messages.
                - Specific technical tradecraft (e.g. same fake trading platform template).
                - Behavioral patterns (e.g. "grooming for weeks then requesting tax fee").
                
                Return a JSON object with a list of matches:
                {
                    "matches": [
                        { "id": "candidate_id", "confidence": "medium|high", "reason": "Detailed explanation of the campaign link or MO cluster." }
                    ]
                }
                Only return matches with medium or high confidence.
            `;

            try {
                const aiRes = await base44.integrations.Core.InvokeLLM({
                    prompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            matches: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        confidence: { type: "string" },
                                        reason: { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                });

                if (aiRes && aiRes.matches) {
                    for (const match of aiRes.matches) {
                        const target = textCandidates.find(c => c.id === match.id);
                        if (target) {
                            addSuggestion(target, 'ai_pattern', match.confidence, match.reason);
                        }
                    }
                }
            } catch (e) {
                console.error("AI Analysis failed", e);
            }
        }

        // 5. Build Confirmed List (Existing Links)
        if (sourceCase.linked_case_ids?.length) {
            for (const linkedId of sourceCase.linked_case_ids) {
                const linkedCase = candidates.find(c => c.id === linkedId);
                if (linkedCase) {
                    confirmed.push({
                        case: {
                            id: linkedCase.id,
                            title: linkedCase.case_title,
                            case_number: linkedCase.case_number,
                            status: linkedCase.status,
                            fraud_type: linkedCase.issue_type,
                            amount_lost: linkedCase.amount_lost
                        },
                        reasons: [{ type: 'link', confidence: 'confirmed', value: 'Manually Linked', label: 'Linked' }]
                    });
                }
            }
        }

        // 6. Save Suggestions to Entity (Optional, for persistence/admin review queue)
        // For now, we return them dynamically, but we could save them to CaseLinkSuggestion
        // Let's iterate suggestions and save them if they don't exist
        for (const sugg of suggestions) {
            const exists = await base44.asServiceRole.entities.CaseLinkSuggestion.filter({
                source_case_id: caseId,
                target_case_id: sugg.case.id
            });
            
            if (!exists || exists.length === 0) {
                await base44.asServiceRole.entities.CaseLinkSuggestion.create({
                    source_case_id: caseId,
                    target_case_id: sugg.case.id,
                    match_type: sugg.reasons[0].type,
                    confidence_score: sugg.reasons[0].confidence === 'high' ? 90 : 70,
                    match_details: sugg.reasons[0].value,
                    status: 'pending'
                });
            }
        }

        return Response.json({
            confirmed,
            suggested: suggestions
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});