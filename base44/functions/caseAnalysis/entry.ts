import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
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

    // 1. Get current case
    let currentCase = null;
    let foundEntity = entityName;

    // Priority list including the requested entity if provided
    let entitiesToTry = ['MyCase', 'InvestigationCase', 'ClientCase', 'FraudCase'];
    if (entityName && !entitiesToTry.includes(entityName)) {
        entitiesToTry.unshift(entityName);
    } else if (entityName) {
        // Move requested entity to front
        entitiesToTry = [entityName, ...entitiesToTry.filter(e => e !== entityName)];
    }
    
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

    // 2. Get other cases
    let allCases = [];
    try {
        allCases = await base44.entities[foundEntity].list('-created_date', 1000);
    } catch (e) {
        console.error(`Failed to list cases from ${foundEntity}`, e);
    }
    
    const otherCases = allCases.filter(c => c.id !== caseId);
    const connections = [];
    const norm = (str) => str ? str.toString().trim().toLowerCase() : '';

    // Helper to extract all wallets
    const getAllWallets = (c) => {
        const wallets = new Set();
        if (c.scammer_wallet) wallets.add(norm(c.scammer_wallet));
        if (c.scammer_info?.wallet_addresses) c.scammer_info.wallet_addresses.forEach(w => wallets.add(norm(w)));
        if (c.monitored_wallets) c.monitored_wallets.forEach(w => wallets.add(norm(w)));
        if (c.traced_wallets) c.traced_wallets.forEach(w => wallets.add(norm(w)));
        return wallets;
    };

    const currentAllWallets = getAllWallets(currentCase);

    // 3. Hard matching logic
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
        const currentMonitored = (currentCase.monitored_wallets || []).map(norm);
        const otherMonitored = (other.monitored_wallets || []).map(norm);
        const commonMonitored = currentMonitored.filter(w => otherMonitored.includes(w));
        
        if (commonMonitored.length > 0) {
             reasons.push({ type: 'monitored_wallet', value: commonMonitored.join(', '), confidence: 'high', label: 'Shared Monitored Wallet' });
             score += 40;
        }

        // Cross-Wallet Flow
        const otherAllWallets = getAllWallets(other);
        const crossMatch = [...currentAllWallets].filter(w => otherAllWallets.has(w) && !commonMonitored.includes(w) && w !== norm(currentCase.scammer_wallet));
        
        if (crossMatch.length > 0) {
            reasons.push({ type: 'cross_wallet', value: crossMatch.slice(0, 3).join(', '), confidence: 'high', label: 'Cross-Case Transaction Flow' });
            score += 45; 
        }

        // Scammer Email
        if (norm(currentCase.scammer_info?.email) && norm(other.scammer_info?.email) &&
            norm(currentCase.scammer_info.email) === norm(other.scammer_info.email)) {
            reasons.push({ type: 'email', value: currentCase.scammer_info.email, confidence: 'high', label: 'Same Scammer Email' });
            score += 40;
        }

         // Scammer Phone
        if (norm(currentCase.scammer_info?.phone) && norm(other.scammer_info?.phone) &&
            norm(currentCase.scammer_info.phone) === norm(other.scammer_info.phone)) {
            reasons.push({ type: 'phone', value: currentCase.scammer_info.phone, confidence: 'high', label: 'Same Scammer Phone' });
            score += 40;
        }

        // Scammer Website
        if (norm(currentCase.scammer_info?.website) && norm(other.scammer_info?.website) &&
            norm(currentCase.scammer_info.website) === norm(other.scammer_info.website)) {
            reasons.push({ type: 'website', value: currentCase.scammer_info.website, confidence: 'high', label: 'Same Scam Website' });
            score += 50;
        }
        
        // Suspect Name Fuzzy
        const s1 = norm(currentCase.scammer_info?.name || currentCase.suspect_details?.primary_suspect?.name);
        const s2 = norm(other.scammer_info?.name || other.suspect_details?.primary_suspect?.name);
        if (s1 && s2 && s1.length > 3 && s2.length > 3 && (s1.includes(s2) || s2.includes(s1))) {
             reasons.push({ type: 'suspect', value: `${s1} / ${s2}`, confidence: 'medium', label: 'Suspect Name Match' });
             score += 30;
        }

        // Scammer IP address match (infrastructure correlation)
        const ipMatch = (arr1, arr2) => {
            const s1 = new Set((arr1 || []).map(norm));
            const s2 = new Set((arr2 || []).map(norm));
            return [...s1].filter(x => s2.has(x));
        };
        const curIps = currentCase.suspect_details?.ip_addresses;
        const othIps = other.suspect_details?.ip_addresses;
        const sharedIps = ipMatch(curIps, othIps);
        if (sharedIps.length > 0) {
            reasons.push({ type: 'ip', value: sharedIps.join(', '), confidence: 'high', label: 'Shared Infrastructure IP' });
            score += 45;
        }
        // Scammer social profile correlation
        const curSocial = (currentCase.suspect_details?.social_profiles || []).map(p => norm(p.url || p.platform));
        const othSocial = (other.suspect_details?.social_profiles || []).map(p => norm(p.url || p.platform));
        const sharedSocial = curSocial.filter(x => othSocial.includes(x));
        if (sharedSocial.length > 0) {
            reasons.push({ type: 'social', value: sharedSocial.join(', '), confidence: 'medium', label: 'Shared Social Profile' });
            score += 25;
        }
        // Known associate overlap
        const curAssoc = (currentCase.suspect_details?.known_associates || []).map(a => norm(a.name));
        const othAssoc = (other.suspect_details?.known_associates || []).map(a => norm(a.name));
        const sharedAssoc = curAssoc.filter(x => othAssoc.includes(x) && x.length > 3);
        if (sharedAssoc.length > 0) {
            reasons.push({ type: 'associate', value: sharedAssoc.join(', '), confidence: 'medium', label: 'Shared Known Associate' });
            score += 30;
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

    // 4. AI Pattern Analysis
    const getSimilarity = (s1, s2) => {
        if (!s1 || !s2) return 0;
        const w1 = new Set(s1.toLowerCase().split(/\W+/).filter(w => w.length > 4));
        const w2 = new Set(s2.toLowerCase().split(/\W+/).filter(w => w.length > 4));
        const intersection = new Set([...w1].filter(x => w2.has(x)));
        return intersection.size / (w1.size + w2.size + 1);
    };

    const candidates = otherCases.filter(c => 
        !connections.find(conn => conn.case.id === c.id) &&
        c.description && currentCase.description
    ).map(c => ({
        ...c,
        simScore: getSimilarity(currentCase.description, c.description)
    })).sort((a, b) => b.simScore - a.simScore);

    const potentialMatches = candidates.filter(c => c.simScore > 0.05 || c.issue_type === currentCase.issue_type).slice(0, 8);

    if (potentialMatches.length > 0) {
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

    connections.sort((a, b) => b.score - a.score);

    return new Response(JSON.stringify({ 
        success: true,
        connections 
    }), { 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});