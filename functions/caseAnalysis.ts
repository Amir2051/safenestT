import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

export default async function handler(req) {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    
    const { caseId } = body;
    if (!caseId) {
        return new Response(JSON.stringify({ error: 'Case ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Get current case
    const cases = await base44.entities.MyCase.filter({ id: caseId });
    const currentCase = cases && cases.length > 0 ? cases[0] : null;
    
    if (!currentCase) {
        return new Response(JSON.stringify({ error: 'Case not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Get other cases - fetch more to ensure we find connections
    // Increase limit to 1000 to catch more potential matches
    const allCases = await base44.entities.MyCase.list('-created_date', 1000);
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
             score += 10;
        }
        
        if (score > 0) {
            connections.push({
                case: {
                    id: other.id,
                    title: other.case_title || other.case_number || 'Untitled',
                    case_number: other.case_number,
                    status: other.status,
                    fraud_type: other.issue_type,
                    amount_lost: other.amount_lost || other.amount_stolen_usd || 0
                },
                reasons,
                score
            });
        }
    }

    // 4. AI Pattern Analysis (LLM)
    // We select cases with similar fraud type but NO hard matches to see if descriptions link them.
    const potentialMatches = otherCases.filter(c => 
        (c.issue_type === currentCase.issue_type || c.fraud_type === currentCase.issue_type) && 
        !connections.find(conn => conn.case.id === c.id) &&
        c.description && currentCase.description
    ).slice(0, 5); // Limit to top 5 candidates

    if (potentialMatches.length > 0) {
        // Collect evidence URLs for analysis context
        const fileUrls = (currentCase.evidence_files || [])
            .map(f => f.url)
            .filter(url => url && typeof url === 'string' && url.length > 0);

        const prompt = `
        Analyze these fraud cases for connections based on description, behavior, and MO (Modus Operandi).
        
        Target Case:
        Title: "${currentCase.case_title || 'Untitled'}"
        Description: "${currentCase.description?.slice(0, 800) || ''}"
        Scammer Info: ${JSON.stringify(currentCase.scammer_info || {})}
        
        Candidate Cases:
        ${potentialMatches.map(c => `- ID ${c.id}: Title: "${c.case_title || 'Untitled'}", Desc: "${c.description?.slice(0, 400) || ''}"`).join('\n')}
        
        Identify if the Target Case shares a specific MO, identical phrasing, unique scammer behavior, or other non-obvious links with any Candidate Case.
        Ignore generic similarities (e.g., "both involve crypto investment"). Look for specific unique details, names, or patterns.
        
        Return JSON object with a "matches" array. Each match: { "caseId": "string", "reason": "string", "confidence": "medium|high" }.
        Return empty array if no strong connection found.
        `;

        try {
            const llmRes = await base44.integrations.Core.InvokeLLM({
                prompt,
                file_urls: fileUrls.length > 0 ? fileUrls : undefined,
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

            if (llmRes.matches && Array.isArray(llmRes.matches)) {
                for (const match of llmRes.matches) {
                    const matchedCase = potentialMatches.find(c => c.id === match.caseId);
                    if (matchedCase) {
                        connections.push({
                            case: {
                                id: matchedCase.id,
                                title: matchedCase.case_title || matchedCase.case_number || 'Untitled',
                                case_number: matchedCase.case_number,
                                status: matchedCase.status,
                                fraud_type: matchedCase.issue_type,
                                amount_lost: matchedCase.amount_lost || matchedCase.amount_stolen_usd || 0
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}