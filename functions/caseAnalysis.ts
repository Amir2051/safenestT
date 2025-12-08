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
    
    const { caseId, entityName } = body;
    if (!caseId) {
        return new Response(JSON.stringify({ error: 'Case ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Get current case (try specified entity or fallback to known case entities)
    let currentCase = null;
    let foundEntity = entityName;

    const entitiesToTry = entityName ? [entityName] : ['MyCase', 'InvestigationCase', 'ClientCase', 'FraudCase'];
    
    for (const entity of entitiesToTry) {
        if (base44.entities[entity]) {
            try {
                const cases = await base44.entities[entity].filter({ id: caseId });
                if (cases && cases.length > 0) {
                    currentCase = cases[0];
                    foundEntity = entity;
                    break;
                }
            } catch (e) {
                console.warn(`Failed to fetch from ${entity}`, e);
            }
        }
    }
    
    if (!currentCase) {
        return new Response(JSON.stringify({ error: `Case not found. Searched in: ${entitiesToTry.join(', ')}` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Get other cases - fetch from the same entity where the case was found
    // Increase limit to 1000 to catch more potential matches
    let allCases = [];
    try {
        allCases = await base44.entities[foundEntity].list('-created_date', 1000);
    } catch (e) {
        console.error(`Failed to list cases from ${foundEntity}`, e);
    }
    
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

        // Common Fund Path (Traced Wallets Intersection)
        const currentTraced = (currentCase.traced_wallets || []).map(norm);
        const otherTraced = (other.traced_wallets || []).map(norm);
        const commonPath = currentTraced.filter(w => otherTraced.includes(w));

        if (commonPath.length > 0) {
            reasons.push({ type: 'common_path', value: commonPath.slice(0, 3).join(', ') + (commonPath.length > 3 ? '...' : ''), confidence: 'high', label: 'Shared Fund Flow Path' });
            score += 45; // High score for shared intermediate wallets
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
        Analyze the Target Case (including attached evidence files) and Candidate Cases to find hidden connections.

        Target Case:
        Title: "${currentCase.case_title || 'Untitled'}"
        Description: "${currentCase.description?.slice(0, 1000) || ''}"
        Scammer Info: ${JSON.stringify(currentCase.scammer_info || {})}
        Traced Wallets: ${(currentCase.traced_wallets || []).join(', ')}
        Transaction Hash: ${currentCase.transaction_hash || ''}
        
        Candidate Cases:
        ${potentialMatches.map(c => JSON.stringify({
            id: c.id,
            title: c.case_title || 'Untitled',
            description: c.description?.slice(0, 500),
            wallets: c.monitored_wallets || [],
            scammer: c.scammer_info || {},
            traced: c.traced_wallets || []
        })).join('\n')}
        
        Tasks:
        1. EVIDENCE EXTRACTION: Analzye the attached images/PDFs for the Target Case. Extract any wallet addresses, emails, phone numbers, usernames, or transaction IDs visible in the visual content or text of these files.
        2. ENTITY MATCHING: Check if any entity extracted from the files (or existing in Target Case data) appears in the Candidate Cases (check their descriptions, wallets, scammer info).
        3. PATTERN MATCHING: Look for shared MO, specific phrases, transaction patterns (mixer usage, common intermediate wallets), or structural similarities.
        
        Return JSON object with a "matches" array. Each match: 
        { 
            "caseId": "string", 
            "reason": "string" (short label, e.g. "Shared Wallet in Evidence"), 
            "details": "string" (concise explanation, e.g. "Wallet 0x... extracted from screenshot matches Candidate scammer wallet"),
            "confidence": "medium|high", 
            "type": "extracted_match|ai_pattern|common_path|mixer_pattern|illicit_exchange" 
        }
        
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
                                    details: { type: "string" },
                                    confidence: { type: "string", enum: ["medium", "high"] },
                                    type: { type: "string", enum: ["extracted_match", "ai_pattern", "common_path", "mixer_pattern", "illicit_exchange"] }
                                },
                                required: ["caseId", "reason", "confidence", "type"]
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
                            reasons: [{ 
                                type: match.type || 'ai_pattern', 
                                value: match.details || (match.type === 'common_path' ? 'Blockchain Analysis' : 'Pattern Recognition'), 
                                confidence: match.confidence, 
                                label: match.reason 
                            }],
                            score: match.confidence === 'high' ? (match.type === 'extracted_match' ? 60 : 35) : 20
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