import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { caseId } = await req.json();

    if (!caseId) {
        return new Response(JSON.stringify({ error: 'Case ID required' }), { status: 400 });
    }

    // 1. Get current case
    const currentCase = await base44.entities.MyCase.get(caseId);
    if (!currentCase) {
        return new Response(JSON.stringify({ error: 'Case not found' }), { status: 404 });
    }

    // 2. Get all other cases (excluding current)
    // In a real prod app with millions of records, we would filter this query more strictly.
    const allCases = await base44.entities.MyCase.list();
    const otherCases = allCases.filter(c => c.id !== caseId);

    const connections = [];

    // Helper for normalization
    const norm = (str) => str ? str.toString().trim().toLowerCase() : '';

    // 3. Hard matching logic (Deterministic)
    for (const other of otherCases) {
        const reasons = [];
        let score = 0;

        // Scammer Wallet Match
        if (norm(currentCase.scammer_wallet) && norm(other.scammer_wallet) && 
            norm(currentCase.scammer_wallet) === norm(other.scammer_wallet)) {
            reasons.push({ type: 'wallet', value: currentCase.scammer_wallet, confidence: 'high', label: 'Same Scammer Wallet' });
            score += 50;
        }
        
        // Monitored Wallets intersection
        const currentWallets = (currentCase.monitored_wallets || []).map(norm);
        const otherWallets = (other.monitored_wallets || []).map(norm);
        const commonWallets = currentWallets.filter(w => otherWallets.includes(w));
        
        if (commonWallets.length > 0) {
             reasons.push({ type: 'monitored_wallet', value: commonWallets.join(', '), confidence: 'high', label: 'Shared Monitored Wallet' });
             score += 40;
        }

        // Scammer Email Match
        if (norm(currentCase.scammer_info?.email) && norm(other.scammer_info?.email) &&
            norm(currentCase.scammer_info.email) === norm(other.scammer_info.email)) {
            reasons.push({ type: 'email', value: currentCase.scammer_info.email, confidence: 'high', label: 'Same Scammer Email' });
            score += 40;
        }

         // Scammer Phone Match
        if (norm(currentCase.scammer_info?.phone) && norm(other.scammer_info?.phone) &&
            norm(currentCase.scammer_info.phone) === norm(other.scammer_info.phone)) {
            reasons.push({ type: 'phone', value: currentCase.scammer_info.phone, confidence: 'high', label: 'Same Scammer Phone' });
            score += 40;
        }

        // Victim Match (Repeat Victim)
        if (norm(currentCase.client_email) && norm(other.client_email) &&
            norm(currentCase.client_email) === norm(other.client_email)) {
             reasons.push({ type: 'victim', value: currentCase.client_email, confidence: 'high', label: 'Repeat Victim' });
             score += 10; // Lower score as it might just be the same client reporting multiple issues
        }
        
        if (score > 0) {
            connections.push({
                case: {
                    id: other.id,
                    title: other.case_title || other.case_number,
                    case_number: other.case_number,
                    status: other.status,
                    fraud_type: other.issue_type,
                    amount_lost: other.amount_lost
                },
                reasons,
                score
            });
        }
    }

    // 4. AI Pattern Analysis (LLM)
    // We select cases with similar fraud type but NO hard matches to see if descriptions link them.
    const potentialMatches = otherCases.filter(c => 
        c.issue_type === currentCase.issue_type && 
        !connections.find(conn => conn.case.id === c.id) &&
        c.description && currentCase.description
    ).slice(0, 3); // Limit to top 3 candidates to save time/cost

    if (potentialMatches.length > 0) {
        const prompt = `
        Analyze these fraud cases for connections.
        
        Target Case:
        Description: "${currentCase.description?.slice(0, 500)}"
        
        Candidate Cases:
        ${potentialMatches.map(c => `- ID ${c.id}: "${c.description?.slice(0, 300)}..."`).join('\n')}
        
        Identify if the Target Case shares a specific MO (Modus Operandi), identical phrasing, or unique scammer behavior with any Candidate Case.
        Ignore generic similarities (e.g. "both involve crypto"). Look for specific unique details.
        
        Return JSON object with a "matches" array. Each match: { "caseId": "string", "reason": "string", "confidence": "medium|high" }.
        Return empty array if no strong connection.
        `;

        try {
            const llmRes = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        matches: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    caseId: { type: "string" },
                                    reason: { type: "string" },
                                    confidence: { type: "string", enum: ["medium", "high"] }
                                },
                                required: ["caseId", "reason", "confidence"]
                            }
                        }
                    }
                }
            });

            if (llmRes.matches) {
                for (const match of llmRes.matches) {
                    const matchedCase = potentialMatches.find(c => c.id === match.caseId);
                    if (matchedCase) {
                        connections.push({
                            case: {
                                id: matchedCase.id,
                                title: matchedCase.case_title || matchedCase.case_number,
                                case_number: matchedCase.case_number,
                                status: matchedCase.status,
                                fraud_type: matchedCase.issue_type,
                                amount_lost: matchedCase.amount_lost
                            },
                            reasons: [{ type: 'ai_pattern', value: 'Behavioral Pattern', confidence: match.confidence, label: match.reason }],
                            score: match.confidence === 'high' ? 30 : 15
                        });
                    }
                }
            }
        } catch (e) {
            console.error("LLM Analysis Error:", e);
        }
    }

    // Sort connections by relevance score
    connections.sort((a, b) => b.score - a.score);

    return new Response(JSON.stringify({ 
        success: true,
        connections 
    }), { 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}