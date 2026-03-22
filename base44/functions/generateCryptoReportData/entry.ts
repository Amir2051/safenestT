import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { caseId, linkedCaseIds = [] } = await req.json();

    if (!caseId) {
      return new Response(JSON.stringify({ error: 'Case ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Fetch Cases
    let primaryCase = await base44.entities.InvestigationCase.get(caseId);
    if (!primaryCase) primaryCase = await base44.entities.MyCase.get(caseId);
    
    if (!primaryCase) {
         return new Response(JSON.stringify({ error: 'Primary case not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    let linkedCases = [];
    if (linkedCaseIds.length > 0) {
        // Fetch from all possible case entities
        const [invCases, myCases, clientCases, fraudCases] = await Promise.all([
            base44.entities.InvestigationCase.filter({ id: { $in: linkedCaseIds } }),
            base44.entities.MyCase.filter({ id: { $in: linkedCaseIds } }),
            base44.entities.ClientCase ? base44.entities.ClientCase.filter({ id: { $in: linkedCaseIds } }) : [],
            base44.entities.FraudCase ? base44.entities.FraudCase.filter({ id: { $in: linkedCaseIds } }) : []
        ]);
        linkedCases = [...invCases, ...myCases, ...clientCases, ...fraudCases];
    }

    const allCaseIds = [caseId, ...linkedCases.map(c => c.id)];

    // 2. Fetch Evidence & Transactions for ALL cases
    // Note: In a real scalable app, we'd use better filtering or indexing.
    // Assuming ExtractedTransaction has case_id field.
    const allTxs = await base44.entities.ExtractedTransaction.filter({ case_id: { $in: allCaseIds } });
    const allEvidence = await base44.entities.CaseEvidenceFile.filter({ case_id: { $in: allCaseIds } });

    // 3. Aggregate Data
    const uniqueWallets = new Set();
    const uniqueTxs = new Map(); // hash -> tx
    const tokens = new Set();
    const chains = new Set();

    // Helper to add wallet
    const addWallet = (w, source) => {
        if (!w) return;
        const normalized = w.toLowerCase().trim();
        uniqueWallets.add(normalized);
    };

    // Process Primary Case Wallets
    addWallet(primaryCase.scammer_wallet, 'Primary');
    (primaryCase.monitored_wallets || []).forEach(w => addWallet(w, 'Primary Monitored'));
    (primaryCase.scammer_info?.wallet_addresses || []).forEach(w => addWallet(w, 'Primary Suspect'));

    // Process Linked Cases Wallets
    linkedCases.forEach(c => {
        addWallet(c.scammer_wallet, `Linked Case ${c.case_number}`);
        (c.monitored_wallets || []).forEach(w => addWallet(w, `Linked Case ${c.case_number}`));
        (c.scammer_info?.wallet_addresses || []).forEach(w => addWallet(w, `Linked Case ${c.case_number}`));
    });

    // Map evidence ID to filename
    const evidenceMap = new Map();
    allEvidence.forEach(e => evidenceMap.set(e.id, e.filename || e.name));

    // Process Extracted Txs
    allTxs.forEach(tx => {
        const sourceFile = evidenceMap.get(tx.evidence_file_id) || 'Unknown Source';
        
        if (tx.from_address) addWallet(tx.from_address, `Extracted from ${sourceFile}`);
        if (tx.to_address) addWallet(tx.to_address, `Extracted from ${sourceFile}`);
        if (tx.token_symbol) tokens.add(tx.token_symbol);
        
        if (tx.tx_hash) {
            if (!uniqueTxs.has(tx.tx_hash)) {
                uniqueTxs.set(tx.tx_hash, {
                    ...tx,
                    source_case: tx.case_id === caseId ? 'Primary' : 'Linked',
                    source_file: sourceFile
                });
            }
        }
    });

    // Process Chains
    if (primaryCase.blockchain) chains.add(primaryCase.blockchain);
    linkedCases.forEach(c => { if(c.blockchain) chains.add(c.blockchain); });

    // 4. Structure Output
    const reportData = {
        meta: {
            generated_at: new Date().toISOString(),
            generated_by: user.email,
            primary_case: {
                id: primaryCase.id,
                number: primaryCase.case_number,
                title: primaryCase.case_title
            },
            linked_count: linkedCases.length
        },
        intelligence: {
            wallets: Array.from(uniqueWallets),
            transactions: Array.from(uniqueTxs.values()),
            tokens: Array.from(tokens),
            chains: Array.from(chains)
        },
        evidence_summary: allEvidence.map(e => ({
            filename: e.filename || e.name,
            type: e.mime_type || e.type,
            summary: e.summary,
            case_origin: e.case_id === caseId ? 'Primary' : 'Linked'
        })),
        suspect_profile: {
            // Aggregate suspect info
            names: [...new Set([
                primaryCase.scammer_info?.name,
                ...linkedCases.map(c => c.scammer_info?.name)
            ].filter(Boolean))],
            emails: [...new Set([
                primaryCase.scammer_info?.email,
                ...linkedCases.map(c => c.scammer_info?.email)
            ].filter(Boolean))],
            phones: [...new Set([
                primaryCase.scammer_info?.phone,
                ...linkedCases.map(c => c.scammer_info?.phone)
            ].filter(Boolean))]
        }
    };

    return new Response(JSON.stringify({ 
        success: true, 
        data: reportData
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});