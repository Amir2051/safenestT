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

    let entitiesToTry = ['MyCase', 'InvestigationCase', 'ClientCase', 'FraudCase'];
    if (entityName && !entitiesToTry.includes(entityName)) {
        entitiesToTry.unshift(entityName);
    } else if (entityName) {
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
        return new Response(JSON.stringify({ error: `Case not found.` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Get other cases
    let allCases = [];
    try {
        allCases = await base44.entities[foundEntity].list('-created_date', 500); // optimize limit if needed
    } catch (e) {
        console.error(`Failed to list cases from ${foundEntity}`, e);
    }
    
    const otherCases = allCases.filter(c => c.id !== caseId);
    
    const suggestions = [];
    const norm = (str) => str ? str.toString().trim().toLowerCase() : '';
    const getAllWallets = (c) => {
        const wallets = new Set();
        if (c.scammer_wallet) wallets.add(norm(c.scammer_wallet));
        if (c.scammer_info?.wallet_addresses) c.scammer_info.wallet_addresses.forEach(w => wallets.add(norm(w)));
        if (c.monitored_wallets) c.monitored_wallets.forEach(w => wallets.add(norm(w)));
        return wallets;
    };
    const currentWallets = getAllWallets(currentCase);

    // 3. Match Logic
    for (const other of otherCases) {
        const reasons = [];
        let score = 0;

        // Wallet Match
        const otherWallets = getAllWallets(other);
        const sharedWallets = [...currentWallets].filter(w => otherWallets.has(w));
        if (sharedWallets.length > 0) {
            reasons.push({ type: 'wallet', value: sharedWallets.join(', '), confidence: 'high', label: 'Shared Wallet Address' });
            score += 60;
        }

        // Email Match
        if (norm(currentCase.scammer_info?.email) && norm(other.scammer_info?.email) && 
            norm(currentCase.scammer_info.email) === norm(other.scammer_info.email)) {
            reasons.push({ type: 'email', value: currentCase.scammer_info.email, confidence: 'high', label: 'Shared Scammer Email' });
            score += 50;
        }

        // Phone Match
        if (norm(currentCase.scammer_info?.phone) && norm(other.scammer_info?.phone) &&
            norm(currentCase.scammer_info.phone) === norm(other.scammer_info.phone)) {
            reasons.push({ type: 'phone', value: currentCase.scammer_info.phone, confidence: 'high', label: 'Shared Scammer Phone' });
            score += 50;
        }

        // Suspect Name Match
        const s1 = norm(currentCase.scammer_info?.name || currentCase.suspect_details?.primary_suspect?.name);
        const s2 = norm(other.scammer_info?.name || other.suspect_details?.primary_suspect?.name);
        if (s1 && s2 && s1.length > 3 && s2.length > 3 && (s1.includes(s2) || s2.includes(s1))) {
             reasons.push({ type: 'suspect', value: `${s1}`, confidence: 'medium', label: 'Suspect Name Match' });
             score += 30;
        }

        if (score > 0) {
            suggestions.push({
                case: {
                    id: other.id,
                    title: other.case_title || other.case_number || 'Untitled',
                    case_number: other.case_number,
                    status: other.status,
                    fraud_type: other.issue_type || other.fraud_type,
                    amount_lost: other.amount_lost || other.amount_stolen_usd || 0
                },
                reasons,
                score
            });
        }
    }
    
    // Sort suggestions
    suggestions.sort((a, b) => b.score - a.score);

    // Split into Confirmed (Linked) and Suggested
    const linkedIds = new Set(currentCase.linked_case_ids || []);
    const confirmed = suggestions.filter(s => linkedIds.has(s.case.id));
    
    // Add explicitly linked cases even if no algorithmic match (manual links)
    // We need to fetch them if they weren't in the suggestions list
    // (Optimization: In a real app we'd fetch them specifically, here we rely on 'otherCases' list or just ignore if not loaded)
    // But let's assume 'suggestions' only contains Algorithmic matches.
    // We want to return ALL linked cases in 'confirmed'.
    
    const matchedIds = new Set(confirmed.map(c => c.case.id));
    const missingLinkedIds = [...linkedIds].filter(id => !matchedIds.has(id));
    
    if (missingLinkedIds.length > 0) {
        // Find them in 'otherCases'
        missingLinkedIds.forEach(id => {
            const c = otherCases.find(oc => oc.id === id);
            if (c) {
                confirmed.push({
                    case: {
                        id: c.id,
                        title: c.case_title || c.case_number || 'Untitled',
                        case_number: c.case_number,
                        status: c.status,
                        fraud_type: c.issue_type || c.fraud_type,
                        amount_lost: c.amount_lost || c.amount_stolen_usd || 0
                    },
                    reasons: [{ type: 'manual', value: 'Manually Linked', confidence: 'high', label: 'Manual Link' }],
                    score: 100
                });
            }
        });
    }

    const suggested = suggestions.filter(s => !linkedIds.has(s.case.id));

    return new Response(JSON.stringify({ 
        success: true,
        confirmed,
        suggested: suggested.slice(0, 10) // Limit suggestions
    }), { 
        headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error("Link Suggestion Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});