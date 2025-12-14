import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await req.json().catch(() => ({}));
    const forceRegenerate = body.regenerate || false;

    // 1. Check for existing Master Case
    if (!forceRegenerate) {
        const existing = await base44.entities.MasterCase.filter({ user_id: user.email }, '-generated_date', 1);
        if (existing.length > 0) {
            return new Response(JSON.stringify({ success: true, masterCase: existing[0], cached: true }), { headers: { 'Content-Type': 'application/json' } });
        }
    }

    // 2. Fetch ALL cases for this user
    const myCases = await base44.entities.MyCase.filter({ created_by: user.email }, '-created_date', 100);
    const investigationCases = await base44.entities.InvestigationCase.filter({ created_by: user.email }, '-created_date', 100);
    // Also include cases where client_email matches user.email if not created_by them (legacy data)
    const clientCases = await base44.entities.MyCase.filter({ client_email: user.email }, '-created_date', 100);

    // Deduplicate cases by ID
    const allCasesMap = new Map();
    [...myCases, ...investigationCases, ...clientCases].forEach(c => allCasesMap.set(c.id, c));
    const allCases = Array.from(allCasesMap.values());

    if (allCases.length === 0) {
        return new Response(JSON.stringify({ error: 'No cases found for this user' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Aggregate Data
    const linkedCaseIds = [];
    const scamList = [];
    const walletSet = new Set();
    const transactionRecords = [];
    const evidenceMap = new Map(); // url -> evidence obj
    let totalLoss = 0;

    allCases.forEach(c => {
        linkedCaseIds.push(c.id);
        
        // Amount
        const amount = c.amount_lost || c.amount_stolen_usd || 0;
        totalLoss += parseFloat(amount) || 0;

        // Scams List
        scamList.push({
            date: c.incident_date || c.created_date,
            platform: c.issue_type || c.fraud_type || 'Unknown',
            method: c.description ? c.description.substring(0, 50) + '...' : 'N/A',
            amount: parseFloat(amount) || 0,
            case_id: c.id
        });

        // Wallets
        if (c.scammer_wallet) walletSet.add(c.scammer_wallet);
        if (c.scammer_info?.wallet_addresses) c.scammer_info.wallet_addresses.forEach(w => walletSet.add(w));
        if (c.monitored_wallets) c.monitored_wallets.forEach(w => walletSet.add(w));

        // Transactions
        if (c.transactions && Array.isArray(c.transactions)) {
            transactionRecords.push(...c.transactions);
        }

        // Evidence
        const caseEvidence = c.evidence_files || [];
        const logEvidence = c.evidence_log || [];
        
        [...caseEvidence, ...logEvidence].forEach(ev => {
            if (ev.url || ev.file_url) {
                const url = ev.url || ev.file_url;
                if (!evidenceMap.has(url)) {
                    evidenceMap.set(url, {
                        url: url,
                        name: ev.name || ev.description || 'Unnamed File',
                        source_case: c.case_number || c.id,
                        type: ev.type || ev.evidence_type || 'document'
                    });
                }
            }
        });
    });

    // 4. Generate Narrative & Analysis via LLM
    const prompt = `
    Analyze these related fraud cases for victim ${user.email}.
    
    Cases: ${JSON.stringify(scamList)}
    Total Loss: ${totalLoss}
    Wallets: ${Array.from(walletSet).join(', ')}
    
    Generate two sections in HTML format:
    1. "merged_summary": A consolidated chronological narrative of how the victim was targeted across these incidents. Assume they are linked. Write for law enforcement (IC3/FBI).
    2. "pattern_analysis": Analysis of commonalities (shared wallets, recurring platforms, method similarities).
    
    Return JSON: { "merged_summary": "<html>...", "pattern_analysis": "<html>..." }
    `;

    const llmRes = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
            type: "object",
            properties: {
                merged_summary: { type: "string" },
                pattern_analysis: { type: "string" }
            }
        }
    });

    // 5. Persist Master Case
    const masterCaseData = {
        user_id: user.email,
        linked_case_ids: linkedCaseIds,
        merged_summary: llmRes.merged_summary,
        pattern_analysis: llmRes.pattern_analysis,
        scam_list: scamList.sort((a, b) => new Date(a.date) - new Date(b.date)),
        wallet_addresses: Array.from(walletSet),
        transaction_records: transactionRecords,
        evidence_index: Array.from(evidenceMap.values()),
        total_loss: totalLoss,
        status: 'draft',
        generated_date: new Date().toISOString()
    };

    // Check if we updating existing or creating new
    // If forceRegenerate is true, we might want to update the existing record if we found one earlier, 
    // or just create new. Let's delete old one and create new for simplicity, or update.
    // Let's create new for history? No, prompt says "Store so it can be reopened". 
    // Ideally one active master case per user.
    
    const existing = await base44.entities.MasterCase.filter({ user_id: user.email });
    let resultEntity;
    
    if (existing.length > 0) {
        resultEntity = await base44.entities.MasterCase.update(existing[0].id, masterCaseData);
    } else {
        resultEntity = await base44.entities.MasterCase.create(masterCaseData);
    }

    return new Response(JSON.stringify({
        success: true,
        masterCase: resultEntity,
        cached: false
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("Master Case Creation Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});