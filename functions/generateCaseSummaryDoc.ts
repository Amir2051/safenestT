import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.is_admin)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { caseId, linkedCaseIds = [], additionalEvidence = [] } = await req.json();

    if (!caseId) {
      return new Response(JSON.stringify({ error: 'Case ID required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 1. Fetch Primary Case
    // We try MyCase and InvestigationCase
    let primaryCase = await base44.entities.InvestigationCase.get(caseId);
    if (!primaryCase) {
        primaryCase = await base44.entities.MyCase.get(caseId);
    }
    
    if (!primaryCase) {
        return new Response(JSON.stringify({ error: 'Case not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Fetch Linked Cases
    let linkedCases = [];
    if (linkedCaseIds.length > 0) {
        // Try both entities for linked cases
        const invCases = await base44.entities.InvestigationCase.filter({ id: { $in: linkedCaseIds } });
        const myCases = await base44.entities.MyCase.filter({ id: { $in: linkedCaseIds } });
        linkedCases = [...invCases, ...myCases];
    }

    // 3. Fetch Evidence Files (Primary)
    const primaryEvidence = await base44.entities.CaseEvidenceFile.filter({ case_id: caseId });

    // 3b. Fetch Extracted Evidence Items (Transactions & Wallets)
    const evidenceItems = await base44.entities.CaseEvidenceItem.filter({ case_id: caseId });
    const extractedTxs = evidenceItems.filter(i => i.category === 'blockchain_transaction');
    const extractedWallets = evidenceItems.filter(i => i.category === 'wallet_address');

    // 4. Aggregate Data
    const aggregatedWallets = new Set();
    const aggregatedTx = new Set();
    const suspectInfo = { ...primaryCase.scammer_info };

    // Primary Wallets
    if (primaryCase.scammer_wallet) aggregatedWallets.add(primaryCase.scammer_wallet);
    (primaryCase.monitored_wallets || []).forEach(w => aggregatedWallets.add(w));
    (primaryCase.scammer_info?.wallet_addresses || []).forEach(w => aggregatedWallets.add(w));

    // Linked Cases Data
    const linkedSummaries = linkedCases.map(c => {
        if (c.scammer_wallet) aggregatedWallets.add(c.scammer_wallet);
        (c.monitored_wallets || []).forEach(w => aggregatedWallets.add(w));
        (c.scammer_info?.wallet_addresses || []).forEach(w => aggregatedWallets.add(w));
        
        // Merge Suspect Info (simple merge)
        if (c.scammer_info?.email) suspectInfo.email = suspectInfo.email || c.scammer_info.email;
        if (c.scammer_info?.phone) suspectInfo.phone = suspectInfo.phone || c.scammer_info.phone;
        
        return `- Case ${c.case_number || c.id}: ${c.case_title} (${c.status}) - Amount: ${c.amount_lost || 0}`;
    }).join('\n');

    // Evidence Summaries
    const evidenceSummaries = [
        ...primaryEvidence.map(e => `[Primary] ${e.filename}: ${JSON.stringify(e.summary || 'No summary')}`),
        ...additionalEvidence.map(e => `[Uploaded] ${e.name}: ${e.summary || 'New file'}`)
    ].join('\n');

    // 5. Generate Content with LLM
    const prompt = `
    Generate a comprehensive Case Summary Document for an Admin Review.
    
    Target Case:
    Title: ${primaryCase.case_title || primaryCase.case_number}
    Description: ${primaryCase.description}
    Victim: ${primaryCase.client_name || 'Redacted'}
    Amount Lost: ${primaryCase.amount_lost || 0} ${primaryCase.cryptocurrency || 'USD'}
    Scam Type: ${primaryCase.issue_type || primaryCase.fraud_type}
    
    Wallet Intelligence & Risk Analysis:
    ${primaryCase.wallet_analysis ? JSON.stringify(primaryCase.wallet_analysis) : 'No automated wallet analysis available.'}
    
    Linked Cases (${linkedCases.length}):
    ${linkedSummaries || 'None'}
    
    Aggregated Wallets: ${Array.from(aggregatedWallets).join(', ')}
    
    Evidence Analysis:
    ${evidenceSummaries}

    Extracted Transactions (${extractedTxs.length}):
    ${extractedTxs.map(t => `- ${t.data.timestamp}: ${t.data.amount} ${t.data.token} from ${t.data.from_address} to ${t.data.to_address} (Hash: ${t.data.transaction_hash})`).join('\n').slice(0, 4000)}

    Extracted Wallets (${extractedWallets.length}):
    ${extractedWallets.map(w => `- ${w.data.wallet_address} (${w.data.role})`).join('\n')}
    
    Suspect Info:
    ${JSON.stringify(suspectInfo)}
    
    Instructions:
    Create a structured HTML document (just the body content, no html/head tags) with the following sections:
    1. **Executive Overview**: High-level summary of the fraud ring or incident.
    2. **Victim Statement Summary**: Consolidate the primary victim's experience.
    3. **Suspect Profile & Wallets**: List known wallets and identities. Highlight overlaps with linked cases.
    4. **Linked Intelligence**: Summarize how the linked cases connect (e.g. shared wallets, same MO).
    5. **Crypto Tracing & Evidence**: Summarize the findings from the evidence files.
    6. **Timeline**: Reconstruct the likely timeline of events.
    7. **Confidence & Conclusion**: Assess the strength of the case.
    
    Format nicely with <h2>, <p>, <ul>, <strong>.
    Mark any low-confidence findings with a specific note.
    `;

    const llmRes = await base44.integrations.Core.InvokeLLM({ prompt });
    const content = typeof llmRes === 'string' ? llmRes : llmRes.content || JSON.stringify(llmRes);

    return new Response(JSON.stringify({ 
        success: true, 
        content,
        meta: {
            wallet_count: aggregatedWallets.size,
            linked_count: linkedCases.length
        }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});